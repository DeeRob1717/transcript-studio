import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { z } from "zod";
import { getOrCreateCurrentDbUser } from "@/lib/auth";
import { createQueuedJob, listJobsForUser, markJobFailed, markJobProcessing } from "@/lib/jobs";

const createJobSchema = z.object({
  originalFileName: z.string().min(1),
  mediaUrl: z.string().url().optional()
});

async function dispatchToWorker(params: {
  jobId: string;
  originalFileName: string;
  mediaUrl: string;
}) {
  const workerUrl = process.env.TRANSCRIPTION_WORKER_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const workerSecret = process.env.TRANSCRIPTION_WORKER_SECRET;

  if (!workerUrl || !appUrl || !workerSecret) {
    return false;
  }

  const normalizedWorkerUrl = workerUrl.trim().replace(/\/+$/, "");
  const candidateUrls = Array.from(
    new Set(
      (() => {
        const candidates = [normalizedWorkerUrl];

        if (!normalizedWorkerUrl.includes("/api/transcriptions/from-url")) {
          candidates.push(`${normalizedWorkerUrl}/api/transcriptions/from-url`);
        }

        if (normalizedWorkerUrl.includes("/api/transcriptions/from-url")) {
          candidates.push(normalizedWorkerUrl.replace("/api/transcriptions/from-url", "/transcriptions/from-url"));
        }

        return candidates;
      })()
    )
  );

  let lastError: Error | null = null;

  for (const candidateUrl of candidateUrls) {
    let response: Response;

    try {
      response = await fetch(candidateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-worker-secret": workerSecret
        },
        body: JSON.stringify({
          jobId: params.jobId,
          originalFileName: params.originalFileName,
          mediaUrl: params.mediaUrl,
          callbackUrl: `${appUrl}/api/worker/transcriptions/complete`,
          callbackSecret: workerSecret
        }),
        signal: AbortSignal.timeout(3000)
      });
    } catch (error) {
      // The local Whisper worker can keep processing after this request times out.
      if (error instanceof Error && error.name === "TimeoutError") {
        return true;
      }

      lastError = error instanceof Error ? error : new Error("Worker dispatch failed.");
      continue;
    }

    if (response.ok) {
      return true;
    }

    if (response.status !== 404) {
      throw new Error(`Worker dispatch failed with status ${response.status}.`);
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("Worker dispatch failed with status 404.");
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getOrCreateCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await listJobsForUser(user.id);
  return NextResponse.json(jobs);
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getOrCreateCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const mediaUrlValue = formData.get("mediaUrl");
  const parsed = createJobSchema.safeParse({
    originalFileName: formData.get("originalFileName"),
    mediaUrl:
      typeof mediaUrlValue === "string" && mediaUrlValue.trim().length > 0
        ? mediaUrlValue
        : undefined
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  let resolvedMediaUrl = parsed.data.mediaUrl;

  if (!resolvedMediaUrl) {
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Please choose an audio or video file, or provide a file URL." },
        { status: 400 }
      );
    }

    const uploaded = await put(`uploads/${Date.now()}-${file.name}`, file, {
      access: "public"
    });

    resolvedMediaUrl = uploaded.url;
  }

  const job = await createQueuedJob({
    userId: user.id,
    originalFileName: parsed.data.originalFileName,
    mediaUrl: resolvedMediaUrl
  });

  try {
    const dispatched = await dispatchToWorker({
      jobId: job.id,
      originalFileName: parsed.data.originalFileName,
      mediaUrl: resolvedMediaUrl
    });

    if (dispatched) {
      await markJobProcessing(job.id);
    }
  } catch (error) {
    await markJobFailed({
      jobId: job.id,
      errorMessage: error instanceof Error ? error.message : "Worker dispatch failed."
    });
  }

  const acceptsJson = request.headers.get("accept")?.includes("application/json");

  if (acceptsJson) {
    return NextResponse.json({ success: true, jobId: job.id }, { status: 201 });
  }

  return NextResponse.redirect(new URL("/dashboard/jobs", request.url), 303);
}

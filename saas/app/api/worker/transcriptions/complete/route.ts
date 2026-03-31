import { NextRequest, NextResponse } from "next/server";
import { markJobCompleted, markJobFailed } from "@/lib/jobs";

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.TRANSCRIPTION_WORKER_SECRET;
  const incomingSecret = request.headers.get("x-worker-secret");

  if (!expectedSecret || incomingSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    jobId?: string;
    transcriptText?: string;
    transcriptFormat?: string;
    errorMessage?: string;
    status?: string;
  };

  if (!payload.jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  if (payload.status === "FAILED") {
    await markJobFailed({
      jobId: payload.jobId,
      errorMessage: payload.errorMessage || "Transcription failed."
    });
    return NextResponse.json({ received: true });
  }

  if (!payload.transcriptText) {
    return NextResponse.json({ error: "Missing transcriptText" }, { status: 400 });
  }

  await markJobCompleted({
    jobId: payload.jobId,
    transcriptText: payload.transcriptText,
    transcriptFormat: payload.transcriptFormat
  });

  return NextResponse.json({ received: true });
}

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getOrCreateCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getOrCreateCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const job = await db.transcriptionJob.findFirst({
    where: {
      id,
      userId: user.id
    }
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getOrCreateCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const job = await db.transcriptionJob.findFirst({
    where: {
      id,
      userId: user.id
    }
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  await db.transcriptionJob.delete({
    where: { id: job.id }
  });

  return NextResponse.json({ success: true });
}


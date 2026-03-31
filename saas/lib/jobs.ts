import { db } from "@/lib/db";

export async function listJobsForUser(userId: string) {
  return db.transcriptionJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });
}

export async function createQueuedJob(params: {
  userId: string;
  originalFileName: string;
  mediaUrl: string;
}) {
  return db.transcriptionJob.create({
    data: {
      userId: params.userId,
      originalFileName: params.originalFileName,
      mediaUrl: params.mediaUrl,
      status: "QUEUED"
    }
  });
}

export async function markJobProcessing(jobId: string) {
  return db.transcriptionJob.update({
    where: { id: jobId },
    data: {
      status: "PROCESSING",
      errorMessage: null
    }
  });
}

export async function markJobCompleted(params: {
  jobId: string;
  transcriptText: string;
  transcriptFormat?: string;
}) {
  return db.transcriptionJob.update({
    where: { id: params.jobId },
    data: {
      status: "COMPLETED",
      transcriptText: params.transcriptText,
      transcriptFormat: params.transcriptFormat ?? "text",
      completedAt: new Date(),
      errorMessage: null
    }
  });
}

export async function markJobFailed(params: {
  jobId: string;
  errorMessage: string;
}) {
  return db.transcriptionJob.update({
    where: { id: params.jobId },
    data: {
      status: "FAILED",
      errorMessage: params.errorMessage
    }
  });
}

import { DashboardShell } from "@/components/dashboard-shell";
import { JobsTable } from "@/components/jobs-table";

export default function JobsPage() {
  return (
    <main className="dashboard-page">
      <DashboardShell
        title="Transcription jobs"
        description="Track uploads, queue status, and completed transcripts from one workspace."
      >
        <article className="jobs-card">
          <JobsTable />
        </article>
      </DashboardShell>
    </main>
  );
}

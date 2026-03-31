import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { UploadJobForm } from "@/components/upload-job-form";

export default function DashboardPage() {
  return (
    <main className="dashboard-page">
      <DashboardShell
        title="Dashboard"
        description="Upload files, create transcription jobs, and move between jobs, billing, and your main website."
      >
        <section className="metrics-grid">
          <article className="metric-card">
            <span>Current plan</span>
            <strong>Free</strong>
          </article>
          <article className="metric-card">
            <span>Monthly limit</span>
            <strong>10/month</strong>
          </article>
          <article className="metric-card">
            <span>Workspace</span>
            <strong>Ready</strong>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="upload-card">
            <h2>Upload audio or video</h2>
            <p className="helper-text">
              Choose a file and create a transcription job directly from the dashboard.
            </p>
            <UploadJobForm />
          </article>

          <article className="jobs-card">
            <h2>Quick actions</h2>
            <div className="action-stack">
              <Link href="/dashboard/jobs" className="primary-button">
                View jobs
              </Link>
              <Link href="/dashboard/billing" className="ghost-button">
                Manage billing
              </Link>
              <Link href="/" className="ghost-button">
                Back to home
              </Link>
            </div>
            <div className="empty-card">
              <p>
                This is your actual app area. Users should come here after signing in, not remain
                stuck on the landing page.
              </p>
            </div>
          </article>
        </section>
      </DashboardShell>
    </main>
  );
}

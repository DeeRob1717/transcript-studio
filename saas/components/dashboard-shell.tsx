import Link from "next/link";
import { ReactNode } from "react";

export function DashboardShell({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-top">
          <Link href="/dashboard" className="dashboard-brand">
            Transcript Studio
          </Link>
          <p className="dashboard-sidebar-copy">Your transcription workspace</p>
        </div>

        <nav className="dashboard-nav">
          <Link href="/dashboard">Overview</Link>
          <Link href="/dashboard/jobs">Jobs</Link>
          <Link href="/dashboard/billing">Billing</Link>
          <Link href="/">Back to home</Link>
        </nav>

        <div className="dashboard-sidebar-actions">
          <Link href="/dashboard" className="primary-button">
            Open app
          </Link>
          <Link href="/" className="ghost-button">
            Website
          </Link>
        </div>
      </aside>

      <section className="dashboard-main">
        <div className="dashboard-heading">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
      </section>
    </div>
  );
}

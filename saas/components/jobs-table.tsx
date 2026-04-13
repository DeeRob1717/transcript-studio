"use client";

import { useEffect, useState } from "react";

type Job = {
  id: string;
  originalFileName: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
  completedAt: string | null;
  transcriptText: string | null;
  errorMessage: string | null;
};

export function JobsTable() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadJobs() {
      try {
        const response = await fetch("/api/jobs", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Could not load jobs.");
        }

        const responseText = await response.text();
        let payload: Job[] = [];

        if (responseText) {
          try {
            payload = JSON.parse(responseText) as Job[];
          } catch {
            throw new Error("Could not parse jobs response.");
          }
        }

        if (!ignore) {
          setJobs(payload);
          setError("");
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Could not load jobs.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadJobs();
    const timer = window.setInterval(loadJobs, 5000);

    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, []);

  if (loading) {
    return (
      <div className="empty-card">
        <p>Loading jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-card">
        <p>{error}</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="empty-card">
        <p>No jobs yet. Upload a file from the dashboard to create your first transcription job.</p>
      </div>
    );
  }

  return (
    <table className="jobs-table">
      <thead>
        <tr>
          <th>File</th>
          <th>Status</th>
          <th>Created</th>
          <th>Transcript</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => (
          <tr key={job.id}>
            <td>{job.originalFileName}</td>
            <td>
              <span className={`status-pill ${job.status.toLowerCase()}`}>{job.status}</span>
            </td>
            <td>{new Date(job.createdAt).toLocaleString()}</td>
            <td className="jobs-transcript-cell">
              {job.transcriptText ? job.transcriptText.slice(0, 120) : job.errorMessage || "Waiting..."}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

"use client";

import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function UploadJobForm() {
  const router = useRouter();
  const [selectedFileName, setSelectedFileName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setSelectedFileName(file?.name ?? "");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage("Uploading your file...");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json"
        }
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Upload failed.");
      }

      setStatusMessage("Upload received. Transcription job created.");
      router.push("/dashboard/jobs");
      router.refresh();
    } catch (submitError) {
      setStatusMessage(
        submitError instanceof Error ? submitError.message : "Upload failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="field-stack" onSubmit={handleSubmit} encType="multipart/form-data">
      <div className="upload-picker">
        <label className="upload-picker-label" htmlFor="media-file">
          Choose audio or video file
        </label>
        <input
          id="media-file"
          name="file"
          type="file"
          accept="audio/*,video/*"
          onChange={handleFileChange}
          required
        />
        <p className="helper-text">
          {selectedFileName
            ? `Selected: ${selectedFileName}`
            : "Choose a file to auto-fill the file name field below."}
        </p>
      </div>

      <label>
        File name
        <input
          name="originalFileName"
          placeholder="episode-014.wav"
          defaultValue={selectedFileName}
          key={selectedFileName || "empty"}
          required
        />
      </label>

      <p className="helper-text">
        Your file will be uploaded first, and the app will create the transcription job from that
        uploaded file automatically.
      </p>

      <button className="primary-button" type="submit">
        {isSubmitting ? "Uploading..." : "Create transcription job"}
      </button>

      {statusMessage ? <p className="helper-text">{statusMessage}</p> : null}
    </form>
  );
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Transcript Studio",
    short_name: "Transcript Studio",
    description:
      "Upload audio or video files, generate transcripts, and manage subscriptions from one polished transcription platform.",
    start_url: "/",
    display: "standalone",
    background_color: "#07151a",
    theme_color: "#0d6b74",
    icons: [
      {
        src: "/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  };
}

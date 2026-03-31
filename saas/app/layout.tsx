import type { Metadata } from "next";
import type { Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Transcript Studio",
    template: "%s | Transcript Studio"
  },
  description:
    "Upload audio or video, transcribe it online, manage paid subscriptions, and run your transcription business from one polished dashboard.",
  applicationName: "Transcript Studio",
  keywords: [
    "transcription software",
    "audio transcription",
    "video transcription",
    "speech to text",
    "transcript generator",
    "saas transcription"
  ],
  authors: [{ name: "Transcript Studio" }],
  creator: "Transcript Studio",
  publisher: "Transcript Studio",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: appUrl,
    siteName: "Transcript Studio",
    title: "Transcript Studio",
    description:
      "A premium transcription platform for creators, teams, and businesses that need fast audio and video transcripts.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Transcript Studio transcription SaaS"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Transcript Studio",
    description:
      "Upload audio or video, generate transcripts, and manage subscriptions in one polished SaaS.",
    images: ["/opengraph-image"]
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/app-icon.svg", type: "image/svg+xml" }
    ],
    apple: "/app-icon.svg"
  },
  manifest: "/manifest.webmanifest",
  category: "productivity"
};

export const viewport: Viewport = {
  themeColor: "#0d6b74",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      signInForceRedirectUrl="/dashboard"
      signUpForceRedirectUrl="/dashboard"
    >
      <html lang="en">
        <body>
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}

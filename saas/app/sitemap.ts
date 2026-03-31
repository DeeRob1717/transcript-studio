import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: appUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${appUrl}/sign-up`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9
    },
    {
      url: `${appUrl}/sign-in`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6
    },
    {
      url: `${appUrl}/dashboard/billing`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.5
    }
  ];
}

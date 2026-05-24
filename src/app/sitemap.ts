import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://radiogen.ai";
  const now = new Date().toISOString();

  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/legal`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/waitlist`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/auth/login`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/auth/register`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}

import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  // Prerendered, so this cannot read the clock. `BUILD_DATE` is stamped in
  // next.config.ts and moves on every deploy, which is when these pages can
  // actually change.
  const lastModified = process.env.BUILD_DATE;

  return [
    {
      changeFrequency: "weekly",
      lastModified,
      priority: 1,
      url: siteUrl,
    },
    {
      changeFrequency: "monthly",
      lastModified,
      priority: 0.8,
      url: `${siteUrl}/installation`,
    },
    {
      changeFrequency: "monthly",
      lastModified,
      priority: 0.8,
      url: `${siteUrl}/philosophy`,
    },
    {
      changeFrequency: "weekly",
      lastModified,
      priority: 0.7,
      url: `${siteUrl}/concepts`,
    },
    // No icon URLs. An icon is a panel over the grid (`?icon=slug`), and
    // the old `/{slug}` pages now 308 there; listing either would hand
    // crawlers 2,000 redirects or 2,000 variants of the root.
    // No `/llms.txt` here. A sitemap lists indexable HTML pages, and that route
    // is plain text: no title, no canonical, no description, no OG. Listing it
    // only gave crawlers a page-shaped thing that fails every page check.
    // Agents reach it from `/.well-known` and the `llms.txt` convention, which
    // do not depend on a sitemap entry.
  ];
}

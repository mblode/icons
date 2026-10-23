import { notFound, permanentRedirect } from "next/navigation";

import { iconHref, siteUrl } from "@/lib/config";
import { getAllIconSlugs, getIconDoc } from "@/lib/icon-detail";

/**
 * Icons used to have a page each at `/icons/{slug}`. The side panel over the
 * grid is now the only icon view, so these URLs 308 to it rather than 404:
 * they are in search indexes, READMEs and the MCP output people have pasted.
 *
 * Prerendered so the redirect is a cache read. The 404 still comes from the
 * page, because this route sits at the zone root and would otherwise redirect
 * every mistyped URL under /icons to an empty panel.
 */
export const instant = false;

export function generateStaticParams() {
  return getAllIconSlugs().map((slug) => ({ slug }));
}

export default async function IconRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getIconDoc(slug)) {
    notFound();
  }
  // Absolute, because `redirect` prepends basePath to any path starting with
  // `/`: `/?icon=` becomes `/icons/?icon=` and costs a trailing-slash hop,
  // and `/icons?icon=` becomes `/icons/icons?icon=`. A bare `?icon=` resolves
  // against this URL and loops. A full URL is left alone, so this is one hop.
  permanentRedirect(new URL(iconHref(slug), siteUrl).href);
}

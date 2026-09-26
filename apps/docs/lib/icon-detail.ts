import "server-only";
import { getAllSearchDocs } from "@/lib/icon-search";
import { readIconSource } from "@/lib/icon-source-server";
import type { SearchDoc } from "@/lib/icon-types";

const ICON_SUFFIX_REGEX = /Icon$/;
const FILLED_SUFFIX = "FilledIcon";

const docBySlug = new Map(getAllSearchDocs().map((doc) => [doc.slug, doc]));

/**
 * Exact slug lookup. Unlike `getIconByNameOrSlug` there is no fuzzy fallback:
 * a route must 404 on a wrong slug rather than quietly serve a near miss under
 * a canonical URL that then disagrees with its own content.
 */
export const getIconDoc = (slug: string): SearchDoc | null =>
  docBySlug.get(slug) ?? null;

export const getAllIconSlugs = (): string[] =>
  getAllSearchDocs().map((doc) => doc.slug);

/**
 * Outline markup for a list of slugs, for the grids that are not the search
 * page, such as the concepts table. One `readFile` per icon, cached, so
 * a prerendered grid costs nothing at request time.
 */
export const getIconSvgs = async (
  slugs: string[]
): Promise<Record<string, string>> => {
  "use cache";

  const sources = await Promise.all(
    slugs.map((slug) => readIconSource(slug, "svg"))
  );

  const markupBySlug: Record<string, string> = {};
  for (const [index, source] of sources.entries()) {
    if (source) {
      markupBySlug[slugs[index]] = source;
    }
  }
  return markupBySlug;
};

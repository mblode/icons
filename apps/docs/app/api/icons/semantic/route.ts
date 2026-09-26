import { semanticSearchIcons } from "@/lib/icon-semantic-search";

// Every call spends embedding and TypeSafe tokens, so the query is capped and
// the answer is cached at the edge: the same words give the same icons until
// the next deploy.
const MAX_QUERY_LENGTH = 100;
const MIN_QUERY_LENGTH = 3;

export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "")
    .trim()
    .replaceAll(/\s+/g, " ")
    .slice(0, MAX_QUERY_LENGTH);

  if (query.length < MIN_QUERY_LENGTH) {
    return Response.json({ query, results: [] });
  }

  try {
    const results = await semanticSearchIcons(query);
    return Response.json(
      { query, results: results.map((doc) => doc.slug) },
      {
        headers: {
          "Cache-Control":
            "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch {
    // No gateway credential or a gateway outage. The grid already shows the
    // lexical matches, so an empty list is a quiet fallback, not an error.
    return Response.json(
      { query, results: [] },
      { headers: { "Cache-Control": "no-store" }, status: 503 }
    );
  }
}

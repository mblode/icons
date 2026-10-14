import "server-only";
import { gateway } from "@ai-sdk/gateway";
import { choice, TypeSafeClient } from "@typesafe-ai/sdk";
import { cosineSimilarity, embed, embedMany } from "ai";

import { getAllSearchDocs } from "@/lib/icon-search";
import type { SearchDoc } from "@/lib/icon-types";

/**
 * Search by meaning, for the queries the lexical ranker cannot reach: "happy"
 * has no icon named happy, but it has a smiley face.
 *
 * Two stages. Embeddings through the Vercel AI Gateway narrow ~2,200 icons to
 * a shortlist, because a TypeSafe Choice takes at most 255 options. TypeSafe
 * then reads the shortlist against the query and ranks it, which is the part
 * embeddings are bad at: "stop" sits close to "play" in vector space, but only
 * one of them is the icon you meant.
 *
 * Both stages degrade. No TypeSafe key, or a TypeSafe error, returns the
 * embedding order. No gateway credential throws, and the route turns that into
 * an empty result so the grid keeps its lexical matches.
 */

const EMBEDDING_MODEL = gateway.embeddingModel("openai/text-embedding-3-small");
// 256 dimensions keep the whole index around 2 MB in memory. Icon records are
// a title and a handful of tags, which is nowhere near needing 1,536.
const EMBEDDING_OPTIONS = { openai: { dimensions: 256 } };

const SHORTLIST_SIZE = 60;
const RESULT_LIMIT = 36;
// A Choice spreads probability across the options it rejects too, so the tail
// of its ranking is noise. Below this, keep the embedding order instead.
const RERANK_FLOOR = 0.01;
const TYPESAFE_TIMEOUT_MS = 4000;

const docs = getAllSearchDocs();

const describe = (doc: SearchDoc) =>
  [doc.title, doc.tags.join(", "), doc.category].filter(Boolean).join(". ");

// Built on the first semantic query and reused for the life of the instance.
// The icon set only changes on deploy, which is also when instances recycle.
let indexPromise: Promise<number[][]> | null = null;

const loadIndex = () => {
  indexPromise ??= embedMany({
    model: EMBEDDING_MODEL,
    providerOptions: EMBEDDING_OPTIONS,
    values: docs.map(describe),
  })
    .then(({ embeddings }) => embeddings)
    .catch((error: unknown) => {
      // Let the next query retry rather than caching the failure.
      indexPromise = null;
      throw error;
    });
  return indexPromise;
};

const shortlist = async (query: string): Promise<SearchDoc[]> => {
  const [index, { embedding }] = await Promise.all([
    loadIndex(),
    embed({
      model: EMBEDDING_MODEL,
      providerOptions: EMBEDDING_OPTIONS,
      value: query,
    }),
  ]);

  return index
    .map((vector, i) => ({
      doc: docs[i],
      score: cosineSimilarity(vector, embedding),
    }))
    .toSorted((a, b) => b.score - a.score)
    .slice(0, SHORTLIST_SIZE)
    .map(({ doc }) => doc);
};

const typesafe = process.env.TYPESAFE_API_KEY
  ? new TypeSafeClient({ timeout: TYPESAFE_TIMEOUT_MS })
  : null;

const rerank = async (
  query: string,
  candidates: SearchDoc[]
): Promise<SearchDoc[]> => {
  if (!typesafe || candidates.length < 2) {
    return candidates;
  }

  try {
    const criteria = Object.fromEntries(
      candidates.map((doc) => [doc.slug, describe(doc)])
    );
    const { answers } = await typesafe.systemOne({
      questions: {
        best: choice(
          `Someone searching an icon library typed "${query}". Which icon would they most want to use for it?`,
          criteria
        ),
      },
      state: {
        icons: "Each option is an icon slug, described by its title and tags.",
        query,
      },
    });

    const probability = answers.best.probabilities as Record<string, number>;
    const ranked = candidates
      .filter((doc) => (probability[doc.slug] ?? 0) >= RERANK_FLOOR)
      .toSorted((a, b) => probability[b.slug] - probability[a.slug]);
    const rankedSlugs = new Set(ranked.map((doc) => doc.slug));

    return [
      ...ranked,
      ...candidates.filter((doc) => !rankedSlugs.has(doc.slug)),
    ];
  } catch {
    return candidates;
  }
};

export const semanticSearchIcons = async (
  query: string
): Promise<SearchDoc[]> => {
  const candidates = await shortlist(query);
  const ranked = await rerank(query, candidates);
  return ranked.slice(0, RESULT_LIMIT);
};

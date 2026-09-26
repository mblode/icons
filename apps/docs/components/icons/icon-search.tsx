"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  IconPanelFromUrl,
  resolveVariant,
} from "@/components/icons/icon-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { asset, iconHref } from "@/lib/config";
import { copyIconContent } from "@/lib/conversion-events";
import { PAGE_SIZE } from "@/lib/icon-grid";
import { openIconPanel } from "@/lib/icon-panel-url";
import {
  filterIconsByStyle,
  getAllSearchDocs,
  getIconDisplayName,
  searchIconTiers,
} from "@/lib/icon-search";
import { loadIconSource, loadIconSvgBatch } from "@/lib/icon-source";
import type { IconCopyKind, IconStyle, SearchDoc } from "@/lib/icon-types";
import MagnifyingGlassIcon from "@/src/icons-tsx/magnifying-glass";

const COPY_KIND_LABEL: Record<IconCopyKind, string> = {
  NAME: "name",
  SVG: "SVG",
  TSX: "TSX",
};

// Module-level cache so toggling style / re-searching never re-fetches an SVG.
const svgCache = new Map<string, string>();

const docBySlug = new Map(getAllSearchDocs().map((doc) => [doc.slug, doc]));

// Below three characters a query is still a prefix being typed, and the
// lexical pass already covers it. The debounce keeps one request per pause
// rather than one per keystroke; each request spends model tokens.
const SEMANTIC_MIN_LENGTH = 3;
const SEMANTIC_DEBOUNCE_MS = 350;

/**
 * Icons that match the query by meaning, from `/api/icons/semantic`. Lowercased
 * before the request so "Happy" and "happy" share one edge-cached answer. Any
 * failure settles to no matches: the lexical results are already on screen.
 */
const useSemanticMatches = (query: string) => {
  const normalized = query.trim().replaceAll(/\s+/g, " ").toLowerCase();
  const eligible = normalized.length >= SEMANTIC_MIN_LENGTH;
  const [settled, setSettled] = useState({ query: "", slugs: [] as string[] });

  useEffect(() => {
    if (!eligible) {
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      let slugs: string[] = [];
      try {
        const response = await fetch(
          asset(`/api/icons/semantic?q=${encodeURIComponent(normalized)}`),
          { signal: controller.signal }
        );
        if (response.ok) {
          ({ results: slugs } = (await response.json()) as {
            results: string[];
          });
        }
      } catch {
        if (controller.signal.aborted) {
          return;
        }
      }
      setSettled({ query: normalized, slugs });
    }, SEMANTIC_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [eligible, normalized]);

  const current = eligible && settled.query === normalized;
  return {
    pending: eligible && !current,
    slugs: current ? settled.slugs : [],
  };
};

const IconCell = ({
  doc,
  style,
  markup,
  onCopy,
}: {
  doc: SearchDoc;
  style: IconStyle;
  markup: string | null;
  onCopy: (slug: string, name: string, copyKind: IconCopyKind) => void;
}) => {
  const { slug, name } = resolveVariant(doc, style);
  const displayName = getIconDisplayName(name);

  return (
    <div>
      <div className="group relative h-[104px] overflow-hidden rounded-xl border border-border [contain-intrinsic-size:104px] [content-visibility:auto]">
        {/*
          The glyph links to the grid with this icon's panel open. A plain
          click opens it in place with a shallow URL update; a modified click
          still gets a real href, so a new tab lands on the same panel. The
          copy buttons sit on top, so a click on one never falls through.
          Raw anchor rather than next/link: the grid can hold 2,000 cells, and
          prefetching every visible one is a request storm.
        */}
        <a
          className="absolute inset-0 flex items-center justify-center rounded-xl px-2 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
          href={iconHref(doc.slug)}
          onClick={(event) => {
            if (
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey ||
              event.button !== 0
            ) {
              return;
            }
            event.preventDefault();
            openIconPanel(doc.slug);
          }}
        >
          <span className="sr-only">{displayName}</span>
          {markup ? (
            // Zoom the glyph on hover/focus instead of hiding it behind the copy
            // buttons, so you can actually see the icon while deciding (issue #14).
            //
            // dangerouslySetInnerHTML rather than assigning innerHTML in an
            // effect: the effect only runs after hydration, so the server HTML
            // shipped an empty div and the whole grid stayed blank until the
            // bundle booted. This renders the glyph into the document itself.
            // The markup is this repo's own src/icons-svg files, never user input.
            <div
              className="flex size-6 items-center justify-center transition-transform duration-150 ease-out group-focus-within:-translate-y-1.5 group-focus-within:scale-[1.85] group-hover:-translate-y-1.5 group-hover:scale-[1.85] [&_svg]:size-6"
              dangerouslySetInnerHTML={{ __html: markup }}
            />
          ) : (
            <div className="size-6 rounded-md bg-muted/40" />
          )}
        </a>

        {/*
          Dropped where there is no hover to reveal it. Tailwind scopes `hover:`
          to `(hover: hover)`, so on a phone this bar could never appear — yet
          at `opacity-0` it still swallowed every tap along the bottom of the
          cell, which is why copying an icon there meant hitting a button you
          could not see. `display: none` takes it out of the tap target, the tab
          order and the a11y tree together, leaving the whole cell as the link
          to the icon's panel, where the same actions are always visible at a
          size worth aiming at.
        */}
        <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-background via-background/95 to-transparent p-1.5 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:hidden">
          <Button
            aria-label={`Copy ${displayName} SVG`}
            className="h-7 min-w-0 flex-1 cursor-pointer px-1 text-[11px]"
            onClick={() => onCopy(slug, name, "SVG")}
            variant="secondary"
          >
            SVG
          </Button>
          <Button
            aria-label={`Copy ${displayName} React component source`}
            className="h-7 min-w-0 flex-1 cursor-pointer px-1 text-[11px]"
            onClick={() => onCopy(slug, name, "TSX")}
            variant="secondary"
          >
            TSX
          </Button>
          <Button
            aria-label={`Copy ${displayName} name`}
            className="h-7 min-w-0 flex-1 cursor-pointer px-1 text-[11px]"
            onClick={() => onCopy(slug, name, "NAME")}
            variant="secondary"
          >
            Name
          </Button>
        </div>
      </div>

      <span className="mt-2 line-clamp-2 text-center text-muted-foreground text-xs">
        {displayName}
      </span>
    </div>
  );
};

export const IconSearch = ({
  initialSvgs,
}: {
  /** First batch, rendered on the server so the opening screen costs no requests. */
  initialSvgs: Record<string, string>;
}) => {
  const [iconStyle, setIconStyle] = useState<IconStyle>("OUTLINE");
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const tiers = useMemo(() => searchIconTiers(searchQuery), [searchQuery]);
  const semantic = useSemanticMatches(searchQuery);

  // Exact and all-token hits first, then meaning, then typo distance. Semantic
  // matches land below what the user literally typed, so arriving late never
  // moves the cell they were about to click.
  const filteredIcons = useMemo(() => {
    const seen = new Set(tiers.strong.map((doc) => doc.slug));
    const byMeaning = semantic.slugs.flatMap((slug) => {
      const doc = docBySlug.get(slug);
      if (!doc || seen.has(slug)) {
        return [];
      }
      seen.add(slug);
      return [doc];
    });
    const fuzzy = tiers.fuzzy.filter((doc) => !seen.has(doc.slug));
    return filterIconsByStyle(
      [...tiers.strong, ...byMeaning, ...fuzzy],
      iconStyle
    );
  }, [iconStyle, semantic.slugs, tiers]);

  const iconCount = useMemo(
    () => filterIconsByStyle(getAllSearchDocs(), iconStyle).length,
    [iconStyle]
  );

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset to the first batch whenever the result set changes. The deps track
  // the query and style inputs, not the derived list.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, iconStyle]);

  // Reveal the next batch as the sentinel approaches the viewport.
  useEffect(() => {
    if (visibleCount >= filteredIcons.length) {
      return;
    }
    const el = sentinelRef.current;
    if (!el) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((count) => count + PAGE_SIZE);
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, filteredIcons.length]);

  const visibleIcons = filteredIcons.slice(0, visibleCount);

  const visibleSlugs = useMemo(
    () => visibleIcons.map((doc) => resolveVariant(doc, iconStyle).slug),
    [visibleIcons, iconStyle]
  );

  // Markup that has arrived so far. Seeded from the server payload, so the
  // opening screen paints from the document instead of waiting on the network.
  // The module-level svgCache survives unmount; this state is what React
  // re-renders on.
  const [markupBySlug, setMarkupBySlug] = useState(() => {
    for (const [slug, markup] of Object.entries(initialSvgs)) {
      svgCache.set(slug, markup);
    }
    return new Map(svgCache);
  });

  // One request per batch, not one per icon.
  useEffect(() => {
    const missing = visibleSlugs.filter((slug) => !svgCache.has(slug));
    if (missing.length === 0) {
      // Style toggles and searches surface slugs already cached from an earlier
      // batch, so publish those without going to the network.
      setMarkupBySlug((current) =>
        visibleSlugs.every((slug) => current.has(slug))
          ? current
          : new Map(svgCache)
      );
      return;
    }

    let active = true;
    (async () => {
      try {
        const batch = await loadIconSvgBatch(missing);
        if (!active) {
          return;
        }
        for (const [slug, markup] of Object.entries(batch)) {
          svgCache.set(slug, markup);
        }
        setMarkupBySlug(new Map(svgCache));
      } catch {
        // A failed batch leaves placeholders; the next scroll or search retries.
      }
    })();

    return () => {
      active = false;
    };
  }, [visibleSlugs]);

  const handleIconCopy = async (
    slug: string,
    name: string,
    copyKind: IconCopyKind
  ) => {
    // The fetch is started but deliberately not awaited: handing the pending
    // promise straight to the clipboard keeps the write inside the tap that
    // asked for it, which is the only thing Safari accepts.
    const source =
      copyKind === "NAME"
        ? name
        : loadIconSource({ copyKind, iconName: slug }).then((value) => {
            if (!value) {
              throw new Error(`No ${copyKind} source for ${slug}`);
            }
            return value;
          });

    try {
      await copyIconContent(
        source,
        `copy-${copyKind.toLowerCase()}`,
        "icon-search",
        slug
      );
      toast(
        `"${getIconDisplayName(name)}" ${COPY_KIND_LABEL[copyKind]} copied to clipboard`
      );
    } catch {
      toast.error(`Failed to copy ${name}`);
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/*
       * Says what this page does, rather than restating the title tag. A screen
       * reader lands on the search field next, so the heading should name that.
       */}
      <h1 className="sr-only">Search the Blode Icons library</h1>
      <div className="sticky top-0 z-10 mb-4 bg-background/85 py-4 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-3 px-4 sm:px-6 md:px-10">
          <Input
            autoFocus
            className="w-full rounded-full pl-10"
            leftAddon={
              <MagnifyingGlassIcon className="absolute top-1/2 left-4 size-4 -translate-y-1/2" />
            }
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={`Search ${iconCount.toLocaleString("en-US")} icons by name...`}
            ref={searchRef}
            type="search"
            value={searchQuery}
          />
          <div className="flex items-center gap-3">
            <Tabs
              onValueChange={(value) => setIconStyle(value as IconStyle)}
              value={iconStyle}
            >
              <TabsList className="h-10 rounded-full">
                <TabsTrigger className="rounded-full px-4" value="OUTLINE">
                  Outline
                </TabsTrigger>
                <TabsTrigger className="rounded-full px-4" value="SOLID">
                  Filled
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1100px] px-4 pb-12 sm:px-6 md:px-10">
        <div className="grid grid-cols-2 gap-2 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {visibleIcons.map((doc) => (
            <IconCell
              doc={doc}
              key={doc.slug}
              markup={
                markupBySlug.get(resolveVariant(doc, iconStyle).slug) ?? null
              }
              onCopy={handleIconCopy}
              style={iconStyle}
            />
          ))}
        </div>
        {filteredIcons.length === 0 ? (
          <p
            aria-live="polite"
            className="py-16 text-center text-muted-foreground text-sm"
          >
            {semantic.pending
              ? "Looking for icons by meaning..."
              : `No icons match "${searchQuery.trim()}".`}
          </p>
        ) : null}
        {visibleCount < filteredIcons.length ? (
          <div aria-hidden className="h-px w-full" ref={sentinelRef} />
        ) : null}
      </div>
      <Suspense fallback={null}>
        <IconPanelFromUrl
          markupBySlug={markupBySlug}
          onCopyName={(slug, name) => handleIconCopy(slug, name, "NAME")}
          onStyleChange={setIconStyle}
          style={iconStyle}
        />
      </Suspense>
    </>
  );
};

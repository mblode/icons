"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ICON_PARAM } from "@/lib/config";
import { copyIconContent } from "@/lib/conversion-events";
import { downloadSvg } from "@/lib/icon-download";
import { closeIconPanel } from "@/lib/icon-panel-url";
import {
  getAllSearchDocs,
  getIconDisplayName,
  preferredLucideAlias,
} from "@/lib/icon-search";
import { loadIconSource, loadIconSvgBatch } from "@/lib/icon-source";
import type { IconStyle, SearchDoc } from "@/lib/icon-types";
import { cn } from "@/lib/utils";
import ArrowInboxIcon from "@/src/icons-tsx/arrow-inbox";
import CheckIcon from "@/src/icons-tsx/check";
import XIcon from "@/src/icons-tsx/x";

const ICON_SUFFIX_REGEX = /Icon$/;
const FILLED_SUFFIX = "FilledIcon";

export const resolveVariant = (doc: SearchDoc, style: IconStyle) => {
  const solid = style === "SOLID" && doc.hasFilled;
  return {
    name: solid ? doc.name.replace(ICON_SUFFIX_REGEX, FILLED_SUFFIX) : doc.name,
    slug: solid ? `${doc.slug}-filled` : doc.slug,
  };
};

const COPIED_RESET_MS = 1500;

const SWAP =
  "col-start-1 row-start-1 flex items-center justify-center gap-1 transition-[opacity,scale,filter] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";
const SWAP_HIDDEN = "scale-75 opacity-0 blur-[2px]";

/**
 * A copy button's label that turns into a check once the copy lands, so the
 * confirmation shows on the control that was pressed instead of in a toast
 * across the screen. Both labels share one grid cell, which keeps the button
 * at the wider of the two widths: the row never reflows while it is showing.
 */
function CopyLabel({
  children,
  copied,
}: {
  children: React.ReactNode;
  copied: boolean;
}) {
  return (
    <span className="inline-grid">
      <span aria-hidden={copied} className={cn(SWAP, copied && SWAP_HIDDEN)}>
        {children}
      </span>
      <span aria-hidden={!copied} className={cn(SWAP, !copied && SWAP_HIDDEN)}>
        <CheckIcon aria-hidden="true" />
        Copied
      </span>
    </span>
  );
}

function Snippet({
  copied,
  label,
  onCopy,
  value,
}: {
  copied: boolean;
  label: string;
  onCopy: () => void;
  value: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">{label}</p>
        <Button onClick={onCopy} size="xs" variant="ghost">
          <CopyLabel copied={copied}>Copy</CopyLabel>
        </Button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-muted/50 p-3 font-mono text-xs">
        {value}
      </pre>
    </div>
  );
}

export function IconDrawer({
  doc,
  markup,
  onClose,
  onStyleChange,
  style,
}: {
  doc: SearchDoc;
  markup: string | null;
  onClose: () => void;
  onStyleChange: (style: IconStyle) => void;
  style: IconStyle;
}) {
  const { slug, name } = resolveVariant(doc, style);
  const displayName = getIconDisplayName(name);
  const alias = preferredLucideAlias(doc.lucideAliases);
  const importSnippet = `import { ${name} } from "blode-icons-react";`;
  const deepImport = `import ${name} from "blode-icons-react/icons/${slug}";`;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Which button last copied successfully. Keyed by slug too, so switching
  // icons or styles never shows a check for a copy of something else.
  const [copied, setCopied] = useState<{ key: string; slug: string } | null>(
    null
  );
  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(null), COPIED_RESET_MS);
    return () => clearTimeout(timer);
  }, [copied]);
  const isCopied = (key: string) => copied?.key === key && copied.slug === slug;

  // Failures still toast: there is no success state on the button to show,
  // and the reason matters more than where the eye is.
  const copyText = async (key: string, value: string) => {
    try {
      await copyIconContent(value, `copy-${key}`, "icon-drawer", slug);
      setCopied({ key, slug });
    } catch {
      toast.error(`Failed to copy ${key}`);
    }
  };

  // The fetch is handed to the clipboard still pending, as the grid does:
  // awaiting it first outlives the tap, and Safari then rejects the write.
  const copySource = async (copyKind: "SVG" | "TSX") => {
    const source = loadIconSource({ copyKind, iconName: slug }).then(
      (value) => {
        if (!value) {
          throw new Error(`No ${copyKind} for ${displayName}`);
        }
        return value;
      }
    );
    try {
      await copyIconContent(
        source,
        `copy-${copyKind.toLowerCase()}`,
        "icon-drawer",
        slug
      );
      setCopied({ key: copyKind, slug });
    } catch {
      toast.error(`Failed to copy ${displayName} ${copyKind}`);
    }
  };

  return (
    <>
      <button
        aria-label="Close icon details"
        className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] starting:opacity-0 motion-reduce:transition-none md:hidden"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-labelledby="icon-drawer-title"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col gap-5 overflow-y-auto rounded-t-2xl border border-border bg-background p-5 shadow-lg transition-[translate,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] starting:translate-y-full motion-reduce:transition-none md:inset-y-auto md:top-20 md:right-4 md:bottom-4 md:left-auto md:max-h-none md:w-[440px] md:rounded-2xl md:starting:translate-x-6 md:starting:translate-y-0 md:starting:opacity-0"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-medium text-lg" id="icon-drawer-title">
              {displayName}
            </h2>
            <p className="mt-1 font-mono text-muted-foreground text-xs">
              {name}
            </p>
          </div>
          <Button
            aria-label="Close"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="flex items-center justify-center rounded-2xl bg-muted/40 py-10">
          {markup ? (
            <div
              className="flex size-16 items-center justify-center [&_svg]:size-16"
              dangerouslySetInnerHTML={{ __html: markup }}
            />
          ) : (
            <div className="size-16 rounded-md bg-muted" />
          )}
        </div>

        {doc.hasFilled ? (
          <Tabs
            onValueChange={(value) => onStyleChange(value as IconStyle)}
            value={style}
          >
            <TabsList className="w-full rounded-full">
              <TabsTrigger className="flex-1 rounded-full" value="OUTLINE">
                Outline
              </TabsTrigger>
              <TabsTrigger className="flex-1 rounded-full" value="SOLID">
                Filled
              </TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => copySource("SVG")} size="sm" variant="outline">
            <CopyLabel copied={isCopied("SVG")}>Copy SVG</CopyLabel>
          </Button>
          <Button onClick={() => copySource("TSX")} size="sm" variant="outline">
            <CopyLabel copied={isCopied("TSX")}>Copy TSX</CopyLabel>
          </Button>
          <Button
            onClick={() => copyText("name", name)}
            size="sm"
            variant="outline"
          >
            <CopyLabel copied={isCopied("name")}>Copy name</CopyLabel>
          </Button>
          <Button
            disabled={!markup}
            onClick={() => markup && downloadSvg(slug, markup)}
            size="sm"
            variant="outline"
          >
            <ArrowInboxIcon aria-hidden="true" />
            Download
          </Button>
        </div>

        <div className="space-y-3">
          <Snippet
            copied={isCopied("import")}
            label="Import"
            onCopy={() => copyText("import", importSnippet)}
            value={importSnippet}
          />
          <Snippet
            copied={isCopied("deep-import")}
            label="Deep import"
            onCopy={() => copyText("deep-import", deepImport)}
            value={deepImport}
          />
        </div>

        {alias ? (
          <p className="text-muted-foreground text-sm">
            Lucide alias:{" "}
            <span className="font-mono text-foreground">{alias}</span>
          </p>
        ) : null}
      </aside>
    </>
  );
}

const docBySlug = new Map(getAllSearchDocs().map((doc) => [doc.slug, doc]));

/**
 * The panel for whatever `?icon=` names.
 *
 * Its own component so `useSearchParams` stays inside a small Suspense
 * boundary: read in the grid, it would pull the whole grid out of the
 * prerendered shell. A pasted link to a filled variant (`?icon=x-filled`)
 * opens the base icon with the Filled tab selected.
 */
export function IconPanelFromUrl({
  markupBySlug,
  onStyleChange,
  style,
}: {
  markupBySlug: Map<string, string>;
  onStyleChange: (style: IconStyle) => void;
  style: IconStyle;
}) {
  const param = useSearchParams().get(ICON_PARAM);
  const filledLink = param?.endsWith("-filled") ?? false;
  const doc = param
    ? (docBySlug.get(param) ??
      (filledLink ? docBySlug.get(param.slice(0, -"-filled".length)) : null))
    : null;

  useEffect(() => {
    if (doc && filledLink && doc.hasFilled) {
      onStyleChange("SOLID");
    }
  }, [doc, filledLink, onStyleChange]);

  const slug = doc ? resolveVariant(doc, style).slug : null;
  const cached = slug ? (markupBySlug.get(slug) ?? null) : null;

  // A pasted link can name an icon far below the first batch, so the grid has
  // not fetched its markup. Fetch just that one.
  const [fetched, setFetched] = useState<{ slug: string; markup: string }>();
  useEffect(() => {
    if (!slug || cached) {
      return;
    }
    let active = true;
    loadIconSvgBatch([slug])
      .then((batch) => {
        if (active && batch[slug]) {
          setFetched({ markup: batch[slug], slug });
        }
      })
      .catch(() => {
        // The panel keeps its placeholder; the actions still work by slug.
      });
    return () => {
      active = false;
    };
  }, [slug, cached]);

  if (!doc) {
    return null;
  }

  return (
    <IconDrawer
      doc={doc}
      markup={cached ?? (fetched?.slug === slug ? fetched.markup : null)}
      onClose={closeIconPanel}
      onStyleChange={onStyleChange}
      style={style}
    />
  );
}

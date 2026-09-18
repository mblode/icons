"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { asset } from "@/lib/config";
import { copyIconContent } from "@/lib/conversion-events";
import { downloadSvg } from "@/lib/icon-download";
import { getIconDisplayName, preferredLucideAlias } from "@/lib/icon-search";
import { loadIconSource } from "@/lib/icon-source";
import type { IconStyle, SearchDoc } from "@/lib/icon-types";
import ArrowDownWallIcon from "@/src/icons-tsx/arrow-down-wall";
import CircleXIcon from "@/src/icons-tsx/circle-x";

const ICON_SUFFIX_REGEX = /Icon$/;
const FILLED_SUFFIX = "FilledIcon";

export const resolveVariant = (doc: SearchDoc, style: IconStyle) => {
  const solid = style === "SOLID" && doc.hasFilled;
  return {
    name: solid ? doc.name.replace(ICON_SUFFIX_REGEX, FILLED_SUFFIX) : doc.name,
    slug: solid ? `${doc.slug}-filled` : doc.slug,
  };
};

function Snippet({
  label,
  onCopy,
  value,
}: {
  label: string;
  onCopy: () => void;
  value: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">{label}</p>
        <Button onClick={onCopy} size="xs" variant="ghost">
          Copy
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
  onCopyName,
  onStyleChange,
  style,
}: {
  doc: SearchDoc;
  markup: string | null;
  onClose: () => void;
  onCopyName: (slug: string, name: string) => void;
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

  const copyText = async (label: string, value: string) => {
    try {
      await copyIconContent(value, `copy-${label}`, "icon-drawer", slug);
      toast(`${label} copied to clipboard`);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

  const copySource = async (copyKind: "SVG" | "TSX") => {
    try {
      const value = await loadIconSource({ copyKind, iconName: slug });
      if (!value) {
        toast.error(`No ${copyKind} for ${displayName}`);
        return;
      }
      await copyIconContent(
        value,
        `copy-${copyKind.toLowerCase()}`,
        "icon-drawer",
        slug
      );
      toast(`${displayName} ${copyKind} copied to clipboard`);
    } catch {
      toast.error(`Failed to copy ${copyKind}`);
    }
  };

  return (
    <>
      <button
        aria-label="Close icon details"
        className="fixed inset-0 z-40 bg-black/40 md:hidden"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-labelledby="icon-drawer-title"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col gap-5 overflow-y-auto rounded-t-2xl border border-border bg-background p-5 shadow-lg md:inset-y-auto md:top-20 md:right-4 md:bottom-4 md:left-auto md:max-h-none md:w-[440px] md:rounded-2xl"
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
            <CircleXIcon className="size-4" />
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
            Copy SVG
          </Button>
          <Button onClick={() => copySource("TSX")} size="sm" variant="outline">
            Copy TSX
          </Button>
          <Button
            onClick={() => onCopyName(slug, name)}
            size="sm"
            variant="outline"
          >
            Copy name
          </Button>
          <Button
            disabled={!markup}
            onClick={() => markup && downloadSvg(slug, markup)}
            size="sm"
            variant="outline"
          >
            <ArrowDownWallIcon aria-hidden="true" />
            Download
          </Button>
        </div>

        <div className="space-y-3">
          <Snippet
            label="Import"
            onCopy={() => copyText("import", importSnippet)}
            value={importSnippet}
          />
          <Snippet
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

        <a
          className="text-sm underline-offset-2 hover:underline"
          href={asset(`/${doc.slug}`)}
        >
          Open full page
        </a>
      </aside>
    </>
  );
}

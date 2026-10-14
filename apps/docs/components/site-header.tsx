"use client";

import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { asset, basePath, siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

const DOC_PATHS = ["/installation", "/philosophy", "/concepts"];

export function SiteHeader() {
  const pathname = usePathname();
  const onDocs = DOC_PATHS.some((path) => pathname.startsWith(path));
  // Everything that is not a docs page is the icon grid, with or without a
  // panel open. Matching `/` exactly missed the zone root whenever the path
  // arrived as the empty string or with a trailing slash behind the rewrite.
  const onIcons = !onDocs;

  return (
    <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-3 px-4 pt-5 sm:px-6 md:px-10">
      {/*
        Raw anchors, so Next does not prefix `basePath` the way it would for
        `next/link`. Without `basePath`/`asset()` these escape the /icons zone
        and hit blode.co itself — `/installation` there is a 404.
      */}
      <a className="font-medium text-lg tracking-tight" href={basePath}>
        Blode Icons
      </a>
      <div className="flex items-center gap-2 sm:gap-3">
        <nav
          aria-label="Primary"
          className="inline-flex rounded-full bg-muted p-1"
        >
          <a
            aria-current={onIcons ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm",
              onIcons
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            href={basePath}
          >
            Icons
          </a>
          <a
            aria-current={onDocs ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm",
              onDocs
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            href={asset("/installation")}
          >
            Documentation
          </a>
        </nav>
        <a
          className="hidden text-muted-foreground text-sm underline-offset-2 hover:text-foreground hover:underline md:inline"
          href={siteConfig.links.github}
          rel="noopener noreferrer"
          target="_blank"
        >
          GitHub
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}

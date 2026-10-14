"use client";

import { ICON_PARAM } from "@/lib/config";

/**
 * The open panel lives in the URL (`?icon=slug`), written with the native
 * History API. Next.js syncs `pushState`/`replaceState` into `useSearchParams`
 * without a server round trip, which is the App Router's shallow update.
 *
 * History shape: opening the panel pushes one entry, switching icons while it
 * is open replaces it, so Back always closes the panel instead of stepping
 * through every icon looked at.
 */

// Whether this tab pushed the entry the panel is showing. If so, closing is a
// Back; if the panel came from a pasted link, there is nothing to go back to.
let pushedPanelEntry = false;

const urlWith = (slug: string | null) => {
  const url = new URL(window.location.href);
  if (slug) {
    url.searchParams.set(ICON_PARAM, slug);
  } else {
    url.searchParams.delete(ICON_PARAM);
  }
  return url;
};

export const openIconPanel = (slug: string) => {
  if (new URLSearchParams(window.location.search).has(ICON_PARAM)) {
    window.history.replaceState(null, "", urlWith(slug));
    return;
  }
  window.history.pushState(null, "", urlWith(slug));
  pushedPanelEntry = true;
};

export const closeIconPanel = () => {
  if (pushedPanelEntry) {
    pushedPanelEntry = false;
    window.history.back();
    return;
  }
  window.history.replaceState(null, "", urlWith(null));
};

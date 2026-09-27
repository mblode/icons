# blode-icons

SVG icon library with a React component package. Turborepo monorepo, Node 24.

- `packages/blode-icons-react`: React icon components, generated from `icons-svg/` and published to npm
- `apps/docs`: the docs site, served at `blode.co/icons`

## Commands

Run from the repo root.

- `npm install`: install; the `prepare` script installs the lefthook pre-commit hook
- `npm run build`: build the package, copy icons into the docs app, build the docs (`turbo run build`)
- `npm run dev`: docs dev server through portless at https://blode-icons.localhost:1355/icons
- `npm run lint`: `ultracite check` (Oxlint + Oxfmt)
- `npm run format`: `ultracite fix` over the whole repo; the pre-commit hook already fixes staged files
- `npm run check:types`: typecheck both workspaces (builds the package first)
- `npm run validate --workspace blode-icons-react`: slugs, filled siblings and `viewBox` of every SVG
- `npm run validate:icons-data --workspace blode-icons-react`: icon metadata in `icons-data/`
- `npm run changeset`: record a user-facing change to `packages/blode-icons-react`
- `npm run release`: build `blode-icons-react` and publish with changesets

## Verification

- A change is proven by the sequence CI runs, all passing on 27 Sep 2026 (4357 SVGs, 2221 metadata files, docs build): `npm run lint && npm run check:types && npm run validate --workspace blode-icons-react && npm run validate:icons-data --workspace blode-icons-react && npm run build`
- There are no unit or browser tests. For a docs UI change, open the `npm run dev` URL and check it by hand.
- Shape or cohort changes: run the cohort lint below. It is a measurement, not a gate.
- Gaps: no `verify` script (the CI sequence above is the de facto one), no `doctor` script (one would check Node 24 and the `../iconsmith-internal` checkout) and no feature map.

## Cohorts

`packages/blode-icons-react/icons-data/_cohorts.json` states which icons swap for each other, so they can be checked for a shared bounding box: a swap across disagreeing extents makes the icon jump in place. It maps a cohort name to its members; `#filled` keys are the filled style of the same family, which never swaps with the outline one. Keys prefixed `solo:` are single-member entries: a deliberate statement that an icon sharing a name prefix with a family is _not_ in it (`desk-lamp` is not a `desk-office` variant), because the checker infers a cohort from the name prefix for anything the file leaves out.

Membership is behavioural, not lexical: two icons are in one cohort when one replaces the other in the same UI slot (toggle states, enumerations, a status set sharing a container). A shared noun is not enough. Direction sets that are rotations of one glyph (`arrow-up`/`arrow-left`) are left out on purpose: their x and y extents transpose, which the per-axis check reads as disagreement.

The checker is iconsmith (formerly icon-forge), which is not on npm. It needs a sibling checkout of `mblode/iconsmith-internal`. It exits 1 while any error exists, which is normal:

```bash
npx tsx ../iconsmith-internal/packages/iconsmith/src/cli.ts lint \
  --dir packages/blode-icons-react/icons-svg \
  --cohorts packages/blode-icons-react/icons-data/_cohorts.json
```

`npm run audit --workspace blode-icons-react` compares the same measurements with `audit-baseline.json`. Its default `npx --package=icon-forge` 404s, so set `FORGE="npx tsx ../../../iconsmith-internal/packages/iconsmith/src/cli.ts"`.

## Gotchas

- IMPORTANT: `npm run release` only builds `blode-icons-react` (`--filter=blode-icons-react`), not the docs app.
- `npm run build`, `check:types` and `dev` regenerate `apps/docs/src/icons-tsx/`, `icons-svg/`, `icons-data/`, `icons-metadata.json` and `icons-search-index.json` from the package's `src/` via `scripts/copy-icons.mjs`. These are untracked and gitignored, so a clean build leaves `git status` empty; don't commit them.
- In a git worktree, turbo reuses the main checkout's local cache. If `check:types` reports `Cannot find module 'blode-icons-react'`, a cache hit restored the package without `dist/`; run `npx turbo run build --filter=blode-icons-react --force`.
- `apps/docs/AGENTS.md` is the Next.js agent-rules block that `next dev` rewrites on start. Leave it as Next writes it.

## Agent skills

`skills/blode-icons-react/SKILL.md` covers import paths, Lucide-compatible aliases, `DynamicIcon` naming and release conventions. Read it before changing exports or docs examples. Consumers install it with `npx skills add mblode/icons`.

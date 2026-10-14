# blode-icons-react

React icon components generated from `../../icons-svg/` and `../../icons-data/`, published to npm as `blode-icons-react`. Run these from this directory (or `npm run <script> --workspace blode-icons-react` from the repo root).

## Commands

- `npm run build`: regenerates `src/` from `icons-svg/`, appends Lucide aliases, compiles to `dist/`
- `npm run check:types`: `tsc --noEmit` over `src/` plus the build scripts
- `npm run validate`: checks every SVG's slug, filled sibling and `viewBox`
- `npm run validate:icons-data`: checks `icons-data/` metadata (categories, concepts)
- `npm run verify:lucide-mapping`: dry-run scoring of Lucide-name pairs against `scripts/lucide-mapping.ts`; pass `--apply` to rewrite it (not verified here)

Not verified here: `lint`/`format:check` (both currently fail on a pre-existing `oxc(approx-constant)` finding in `scripts/lucide-mapping.ts`, unrelated to this change) and `audit` (needs a sibling `mblode/iconsmith-internal` checkout with its own `npm install`, per the root `AGENTS.md` Cohorts section).

## Boundary

- Exports (see `package.json` `exports`): the barrel `.` (all icon components + Lucide aliases), `./icons/*` (one component per icon, for tree-shaking), `./dynamic` (`DynamicIcon`), `./dynamicIconImports` (the name → lazy-import map `DynamicIcon` uses)
- Consumers: `apps/docs` depends on it as a workspace package (`"blode-icons-react": "*"`) and imports from the public entry points above; nothing else in the repo imports it
- It has no runtime `dependencies`, only a `react >=16.8.0` peerDependency — never add a dependency on `apps/docs`, another workspace, or any other UI framework
- `src/` and `dist/` are generated and gitignored; never hand-edit files there, edit `icons-svg/`, `icons-data/`, or `scripts/` instead

See the root `AGENTS.md` for repo-wide conventions (npm workspaces, changesets, running from root).

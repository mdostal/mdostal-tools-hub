# Project CONTEXT

The router behind tools.mdostal.com -- lists every live personal tool and proxies
each one's mount path to its own independently-deployed Vercel project.

## Terminology

- **Tool** — a single entry in the landing page's directory: a `ToolEntry` sourced
  from the Sanity "tool" document type. Has a `mount` (URL path segment), `label`,
  `description`, `originUrl` (its own live deployment), `repoUrl`, optional
  `pagesUrl` (GitHub Pages site), and a `live` flag.
- **Framework card** — a tool entry with a `components[]` list (e.g. Drone
  Components/drone-hub), rendered as a wider "featured" card instead of the
  standard single-purpose tool card. See `src/app/page.tsx`.
- **Multi-zone routing** — Vercel's pattern (see README) for proxying a subpath
  to a completely independent Vercel deployment. Each tool's own `next.config.ts`
  sets `basePath` matching its `mount`; this hub's `next.config.ts` generates the
  `rewrites()` rules from `getTools()`.
- **live vs. preview-only** — `live: true` means the tool's `basePath` support is
  verified working end-to-end and gets a real rewrite + "Open →" button proxying
  `/<mount>` to `originUrl`. `live: false` always shows a "Preview only" badge
  (`LiveBadge`, keyed only on `tool.live`, unaffected by which button state
  below applies), and its primary button is a two-way fallback:
    - **`pagesUrl` set** (the tool has a real GitHub Pages site, just not its
      own live deployment) — "View →" button, also linking `/<mount>`, proxied
      by `next.config.ts`'s second rewrite tier straight to `pagesUrl` instead
      of `originUrl`. That tier normalizes `pagesUrl`'s trailing slash (stored
      formatting isn't schema-enforced) and additionally registers a rewrite
      keyed on the Pages URL's own real-case path segment (`new
      URL(pagesUrl).pathname`), not just the lowercased `mount` --
      `scripts/crawl-github-repos.mjs`'s `slugify()` always lowercases, but
      GitHub Pages preserves exact repo-name case, so a mixed-case repo (e.g.
      a future `iosDiceRoller`) needs that real-case entry or its own proxied
      page's asset requests 404. The two tiers are mutually exclusive by
      construction (`live` vs. `!live && pagesUrl`) -- a tool is never routed
      by both.
    - **no `pagesUrl`** (nothing deployed anywhere) — "Download latest
      release ↓", linking `${repoUrl}/releases/latest`, the true fallback.
  See `.pHive/epics/tool-routing-and-grouping/docs/design-discussion.md` §3
  part A for the full rewrite pseudocode and reasoning.
- **GitHub crawler** — `scripts/crawl-github-repos.mjs`, which scans all public repos
  under the `mdostal` GitHub account, pulls README + metadata, and proposes new
  Sanity tool entries for human approval (suggest-then-approve, never auto-publish).
  Suggestions are written to a distinct `tool-suggestion-<mount>` `_id` namespace,
  never `tool-<mount>` (the curated/real namespace), so a crawler run can never
  collide with or overwrite a real published tool doc. Writes are create-only: if
  `tool-suggestion-<mount>` already exists (e.g. from a prior run, possibly hand-edited
  in Studio since), the script skips it rather than overwriting. Runs daily via
  `.github/workflows/crawl-github-repos.yml` (also manually triggerable from the
  Actions tab). `EXCLUDED_REPOS` in the script is the denylist for repos that
  pass the mechanical filters but aren't tools (e.g. the GitHub profile-README
  repo). Defaults to a dry-run that only prints a summary table; `--write` is
  required to actually create
  documents.

## Key paths

- `src/lib/site-config.ts` — every deployment-specific value (GitHub account
  to crawl, hero copy, nav/support links, footer) read from env vars with
  generic fallback defaults. Nothing in `src/` or `scripts/` should hardcode
  this deployment's identity directly -- see `.env.example` and README.md's
  "Forking this for your own GitHub" section.
- `src/lib/tools.ts` — `getTools()`: the single data-fetch function used by BOTH
  the landing page and `next.config.ts`'s rewrite generator. Fetches from Sanity,
  falls back to hardcoded `FALLBACK_TOOLS` on any failure.
- `src/lib/sanity.ts` — read-only Sanity client + `allToolsQuery`. Never holds a
  write token; only `scripts/migrate-tools-to-sanity.mjs` does (via `SANITY_API_WRITE_TOKEN`
  env var).
- `next.config.ts` — multi-zone rewrite rules, generated from `getTools()` at
  build time.
- `src/app/page.tsx` — the landing page. `Home` fetches `getTools()`, computes
  two ordered groups by partitioning on `tool.live` (`"Live"`, then
  `"Preview"`, each preserving `TOOLS`'s existing Sanity-`sortOrder` relative
  order -- not re-sorted), and renders them via `GroupedToolSections`.
- `src/app/GroupedToolSections.tsx` — reusable grouping/section component
  (added for the Live/Preview split, horizontal-plan.md layer 3). Contract:
  accepts a single prop, an ordered `{ title: string, tools: ToolEntry[] }[]`
  array -- the component itself has no notion of "Live"/"Preview" or any
  other grouping scheme; that partition is entirely the caller's decision
  (`src/app/page.tsx`'s `Home`). For each group with at least one tool, it
  renders a labeled `<h2>` heading (same typographic scale as the page's
  other section headings, e.g. the "Support" heading) followed by the
  existing 2-column grid (`grid grid-cols-1 gap-5 sm:grid-cols-2`), mapping
  each tool through the same unchanged `tool.components ? <FrameworkCard
  .../> : <ToolCard .../>` branch (moved here from `page.tsx`, not
  duplicated). A group with zero tools renders nothing at all for that group
  -- no heading, no empty grid. Also owns `LiveBadge` and
  `OpenAndSourceLinks` (moved here alongside `ToolCard`/`FrameworkCard`,
  since only those two cards use them). Adding a future third section (e.g.
  "Archived") is a data change in `page.tsx`'s `Home`, not a code change
  here. Deliberately static/server-rendered only -- no collapse/expand,
  animation, or client-side state (see horizontal-plan.md layer 3's
  explicit non-goals). See
  `.pHive/epics/tool-routing-and-grouping/docs/behavior-specs-slice-2.md`
  for the full Given/When/Then spec this was built against.
- `scripts/migrate-tools-to-sanity.mjs` — one-time/idempotent bootstrap script that
  seeds Sanity tool docs via `createOrReplace` on a fixed, hand-maintained list keyed
  by `tool-<mount>`. Structural precedent (ESM script, `@sanity/client`, env-var-only
  credentials) for `scripts/crawl-github-repos.mjs`, but NOT an upsert-semantics
  precedent for it: the crawler deliberately does not reuse this script's
  upsert-across-runs behavior — it writes to the separate `tool-suggestion-<mount>`
  namespace and is create-only there (checks existence first, skips rather than
  overwrites), so a re-run never clobbers a human's in-progress edit to a suggestion.
- `scripts/crawl-github-repos.mjs` — scans public `mdostal` repos and writes
  `tool-suggestion-<mount>` Sanity docs (`hidden: true`, `live: false`) for human
  review. See the "GitHub crawler" glossary entry above for its write semantics.
- `DESIGN-BRIEF.md` — brand tokens + layout spec shared with sibling sites
  (mdostal.com, life.mdostal.com).

## Conventions

- Adding a tool today = a Sanity Studio publish, not a code change (see README).
- The Sanity "tool" document type is the single source of truth; `FALLBACK_TOOLS`
  in `src/lib/tools.ts` is a safety net snapshot, not a second source to hand-sync.
- No test suite exists in this repo (`test_absence: true` in project-profile.yaml).
- Commits are short, imperative, present-tense; direct to `main`, no feature branches.
- This repo is PUBLIC on GitHub — see the `secrets-hygiene` cross-cutting concern
  in `.pHive/cross-cutting-concerns.yaml`.

## Canonical references

- `README.md` — multi-zone pattern + "how a tool gets added" workflow.
- `DESIGN-BRIEF.md` — brand/layout spec for the landing page.
- `.pHive/project-profile.yaml` — full discovery profile, north star, and the
  GitHub-crawler scope captured during kickoff (2026-08-13).
- `.pHive/cross-cutting-concerns.yaml` — secrets hygiene + multi-zone routing
  safety checks that apply across stories.

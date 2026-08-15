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
  verified working end-to-end and gets a real rewrite + "Open" button. `live: false`
  shows a "Preview only" badge and falls back to linking the GitHub releases page.
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

- `src/lib/tools.ts` — `getTools()`: the single data-fetch function used by BOTH
  the landing page and `next.config.ts`'s rewrite generator. Fetches from Sanity,
  falls back to hardcoded `FALLBACK_TOOLS` on any failure.
- `src/lib/sanity.ts` — read-only Sanity client + `allToolsQuery`. Never holds a
  write token; only `scripts/migrate-tools-to-sanity.mjs` does (via `SANITY_API_WRITE_TOKEN`
  env var).
- `next.config.ts` — multi-zone rewrite rules, generated from `getTools()` at
  build time.
- `src/app/page.tsx` — the landing page: tool grid, `LiveBadge`, `OpenAndSourceLinks`.
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

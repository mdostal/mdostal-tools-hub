# Research Brief: GitHub Repo Crawler

Epic: `github-repo-crawler` · Target codebase: `mdostal-tools-hub` (+ read-only lookups against the sibling `personal-site` Sanity schema)

## Requirement

Scan all public repos under the `mdostal` GitHub account, pull README + metadata for
each, and write suggested Sanity `tool` documents for human review/approval — never
auto-publish. v1 scope: this GitHub account only. Captured during kickoff
(`.pHive/project-profile.yaml → north_star.github_crawler_scope`).

## Existing patterns to follow

- **`scripts/migrate-tools-to-sanity.mjs`** — the direct precedent. One-time/re-runnable
  Node script using `@sanity/client`'s `createOrReplace` with a deterministic `_id`
  (`tool-<mount>`), reading `NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET`
  / `SANITY_API_WRITE_TOKEN` from `process.env`, never hardcoded. The crawler script
  should live at the same level (`scripts/`) and follow the same env-var/token pattern.
- **`src/lib/tools.ts` `ToolEntry` interface** — the target shape: `mount`, `label`,
  `description`, `originUrl`, `repoUrl`, optional `pagesUrl`, `live`, `screenshot`,
  optional `components[]`.
- **`src/lib/sanity.ts` `allToolsQuery`** — filters `hidden != true`. This is the existing
  review mechanism already in the schema (see below) — not something new to build.

## Sanity `tool` schema (read from `/Users/mdostal/Code/personal-site/sanity/schemas/tool.ts`,
## origin/main tip, commit `f25b1e3`)

Required fields: `label`, `mount` (slug), `description`, `originUrl` (url),
`repoUrl` (url), `screenshot` (image, "a real screenshot ... never a mockup").
Optional: `pagesUrl`, `components[]`, `sortOrder`.

Two fields already exist that are exactly the suggest-then-approve mechanism the
requirement asks for:
- **`hidden`** (boolean, default `false`) — "Same pattern as Case Study's hidden flag:
  build/review here before it goes live." Docs with `hidden: true` are excluded from
  `allToolsQuery` (`hidden != true`) but visible in Studio for review.
- **`live`** (boolean, default `false`) — separately controls whether a rewrite is
  generated and the card shows "Open" vs. a releases-page fallback link.

**Consequence:** no schema change is needed in `personal-site`. The crawler can create
suggestion documents with `hidden: true, live: false` using fields that already exist,
and the review/approval step is: open Sanity Studio, review, uncheck `hidden` (and fill
in `screenshot`, correct `originUrl` if needed) when ready to go live. This keeps the
whole feature single-repo (`mdostal-tools-hub`), which shrinks the original scope
significantly from what the north-star note assumed.

**Validation caveat:** `Rule.required()` is Studio-side, not a content-lake write
constraint — the API-level `createOrReplace` will happily write a doc missing
`originUrl`/`screenshot`; Studio will just show it as invalid until a human fills those
in. This is compatible with (in fact, exactly matches) the suggest-then-approve intent:
a suggestion doc is *expected* to be incomplete until reviewed.

## GitHub REST API — live data pulled via `gh api users/mdostal/repos --paginate`

26 repos currently on the account. Key signals per repo: `name`, `description`,
`fork` (bool), `archived` (bool), `homepage`, `topics`.

- **9 of 26 are forks** (`bluemix-cloud-connectors`, `competitive-programming`,
  `ionic_test`, `JavaScript-API`, `jitsi-meet`, `mcpelauncher-extract`,
  `mcpelauncher-manifest`, `SmartThingsPublic`, `plugin-hive-fork`) — none of these are
  Mathew's own tools.
- **4 are already-listed live tools** (`allergy-locator`, `mapstack-us`,
  `medical-study-tracker`, `drone-hub`) — already represented in `FALLBACK_TOOLS` /
  Sanity, must not be re-suggested or (worse) overwritten.
- **This repo itself** (`mdostal-tools-hub`) and the Hive plugin fork are not "tools" in
  the directory sense and must self-exclude.
- **`homepage` is a strong `originUrl` signal**: all 4 known-live tools have their
  `originUrl` set verbatim as the repo's GitHub `homepage` field
  (e.g. `allergy-locator` → `https://allergy-locator.vercel.app`). This repo's own
  `homepage` is `https://mdostal-tools-hub.vercel.app`, confirming the pattern holds
  project-wide, not just for these 4.
- Remaining non-fork, non-listed repos split into two groups:
  - **Real candidates with a description** (`gigradar`, `human-review`, `rolodex`,
    `coin-finder`) — no `homepage` set, so `originUrl` would be unknown/blank for these
    (not deployed, or deployed without setting the GitHub "website" field).
  - **No-signal repos** (`description: null`, no `homepage`) — `ClusterExample`,
    `Example`, `Fractalizations`, `hermes-chat`, `iosDiceRoller`, `ReactSample`, `test`,
    `Test-MVP`, `thoughtful`. Nothing to build a plausible suggestion from.

## GitHub API rate limits

Unauthenticated: 60 requests/hour/IP. A full v1 crawl = 1 request to list repos
(paginated, single page at current repo count) + up to ~1 README request per
non-excluded candidate (well under 20 today) → comfortably under the unauthenticated
limit for occasional runs, but tight for repeated dev-loop re-runs or if the account's
repo count grows. Authenticated (any PAT, even with no scopes, for public data):
5,000 requests/hour. Recommend an optional `GITHUB_TOKEN` env var, same
never-hardcode/process.env pattern as `SANITY_API_WRITE_TOKEN` — required for comfort,
not for v1 correctness at current scale.

## Validation note

No context7/library-doc lookup was needed — `@sanity/client` is already a dependency
(`package.json`) and its `createOrReplace` API is already exercised by
`scripts/migrate-tools-to-sanity.mjs`. GitHub REST API behavior (rate limits, repo
list/readme endpoints, `fork`/`archived`/`homepage`/`topics` fields) was verified
directly against the live account via `gh api`, not from memory — confidence: high.

## Risk signals surfaced (feed into grill / design discussion §4)

- Idempotent re-run must never overwrite a human-curated existing tool doc (the
  migrate script's `createOrReplace`-by-deterministic-ID pattern is safe for *seeding*
  known tools but dangerous if blindly reused for *ongoing* crawls of doc IDs a human
  may since have hand-edited).
- No screenshot can be auto-generated — schema calls for "a real screenshot ... never
  a mockup," which is fundamentally a human step.
- Exclusion heuristic (forks/archived/self/no-signal) is a judgment call with no single
  "correct" answer — needs an explicit, inspectable rule set, not vibes.

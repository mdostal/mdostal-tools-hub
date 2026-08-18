# Research Brief: GitHub Pages Fallback Routing + Tool Grouping UI

Epic: `tool-routing-and-grouping` · Target codebase: `mdostal-tools-hub` (+ a schema
addition in the sibling `personal-site` Sanity project, same pattern as the `icon`
field added earlier).

## Requirement

1. When a tool isn't `live` (no deployed app with matching `basePath`) but has a
   `pagesUrl` (GitHub Pages site), forward `tools.mdostal.com/<mount>` to that Pages
   site instead of only offering "Download latest release."
2. A landing-page UI treatment for grouping/nesting related tools (e.g. the
   "Pantheon" family: portunus, mnemosyne, minerva, heimdall) so the page stays
   navigable as more of the ~50 candidate repos come online this month.

## Current routing mechanism (`next.config.ts`)

```ts
async rewrites() {
  const tools = await getTools();
  return tools.filter((t) => t.live).flatMap((tool) => [
    { source: `/${tool.mount}`, destination: `${tool.originUrl}/${tool.mount}` },
    { source: `/${tool.mount}/:path*`, destination: `${tool.originUrl}/${tool.mount}/:path*` },
  ]);
},
```

Only `live: true` tools get a rewrite at all. `live: false` tools render a
"Preview only" card with a "Download latest release" CTA (`src/app/page.tsx`'s
`OpenAndSourceLinks`) and no route — visiting `/<mount>` 404s.

**Critical constraint on the existing pattern:** the destination is
`${originUrl}/${mount}`, not just `${originUrl}` — because the child app was built
with `basePath: "/<mount>"` (documented in `tools.ts`'s own header comment), so its
internal asset/link paths already expect to be served under that path prefix. This
is what makes the proxy transparent: the child app doesn't know it's being proxied.

## Real current data (live Sanity query, not assumption)

| Tool | live | pagesUrl set? | mount == repo name? |
|---|---|---|---|
| allergy-locator | true | yes | yes |
| mapstack (repo: mapstack-us) | true | yes | **no** |
| framework (repo: drone-hub) | true | yes | **no** |
| study-tracker (repo: medical-study-tracker) | true | yes | **no** |
| coin-finder | false | yes | yes |
| gigradar | false | yes | yes |
| rolodex | false | yes | yes |
| cleanup-tools, portunus | false | not yet set | yes (crawler-derived) |
| 6 held-back suggestions | false | not set | yes (crawler-derived) |

**This is the key finding for the routing feature.** Every `live: false` tool's
`mount` is crawler-derived and therefore always equals its GitHub repo name exactly
(`scripts/crawl-github-repos.mjs`'s `humanizeLabel`/slug derivation never
introduces a mismatch). Every `live: true` tool's `mount` was hand-picked and in
3 of 4 cases does NOT match the repo name (`mapstack` for `mapstack-us`, etc.) —
but that's irrelevant to the Pages fallback, since those tools are already `live`
and never fall into the pagesUrl-fallback tier.

## GitHub Pages asset-path risk (the concern flagged in the request)

A GitHub Pages site at `https://mdostal.github.io/<repo>/` is built assuming it's
served from exactly that path -- its own internal absolute asset paths (JS/CSS
`<script src>`/`<link href>`) are written relative to `/repo/`, matching the
Pages URL structure itself. Forwarding `tools.mdostal.com/<mount>/*` to
`https://mdostal.github.io/<repo>/*` only produces correct asset resolution in the
proxied page's HTML when `mount === repo` exactly -- the Pages site was never built
with a configurable `basePath` the way this hub's live multi-zone tools are (that's
a Next.js/Vercel-specific convention this hub's own README documents for tool
authors; GitHub Pages has no equivalent).

Confirmed via the data above: this constraint is **already satisfied for every
live:false tool today** (mount is always crawler-derived == repo name), and is
irrelevant for live:true tools (they don't use this fallback tier). The constraint
only becomes a real risk if a human later hand-edits a `live: false` tool's `mount`
in Studio to something that doesn't match its repo name while leaving `pagesUrl`
set -- worth a one-line Studio field description warning, not a code-level guard
(the schema has no way to validate against an external GitHub repo name at
save time).

## Sanity schema (`personal-site/sanity/schemas/tool.ts`, unchanged since `icon`
## field added, verified via `git log`)

Fields relevant to this epic: `mount` (slug), `pagesUrl` (url, optional),
`live` (boolean), `hidden` (boolean). No `group`/`parent`/`category` field exists.

## Landing page structure (`src/app/page.tsx`)

Single `<section>` with `grid grid-cols-1 sm:grid-cols-2 gap-5`. Every tool maps to
either `<ToolCard>` (standard) or `<FrameworkCard>` (when `tool.components` is set,
full-width). No existing grouping/sectioning concept. Currently 9 tools total (4
live + 5 visible suggestions: coin-finder, gigradar, rolodex, plus cleanup-tools
and portunus just added, both still hidden). Per the request, several upcoming
repos (portunus, mnemosyne, minerva, heimdall) share a "Pantheon" family identity
-- `scripts/readme-sync/taglines.json` already documents this shared identity in
its own taglines (e.g. `portunus`: "A secret broker that finds secrets by metadata
and injects them -- without them ever touching your LLM").

## Validation note

No context7/external library lookup needed -- both changes are within already-used
tech (Next.js rewrites, Sanity schema fields, Tailwind grid). The GitHub Pages
asset-path risk was verified by checking real repo `mount` vs. name data directly,
not asserted from general knowledge.

## Risk signals surfaced (feed into grill / design discussion)

- A future hand-edit in Studio could set a `live: false` tool's `mount` to
  something other than its repo name while `pagesUrl` is set, silently breaking
  asset resolution for that one tool (not a systemic risk, a per-tool one).
- The grouping data model choice (a flat `group: string` field vs. a proper
  reference/taxonomy) trades simplicity for future flexibility -- worth an
  explicit call, not a default.

# Behavior Specs — Slice 1: GitHub Pages Fallback Routing

Source: design-discussion.md §3 part A (rewrite pseudocode) and §4 (mixed-case
and trailing-slash risks, now required fixes not optional polish).

Fixtures below are real, queried directly from Sanity (project `dafshiq1`,
dataset `production`) on 2026-08-18 via the `allToolsQuery` shape, not
guessed:

```
live: false, pagesUrl set (routing-fallback candidates):
  coin-finder  -> pagesUrl: https://mdostal.github.io/coin-finder/
  gigradar     -> pagesUrl: https://mdostal.github.io/gigradar/
  rolodex      -> pagesUrl: https://mdostal.github.io/rolodex/
  (all three: originUrl is null -- they have nothing else to route to today)

live: true (regression-check fixtures):
  allergy-locator -> originUrl: https://allergy-locator.vercel.app
  mapstack        -> originUrl: https://mapstack-us.vercel.app
  framework       -> originUrl: https://drone-hub-rust.vercel.app  (FrameworkCard)
  study-tracker   -> originUrl: https://medical-study-tracker-seven.vercel.app

Note: no currently-published tool has BOTH live:false AND no pagesUrl, so
AC4's true-fallback ("Download latest release") is exercised today only by
tools not yet routing-relevant. Spec it against the general rule (tool.live
!== true && !tool.pagesUrl), not a named current fixture.
```

---

## AC1 — pagesUrl-fallback tool resolves to real Pages content, not 404/download page

**Given** a published tool doc has `live: false` and a non-empty `pagesUrl`
(e.g. `coin-finder`, `pagesUrl: https://mdostal.github.io/coin-finder/`)
**When** a visitor requests `https://tools.mdostal.com/coin-finder` (and any
sub-path, e.g. `/coin-finder/some/asset.js`)
**Then** the response is the real content proxied from
`https://mdostal.github.io/coin-finder/` (and the matching sub-path) — not a
404, and not this hub's own `/coin-finder` route rendering nothing (there is
no such route today, so absent the new rewrite this would 404).

**Given** the same fixture
**When** the response body is inspected
**Then** it does NOT match this hub's own landing-page shell (no
`siteConfig.siteName`/hero markup) — i.e. it's provably the child site's own
HTML, not tools-hub content served under a matched path.

Repeat identically for `gigradar` -> `https://mdostal.github.io/gigradar/`
and `rolodex` -> `https://mdostal.github.io/rolodex/`.

---

## AC2 — card button text and href for the same fallback tier

**Given** `coin-finder` (`live: false`, `pagesUrl` set)
**When** its card renders on the landing page
**Then** the primary button reads exactly `View →` (not `Open →`, not
`Download latest release ↓`)
**And** its `href` is `/coin-finder` (the mount path, routed through the new
rewrite tier from AC1 — NOT a direct link to the raw
`https://mdostal.github.io/coin-finder/` URL; that continues to be the
separate "Site page" secondary link that already exists).
**And** the button keeps the same primary (`bg-accent`) visual styling as the
live-tier "Open →" button — this is a copy change only, not a new visual
tier.

Repeat identically for `gigradar` and `rolodex`.

---

## AC3 — live-tier tools: byte-identical regression check

**Given** a tool with `live: true` (e.g. `allergy-locator`, `mapstack`,
`study-tracker`, `framework`)
**When** its card renders and its routes resolve
**Then**:
- the primary button text is exactly `Open →` (unchanged)
- the button `href` is `/${mount}` (unchanged)
- the underlying rewrite destination is still
  `${originUrl}/${mount}` and `${originUrl}/${mount}/:path*` (unchanged —
  this is the existing `tools.filter((t) => t.live).flatMap(...)` block in
  `next.config.ts`, which this slice must not modify)
- `study-tracker` and `framework` both ALSO have a non-empty `pagesUrl`
  today — confirms `live: true` takes precedence and short-circuits the new
  fallback tier entirely for those two; they must not pick up a `View →`
  button or a second/duplicate rewrite entry from the new tier.

This is a pure regression check: diff the rendered HTML and the effective
rewrite table for these four tools against pre-change behavior; any
difference is a failure, no matter how small.

---

## AC4 — true fallback: neither live nor pagesUrl

**Given** a tool with `live: false` (or `live` unset/falsy) and no
`pagesUrl` (`pagesUrl` empty string, null, or field absent)
**When** its card renders
**Then** the primary button reads exactly `Download latest release ↓`,
`href` is `${repoUrl}/releases/latest`, `target="_blank"`, `rel="noreferrer"`
— unchanged from current behavior.
**And** no rewrite entries are generated for this tool in either tier (no
`/${mount}` route exists at all — a direct visit 404s, which is correct/
unchanged, since there is nothing to route to).

No currently-published tool matches this fixture exactly (all three
`live:false` tools today have `pagesUrl` set) — verify this against the
general condition (`!tool.live && !tool.pagesUrl`) using either a temporary
Studio edit/test doc or a unit-level check on the branch logic, not a named
production fixture.

---

## AC5 — pagesUrl trailing-slash normalization (real bug, not hypothetical)

**Given** a tool's stored `pagesUrl` value ends WITHOUT a trailing slash
(synthetic input — no current fixture has this shape, since every
production `pagesUrl` today happens to already end in `/`; the Sanity
schema does not enforce a trailing slash, so this is a realistic future
hand-entry, e.g. someone pastes `https://mdostal.github.io/coin-finder`)
**When** the rewrite table is built
**Then** the computed `pagesBase` is `https://mdostal.github.io/coin-finder/`
— exactly one `/` separator between the host path and any appended
`:path*`, never zero (`.../coin-finderfoo`) and never two
(`.../coin-finder//foo`).

**Given** a tool's stored `pagesUrl` ends WITH one or more trailing slashes
(e.g. `https://mdostal.github.io/coin-finder/` — today's real shape — or a
pathological `https://mdostal.github.io/coin-finder///`)
**When** the rewrite table is built
**Then** `pagesBase` is still exactly
`https://mdostal.github.io/coin-finder/` (collapsed to one trailing slash,
not accumulated) — verifying the `.replace(/\/+$/, "") + "/"` normalization
strips ALL trailing slashes before re-adding exactly one, not just one.

**Then** in both cases, the three generated rewrite entries' destinations
(`pagesBase`, `${pagesBase}:path*` x2) are byte-identical regardless of
which of the three input shapes (no slash / one slash / multiple slashes)
produced them — normalization output must be a pure function of the
"real" URL, not of incidental stored formatting.

---

## AC6 — mixed-case repo name: real-case rewrite entry (synthetic, rewrite-table-level)

**Given** `scripts/crawl-github-repos.mjs`'s `slugify()` always lowercases
(confirmed: `repoName.toLowerCase()` is the first transform, `scripts/
crawl-github-repos.mjs` lines ~199-206) — so a repo named `iosDiceRoller`
gets `mount: "iosdiceroller"` — while its real GitHub Pages URL preserves
exact case: `https://mdostal.github.io/iosDiceRoller/`
(`new URL(pagesUrl).pathname === "/iosDiceRoller/"`)
**When** the rewrite table is built for a synthetic tool doc shaped like:
```
{ mount: "iosdiceroller", live: false,
  pagesUrl: "https://mdostal.github.io/iosDiceRoller/" }
```
**Then** the rewrite table contains ALL THREE of:
1. `{ source: "/iosdiceroller", destination: "https://mdostal.github.io/iosDiceRoller/" }`
2. `{ source: "/iosdiceroller/:path*", destination: "https://mdostal.github.io/iosDiceRoller/:path*" }`
3. `{ source: "/iosDiceRoller/:path*", destination: "https://mdostal.github.io/iosDiceRoller/:path*" }`
   — keyed on the Pages URL's OWN real-case path segment
   (`new URL(tool.pagesUrl).pathname`), not the lowercased `mount`.

**And** for a control case where the repo name IS already all-lowercase
(e.g. `coin-finder`, `pagesUrl: https://mdostal.github.io/coin-finder/`),
entries 2 and 3 above are identical strings (`/coin-finder/:path*` both
times) — confirming entry 3 is a harmless no-op duplicate in the common
case, not a behavior change for any of today's three real fallback tools.

**Note on testability:** none of the three real mixed-case-named repos
(`ClusterExample`, `ReactSample`, `iosDiceRoller`) are unhidden/published
today, so AC6 cannot be verified end-to-end against a live route (no such
`/iosDiceRoller` mount exists to curl). Verify this spec against the
rewrite-table-building function directly (unit-level: call the
table-building logic with the synthetic input above and assert on its
return value), not via an HTTP request.

---

## Cross-cutting: "Preview only" badge unaffected

**Given** any tool with `live: false` (`coin-finder`, `gigradar`, `rolodex`,
or the AC4 no-pagesUrl case)
**When** its card renders, regardless of which primary-button state applies
(`View →` per AC2, or `Download latest release ↓` per AC4)
**Then** the `LiveBadge` still renders "Preview only" — badge logic is keyed
only on `tool.live`, untouched by this slice, and continues to be the single
source of truth for deployment status independent of which button is
shown.

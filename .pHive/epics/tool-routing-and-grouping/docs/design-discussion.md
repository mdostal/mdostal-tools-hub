# Design Discussion: GitHub Pages Fallback Routing + Tool Grouping UI

## 1. What Are We Doing?

Two related but separable pieces:

**(A) Routing:** `coin-finder`, `gigradar`, and `rolodex` are visible on the
landing page right now with a "Preview only" badge and a "Download latest
release" button — even though all three already have a real, live GitHub Pages
site (`pagesUrl` is set on all three). We should forward `tools.mdostal.com/<mount>`
to that Pages site instead, the same way `live: true` tools get forwarded to their
own Vercel deployment. "Done" means: visiting `/coin-finder` shows the tool's real
GitHub Pages UI, not a 404 or a release-download page.

**(B) Grouping:** as more of the ~50 candidate repos come online, the flat 2-column
card grid will get long, and several upcoming tools (portunus, mnemosyne, minerva,
heimdall) share a "Pantheon" family identity that's currently invisible on the
page. "Done" for this piece is fuzzier — the request itself asks for exploration
("nesting or callouts or other ways of viewing this"), not a single named feature.

## 2. What I Found

- The existing live-routing rewrite proxies to `${originUrl}/${mount}`, not just
  `${originUrl}` — because live tools are built with a matching Next.js `basePath`.
  GitHub Pages sites have no equivalent configurable basePath; they're built
  assuming they're served at exactly `https://mdostal.github.io/<repo>/`.
- **Revised after grill V1/H1.** My first draft claimed "every `live: false`
  tool's `mount` already equals its repo name exactly." That's imprecise:
  `scripts/crawl-github-repos.mjs`'s `slugify()` lowercases the repo name
  (`mount = slugify(repo.name)`), so the accurate claim is "mount equals the
  repo name's *lowercase* form." For an all-lowercase repo name (`coin-finder`,
  `gigradar`, `rolodex` — every currently-visible pagesUrl-fallback candidate)
  that distinction is invisible. It is **not** invisible for three currently
  held-back suggestions with mixed-case repo names — `ClusterExample`,
  `ReactSample`, `iosDiceRoller` — whose derived mounts are all-lowercase
  (`clusterexample`, `reactsample`, `iosdiceroller`) while their real GitHub
  Pages URLs preserve exact case (`.../iosDiceRoller/`, not `.../iosdiceroller/`).
  If this routing feature is ever applied to one of those three once unhidden,
  the proxy *fetch* itself still works (the stored `pagesUrl` is correctly
  cased), but the *proxied page's own internal absolute asset paths* would
  resolve in the browser against the mixed-case path, which wouldn't match a
  rewrite table keyed only on the lowercase mount — silently broken asset
  loading. Fixed in §3 below, not just documented as a residual risk.
- No grouping/category field exists in the Sanity schema today.
- `src/app/page.tsx` already has a precedent for "one entry represents a cluster
  of things" — `FrameworkCard` (drone-hub), which renders a full-width featured
  card with a row of `components: {label, href}[]` chips. Those chips currently
  link to sub-routes of the *same* app, but nothing about the field or the card
  requires that — a chip's `href` is just a string.

## 3. My Proposed Approach

**(A) Routing — extend `next.config.ts`'s `rewrites()` with a second tier:**

```
for each tool with pagesUrl set and live !== true:
  pagesBase = tool.pagesUrl.replace(/\/+$/, "") + "/"
  pagesPath = new URL(tool.pagesUrl).pathname   // e.g. "/iosDiceRoller/"
  rewrites += [
    { source: `/${tool.mount}`,        destination: pagesBase },
    { source: `/${tool.mount}/:path*`, destination: `${pagesBase}:path*` },
    { source: `${pagesPath}:path*`,    destination: `${pagesBase}:path*` },
  ]
```

Two fixes here versus the naive version, both from grill:

1. **Normalize `pagesUrl` instead of trusting its stored formatting (grill H2).**
   `pagesBase` strips any trailing slash then always re-adds exactly one. Every
   `pagesUrl` value currently in Sanity happens to already end in `/`, but that's
   not schema-enforced (`pagesUrl` is a plain `url` field, no pattern
   validation) — a future hand-entered value without one would otherwise produce
   a slash-missing destination (`https://.../repo:path*`) instead of a valid URL.
2. **Also register a rewrite keyed on the Pages URL's own real path segment,
   not just our lowercased `mount` (grill H1).** For the three mixed-case-named
   repos above, the proxied page's own assets request paths using the *real*
   case (e.g. `/iosDiceRoller/assets/...`), which would silently 404 against a
   rewrite table that only knows the lowercase mount. The third rewrite entry
   above covers that — harmless no-op-duplicate in the common all-lowercase
   case, a real fix for the mixed-case one.

`OpenAndSourceLinks` (`src/app/page.tsx`) changes its non-live branch to check
`pagesUrl` first: if set, render an "Open →" button (same primary style, pointing
at `/<mount>`, exactly like a live tool) instead of "Download latest release";
the release-download button becomes the fallback for tools with *neither* `live`
nor `pagesUrl`. The "Preview only" badge stays as-is — it's still not the tool's
*own* deployment, just its docs/demo site.

**(B) Grouping — two small, independent pieces, not one big taxonomy feature:**

1. **"Pantheon" as a `FrameworkCard`-shaped entry, reusing the existing pattern
   exactly, zero schema/code change.** A hand-curated Sanity tool doc (like
   drone-hub is today) whose `components[]` chips link to the member tools' own
   mounts (`/portunus`, `/mnemosyne`, ...) instead of same-app subroutes. This
   is genuinely just data entry once enough Pantheon member tools are public and
   live enough to be worth featuring together — **not proposing to build this
   now** (only `portunus` is a public repo today; heimdall/mnemosyne/minerva
   and the others are still private), but documenting it as the ready-to-use
   answer to "launch Pantheon at the top level, linking to the ones underneath"
   once there's enough there to feature.
2. **Live vs. Preview sectioning on the main grid — small real code change,
   ships now.** Split the flat grid into two labeled sections: "Live" (today's
   4, plus anything future that goes fully live) and "Preview" (everything still
   `live: false`, currently 5 visible + growing). This directly addresses the
   "long scroll of everything mixed together" problem without inventing a new
   taxonomy or Sanity field — it's derived from data that already exists
   (`live`), reads as "here's what's real, here's what's cooking," and scales
   fine to 50 tools the same way it scales to 9.

**What this epic does NOT do (grill U1 — flagging this plainly, not burying it
in prose):** it does not build a general nesting/collapsible-section component,
and it does not build the Pantheon featured card yet. Those are real scope cuts
against the request's own framing ("a new component to allow nesting... it's
going to be a lot to scroll through eventually"), not hidden ones. **If you want
either of those delivered now rather than deferred, say so at the review gate
below** — this design intentionally proposes the smaller, honestly-scoped slice
first rather than assuming the bigger version is wanted.

## 4. What Could Go Wrong

- **[medium, now mitigated] Mixed-case repo names would break asset loading
  under the naive version of this feature.** Closed by §3 item 2's third rewrite
  entry. Verified real, not hypothetical: `ClusterExample`, `ReactSample`,
  `iosDiceRoller` are exactly this shape and are named in this session's own
  history as tools to revisit later — this isn't a someday-maybe edge case.
- **[low, now mitigated] Trailing-slash formatting was assumed, not enforced.**
  Closed by §3 item 1's normalization.
- **[low] A future hand-edit sets a `live: false` tool's `mount` to something
  wildly unrelated to its repo entirely** (not just a case difference) **while
  `pagesUrl` stays set** → the case-mismatch fix above doesn't cover an
  arbitrary mismatch. Mitigated by a one-line Studio field description on
  `mount` noting this; the schema can't hard-validate against an external
  GitHub repo name at save time.
- **[low] A GitHub Pages site issues its own redirect or has a custom 404** that
  doesn't play well proxied — same category of risk the existing live-tier
  rewrite already accepts for Vercel deployments, not new to this change.
- **[low] "Open →" now appears for pagesUrl-fallback tools that aren't actually
  `live`** — could read as misleading. Mitigated by keeping the "Preview only"
  badge on the card regardless — the badge is the source of truth for live
  status, the button is just about whether there's anywhere to click through to.

## 5. Dependencies and Constraints

- **External:** none new — both changes reuse the existing multi-zone rewrite
  mechanism and the existing `components[]` schema field.
- **Internal:** the routing change touches `next.config.ts` and
  `OpenAndSourceLinks` in `src/app/page.tsx` — the same files the
  `multi-zone-routing-safety` cross-cutting concern already watches.
- **Cross-repo:** none — no personal-site schema change needed for either piece
  (unlike the earlier `icon` field addition).

## 6. Open Questions

1. **Live/Preview sectioning — right split, or do you want something else?**
   Proposing exactly two sections (Live, Preview) rather than more granular
   categories. If you want the Pantheon family visually distinguished *within*
   Preview too (not just via the future featured card), that's a small addition
   (a badge/pill on the individual card), not a redesign — flag if you want it
   included now.
2. **Pantheon featured card — build it now with just `portunus`, or wait for more
   members to go public?** A 1-chip "featured" card reads a little thin today.
   Proposing: wait, but document the pattern in `.pHive/CONTEXT.md` so it's a
   known, ready move the moment a second family member goes public.
3. **"Open →" wording for pagesUrl-fallback tools** — keep it identical to live
   tools' button, or say something like "View →" / "Docs →" to signal it's not
   the live app itself? I lean toward keeping "Open →" for consistency (the
   "Preview only" badge already carries that distinction), but this is a real
   copy call.
4. **Is the Live/Preview split + documented-but-deferred Pantheon pattern enough
   for the "long scroll" concern, or do you want a real nesting/collapsible
   component built now** even before there's a second Pantheon member to
   feature? This is the honest scope-cut question grill flagged (§3's closing
   note) — worth a direct answer rather than assuming the smaller slice is right.

## 7. Verification Strategy

```
VERIFICATION PLAN:
  Tools: none (no test infra in this repo, same as every prior story here).
         Manual verification via pnpm build + a real browser check, matching
         the pattern used for every prior change in this repo's history.
  Platforms: N/A -- Next.js web app only.
  Automated: nothing automated -- consistent with this repo's existing state.
  Manual: build + start locally, confirm /coin-finder, /gigradar, /rolodex now
    resolve to their real Pages sites (not 404, not the download button);
    confirm the 4 live tools' routing is byte-identical to before (regression
    check on the higher-priority existing behavior); confirm the Live/Preview
    section split renders correctly with the current 9 tools and degrades
    gracefully with 0 tools in either bucket (shouldn't render an empty
    section heading).
  Not verifying: actual asset-loading correctness of the proxied GitHub Pages
    sites beyond a manual click-through (would require a real E2E browser
    check against live external Pages URLs, out of proportion for this repo's
    test posture) -- the mixed-case asset-path risk (§4) is architecturally
    closed by the third rewrite entry, not by a runtime test, since none of
    the affected repos are unhidden yet to test against live.
```

## 8. Scale Assessment

```
SCALE ASSESSMENT:
  Files affected: ~3 (next.config.ts, src/app/page.tsx, .pHive/CONTEXT.md docs-only).
  Subsystems: routing (next.config.ts rewrites) + landing-page rendering
    (src/app/page.tsx) -- two layers of the same app, no cross-repo change.
  Migration required: no.
  Cross-team/cross-repo coordination: no.
  Unknowns: 4 open questions (§6), all resolvable by user answer, none requiring
    exploratory research.

  RECOMMENDATION: Proceed to stories (skip H/V planning).
  RATIONALE: Two small, well-understood changes to an already-small app, no
    schema change, no new external dependency. Classifying as **Small** --
    but note open question 4 above: if the answer is "build real nesting now,"
    that would justifiably grow this to Medium and warrant revisiting this
    assessment before story decomposition, not after.
```

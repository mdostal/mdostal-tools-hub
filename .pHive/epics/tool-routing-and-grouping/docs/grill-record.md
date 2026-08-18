# Grill Record — tool-routing-and-grouping

**Source draft:** .pHive/epics/tool-routing-and-grouping/docs/design-discussion.md
**CONTEXT.md substrate:** present
**inconsistency_risk_signals:** present (research brief §"Risk signals surfaced")
**round_number:** 1
**unresolved_count:** 4
**Generated:** 2026-08-18T00:00:00Z

## Summary

- Vocabulary mismatches: 1 finding
- Hidden assumptions: 2 findings
- Unresolved tensions: 1 finding
- Convention violations: clean
- Posture mismatches: clean

## Vocabulary mismatches

- **V1** — The design-discussion (§2, §3) and its research brief both assert
  "every `live: false` tool's `mount` already equals its repo name" as a settled
  fact closing the asset-path risk. Verified directly against
  `scripts/crawl-github-repos.mjs:199-206`: `mount = slugify(repo.name)`, and
  `slugify` calls `.toLowerCase()` as its first operation. The claim should read
  "mount equals the repo name's lowercase form," not "equals the repo name" —
  these are different claims for any repo with uppercase letters.
  - Draft location: research-brief.md "GitHub Pages asset-path risk" section;
    design-discussion.md §2 second bullet, §4 first risk item
  - Reference: `scripts/crawl-github-repos.mjs:199-206` (`slugify`)
  - Question for planner: does this distinction actually matter for any repo in
    play today? (See H1 below — it does, concretely.)

## Hidden assumptions

- **H1** — Three of the six currently-held-back suggestions have mixed-case repo
  names: `ClusterExample`, `ReactSample`, `iosDiceRoller`. Their crawler-derived
  `mount` values are `clusterexample`, `reactsample`, `iosdiceroller` (confirmed
  live in Sanity). GitHub Pages URLs preserve the repo's exact case
  (`https://mdostal.github.io/iosDiceRoller/`, not `.../iosdiceroller/`). If this
  routing feature is ever applied to one of these three once unhidden (with
  `pagesUrl` set), the *proxy fetch* still works fine (the stored `pagesUrl`
  string is already correctly cased) — but the *proxied page's own internal
  absolute asset paths* (e.g. `<script src="/iosDiceRoller/assets/main.js">`)
  would resolve, in the browser, against `tools.mdostal.com/iosDiceRoller/...`
  (mixed case) — a completely different path than the registered lowercase
  rewrite source `/iosdiceroller/:path*`. Next.js rewrite matching is
  case-sensitive by default. Net effect: broken asset loading specifically for
  mixed-case-named repos, silently, the exact failure mode the draft's own §4
  claims is already closed.
  - Draft location: design-discussion.md §4 first risk item ("low" severity,
    scoped only to future hand-edits — misses this pre-existing case-folding gap
    entirely)
  - Why this matters: these three are explicitly named in this session's own
    history as "will come out as samples, ideas, other tools etc... but I'll
    wrap back around to some of them" (user's own words, captured earlier this
    session) — i.e., not hypothetical, a stated future intent.
  - Question for planner: should the story require the rewrite to use the
    *actual* GitHub repo name's case (available from the crawler's own API
    response, or derivable by comparing `pagesUrl`'s path segment against
    `mount`) rather than the lowercased `mount`, for the pagesUrl-fallback tier
    specifically? Or is documenting the constraint (don't unhide a
    mixed-case-repo pagesUrl-fallback tool without re-checking) sufficient for
    v1, given none of the three are unhidden today?

- **H2** — The proposed rewrite destination (`${pagesUrl}:path*` for the
  wildcard route) is only slash-correct because every `pagesUrl` value currently
  in Sanity happens to end in `/` (verified: all 7 set values do). This is
  incidental, not schema-enforced — the Sanity `pagesUrl` field is a plain `url`
  type with no format/pattern validation. A future hand-entered `pagesUrl`
  without a trailing slash (e.g. `https://mdostal.github.io/foo`, no trailing
  `/`) would produce `https://mdostal.github.io/foo:path*` for a request to
  `/foo/bar` — no separator, resolving to a garbage path, not the intended
  `https://mdostal.github.io/foo/bar`.
  - Draft location: design-discussion.md §3 "(A) Routing" rewrite pseudocode
  - Why this matters: this is a silent, hard-to-notice failure mode (wrong proxy
    target, likely a 404 from GitHub Pages) that would only surface when someone
    adds the next `pagesUrl` by hand without exactly matching the existing
    convention.
  - Question for planner: should the implementation normalize `pagesUrl` (strip
    any trailing slash, then always join with `/`) rather than trust the stored
    string's exact formatting?

## Unresolved tensions

- **U1** — The epic is named `tool-routing-and-grouping` and the original
  request's own framing is fairly strong: "we may want a new component to allow
  nesting or callouts or other ways of viewing this... it's going to be a lot to
  scroll through eventually." The draft's actual proposed grouping deliverable
  (§3 part B) is a two-section Live/Preview split plus a *documented but
  explicitly not built* Pantheon pattern. That's a reasonable, honestly-argued
  scope call (§3's own paragraph defends it against premature complexity) — but
  the design-discussion's Scale Assessment (§8) rates this "Small" and doesn't
  flag that the more expansive "new component for nesting" idea in the request
  is being deferred, not delivered. A user skimming just the SCALE ASSESSMENT
  and RECOMMENDATION could reasonably expect their full ask is in scope.
  - Draft location: design-discussion.md §3 part B closing paragraph vs. §8
    Scale Assessment
  - Tension: "small, honest scope cut" vs. "the request asked for more than
    what's being delivered, and the summary doesn't say so plainly"
  - Question for planner: make the deferral explicit in the user-facing
    presentation at the design-discussion review gate (step 5), not just
    inside the doc body — e.g., an explicit "what this epic does NOT do yet"
    line, so the scope cut is a decision the user visibly signs off on, not
    something they'd only notice by reading closely.

## Convention violations

Clean. The proposed `components[]`-reuse pattern for a future Pantheon card, and
the `live`-derived (not new-field-derived) Live/Preview split, both correctly
follow this codebase's own stated "small, low-churn hand-mirrored list" /
minimal-abstraction precedent rather than introducing a new taxonomy field.

## Posture mismatches

Clean. Nothing in the draft introduces a new pattern inconsistent with this
repo's existing posture (Sanity-as-source-of-truth, reuse-before-invent,
manual-verification-only test posture).

## Notes

- Confirmed independently (not just trusting the draft): the mutual-exclusivity
  of the `live` / `pagesUrl` rewrite tiers is sound *as designed* (the draft's
  own pseudocode is `if live: ... else if pagesUrl: ...`), so no double-rewrite
  risk — this was one of the five things I was asked to scrutinize and it holds
  up.
- The `open question 3` (button copy: "Open →" vs "View →"/"Docs →") is a
  legitimate open copy question, not a finding — correctly left to the user in
  the draft.

## Out of scope (this pass)

Grill does NOT propose solutions, score quality, gate work, or prioritize
findings. Each finding ends with a question for the planner; the planner's job
is to revise the draft (or document accepted deviations) before stories are
written.

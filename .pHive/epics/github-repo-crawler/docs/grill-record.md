# Grill Record — github-repo-crawler

**Source draft:** .pHive/epics/github-repo-crawler/docs/design-discussion.md
**CONTEXT.md substrate:** present
**inconsistency_risk_signals:** present (research brief §"Risk signals surfaced")
**round_number:** 1
**unresolved_count:** 5
**Generated:** 2026-08-13T00:00:00Z

## Summary

- Vocabulary mismatches: 1 finding
- Hidden assumptions: 1 finding
- Unresolved tensions: 1 finding
- Convention violations: 1 finding
- Posture mismatches: 1 finding

## Vocabulary mismatches

- **V1** — CONTEXT.md's own "GitHub crawler" glossary entry (lines 22-25) describes the
  feature only as proposing "new Sanity tool entries for human approval," with no mention
  of a distinct `tool-suggestion-*` ID namespace separate from real `tool-*` docs. The
  draft introduces that namespace as a core safety mechanism (§3 item 5) but the
  project's own glossary doesn't yet reflect the concept exists.
  - Draft location: design-discussion.md §3 item 5, lines 73-78
  - Reference: `.pHive/CONTEXT.md` lines 22-25
  - Question for planner: should CONTEXT.md be updated (as part of this epic's stories,
    per the `documentation` cross-cutting concern) once the `tool-suggestion-*` vs
    `tool-*` distinction is real, so the glossary doesn't go stale the moment this ships?

## Hidden assumptions

- **H1** — "first non-heading paragraph of the README" (§3 item 4) is asserted as the
  description-fallback heuristic but was never checked against the actual READMEs of the
  4 real candidate repos it would run against (`gigradar`, `human-review`, `rolodex`,
  `coin-finder`). Many READMEs open with badges/shields, a table of contents, or an image
  before any real prose — a very common pattern that would break "first non-heading
  paragraph" silently (e.g., picking up a badge-alt-text line or ToC entry as the
  "description").
  - Draft location: design-discussion.md §3 item 4, line 70; §4 medium-risk bullet
    acknowledges the heuristic is fuzzy but doesn't ground it against real data
  - Why this matters: draft's own mitigation for this risk is "reviewed before publish
    anyway" — true, but a heuristic that produces garbage on most/all of the 4 real v1
    candidates makes the auto-description feature close to useless in practice, not just
    imperfect.
  - Question for planner: pull the actual READMEs for the 4 real candidates before
    finalizing the heuristic (or as an early story step) — is "first non-heading
    paragraph" actually going to produce something reasonable for these four, or does it
    need a stronger rule (e.g., skip lines that are image/badge markdown, skip a
    detected ToC block)?

## Unresolved tensions

- **U1** — The draft's closing line in §3 ("must be safe to fire on a schedule without a
  human babysitting every run") is not actually satisfied by the design as specified.
  The `tool-suggestion-<mount>` namespace (§3 item 5) protects real, human-curated
  `tool-*` docs from being overwritten — but it does **not** protect a suggestion doc
  from being overwritten by itself. If a human opens Studio, starts editing a not-yet-
  approved `tool-suggestion-gigradar` doc (fixing the auto-description, say), and the
  crawler re-runs before they approve/promote it, `createOrReplace` at that same
  `_id` silently discards their in-progress edit. Open question 3 explicitly anticipates
  a scheduled/repeated-run future ("GitHub Actions cron as a fast-follow"), so this
  isn't a hypothetical — it's the exact scenario the roadmap points at next.
  - Draft location: design-discussion.md §3 closing paragraph (lines 82-86) vs. §6 open
    question 3 (lines 136-141)
  - Tension: "safe to re-run unattended" vs. "suggestion docs are meant to be
    hand-edited before approval, and re-run overwrites them"
  - Question for planner: should re-runs skip any `tool-suggestion-*` doc that already
    exists (crawler only ever creates, never updates, a suggestion) once a human may have
    touched it? Or should the crawler track a hash/timestamp and only overwrite
    suggestions it can prove are still machine-original (unedited) since creation? Either
    resolves this before a schedule is wired up — worth deciding now even though
    scheduling itself is deferred, since it changes the write logic in v1's script.

## Convention violations

- **C1** — CONTEXT.md states `scripts/migrate-tools-to-sanity.mjs` is "the template for
  how the future GitHub crawler script should write to Sanity too" (line 38-40) — i.e.,
  the documented convention at kickoff time was "same deterministic-ID
  `createOrReplace` pattern." The draft explicitly and knowingly deviates from that
  (separate ID namespace, no reuse of the upsert-across-runs behavior) with solid
  reasoning (§3 closing paragraph) — this is a **reasonable, justified deviation**, not
  a mistake. Flagging only because the deviation isn't reflected back into CONTEXT.md,
  so the glossary and the actual implementation would disagree the moment this ships.
  - Draft location: design-discussion.md §3, lines 82-86
  - Convention: `.pHive/CONTEXT.md` lines 38-40
  - Question for planner: same fix as V1 — update CONTEXT.md's "Key paths" entry for
    `migrate-tools-to-sanity.mjs` (and/or add a line for the new script) once this
    ships, so it reads "same conventions, different upsert-safety semantics" rather than
    implying an identical write pattern.

## Posture mismatches

- **P1** — §1 explicitly frames the v2 "reusable tool for other developers" direction as
  a non-goal and warns against "solving a problem we don't have evidence for yet." §3
  item 1 then partially does exactly that: it keeps `GITHUB_ACCOUNT` as a named,
  account-agnostic config value specifically "for the stated-but-out-of-scope v2 reuse
  direction," rather than simply hardcoding `mdostal` the way a v1-only script would.
  This is minor — one env var, not a structural choice — and doesn't cost much, but it's
  a small, real inconsistency between the draft's stated posture (don't build for v2 yet)
  and one line of its own plan (a v2-motivated generalization).
  - Draft location: design-discussion.md §1 lines 15-20 vs. §3 item 1, lines 53-58
  - Posture reference: this repo's own "small, low-churn hand-mirrored list" precedent
    (cited approvingly elsewhere in this same draft, §6 open question 1) — minimal
    abstraction until a second real use case exists
  - Question for planner: either drop the `GITHUB_ACCOUNT` env var for v1 (hardcode
    `mdostal`, matching the stated non-goal) and let a real v2 story add it later, or
    keep it and explicitly say in §1 that this one small hook is the sole deliberate
    exception — as written it reads as an unacknowledged contradiction rather than a
    conscious tradeoff.

## Notes

- `topics` is listed in the research brief as a "key signal" gathered from the GitHub API
  but is never used anywhere in the proposed approach (§3) — not a finding worth a full
  entry, just flagging it as either dead-weight-to-drop or an unused hook (e.g. could
  feed future tag/category fields) worth a one-line note in the brief.
- The multi-zone-routing-safety cross-cutting concern's `applies_when` (touches
  `next.config.ts` / `src/lib/tools.ts` / `src/lib/sanity.ts` / schema/query shape) is
  correctly assessed as not triggered — the draft's claim that this script touches none
  of those files checks out against the actual proposed approach.
- Secrets-hygiene cross-cutting concern is correctly followed: `GITHUB_TOKEN` and
  `SANITY_API_WRITE_TOKEN` are both specified as `process.env`-only, no hardcoding
  proposed anywhere in the draft.

## Out of scope (this pass)

Grill does NOT propose solutions, score quality, gate work, or prioritize findings. Each
finding ends with a question for the planner; the planner's job is to revise the draft
(or document accepted deviations) before stories are written.

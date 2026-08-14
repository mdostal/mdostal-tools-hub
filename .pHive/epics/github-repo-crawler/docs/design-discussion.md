# Design Discussion: GitHub Repo Crawler

## 1. What Are We Doing?

Mathew wants a script that scans every public repo under his `mdostal` GitHub account,
figures out which ones are actually his "tools" (not forks, not scaffolding, not
already-listed), pulls their README + metadata, and creates a suggested entry in the
same Sanity CMS that already drives tools.mdostal.com — as a **suggestion he reviews and
approves**, never something that goes live automatically. "Done" for v1 means: run one
command, get a batch of new `hidden: true` tool docs in Sanity Studio that Mathew can
open, fill in the gaps on (screenshot, maybe originUrl), uncheck `hidden`, and publish —
instead of hand-typing every field for every new tool the way the 4 current ones were
onboarded.

There's also a stated v2 direction — generalize this into something other developers
point at their own GitHub account. I'm treating that as a **non-goal for this epic**: it
shapes a couple of naming/structure choices (keep the crawl logic itself
account-agnostic even though v1 only ever calls it with `mdostal`) but does not add any
stories here. Trying to build the "reusable product" shell now, before a single real
crawl has run, would be solving a problem we don't have evidence for yet.

## 2. What I Found

- **`scripts/migrate-tools-to-sanity.mjs`** is the exact precedent to follow: a
  `pnpm`-runnable Node script, `@sanity/client`, `createOrReplace` with a deterministic
  `_id`, credentials from `process.env` only. The crawler is a sibling script, same
  conventions.
- **The Sanity `tool` schema already has the review mechanism built in.** `hidden`
  (boolean) is described in its own schema comment as "build/review here before it goes
  live" — this is literally the suggest-then-approve flow already designed into the CMS
  for another content type (Case Study) and reused here. `live` is a second, separate
  gate that also has to be true for a rewrite to generate. **This means no schema change
  in `personal-site` is needed** — I initially assumed this would be a two-repo change;
  it isn't.
- **`homepage` on the GitHub repo object reliably maps to `originUrl`.** I checked this
  against live data, not assumption: all 4 currently-listed tools have `originUrl` set to
  exactly their repo's `homepage` field. That's a real, checkable signal, not a guess.
- **Real account data, pulled live via `gh api users/mdostal/repos --paginate`:** 26
  repos. 9 are forks (auto-excludable via the `fork` field). 4 are the already-listed
  tools. This repo and the Hive plugin fork aren't "tools." Of what's left, 4 repos
  (`gigradar`, `human-review`, `rolodex`, `coin-finder`) have real descriptions and are
  plausible new candidates; 9 more have neither a description nor a homepage and are
  very likely scaffolding/test repos (`test`, `Test-MVP`, `ClusterExample`, etc.) with
  nothing usable to build a suggestion from.
- **Required fields the crawler cannot fill:** `screenshot` is required by the schema
  and its own description says "never a mockup" — this is inherently a manual step,
  matching the existing convention. That's fine; suggestion docs are *expected* to be
  incomplete pending review, and Sanity's `Rule.required()` is Studio-side only, not
  enforced by the write API.

## 3. My Proposed Approach

1. New script `scripts/crawl-github-repos.mjs`, same shape as
   `migrate-tools-to-sanity.mjs`: reads `NEXT_PUBLIC_SANITY_PROJECT_ID`,
   `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_API_WRITE_TOKEN` (same names, same
   never-hardcode pattern), and an optional `GITHUB_TOKEN` for the higher
   authenticated rate limit. The account (`mdostal`) is a hardcoded constant, not an
   env var — **revised after grill P1**: §1 already calls the "reusable for other
   developers" direction a non-goal for this epic; making the account configurable
   was a small, unacknowledged contradiction of that. If a v2 story materializes,
   parameterizing this one constant is a trivial follow-up, matching this repo's own
   "minimal abstraction until a second real use case exists" precedent
   (`src/lib/tools.ts`'s `components[]`).
2. Fetch `GET /users/{account}/repos` (paginated), filter out: forks, archived repos,
   the crawler's own account's `mdostal-tools-hub` repo (self-reference by name),
   and any repo whose `full_name` already matches an **existing** tool doc's `repoUrl`
   (fetched from Sanity first — this is the dedup check, and it's the safety rail that
   keeps re-runs from touching curated docs).
3. Of what's left, keep only repos with a non-null `description` **or** a fetchable
   README (`GET /repos/{account}/{repo}/readme`) — this is the mechanical "do we have
   enough to build a suggestion" bar from the research brief, not a subjective
   is-this-a-real-tool judgment call.
4. For each surviving repo: derive `label` (humanized repo name), `mount` (slugified
   repo name, same `options: { source: 'label' }` shape the schema already expects),
   `description` (repo description, or a README fallback — see the grounded heuristic
   below if description is null), `repoUrl` (`html_url`), `originUrl` (repo's
   `homepage` field if present, else omitted), `hidden: true`, `live: false`. Never
   set `screenshot`.

   **README description-fallback heuristic (revised after grill H1 — grounded against
   the 4 real v1 candidates, not asserted from memory).** I pulled all 4 actual
   READMEs (`gigradar`, `human-review`, `rolodex`, `coin-finder`) to check this before
   finalizing it. A naive "first non-heading paragraph" works cleanly for 3 of 4
   (`gigradar`, `human-review`, `rolodex` all open with `# title` then immediately a
   real descriptive paragraph). It breaks on `coin-finder`, whose README is
   `# title` → `---` (horizontal rule) → `## Overview` → `---` → real paragraph — a
   naive heuristic would grab the bare `---` as "content." Fix: skip ATX headings
   (`#` lines), horizontal rules (lines that are only repeated `-`/`*`/`_`), blank
   lines, and pure badge/image lines (`^!\[.*\]\(.*\)$`), then take the first
   remaining line/paragraph. Verified this rule produces a real, usable one-line
   description for all 4 candidates, not just the 3 easy ones.
5. Write with `createOrReplace`-style logic but **create-only, never overwrite** — at
   a new, distinct ID namespace, `tool-suggestion-<mount>`, not `tool-<mount>` — so a
   suggestion document can never collide with (and silently overwrite) a real curated
   `tool-<mount>` doc. **Revised after grill U1:** the ID-namespace split alone
   protects curated docs from the crawler, but does nothing to protect a
   *not-yet-approved suggestion* from the crawler re-running and clobbering a human's
   in-progress edit to that same suggestion. Fix: before writing, check whether a
   `tool-suggestion-<mount>` doc already exists; if it does, **skip it and log
   "already suggested, skipping (may have been hand-edited)"** rather than
   overwriting. This makes "safe to fire on a schedule unattended" actually true
   by construction, not just true today because nothing has ever re-run yet. Once a
   human approves a suggestion in Studio, they either retype it as a real
   `tool-<mount>` doc (matching today's manual-add workflow) or a later story can add
   a "promote" helper — not v1.
6. Script prints a summary table (repo → suggested/skipped + reason, including
   "skipped: already suggested" as a distinct reason from "skipped: excluded") so a
   run is legible without opening Studio.
7. **Update `.pHive/CONTEXT.md` as part of this work (resolves grill V1 + C1).**
   CONTEXT.md's existing "GitHub crawler" glossary entry doesn't yet describe the
   `tool-suggestion-*` namespace, and its `migrate-tools-to-sanity.mjs` Key Paths
   entry currently reads as if the new script would reuse the same upsert-across-runs
   semantics — it deliberately doesn't (item 5). Both entries get updated once this
   ships, so the glossary and the implementation agree. This falls under the existing
   `documentation` cross-cutting concern and is a checklist item on the implement
   story, not a separate story.

I'm deliberately NOT writing to the same `_id` namespace as real tools, and NOT reusing
`createOrReplace`'s upsert-by-ID behavior the way the migrate script does for its fixed,
hand-maintained seed list — this script runs repeatedly against a moving target (the
whole account) and, per the create-only rule above, is now safe to fire on a schedule
without a human babysitting every run or losing in-progress review edits.

## 4. What Could Go Wrong

- **[high, now mitigated] Overwriting a human-curated doc, or a human's in-progress
  edit to a suggestion, on re-run.** Two distinct sub-risks, both closed by §3: real
  `tool-*` docs are protected by the separate `tool-suggestion-*` namespace
  (construction, not convention); a suggestion doc's own in-progress edits are
  protected by the create-only/skip-if-exists rule (item 5, added after grill U1).
- **[low, now grounded] README parsing produces a garbage description.** Checked
  against the actual READMEs of all 4 real v1 candidates (§3 item 4) rather than left
  as an unverified heuristic — one of the four would have broken a naive
  first-paragraph rule; the heading/rule/badge-skipping version handles all four.
  Residual risk is repos beyond these 4 with even weirder README structure; mitigated
  by the same review-before-publish gate as always.
- **[medium] `originUrl` guessed from `homepage` could be stale or wrong** (a repo's
  GitHub "website" field isn't guaranteed accurate). Same mitigation — reviewed before
  `live` ever flips true.
- **[low] GitHub API rate limits** on repeated dev-loop runs while building this
  (unauthenticated = 60/hr). Recommending optional `GITHUB_TOKEN` (§3 item 1) rather than
  requiring it for v1, since the account has ~26 repos today and one full crawl costs
  well under 20 requests.
- **[low] Re-classifying an existing "no-signal" repo later** (e.g. Mathew adds a
  description to `test` next month) — the exclusion filter would then surface it. This
  is correct behavior, not a bug, but worth calling out so it isn't surprising.

## 5. Dependencies and Constraints

- **External:** GitHub REST API (public, read-only for repo list + README; only needs a
  token for the higher rate-limit tier, not for auth). `@sanity/client` — already a repo
  dependency, no new package needed for that half.
- **Internal:** none — this doesn't touch `next.config.ts`, `src/lib/tools.ts`, or
  `src/app/page.tsx` at all. Zero runtime/build-path risk; it's a standalone script like
  its precedent.
- **Cross-repo:** none, contrary to the original north-star assumption — the `hidden`
  field already exists in `personal-site`'s schema (§2), so this epic does not touch that
  repo.
- **Environment:** needs `SANITY_API_WRITE_TOKEN` set locally (or in CI/cron, if this
  gets scheduled later) to actually write; runs read-only against GitHub with no auth
  required at current repo count.

## 6. Open Questions

1. **Exclusion list beyond forks/archived/self:** should there be a small manual
   denylist (like the "small, low-churn hand-mirrored list" precedent already used in
   `src/lib/tools.ts`'s `components[]`) for repos that pass the mechanical filter but
   are still not tools (e.g. `coin-finder` — is that a "tool" Mathew wants listed, or a
   private personal-finance thing)? Proposing: yes, add an empty-by-default
   `EXCLUDED_REPOS` array in the script so this is a one-line edit, not a code change,
   the first time it's needed.
2. **Should the script default to a dry-run** (print what it would create, write
   nothing) unless a `--write` flag is passed? Given item 1's judgment calls, I think
   yes — first runs especially benefit from a preview before anything lands in Sanity,
   even as a hidden doc.
3. **Manual trigger only for v1, or wire a schedule now?** Kickoff discovery captured
   "auto scan to some degree... I want it to update" — proposing v1 ships as a
   manually-run script (matches the "runtime: script in this repo" answer from kickoff),
   with a GitHub Actions cron as a fast-follow once the exclusion/dedup logic has been
   run and trusted a few times by hand. Flag if you want the cron wired in this same
   epic instead of deferred.

## 7. Verification Strategy

```
VERIFICATION PLAN:
  Tools: none (no test infra in this repo — see project-profile.yaml test_infrastructure).
         Manual verification only, same as scripts/migrate-tools-to-sanity.mjs today.
  Platforms: N/A — Node script, no browser/mobile surface.
  Automated: nothing automated; this repo has zero test infrastructure and adding a
    test harness for one script is out of proportion to the change.
  Manual: run with --dry-run against the real account, eyeball the summary table
    against the known-good exclusion list (9 forks, 4 existing tools, self) from the
    research brief; then run for real once against a scratch Sanity dataset or with
    --write and manually verify in Studio that suggestion docs land as hidden:true,
    live:false, under the tool-suggestion-* id prefix, and that none of the 4 existing
    tool-* docs changed.
  Not verifying: README-parsing quality (heuristic, human reviews every suggestion
    before it can go live — see design discussion §4) and originUrl accuracy (same).
```

## 8. Scale Assessment

```
SCALE ASSESSMENT:
  Files affected: 1 new file (scripts/crawl-github-repos.mjs). Possibly a
    README.md mention of the new script, following the existing "How a tool gets
    added" section's precedent.
  Subsystems: none — standalone script, doesn't touch the Next.js app, routing, or
    the landing page. Talks to two external services (GitHub REST API, Sanity) that
    are both already-integrated patterns in this repo.
  Migration required: no.
  Cross-team/cross-repo coordination: no (see §5 — the personal-site schema already
    supports this via the existing hidden field).
  Unknowns: 3 open questions (§6), all resolvable by user answer, none requiring
    exploratory research.

  RECOMMENDATION: Proceed to stories (skip H/V planning).
  RATIONALE: Single new file, single layer (build-time tooling, not app runtime),
    no schema/cross-repo change, no UI. The multiple real design decisions here
    (safe upsert namespace, exclusion heuristics, dry-run default) are genuine but
    they're contained within one script's internal design, not spread across
    layers or systems — exactly the shape H/V planning exists to slice apart, which
    this doesn't need. Classifying as **Small**.
```

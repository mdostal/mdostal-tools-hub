# Behavior Specs: scripts/crawl-github-repos.mjs

Given/When/Then scenarios for the GitHub repo crawler. Fixtures are the real
`mdostal` GitHub account data (design-discussion.md §2-3), not placeholders.
26 public repos total:

- 9 forks: bluemix-cloud-connectors, competitive-programming, ionic_test,
  JavaScript-API, jitsi-meet, mcpelauncher-extract, mcpelauncher-manifest,
  SmartThingsPublic, plugin-hive-fork
- 4 already-listed tools (existing `tool-*` docs): allergy-locator,
  mapstack-us, medical-study-tracker, drone-hub
- 1 self: mdostal-tools-hub
- 4 real v1 candidates with usable descriptions: gigradar, human-review,
  rolodex, coin-finder
- 9 no-signal repos (no description, no homepage): test, Test-MVP,
  ClusterExample, Example, Fractalizations, hermes-chat, iosDiceRoller,
  ReactSample, thoughtful

## 1. Forks are dropped first, before any network/Sanity check

Given `jitsi-meet` has `fork: true`, when filtered, then it is excluded with
verdict `skipped: fork`, with no README fetch or Sanity dedup check
performed. Applies identically to all 9 forks above.

## 2. Archived repos are dropped

Given a repo has `archived: true` (none of today's 26 do, but the filter
must still fire)
Then it is excluded with verdict `skipped: archived`, checked before self
and denylist.

## 3. Self-exclusion by exact repo name

Given the repo list includes `mdostal-tools-hub`
Then it is excluded with verdict `skipped: self`, matched by name equality.

## 4. Already-listed repos matched by repoUrl against Sanity, hidden or not

Given Sanity has `tool-allergy-locator`, `tool-mapstack-us`,
`tool-medical-study-tracker`, `tool-framework` (drone-hub) docs, each with a
`repoUrl` (e.g. `https://github.com/mdostal/allergy-locator`)
When the crawler queries `*[_type == "tool"]{repoUrl}` (no `hidden` filter)
and compares to each candidate's `html_url`
Then allergy-locator, mapstack-us, medical-study-tracker, and drone-hub are
excluded with verdict `skipped: already-listed`, even for docs where
`hidden: true` -- a curated-but-hidden doc still counts as "already listed."

## 5. EXCLUDED_REPOS denylist is empty by default, checked after already-listed

Given `EXCLUDED_REPOS` is `[]`, no repo is excluded via this path today, but
if `coin-finder` were later hand-added to it, it would be excluded with
verdict `skipped: excluded`.

## 6. A GitHub description is used verbatim; no README fetch needed

Given `gigradar`'s `description` field is a non-null string
When evaluated for signal
Then it survives without fetching its README, and its suggestion
`description` is that GitHub description verbatim. Applies identically to
human-review, rolodex, coin-finder -- all 4 real candidates already have
descriptions, so README fallback in practice only fires for null-description
repos.

## 7. No description and no README means no signal, dropped

Given `test` has `description: null` and `GET /repos/mdostal/test/readme`
404s
When evaluated
Then it is excluded with verdict `skipped: no-signal`, no Sanity write
considered. Applies identically to Test-MVP, ClusterExample, Example,
Fractalizations, hermes-chat, iosDiceRoller, ReactSample, thoughtful.

## 8. README fallback skips headings, rules, blanks, badges (coin-finder shape)

Given a null-description repo's raw README is:

```
# Cryptocurrency Wallet Pipeline

---

## Overview

---

This project is a modular pipeline for tracking cryptocurrency wallet
activity across multiple chains...
```

When the crawler derives a description via README fallback
Then it skips, in order: `# Cryptocurrency Wallet Pipeline` (ATX heading),
blank, `---` (rule, matches `/^(-{3,}|\*{3,}|_{3,})$/`), blank,
`## Overview` (ATX heading), blank, the second `---`, blank
And takes "This project is a modular pipeline for tracking cryptocurrency
wallet activity across multiple chains..." as the description, trimmed to a
reasonable length
And never takes either `---` line as the description (the bug a naive
"first non-heading paragraph" heuristic would hit)
And, separately: a README whose first non-heading, non-blank line is
`![Build Status](https://img.shields.io/badge/build-passing-green)` skips
that line too (matches `/^!\[.*\]\(.*\)$/`) before taking the next real line.

## 9. originUrl copies GitHub's homepage field verbatim when present

Given a survivor's GitHub repo object has
`"homepage": "https://allergy-locator.vercel.app"` (allergy-locator's real
homepage value, used here as the exact-copy fixture even though
allergy-locator itself is excluded per #4 as already-listed)
When the crawler derives `originUrl`
Then it is set to exactly `https://allergy-locator.vercel.app` -- verbatim,
no transformation, trimming, or protocol rewriting.

## 10. originUrl is omitted, not guessed, when homepage is absent

Given a survivor's `homepage` field is `null` or `""`
When the suggestion document is built
Then the `originUrl` key is absent entirely -- not `null`, not `""`, not
derived from `html_url` or any other field.

## 11. label and mount derivation

Given repo name `coin-finder`
Then `label` is `"Coin Finder"` (hyphens/underscores replaced with spaces,
title-cased) and `mount` is `{ _type: "slug", current: "coin-finder" }`
(lowercase, hyphen-separated).
Given repo name `human_review` (underscore variant)
Then `label` is `"Human Review"` and `mount.current` is `"human-review"`.

## 12. hidden/live/screenshot invariants on every suggestion

Given any survivor (e.g. `rolodex`)
When its suggestion document is built
Then `hidden: true`, `live: false`, and no `screenshot` field is set --
non-negotiable, no flag bypasses this.

## 13. Suggestion IDs use a distinct namespace from curated tool docs

Given survivor `gigradar` produces `mount.current: "gigradar"`
When the `_id` is assigned
Then it is `tool-suggestion-gigradar`, never `tool-gigradar` (the curated
namespace, which this script must never write).

## 14. An existing suggestion doc is skipped, never overwritten

Given `tool-suggestion-gigradar` already exists (prior run, possibly
hand-edited in Studio since)
When the crawler runs again with `--write` and `gigradar` survives filtering
again
Then it checks for `tool-suggestion-gigradar`'s existence BEFORE writing,
finds it exists, does NOT call `create` or `createOrReplace`, records
verdict `skipped: already-suggested` with reason "already suggested,
skipping," and the existing document (including any hand-edits) is
byte-for-byte unchanged after the run.

## 15. Dry-run is the default; --write is required to persist anything

Given the crawler is invoked with no flags
When it finishes evaluating all 26 repos
Then it prints the summary table and creates zero Sanity documents no matter
how many rows are `suggested`, and each `suggested` row's write status reads
as a preview (e.g. "would create"), not a confirmed write.

## 16. Missing GITHUB_TOKEN still works, at the lower rate limit

Given `GITHUB_TOKEN` is unset
When making GitHub API requests
Then the `Authorization` header is omitted entirely (never sent as
`Bearer undefined`) and the crawl still completes against all 26 repos,
subject to the unauthenticated 60/hr limit rather than failing.

## 17. Missing SANITY_API_WRITE_TOKEN with --write fails fast

Given `NEXT_PUBLIC_SANITY_PROJECT_ID`/`DATASET` are set but
`SANITY_API_WRITE_TOKEN` is unset
When invoked with `--write`
Then it prints a clear error naming the missing `SANITY_API_WRITE_TOKEN`
(mirroring `migrate-tools-to-sanity.mjs`'s "Missing ... SANITY_API_WRITE_TOKEN"
style), exits non-zero, and makes zero GitHub calls and zero Sanity writes
before exiting.

## 18. Missing Sanity project config degrades gracefully in dry-run

Given `NEXT_PUBLIC_SANITY_PROJECT_ID` is unset and `--write` is NOT passed
When the crawler runs
Then it prints a warning that the Sanity dedup-check was skipped, continues
the crawl treating no repo as "already-listed" via that check, and does NOT
hard-fail or exit non-zero for a plain dry-run with no Sanity config.

## 19. Zero eligible candidates prints a summary, not an error

Given (hypothetically) every one of the 26 repos ends up fork/archived/
self/already-listed/excluded/already-suggested/no-signal, leaving zero
`suggested` rows
When the crawler finishes
Then it prints the full summary table (every repo gets a row with its skip
reason) plus a closing line stating zero candidates were eligible (e.g. "0
repos suggested") and exits code 0 -- an all-skip run is valid, not a
failure.

# readme-sync

One source of truth for the **byline**, **tagline**, and **Support** block across all the OSS repos — because GitHub has no native README includes. Edit here once, run one command, every repo updates.

Lives here (`mdostal-tools-hub`, the meta/hub repo for the whole tools portfolio) rather
than as a standalone tool, since this is already the repo that tracks the portfolio as a
whole — see [`scripts/crawl-github-repos.mjs`](../crawl-github-repos.mjs), which discovers
new candidate repos; this tool is the natural next step once a repo is ready to onboard
(add it to `repos.json` + `taglines.json`, run `node scripts/readme-sync/sync.mjs --init`).

## How it works

Each repo's README gets three marker pairs. This tool fills the region *between* them:

```markdown
# my-tool
<!-- shared:tagline -->
<!-- /shared:tagline -->

<!-- shared:byline -->
<!-- /shared:byline -->

... your repo-specific content (install, usage) ...

<!-- shared:support -->
<!-- /shared:support -->
```

You never hand-write those regions again — `sync.mjs` does.

## Usage

Run from this directory (`scripts/readme-sync/`):

```bash
node sync.mjs --dry     # preview: what would change, writes nothing
node sync.mjs --init    # first run for a repo: inserts missing markers + fills them
node sync.mjs           # after editing any snippet: re-fill all repos
```

This only edits working-tree files in each repo's local checkout -- it never commits or
pushes on its own. Review with `git diff` in each repo and commit what you want to keep.

## Edit in ONE place

- **byline.md** — the "Built by…" line (same everywhere)
- **support.md** — the Support block (`{{REPO_URL}}` is swapped per repo)
- **taglines.json** — one tagline per repo, keyed by repo name
- **repos.json** — the list: `key`, local `path`, `repoUrl`

Change a snippet → `node sync.mjs` → done across every repo in `repos.json`.

## Adding a new repo

1. Add an entry to `repos.json` (`key`, local `path`, `repoUrl`).
2. Add a one-line tagline for it to `taglines.json`, keyed by the same `key`.
3. `node sync.mjs --dry` to preview, then `node sync.mjs --init` to insert and fill its markers.

## The Sponsor button (separate, even simpler)

`FUNDING.yml` here isn't handled by this script — it belongs in a special repo:

```bash
# one-time: create the default-config repo
gh repo create mdostal/.github --public --description "Default community health files"
# then add FUNDING.yml to it (from this folder) and push
```

That one file gives **every** public repo the ♥ Sponsor button automatically — no per-repo work.

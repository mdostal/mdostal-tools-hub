# mdostal-tools-hub

The router behind **tools.mdostal.com**. A minimal Next.js app whose only job
is to (1) list every live tool as a directory landing page, and (2) proxy
each tool's mount path to its own independently-deployed Vercel project,
using [Vercel's multi-zone pattern](https://vercel.com/docs/multi-tenant/multi-zones) —
so `mdostal.com`'s own site, and each tool's own repo/deploy pipeline, stay
completely independent of this one.

## How a tool gets added

1. The tool ships as its own repo + Vercel project (e.g.
   [`allergy-locator`](https://github.com/mdostal/allergy-locator),
   [`mapstack-us`](https://github.com/mdostal/mapstack-us)).
2. Its own `next.config.ts` sets `basePath` to its intended mount path
   (e.g. `/allergy-locator`) — this is what makes its internal links and
   `/_next/*` asset requests resolve correctly once mounted under this hub.
3. Add one entry to [`src/lib/tools.ts`](src/lib/tools.ts) with `live: true`
   once step 2 is verified working end-to-end. This single file drives both
   the landing-page listing and the `next.config.ts` rewrites — nothing
   else needs to change.

[`scripts/crawl-github-repos.mjs`](scripts/crawl-github-repos.mjs) automates
step 1's discovery, and runs on its own daily via
[`.github/workflows/crawl-github-repos.yml`](.github/workflows/crawl-github-repos.yml)
(also triggerable on demand from the Actions tab) — no manual step required.
It scans every public repo under the `mdostal` GitHub account and creates a
hidden, unpublished Sanity suggestion doc for each real candidate (forks,
archived repos, this repo, already-listed tools, and anything in the script's
`EXCLUDED_REPOS` denylist are skipped automatically). Suggestions still need a
human to fill in the gaps (screenshot, etc.) and flip `hidden`/`live` in
Studio before they show up here — nothing it creates is ever live by itself.
Run `node scripts/crawl-github-repos.mjs` locally for a dry-run preview, or
add `--write` to create suggestions outside the schedule.

## Why a separate repo at all

`mdostal.com` itself is a real, existing production site (Sanity CMS, Cal.com
booking) that this project never touches. Routing tool subpaths through a
dedicated subdomain (`tools.mdostal.com`) and a dedicated, minimal router repo
keeps every tool's release cadence, CI, and blast radius fully isolated from
the main site and from each other.

## License

MIT — see [`LICENSE`](LICENSE).

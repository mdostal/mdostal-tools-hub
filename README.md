# mdostal-tools-hub

<!-- shared:tagline -->
> The directory for everything here. Free & open source.
<!-- /shared:tagline -->
<!-- shared:byline -->
Built by [Mathew Dostal](https://mdostal.com) — fractional CTO, Dostal Technology.
<!-- /shared:byline -->

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

## Managing copy across the whole portfolio

[`scripts/readme-sync/`](scripts/readme-sync/) is the single source of truth for the
byline, tagline, and "Support this project" section that every OSS repo in the portfolio
shares -- edit it in one place, run `node scripts/readme-sync/sync.mjs`, every repo's
README updates. Discovering which repos should be onboarded is `crawl-github-repos.mjs`'s
job (a separate script here that scans the `mdostal` GitHub account and surfaces new
candidates as suggestions); once a repo is ready, add it to `scripts/readme-sync/repos.json`
+ `taglines.json`.

## Why a separate repo at all

`mdostal.com` itself is a real, existing production site (Sanity CMS, Cal.com
booking) that this project never touches. Routing tool subpaths through a
dedicated subdomain (`tools.mdostal.com`) and a dedicated, minimal router repo
keeps every tool's release cadence, CI, and blast radius fully isolated from
the main site and from each other.

## License

MIT — see [`LICENSE`](LICENSE).

<!-- shared:support -->
## Support this project

Free and open source, always. A few ways to help — or just say hi:

- **Use it, star it, file an issue.** Honestly the best support an open-source project can get. → [this project](https://github.com/mdostal/mdostal-tools-hub)
- **Hire me.** I do fractional-CTO and consulting work — fixing and scaling tech stacks. → [mdostal.com/contact](https://mdostal.com/contact)
- **[Buy me a coffee](https://www.buymeacoffee.com/mdostal)** if it saved you time.
- **More tools like this** → [tools.mdostal.com](https://tools.mdostal.com)
- **Life outside the terminal** → [life.mdostal.com](https://life.mdostal.com)
- **What we're building at Firefly Events** — event discovery, 8,000+ events/day from 7+ sources → [ff.events](https://ff.events)

Always up for a conversation if any of it's useful to you.
<!-- /shared:support -->

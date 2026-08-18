import type { NextConfig } from "next";
import { getTools } from "@/lib/tools";

/**
 * Multi-zone router: each LIVE tool's mount path is proxied to its own
 * independently-deployed Vercel project (see lib/tools.ts). A tool only
 * gets a rewrite once its origin app actually ships basePath support
 * matching its mount -- until then it stays a "coming soon" card on the
 * landing page instead of a route that would 404 or render broken assets.
 *
 * getTools() fetches the tool list from Sanity (personal-site's "tool"
 * document type) at BUILD time, falling back to a static snapshot if
 * Sanity is unreachable -- this is what makes "publish a new tool in
 * Sanity" alone enough to wire up its live route, no code change needed.
 * See that function's own comment for the exact fallback contract.
 */
const nextConfig: NextConfig = {
  // A Sanity-sourced tool's screenshot resolves to a cdn.sanity.io URL
  // (see lib/sanity.ts's sanityImageUrl) -- next/image refuses to optimize
  // any remote host that isn't explicitly allow-listed here. The local
  // /screenshots/*.png fallback path needs no entry (same-origin).
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
  },
  async rewrites() {
    const tools = await getTools();
    const liveRewrites = tools.filter((t) => t.live).flatMap((tool) => [
      { source: `/${tool.mount}`, destination: `${tool.originUrl}/${tool.mount}` },
      { source: `/${tool.mount}/:path*`, destination: `${tool.originUrl}/${tool.mount}/:path*` },
    ]);
    // Second tier: a tool that isn't live yet but has a real GitHub Pages
    // site (tool.pagesUrl) gets proxied there instead of falling through to
    // a 404 or staying stuck behind the "Download latest release" button --
    // see .pHive/epics/tool-routing-and-grouping/docs/design-discussion.md
    // §3 part A. Mutually exclusive with liveRewrites by construction (the
    // `!t.live` filter mirrors the `t.live` filter above), so a tool is
    // never in both tiers.
    //
    // Two fixes vs. the naive version of this, both load-bearing (not
    // polish -- see design-discussion.md §4):
    //   1. pagesBase normalizes tool.pagesUrl's trailing slash(es) instead
    //      of trusting stored formatting -- pagesUrl is a plain `url` field
    //      in Sanity with no pattern validation, so a future hand-entered
    //      value without a trailing slash would otherwise produce a
    //      slash-missing destination.
    //   2. The third rewrite entry is keyed on the Pages URL's OWN real
    //      path segment (new URL(pagesUrl).pathname), not just our
    //      lowercased tool.mount. scripts/crawl-github-repos.mjs's
    //      slugify() always lowercases the repo name into `mount`, but
    //      GitHub Pages preserves exact repo-name case -- so a mixed-case
    //      repo's own proxied page would request its assets against the
    //      real-case path, which a lowercase-only rewrite table would
    //      silently 404. Harmless no-op duplicate for today's all-lowercase
    //      fallback tools (coin-finder, gigradar, rolodex); load-bearing
    //      the moment a mixed-case repo (e.g. iosDiceRoller) is unhidden.
    const pagesRewrites = tools
      .filter((t) => !t.live && t.pagesUrl)
      .flatMap((tool) => {
        const pagesBase = tool.pagesUrl!.replace(/\/+$/, "") + "/";
        const pagesPath = new URL(pagesBase).pathname;
        const entries = [
          { source: `/${tool.mount}`, destination: pagesBase },
          { source: `/${tool.mount}/:path*`, destination: `${pagesBase}:path*` },
        ];
        // A bare-domain pagesUrl (no path segment, e.g. "https://x.github.io")
        // resolves pagesPath to "/" -- registering a third entry in that case
        // would produce a `/:path*` catch-all rewrite that shadows every
        // route on the entire site. The first two entries above already
        // provide working routing for the no-sub-path case; the third entry
        // only exists to handle a mismatched-case *sub-path* segment (see
        // comment above), which doesn't apply when there's no sub-path.
        if (pagesPath !== "/") {
          entries.push({ source: `${pagesPath}:path*`, destination: `${pagesBase}:path*` });
        }
        return entries;
      });
    return [...liveRewrites, ...pagesRewrites];
  },
};

export default nextConfig;

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
    return tools.filter((t) => t.live).flatMap((tool) => [
      { source: `/${tool.mount}`, destination: `${tool.originUrl}/${tool.mount}` },
      { source: `/${tool.mount}/:path*`, destination: `${tool.originUrl}/${tool.mount}/:path*` },
    ]);
  },
};

export default nextConfig;

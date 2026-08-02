import type { NextConfig } from "next";
import { TOOLS } from "@/lib/tools";

/**
 * Multi-zone router: each LIVE tool's mount path is proxied to its own
 * independently-deployed Vercel project (see lib/tools.ts). A tool only
 * gets a rewrite once its origin app actually ships basePath support
 * matching its mount -- until then it stays a "coming soon" card on the
 * landing page instead of a route that would 404 or render broken assets.
 */
const nextConfig: NextConfig = {
  async rewrites() {
    return TOOLS.filter((t) => t.live).flatMap((tool) => [
      { source: `/${tool.mount}`, destination: `${tool.originUrl}/${tool.mount}` },
      { source: `/${tool.mount}/:path*`, destination: `${tool.originUrl}/${tool.mount}/:path*` },
    ]);
  },
};

export default nextConfig;

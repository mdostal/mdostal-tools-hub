/**
 * Single source of truth for every tool this hub exposes under
 * tools.mdostal.com. Each entry drives BOTH the landing-page directory
 * listing (src/app/page.tsx) AND the multi-zone rewrites (next.config.ts)
 * that proxy a mount path here to that tool's own independently-deployed
 * Vercel project -- add a tool here once, not in two places.
 *
 * `originUrl` is the tool's own Vercel deployment, which MUST be built
 * with a matching `basePath` (e.g. mount "/allergy-locator" <-> the child
 * app's own next.config.ts sets basePath: "/allergy-locator") -- this is
 * the standard Vercel "multi-zone" pattern: the child owns its mount path
 * everywhere (its own domain included), so its internal asset/link paths
 * already match what this hub's rewrite forwards.
 */
export interface ToolEntry {
  /** URL path segment under tools.mdostal.com, no leading/trailing slash. */
  mount: string;
  label: string;
  description: string;
  originUrl: string;
  repoUrl: string;
  /** Set to true once the origin app has actually shipped basePath support
   * and the rewrite is verified working end-to-end -- the landing page
   * shows a "coming soon" state for anything still false, rather than
   * linking to a route that 404s. */
  live: boolean;
}

export const TOOLS: ToolEntry[] = [
  {
    mount: "allergy-locator",
    label: "Allergy Locator",
    description: "Pick your allergens, see where in the US is best or worst for you.",
    originUrl: "https://allergy-locator.vercel.app",
    repoUrl: "https://github.com/mdostal/allergy-locator",
    live: true,
  },
  {
    mount: "mapstack",
    label: "Mapstack",
    description: "Open-source US map layers -- pick datasets, overlay them, find what matters to you.",
    originUrl: "https://mapstack-us.vercel.app",
    repoUrl: "https://github.com/mdostal/mapstack-us",
    live: false,
  },
];

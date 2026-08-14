/**
 * The real source of truth for every tool this hub exposes under
 * tools.mdostal.com is now the "tool" document type in the personal-site
 * Sanity project (mdostal/personal-site's sanity/schemas/tool.ts) --
 * getTools() below fetches it. Adding a new tool is a Studio publish, not a
 * code change: fill in label/mount/description/originUrl/repoUrl/screenshot
 * (+ optional pagesUrl/components), hit publish, and the next build/request
 * picks it up automatically in both the landing-page cards AND the
 * multi-zone routing rewrite (next.config.ts, which also calls getTools()).
 *
 * FALLBACK_TOOLS below is the safety net, not a second source of truth to
 * keep in sync by hand -- getTools() only falls back to it when Sanity isn't
 * configured (e.g. local dev with no env vars) or a fetch genuinely fails,
 * so the site can never go fully dark over a CMS hiccup. It's snapshotted
 * from what was live before this migration; it doesn't need updating when a
 * NEW tool is added in Sanity, only if you want that new tool to survive a
 * total Sanity outage too.
 *
 * `originUrl` is the tool's own Vercel deployment, which MUST be built
 * with a matching `basePath` (e.g. mount "/allergy-locator" <-> the child
 * app's own next.config.ts sets basePath: "/allergy-locator") -- this is
 * the standard Vercel "multi-zone" pattern: the child owns its mount path
 * everywhere (its own domain included), so its internal asset/link paths
 * already match what this hub's rewrite forwards.
 */
// Relative import, not the "@/lib/sanity" alias -- next.config.ts's own
// lightweight config-transpile step (it imports getTools from this file)
// doesn't reliably resolve tsconfig path aliases for a SECOND-level import
// like this one, even though the top-level "@/lib/tools" import from
// next.config.ts itself works fine. Confirmed by a real build failure
// ("Cannot find module './src/lib/sanity'") with the aliased form.
import { allToolsQuery, sanityClient, sanityConfigured, sanityImageUrl, type SanityToolDoc } from "./sanity";

export interface ToolEntry {
  /** URL path segment under tools.mdostal.com, no leading/trailing slash. */
  mount: string;
  label: string;
  description: string;
  originUrl: string;
  repoUrl: string;
  /** The tool's own GitHub Pages project site (e.g.
   * https://mdostal.github.io/medical-study-tracker/) -- a standalone
   * landing page with a real screenshot + description, separate from both
   * the live app (originUrl) and the raw repo (repoUrl). Omitted for any
   * tool that doesn't have one yet; OpenAndSourceLinks (src/app/page.tsx)
   * only renders the "Site Page" link when this is set. */
  pagesUrl?: string;
  /** Set to true once the origin app has actually shipped basePath support
   * and the rewrite is verified working end-to-end -- the landing page
   * shows a "coming soon" state for anything still false, rather than
   * linking to a route that 404s. */
  live: boolean;
  /** Path under /public to a real screenshot of the tool's own map output
   * (captured from the live deployment, not a mockup) -- shown as the
   * card's preview thumbnail. */
  screenshot: string;
  /** Optional small brand mark (logo, not a screenshot) -- resolved CDN URL.
   * Rendered as a badge over the screenshot's top-left corner and inline
   * next to the tool's name (see page.tsx's ToolCard/FrameworkCard). Omitted
   * entirely for tools without one yet; the card layout is unchanged in
   * that case. */
  icon?: string;
  /** For a multi-component framework (not a single-purpose tool): the real
   * component/tool list, each linking directly through this hub's
   * multi-zone rewrite to that component's own live demo on the origin
   * app. Presence of this field (vs. omitted) is what makes a card render
   * as the wider "featured framework" layout instead of the standard
   * single-purpose tool card -- see src/app/page.tsx. Omitted for every
   * single-purpose tool. */
  components?: { label: string; href: string }[];
}

const FALLBACK_TOOLS: ToolEntry[] = [
  {
    mount: "allergy-locator",
    label: "Allergy Locator",
    description: "Pick your allergens, see where in the US is best or worst for you.",
    originUrl: "https://allergy-locator.vercel.app",
    repoUrl: "https://github.com/mdostal/allergy-locator",
    live: true,
    screenshot: "/screenshots/allergy-locator.png",
  },
  {
    mount: "mapstack",
    label: "Mapstack",
    description: "Open-source US map layers -- pick datasets, overlay them, find what matters to you.",
    originUrl: "https://mapstack-us.vercel.app",
    repoUrl: "https://github.com/mdostal/mapstack-us",
    live: true,
    screenshot: "/screenshots/mapstack.png",
  },
  {
    mount: "study-tracker",
    label: "Medical Study Tracker",
    description:
      "Ranks paid clinical-trial studies by net cash kept, cash velocity, and downtime -- not the headline \"up to $\" figure. Community-verified data, no accounts.",
    originUrl: "https://medical-study-tracker-seven.vercel.app",
    repoUrl: "https://github.com/mdostal/medical-study-tracker",
    pagesUrl: "https://mdostal.github.io/medical-study-tracker/",
    live: true,
    screenshot: "/screenshots/study-tracker.png",
  },
  {
    mount: "framework",
    label: "Drone Components",
    description:
      "A shadcn-style component framework for drone property intelligence -- map layer viewer, 3D/point-cloud viewer, geo-anchored model overlay, video walkthrough player, Minecraft terrain voxelizer, and the tools around them. Demoed against real drone photogrammetry, not mockups.",
    originUrl: "https://drone-hub-rust.vercel.app",
    repoUrl: "https://github.com/mdostal/drone-hub",
    live: true,
    screenshot: "/screenshots/drone-hub.png",
    // Mirrors drone-hub's own root ToC (app/page.tsx there) exactly -- kept
    // in sync by hand, same "small, low-churn hand-mirrored list" precedent
    // drone-hub's own NavStrip uses for the same reason (see that file's
    // header comment). MinecraftExport omitted here (no demo page of its
    // own -- same href as VoxelTerrain, would just duplicate a chip).
    components: [
      { label: "VideoTour", href: "/framework/components/video-tour" },
      { label: "LayerViewer", href: "/framework/components/layer-viewer" },
      { label: "Model3D", href: "/framework/components/model3d" },
      { label: "LandOverlay", href: "/framework/components/land-overlay" },
      { label: "VoxelTerrain", href: "/framework/components/voxel-terrain" },
      { label: "ContentEngine", href: "/framework/properties/2806-prado/engine" },
      { label: "FileUpload", href: "/framework/components/file-upload" },
      { label: "FileList", href: "/framework/components/file-list" },
      { label: "ProcessingStatus", href: "/framework/components/processing-status" },
      { label: "FlightCoverageAnalyzer", href: "/framework/components/flight-coverage-analyzer" },
      { label: "TourBuilder", href: "/framework/components/tour-builder" },
    ],
  },
];

function fromSanityDoc(doc: SanityToolDoc): ToolEntry {
  return {
    mount: doc.mount,
    label: doc.label,
    description: doc.description,
    originUrl: doc.originUrl,
    repoUrl: doc.repoUrl,
    pagesUrl: doc.pagesUrl || undefined,
    live: Boolean(doc.live),
    // 1200px is comfortably wider than any card's rendered width (see
    // sizes= on the <Image> in src/app/page.tsx) at 2x DPI.
    screenshot: doc.screenshot ? sanityImageUrl(doc.screenshot, 1200) : "",
    // 96px comfortably covers both render sizes (a ~36px badge and a ~20px
    // inline mark) at 2x DPI, same "comfortably wider, not exact" approach
    // as screenshot above.
    icon: doc.icon ? sanityImageUrl(doc.icon, 96) : undefined,
    components: doc.components && doc.components.length > 0 ? doc.components : undefined,
  };
}

/**
 * Called from BOTH src/app/page.tsx (the landing-page cards) and
 * next.config.ts (the multi-zone rewrites) -- same data, same fallback
 * behavior, one function. Never throws: any failure (Sanity unconfigured,
 * network error, empty result set) resolves to FALLBACK_TOOLS instead, so
 * neither call site needs its own try/catch.
 */
export async function getTools(): Promise<ToolEntry[]> {
  if (!sanityConfigured || !sanityClient) return FALLBACK_TOOLS;
  try {
    const docs = await sanityClient.fetch<SanityToolDoc[]>(
      allToolsQuery,
      {},
      { next: { revalidate: 300 } },
    );
    if (!docs || docs.length === 0) return FALLBACK_TOOLS;
    return docs.map(fromSanityDoc);
  } catch {
    return FALLBACK_TOOLS;
  }
}

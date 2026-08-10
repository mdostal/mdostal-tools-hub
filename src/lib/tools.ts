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
  /** Path under /public to a real screenshot of the tool's own map output
   * (captured from the live deployment, not a mockup) -- shown as the
   * card's preview thumbnail. */
  screenshot: string;
  /** For a multi-component framework (not a single-purpose tool): the real
   * component/tool list, each linking directly through this hub's
   * multi-zone rewrite to that component's own live demo on the origin
   * app. Presence of this field (vs. omitted) is what makes a card render
   * as the wider "featured framework" layout instead of the standard
   * single-purpose tool card -- see src/app/page.tsx. Omitted for every
   * single-purpose tool. */
  components?: { label: string; href: string }[];
}

export const TOOLS: ToolEntry[] = [
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

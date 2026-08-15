import { createClient } from "@sanity/client";
import { createImageUrlBuilder, type SanityImageSource } from "@sanity/image-url";

/**
 * Read-only client for the SAME Sanity project/dataset the personal site
 * (mdostal/personal-site) already uses for its own content -- the "tool"
 * document type lives there (sanity/schemas/tool.ts in that repo), this hub
 * is just another consumer of the same public dataset. NEXT_PUBLIC_* here
 * matches that repo's own env var names exactly, so the same values can be
 * copied straight over (they're not secrets -- a Sanity project ID/dataset
 * name is meant to be public; only write tokens are sensitive, and this app
 * never writes).
 */
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

export const sanityConfigured = Boolean(projectId);

export const sanityClient = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion: "2025-02-19",
      useCdn: true,
      perspective: "published",
    })
  : null;

const imageBuilder = sanityClient ? createImageUrlBuilder(sanityClient) : null;

/** Resolves a Sanity image field to a real, sized/optimized CDN URL. Empty string if Sanity isn't configured. */
export function sanityImageUrl(source: SanityImageSource, width = 1200): string {
  if (!imageBuilder) return "";
  return imageBuilder.image(source).width(width).auto("format").url();
}

// Only non-hidden tools, in editor-controlled order -- see that schema's own
// field comments in the personal-site repo for what each field means.
export const allToolsQuery = `*[_type == "tool" && hidden != true] | order(sortOrder asc) {
  label,
  "mount": mount.current,
  description,
  originUrl,
  repoUrl,
  pagesUrl,
  live,
  screenshot,
  icon,
  components
}`;

export interface SanityToolDoc {
  label: string;
  mount: string;
  description: string;
  originUrl: string;
  repoUrl: string;
  pagesUrl?: string;
  live: boolean;
  screenshot?: SanityImageSource;
  icon?: SanityImageSource;
  components?: { label: string; href: string }[];
}

/**
 * Every hardcoded, deployment-specific value this app used to have inline
 * (hero copy, nav/support links, footer, github account) lives here now,
 * sourced from env vars -- so forking this repo for your own GitHub/tools
 * directory means setting Vercel project env vars, not editing source.
 *
 * All defaults below are generic placeholders, not this deployment's real
 * content -- the real values for tools.mdostal.com are set as Vercel
 * project env vars (see README.md's "Forking this for your own GitHub"
 * section) and as repository variables for the crawler's GitHub Action
 * (see .github/workflows/crawl-github-repos.yml).
 */

interface LinkItem {
  label: string;
  url: string;
  description?: string;
}

/** Parses a JSON array of {label, url, description?} from an env var.
 * Falls back to `fallback` on missing/empty/malformed input -- a bad env
 * var should never crash the page, just show the generic default. */
function parseLinks(raw: string | undefined, fallback: LinkItem[]): LinkItem[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return fallback;
  } catch {
    return fallback;
  }
}

const githubAccount = process.env.NEXT_PUBLIC_GITHUB_ACCOUNT || "your-github-username";

export const siteConfig = {
  /** The GitHub account the crawler scans and this site is "the tools directory for." */
  githubAccount,
  githubProfileUrl: `https://github.com/${githubAccount}`,

  /** Absolute URL this site is deployed at -- used for OG/Twitter metadata. */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://example.com",

  /** Short wordmark shown in the header (e.g. "tools.example"). */
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || "tools.example",

  /** <title> and OG/Twitter title. */
  pageTitle: process.env.NEXT_PUBLIC_PAGE_TITLE || "Tools",

  /** <meta description> and OG/Twitter description. */
  pageDescription:
    process.env.NEXT_PUBLIC_PAGE_DESCRIPTION ||
    "Open-source tools, built and shipped in public.",

  /** Hero H1: {heroHeadline} {heroAccent -- rendered in the accent color}. */
  heroHeadline: process.env.NEXT_PUBLIC_HERO_HEADLINE || "Small, sharp tools.",
  heroAccent: process.env.NEXT_PUBLIC_HERO_ACCENT || "Free and open.",

  /** Hero paragraph, directly under the H1. */
  heroDescription:
    process.env.NEXT_PUBLIC_HERO_DESCRIPTION ||
    "Open-source utilities, built and shipped in public. If they're useful and folks want more, I'll keep shipping them.",

  /** One-line subtext under the hero paragraph. */
  heroSubtext:
    process.env.NEXT_PUBLIC_HERO_SUBTEXT || "→ Browse the tools below. Star what helps, file issues, make them better.",

  /** Cross-links shown in the header nav (e.g. links to sibling sites). */
  navLinks: parseLinks(process.env.NEXT_PUBLIC_NAV_LINKS_JSON, []),

  /** Heading for the support section near the bottom of the page. */
  supportHeading: process.env.NEXT_PUBLIC_SUPPORT_HEADING || "Support this project",

  /** Support/funding links -- rendered as a list with optional descriptions. */
  supportLinks: parseLinks(process.env.NEXT_PUBLIC_SUPPORT_LINKS_JSON, [
    { label: "Star it, file an issue", url: githubAccount ? `https://github.com/${githubAccount}` : "#" },
  ]),

  /** Footer byline, e.g. "Built by {name}." */
  ownerName: process.env.NEXT_PUBLIC_OWNER_NAME || "the maintainer",
  /** Optional italic tagline after the byline in the footer. */
  footerTagline: process.env.NEXT_PUBLIC_FOOTER_TAGLINE || "",
  /** Optional footer link next to the GitHub profile link (e.g. a personal site). */
  ownerUrl: process.env.NEXT_PUBLIC_OWNER_URL || "",
  ownerUrlLabel: process.env.NEXT_PUBLIC_OWNER_URL_LABEL || "",
};

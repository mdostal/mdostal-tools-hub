import { getTools } from "@/lib/tools";
import { siteConfig } from "@/lib/site-config";
import GroupedToolSections, { type ToolGroup } from "./GroupedToolSections";

export default async function Home() {
  const TOOLS = await getTools();
  // Live/Preview is a caller-side decision (GroupedToolSections has no
  // built-in notion of what a group is -- see that file's own comment and
  // .pHive/epics/tool-routing-and-grouping/docs/behavior-specs-slice-2.md
  // AC4). Both filters preserve TOOLS's existing relative (Sanity
  // sortOrder) order -- deliberately not re-sorted.
  const TOOL_GROUPS: ToolGroup[] = [
    { title: "Live", tools: TOOLS.filter((tool) => tool.live) },
    { title: "Preview", tools: TOOLS.filter((tool) => !tool.live) },
  ];
  return (
    <main className="min-h-full">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-8">
        <span className="font-mono text-sm font-medium tracking-tight text-foreground">
          {siteConfig.siteName}
        </span>
        <nav className="flex items-center gap-5 text-sm text-muted">
          {siteConfig.navLinks.map((link) => (
            <a key={link.url} href={link.url} className="hover:text-foreground" target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
        </nav>
      </header>

      <section className="mx-auto w-full max-w-4xl px-6 pt-8 pb-16">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {siteConfig.heroHeadline} <span className="text-accent">{siteConfig.heroAccent}</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted">{siteConfig.heroDescription}</p>
        <p className="mt-2 max-w-xl text-sm text-muted">{siteConfig.heroSubtext}</p>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 pb-24">
        <GroupedToolSections groups={TOOL_GROUPS} />
      </section>

      <section className="mx-auto w-full max-w-4xl border-t border-border px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{siteConfig.supportHeading}</h2>
        <ul className="mt-4 max-w-xl space-y-2 text-base text-muted">
          {siteConfig.supportLinks.map((link) => (
            <li key={link.url}>
              <strong className="text-foreground">{link.label}</strong>
              {link.description ? <> — {link.description}</> : null} &rarr;{" "}
              <a href={link.url} className="text-accent hover:underline" target="_blank" rel="noreferrer">
                {link.url.replace(/^https?:\/\//, "")}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mx-auto flex w-full max-w-4xl flex-col gap-2 border-t border-border px-6 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>
          Built by {siteConfig.ownerName}.{siteConfig.footerTagline ? <em> {siteConfig.footerTagline}</em> : null}
        </span>
        <div className="flex items-center gap-5">
          <a href={siteConfig.githubProfileUrl} className="hover:text-foreground" target="_blank" rel="noreferrer">
            GitHub
          </a>
          {siteConfig.ownerUrl && (
            <a href={siteConfig.ownerUrl} className="hover:text-foreground" target="_blank" rel="noreferrer">
              {siteConfig.ownerUrlLabel || siteConfig.ownerUrl.replace(/^https?:\/\//, "")} →
            </a>
          )}
        </div>
      </footer>
    </main>
  );
}

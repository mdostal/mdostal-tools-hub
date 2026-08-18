import Image from "next/image";
import { getTools } from "@/lib/tools";
import type { ToolEntry } from "@/lib/tools";
import { siteConfig } from "@/lib/site-config";

/** Badge over the screenshot's top-left corner (LiveBadge mirrors this on
 *  the right) -- only rendered when the tool has an icon field set; cards
 *  without one keep today's layout unchanged. */
function IconBadge({ tool }: { tool: ToolEntry }) {
  if (!tool.icon) return null;
  return (
    <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/70 backdrop-blur-sm">
      <Image src={tool.icon} alt="" width={36} height={36} className="h-full w-full object-cover" />
    </span>
  );
}

/** Small inline mark next to the tool's name -- same gate as IconBadge. */
function IconInline({ tool }: { tool: ToolEntry }) {
  if (!tool.icon) return null;
  return (
    <Image
      src={tool.icon}
      alt=""
      width={20}
      height={20}
      className="h-5 w-5 shrink-0 rounded-md object-cover"
    />
  );
}

function LiveBadge({ live }: { live: boolean }) {
  return live ? (
    <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
      Live
    </span>
  ) : (
    <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
      Preview only
    </span>
  );
}

/** Every tool gets up to three links, in this order: a primary "get to the
 *  thing" button, then the tool's own GitHub Pages site if it has one
 *  (tool.pagesUrl), then the source repo, always.
 *
 *  The primary button is a three-state check, in priority order:
 *   1. tool.live -- "Open →" to /<mount>, proxied to the tool's own Vercel
 *      deployment via next.config.ts's live-tier rewrite. Unchanged by the
 *      pagesUrl-fallback tier below.
 *   2. !tool.live && tool.pagesUrl -- "View →" to /<mount>, proxied instead
 *      to the tool's real GitHub Pages site via next.config.ts's second
 *      rewrite tier (see that file's own comment + design-discussion.md §3
 *      part A). Not deployed as this hub's own app, but there IS something
 *      real to click through to, so it gets the same primary bg-accent
 *      button as "Open →" -- just different copy so it doesn't overclaim
 *      "live". The "Preview only" badge (LiveBadge) still renders alongside
 *      it regardless -- that badge is about deployment status, this button
 *      is about whether there's anywhere to click through to.
 *   3. neither -- "Download latest release ↓", the true fallback for a tool
 *      with nowhere live to send a visitor at all. */
function OpenAndSourceLinks({ tool }: { tool: ToolEntry }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {tool.live ? (
        <a
          href={`/${tool.mount}`}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Open →
        </a>
      ) : tool.pagesUrl ? (
        <a
          href={`/${tool.mount}`}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          View →
        </a>
      ) : (
        <a
          href={`${tool.repoUrl}/releases/latest`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          title="Not deployed anywhere right now -- grab the newest GitHub release instead"
        >
          Download latest release ↓
        </a>
      )}
      {tool.pagesUrl && (
        <a
          href={tool.pagesUrl}
          className="text-sm text-muted hover:text-foreground"
          target="_blank"
          rel="noreferrer"
        >
          Site page
        </a>
      )}
      <a href={tool.repoUrl} className="text-sm text-muted hover:text-foreground" target="_blank" rel="noreferrer">
        Source
      </a>
    </div>
  );
}

/** Standard single-purpose-tool card — unchanged from before this file's
 *  featured-framework-card addition. */
function ToolCard({ tool }: { tool: ToolEntry }) {
  return (
    <div className="group flex flex-col justify-between gap-6 overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-accent/50">
      <div>
        <div className="relative aspect-video w-full overflow-hidden border-b border-border bg-background">
          <Image
            src={tool.screenshot}
            alt={`Real ${tool.label} map output`}
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <IconBadge tool={tool} />
          <LiveBadge live={tool.live} />
        </div>
        <div className="px-6 pt-5">
          <div className="flex items-center gap-2">
            <IconInline tool={tool} />
            <h2 className="text-lg font-semibold text-foreground">{tool.label}</h2>
          </div>
          <p className="mt-1.5 text-sm text-muted">{tool.description}</p>
        </div>
      </div>
      <div className="px-6 pb-6">
        <OpenAndSourceLinks tool={tool} />
      </div>
    </div>
  );
}

/** Featured, full-width card for a multi-component framework (currently
 *  just drone-hub) — the same screenshot/title/description/links as
 *  <ToolCard>, plus a row of real component chips (each a working link
 *  through this hub's own multi-zone rewrite to that component's live
 *  demo on the origin app), so a visitor sees "12 real, working things
 *  in here," not just one generic tool description like every other
 *  card. Rendered instead of <ToolCard> whenever `tool.components` is
 *  set — see lib/tools.ts's own field comment. */
function FrameworkCard({ tool }: { tool: ToolEntry & { components: NonNullable<ToolEntry["components"]> } }) {
  return (
    <div className="group col-span-full flex flex-col gap-6 overflow-hidden rounded-xl border border-accent/30 bg-surface transition-colors hover:border-accent/60 sm:flex-row">
      <div className="relative aspect-video w-full shrink-0 overflow-hidden border-b border-border bg-background sm:aspect-auto sm:w-72 sm:border-b-0 sm:border-r">
        <Image
          src={tool.screenshot}
          alt={`${tool.label} component library`}
          fill
          sizes="(min-width: 640px) 288px, 100vw"
          className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <IconBadge tool={tool} />
        <LiveBadge live={tool.live} />
      </div>

      <div className="flex flex-1 flex-col justify-between gap-5 px-6 pb-6 pt-5 sm:pl-0">
        <div>
          <span className="mb-1.5 inline-block text-xs font-semibold uppercase tracking-wide text-accent">
            Featured — component framework
          </span>
          <div className="flex items-center gap-2">
            <IconInline tool={tool} />
            <h2 className="text-lg font-semibold text-foreground">{tool.label}</h2>
          </div>
          <p className="mt-1.5 text-sm text-muted">{tool.description}</p>

          <ul className="mt-4 flex flex-wrap gap-2">
            {tool.components.map((c) => (
              <li key={c.href}>
                <a
                  href={c.href}
                  className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-accent/60 hover:text-accent"
                >
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <OpenAndSourceLinks tool={tool} />
      </div>
    </div>
  );
}

export default async function Home() {
  const TOOLS = await getTools();
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {TOOLS.map((tool) =>
            tool.components ? (
              <FrameworkCard key={tool.mount} tool={tool as ToolEntry & { components: NonNullable<ToolEntry["components"]> }} />
            ) : (
              <ToolCard key={tool.mount} tool={tool} />
            ),
          )}
        </div>
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

import Image from "next/image";
import { TOOLS } from "@/lib/tools";

export default function Home() {
  return (
    <main className="min-h-full">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-8">
        <span className="font-mono text-sm font-medium tracking-tight text-foreground">
          tools<span className="text-muted">.</span>mdostal
        </span>
        <nav className="flex items-center gap-5 text-sm text-muted">
          <a href="https://life.mdostal.com" className="hover:text-foreground" target="_blank" rel="noreferrer">
            life.mdostal.com →
          </a>
          <a href="https://mdostal.com" className="hover:text-foreground" target="_blank" rel="noreferrer">
            mdostal.com →
          </a>
        </nav>
      </header>

      <section className="mx-auto w-full max-w-4xl px-6 pt-8 pb-16">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Open tools, <span className="text-accent">built and shipped in public.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted">
          A working shelf of open-source tools — real data, real methodology docs, MIT
          licensed. Pick one below.
        </p>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <div
              key={tool.mount}
              className="group flex flex-col justify-between gap-6 overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-accent/50"
            >
              <div>
                <div className="relative aspect-video w-full overflow-hidden border-b border-border bg-background">
                  <Image
                    src={tool.screenshot}
                    alt={`Real ${tool.label} map output`}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  {tool.live ? (
                    <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                      Live
                    </span>
                  ) : (
                    <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      Preview only
                    </span>
                  )}
                </div>
                <div className="px-6 pt-5">
                  <h2 className="text-lg font-semibold text-foreground">{tool.label}</h2>
                  <p className="mt-1.5 text-sm text-muted">{tool.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 px-6 pb-6">
                {tool.live ? (
                  <a
                    href={`/${tool.mount}`}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                  >
                    Open →
                  </a>
                ) : (
                  <a
                    href={tool.originUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:border-accent/50"
                    title="Not yet mounted at this domain -- opens the standalone deployment instead"
                  >
                    Preview ↗
                  </a>
                )}
                <a
                  href={tool.repoUrl}
                  className="text-sm text-muted hover:text-foreground"
                  target="_blank"
                  rel="noreferrer"
                >
                  Source
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-4xl flex-col gap-2 border-t border-border px-6 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>MIT licensed. Built by Mathew Dostal.</span>
        <div className="flex items-center gap-5">
          <a href="https://github.com/mdostal" className="hover:text-foreground" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="https://mdostal.com" className="hover:text-foreground" target="_blank" rel="noreferrer">
            mdostal.com →
          </a>
        </div>
      </footer>
    </main>
  );
}

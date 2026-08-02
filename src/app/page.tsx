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
              className="group flex flex-col justify-between gap-6 rounded-xl border border-border bg-surface p-6 transition-colors hover:border-accent/50"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 font-mono text-sm font-semibold text-accent">
                    {tool.label.slice(0, 1)}
                  </span>
                  {tool.live ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                      Live
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-muted">Preview only</span>
                  )}
                </div>
                <h2 className="mt-4 text-lg font-semibold text-foreground">{tool.label}</h2>
                <p className="mt-1.5 text-sm text-muted">{tool.description}</p>
              </div>

              <div className="flex items-center gap-4">
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

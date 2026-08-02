import { TOOLS } from "@/lib/tools";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Live, open-source tools at tools.mdostal.com.
        </p>
      </div>

      <ul className="flex flex-col gap-4">
        {TOOLS.map((tool) => (
          <li
            key={tool.mount}
            className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div>
              <p className="font-medium">{tool.label}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{tool.description}</p>
              <a
                href={tool.repoUrl}
                className="mt-1 inline-block text-xs text-blue-600 hover:underline dark:text-blue-400"
                target="_blank"
                rel="noreferrer"
              >
                Source on GitHub
              </a>
            </div>
            {tool.live ? (
              <a
                href={`/${tool.mount}`}
                className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
              >
                Open
              </a>
            ) : (
              <a
                href={tool.originUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                title="Not yet mounted at this domain -- opens the standalone deployment instead"
              >
                Preview ↗
              </a>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

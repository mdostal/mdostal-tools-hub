#!/usr/bin/env node
// Scans every public repo under GITHUB_ACCOUNT, filters down to real
// candidate tools, and writes each as a hidden/unpublished Sanity "tool"
// suggestion document for human review -- never live, never auto-published.
// Defaults to a dry-run (prints a summary table, writes nothing); pass
// --write to actually create documents.
//
// Behavior specs: .pHive/epics/github-repo-crawler/docs/behavior-specs.md
// Design context: .pHive/epics/github-repo-crawler/docs/design-discussion.md
//
// Env vars (never hardcode these -- see .env.example):
//   GITHUB_ACCOUNT -- the GitHub account to scan. Required (no default --
//     scanning an unintended account by accident is worse than failing loud).
//   NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET (default "production")
//     -- public config, not secrets (see src/lib/sanity.ts's own comment).
//     Used even in dry-run mode for the Sanity dedup-check read; if absent,
//     dry-run still works, it just skips that check with a warning.
//   SANITY_API_WRITE_TOKEN -- required only when --write is passed.
//   GITHUB_TOKEN (optional) -- sent as `Authorization: Bearer <token>` if
//     present; omitted entirely if absent (unauthenticated GitHub API calls
//     still work, just at the lower 60/hr rate limit).
//
// Usage:
//   GITHUB_ACCOUNT=you node scripts/crawl-github-repos.mjs              # dry-run, prints summary
//   GITHUB_ACCOUNT=you node scripts/crawl-github-repos.mjs --write       # actually creates docs
//
//   GITHUB_ACCOUNT=you NEXT_PUBLIC_SANITY_PROJECT_ID=... NEXT_PUBLIC_SANITY_DATASET=production \
//   SANITY_API_WRITE_TOKEN=... node scripts/crawl-github-repos.mjs --write

import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const GITHUB_ACCOUNT = process.env.GITHUB_ACCOUNT;

if (!GITHUB_ACCOUNT) {
  console.error("Missing GITHUB_ACCOUNT. Set it to the GitHub account to scan (see .env.example).");
  process.exit(1);
}

// This repo's own name, so it always self-excludes regardless of what the
// repo is called -- derived from package.json rather than hardcoded, since
// a fork won't necessarily keep the same repo name.
const SELF_REPO = JSON.parse(
  readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8"),
).name;

// Manual denylist for repos that pass the mechanical filters but still
// aren't tools -- empty by default, a future addition here is a one-line
// edit, not a code change. GITHUB_ACCOUNT's own GitHub profile-README repo
// (a special repo named exactly the account name) always self-excludes: it
// has a real description ("Personal Readme Page" or similar) so it passes
// the mechanical filter every time, but it is never a "tool." Found by a
// real crawl run creating a bad suggestion for it.
const EXCLUDED_REPOS = [GITHUB_ACCOUNT];

const DESCRIPTION_MAX_LENGTH = 280;

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const writeToken = process.env.SANITY_API_WRITE_TOKEN;
const githubToken = process.env.GITHUB_TOKEN;

const WRITE = process.argv.includes("--write");

if (WRITE && !writeToken) {
  console.error("Missing SANITY_API_WRITE_TOKEN. --write requires a Sanity write token.");
  process.exit(1);
}

// Read-only client for the dedup-check query, mirroring src/lib/sanity.ts's
// own pattern (apiVersion/useCdn/perspective), but this script needs its own
// client instance since src/lib/sanity.ts is read-only reference, not
// imported here (this script lives outside the Next.js app runtime).
const readClient = projectId
  ? createClient({ projectId, dataset, apiVersion: "2025-02-19", useCdn: true, perspective: "published" })
  : null;

// A second client authorized to write, only constructed when actually
// writing -- keeps the write token out of any code path that doesn't need it.
const writeClient =
  WRITE && projectId
    ? createClient({ projectId, dataset, apiVersion: "2025-02-19", token: writeToken, useCdn: false })
    : null;

function githubHeaders(accept) {
  const headers = { Accept: accept };
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`;
  return headers;
}

async function fetchAllRepos() {
  const repos = [];
  let page = 1;
  for (;;) {
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_ACCOUNT}/repos?per_page=100&page=${page}&type=owner`,
      { headers: githubHeaders("application/vnd.github+json") },
    );
    if (!res.ok) {
      throw new Error(`GitHub API error listing repos (page ${page}): ${res.status} ${res.statusText}`);
    }
    const batch = await res.json();
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return repos;
}

async function fetchReadme(repoName) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_ACCOUNT}/${repoName}/readme`, {
    headers: githubHeaders("application/vnd.github.raw"),
  });
  if (!res.ok) return null; // 404 (no README) or any other failure -- treat as "no signal"
  return res.text();
}

// README description-fallback heuristic: skip ATX headings, horizontal
// rules, blank lines, pure badge/image lines, and list items, then take the
// first real paragraph. Grounded against coin-finder's actual README shape:
//   # title -> blank -> --- -> blank -> ## Overview -> blank -> --- -> blank -> real paragraph
// Also grounded against ClusterExample's README, which leads with a bulleted
// setup list right after its heading -- list items are structural markdown,
// not prose, and must be skipped the same as headings/rules/badges rather
// than concatenated into a garbled "description".
const ATX_HEADING = /^#{1,6}\s/;
const HORIZONTAL_RULE = /^(-{3,}|\*{3,}|_{3,})$/;
const BADGE_OR_IMAGE = /^!\[.*\]\(.*\)$/;
const LIST_ITEM = /^(?:[-*+]\s|\d+\.\s)/;

function deriveDescriptionFromReadme(readme) {
  if (!readme) return null;
  const lines = readme.split("\n");

  // Find the first line that isn't blank, an ATX heading, a horizontal
  // rule, a pure badge/image line, or a list item -- that's the start of
  // the first real paragraph.
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line === "") continue;
    if (ATX_HEADING.test(line)) continue;
    if (HORIZONTAL_RULE.test(line)) continue;
    if (BADGE_OR_IMAGE.test(line)) continue;
    if (LIST_ITEM.test(line)) continue;
    start = i;
    break;
  }
  if (start === -1) return null;

  // Markdown paragraphs can wrap across multiple non-blank lines -- collect
  // the rest of the paragraph until the next blank line, or until a list
  // item starts (a list is a separate structural block, not a continuation
  // of the preceding prose -- e.g. ClusterExample's "To run the
  // application..." sentence is immediately followed by a bullet list on
  // the very next line, with no blank line between them).
  const paragraphLines = [];
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line === "") break;
    if (i > start && LIST_ITEM.test(line)) break;
    paragraphLines.push(line);
  }
  const paragraph = paragraphLines.join(" ");
  return paragraph.length > DESCRIPTION_MAX_LENGTH
    ? `${paragraph.slice(0, DESCRIPTION_MAX_LENGTH - 1)}…`
    : paragraph;
}

function humanizeLabel(repoName) {
  return repoName
    .replace(/[-_]+/g, " ")
    .trim()
    .split(" ")
    .map((word) => (word.length ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function slugify(repoName) {
  return repoName
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchExistingRepoUrls() {
  if (!readClient) {
    console.warn(
      "Warning: NEXT_PUBLIC_SANITY_PROJECT_ID not set -- skipping Sanity dedup-check. " +
        "Already-listed repos will not be detected this run.",
    );
    return null;
  }
  try {
    const docs = await readClient.fetch(`*[_type == "tool"]{repoUrl}`);
    return new Set(docs.map((d) => d.repoUrl).filter(Boolean));
  } catch (err) {
    console.warn(`Warning: Sanity dedup-check query failed (${err.message}) -- continuing without it.`);
    return null;
  }
}

async function suggestionAlreadyExists(id) {
  if (!readClient) return false;
  const existing = await readClient.fetch(`*[_id == $id][0]{_id}`, { id });
  return Boolean(existing);
}

const DESCRIPTION_COLUMN_MAX_LENGTH = 60;

function truncateForColumn(text, maxLength) {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function printSummaryTable(rows) {
  const columns = ["repo", "verdict", "description", "written"];
  const widths = columns.map((col) =>
    Math.max(col.length, ...rows.map((r) => String(r[col] ?? "").length)),
  );
  const formatRow = (cells) => cells.map((cell, i) => String(cell).padEnd(widths[i])).join("  ");
  console.log(formatRow(columns));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const row of rows) {
    console.log(formatRow(columns.map((col) => row[col] ?? "")));
  }
}

async function main() {
  console.log(`Crawling public repos for GitHub account "${GITHUB_ACCOUNT}"...`);
  const repos = await fetchAllRepos();
  const existingRepoUrls = await fetchExistingRepoUrls();

  const rows = [];
  let suggestedCount = 0;

  for (const repo of repos) {
    const row = { repo: repo.name, verdict: "", description: "", written: "" };

    if (repo.fork) {
      row.verdict = "skipped: fork";
      rows.push(row);
      continue;
    }
    if (repo.archived) {
      row.verdict = "skipped: archived";
      rows.push(row);
      continue;
    }
    if (repo.name === SELF_REPO) {
      row.verdict = "skipped: self";
      rows.push(row);
      continue;
    }
    if (existingRepoUrls && existingRepoUrls.has(repo.html_url)) {
      row.verdict = "skipped: already-listed";
      rows.push(row);
      continue;
    }
    if (EXCLUDED_REPOS.includes(repo.name)) {
      row.verdict = "skipped: excluded";
      rows.push(row);
      continue;
    }

    let description = repo.description || null;
    if (!description) {
      const readme = await fetchReadme(repo.name);
      description = deriveDescriptionFromReadme(readme);
    }
    if (!description) {
      row.verdict = "skipped: no-signal";
      rows.push(row);
      continue;
    }
    row.description = truncateForColumn(description, DESCRIPTION_COLUMN_MAX_LENGTH);

    const mount = slugify(repo.name);
    const suggestionId = `tool-suggestion-${mount}`;

    if (await suggestionAlreadyExists(suggestionId)) {
      row.verdict = "skipped: already-suggested";
      row.written = "already suggested, skipping";
      rows.push(row);
      continue;
    }

    const doc = {
      _id: suggestionId,
      _type: "tool",
      label: humanizeLabel(repo.name),
      mount: { _type: "slug", current: mount },
      description,
      repoUrl: repo.html_url,
      hidden: true,
      live: false,
    };
    if (repo.homepage) doc.originUrl = repo.homepage;

    row.verdict = "suggested";
    suggestedCount += 1;

    if (WRITE && writeClient) {
      try {
        await writeClient.create(doc);
        row.written = "created";
      } catch (err) {
        row.written = `error: ${err.message}`;
      }
    } else {
      row.written = "would create (dry-run)";
    }

    rows.push(row);
  }

  console.log("");
  printSummaryTable(rows);
  console.log("");
  console.log(`${suggestedCount} repo(s) suggested out of ${repos.length} scanned.`);
  if (suggestedCount === 0) {
    console.log("No eligible candidates found this run.");
  }
  if (!WRITE) {
    console.log("Dry-run only -- no Sanity documents were created. Re-run with --write to persist.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

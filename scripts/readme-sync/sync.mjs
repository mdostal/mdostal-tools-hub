#!/usr/bin/env node
// readme-sync — one source of truth for byline / tagline / support across many repos.
// GitHub has no native README includes, so this fills marked regions instead.
//
//   node sync.mjs --init   # insert missing marker pairs, then fill (run once per repo)
//   node sync.mjs          # re-fill existing markers (run any time you edit a snippet)
//   node sync.mjs --dry    # show what would change, write nothing
//
// Edit the source in ONE place: byline.md, support.md, taglines.json. Then run.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry');
const INIT = args.has('--init');

const repos = JSON.parse(readFileSync(join(HERE, 'repos.json'), 'utf8'));
const taglines = JSON.parse(readFileSync(join(HERE, 'taglines.json'), 'utf8'));
const byline = readFileSync(join(HERE, 'byline.md'), 'utf8').trim();
const supportTpl = readFileSync(join(HERE, 'support.md'), 'utf8').trim();

const block = (name, body) => `<!-- shared:${name} -->\n${body}\n<!-- /shared:${name} -->`;
const has = (md, name) => md.includes(`<!-- shared:${name} -->`);

function fill(md, name, body) {
  const re = new RegExp(`<!-- shared:${name} -->[\\s\\S]*?<!-- /shared:${name} -->`);
  return re.test(md) ? { md: md.replace(re, block(name, body)), had: true } : { md, had: false };
}

function ensureMarkers(md) {
  // Dedupe: drop any pre-existing unmarked byline line before re-inserting.
  if (!has(md, 'byline')) md = md.replace(/^Built by \[Mathew Dostal\][^\n]*\n?/m, '');
  // Insert tagline + byline markers right after the first H1.
  const lines = md.split('\n');
  const h1 = lines.findIndex((l) => /^#\s/.test(l));
  const top = [];
  if (!has(md, 'tagline')) top.push(block('tagline', ''));
  if (!has(md, 'byline')) top.push(block('byline', ''));
  if (top.length) {
    if (h1 >= 0) lines.splice(h1 + 1, 0, '', ...top);
    else lines.unshift(...top, '');
    md = lines.join('\n');
  }
  // Support: ADOPT an existing unmarked "## Support" section (dedupe + normalize), else append.
  if (!has(md, 'support')) {
    const re = /(?:^|\n)(#{2,}\s*Support[^\n]*[\s\S]*?)(?=\n#{1,6}\s|\s*$)/i;
    const m = md.match(re);
    if (m) md = md.replace(m[1], block('support', ''));
    else md = md.replace(/\s*$/, '') + '\n\n' + block('support', '') + '\n';
  }
  return md;
}

let changed = 0, skipped = 0;
for (const r of repos) {
  if (!r.path || r.path.startsWith('CONFIRM')) { console.log(`⏭  ${r.key}: set its path in repos.json`); skipped++; continue; }
  const file = join(r.path, 'README.md');
  let md;
  try { md = readFileSync(file, 'utf8'); } catch { console.log(`⏭  ${r.key}: no README.md at ${r.path}`); skipped++; continue; }

  const before = md;
  if (INIT) md = ensureMarkers(md);
  const tagline = taglines[r.key];
  if (!tagline) console.log(`⚠  ${r.key}: no tagline in taglines.json`);
  const support = supportTpl.replaceAll('{{REPO_URL}}', r.repoUrl || '');

  const missing = [];
  let res;
  res = fill(md, 'tagline', tagline ? `> ${tagline}. Free & open source.` : ''); md = res.md; if (!res.had) missing.push('tagline');
  res = fill(md, 'byline', byline); md = res.md; if (!res.had) missing.push('byline');
  res = fill(md, 'support', support); md = res.md; if (!res.had) missing.push('support');

  if (md !== before) {
    if (DRY) console.log(`~  ${r.key}: would update`);
    else { writeFileSync(file, md); console.log(`✔  ${r.key}: updated`); }
    changed++;
  } else {
    console.log(`=  ${r.key}: no change${missing.length ? `  (missing markers: ${missing.join(', ')} — run: node sync.mjs --init)` : ''}`);
  }
}
console.log(`\n${DRY ? '[dry] ' : ''}${changed} updated, ${skipped} skipped.`);

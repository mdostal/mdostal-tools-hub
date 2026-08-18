# Behavior Specs — Slice 3: Family-Only FrameworkCard (Pantheon)

Source: design-discussion.md §3 part B item 1 ("Pantheon" as a
`FrameworkCard`-shaped entry, reusing the existing pattern exactly, zero
schema/code change) — now being built for real, not deferred, per this
story's own scope.

`FrameworkCard` (src/app/GroupedToolSections.tsx) today unconditionally
renders `<OpenAndSourceLinks tool={tool} />` at the bottom of every card that
has `tool.components` set. `OpenAndSourceLinks` itself branches on
`tool.live` / `tool.pagesUrl` / neither to pick a primary button, and
separately renders a "Site page" link whenever `tool.pagesUrl` is set and a
"Source" link unconditionally pointing at `tool.repoUrl`. A tool like the
upcoming "Pantheon" doc has **none** of `live`, `pagesUrl`, or `originUrl` —
it isn't a deployed thing of its own, just a labeled umbrella over chips that
each link elsewhere. Today's code would still call `OpenAndSourceLinks` for
it and render a "Download latest release ↓" button pointing at
`${tool.repoUrl}/releases/latest` — but Pantheon has no `repoUrl` either (it
isn't a single repo), so that fallback button would be broken/misleading.
This slice's fix: suppress `OpenAndSourceLinks` entirely for this shape of
tool, render everything else in `FrameworkCard` unchanged.

## Real fixture data (queried directly from Sanity, project `dafshiq1`,
dataset `production`, 2026-08-18)

**`tool-framework` (drone-hub) — the regression-risk case, AC2 below.** This
is the ONLY real `tool` doc with `components` set today, so it's the load
-bearing "don't break this" fixture:

```json
{
  "_id": "tool-framework",
  "label": "Drone Components",
  "mount": "framework",
  "live": true,
  "originUrl": "https://drone-hub-rust.vercel.app",
  "repoUrl": "https://github.com/mdostal/drone-hub",
  "pagesUrl": "https://mdostal.github.io/drone-hub/",
  "components": [ /* 11 real chips, e.g. VideoTour, LayerViewer, Model3D, ... */ ]
}
```

Note all three of `live`/`pagesUrl`/`originUrl` are set (not just `live`) —
this matters for AC2: `OpenAndSourceLinks` for drone-hub renders THREE
things today, not one: the primary "Open →" button (branch 1, `tool.live`
true), a separate "Site page" link (because `tool.pagesUrl` is also set —
that block is independent of the primary-button branch), and "Source". A
spec or implementation that only checks "does the primary button still say
Open →" and ignores the Site-page link would under-verify this case.

**Synthetic "family-only" fixture — the new case, AC1/AC3 below.** No real
Sanity doc exists yet at spec-writing time (Pantheon is created as part of
this same story, by the developer, after these specs). Shape, matching
exactly what the story instructs the developer to create:

```json
{
  "_id": "tool-pantheon",
  "label": "Pantheon",
  "mount": "pantheon",
  "live": false,
  "originUrl": null,
  "pagesUrl": null,
  "repoUrl": null,
  "components": [{ "label": "Portunus", "href": "/portunus" }]
}
```

`originUrl`/`pagesUrl`/`repoUrl` all being `null` (Sanity's actual runtime
representation for an unset field on a doc that doesn't set them, per the
GROQ projection — confirmed against `coin-finder`/`gigradar`/`rolodex`,
which today have `originUrl: null` for the same reason) rather than the
field being absent from the JSON entirely — same shape, `!tool.originUrl`
etc. treats both as falsy, so this distinction doesn't change behavior, but
an implementation or test that only tries `originUrl === undefined` and not
`null`/`""` would be wrong.

---

## AC1 — Family-only card: no OpenAndSourceLinks row at all

**Given** a tool with `components` set (so it's already decided to render as
`FrameworkCard`, not `ToolCard` — that decision itself is untouched by this
slice) AND `!tool.live && !tool.pagesUrl && !tool.originUrl` (the "family
-only" condition — e.g. the Pantheon fixture above)
**When** `FrameworkCard` renders
**Then** the card's title (`tool.label`), description (`tool.description`),
"Featured — component framework" eyebrow label, screenshot area (if
`tool.screenshot` resolves to something — an empty string per
`sanityImageUrl`'s "no Sanity configured" fallback is a pre-existing,
separate concern, not new to this slice), `IconBadge`/`IconInline` (gated on
`tool.icon` same as always), `LiveBadge` (still renders "Preview only" —
`LiveBadge` is untouched, still purely a function of `tool.live`), and the
full `tool.components` chip list all render exactly as they do for any other
`FrameworkCard` today.
**And** no `OpenAndSourceLinks` output renders at all: no "Open →" / "View
→" / "Download latest release ↓" button, no "Site page" link, no "Source"
link, and no leftover empty wrapping `<div>` where that row used to be (i.e.
the whole `<OpenAndSourceLinks tool={tool} />` call is skipped, not
rendered-with-nothing-inside).
**And** this is true regardless of whether `originUrl` is `null`, `undefined`,
or `""` on the underlying doc — all three count as "no meaningful deployed
identity," not just one specific falsy representation.

---

## AC2 — drone-hub is byte-identical to before this slice (regression case)

**Given** the real `tool-framework` doc above (`live: true`, `originUrl` AND
`pagesUrl` AND `repoUrl` all set, `components` set — i.e. explicitly NOT the
family-only condition, since `tool.live` alone already makes
`!tool.live` false)
**When** `FrameworkCard` renders for drone-hub
**Then** `OpenAndSourceLinks` renders exactly as it does today, unchanged by
this slice: the primary button reads "Open →" (branch 1: `tool.live` is
true — never reaches the family-only check at all, the same three-way
if/else in `OpenAndSourceLinks` is untouched code), a "Site page" link to
`https://mdostal.github.io/drone-hub/` renders (because `tool.pagesUrl` is
set — independent of the primary-button branch), and a "Source" link to
`https://github.com/mdostal/drone-hub` renders.
**And** every other part of the card (title "Drone Components", description,
all 11 component chips, eyebrow label, badges) is unaffected — this AC exists
specifically to confirm the family-only conditional added inside
`FrameworkCard` is scoped to the `OpenAndSourceLinks` call site only and does
not accidentally change the condition under which any other part of the card
renders.

---

## AC3 — Portunus chip inside a family-only card links to `/portunus`

**Given** the Pantheon fixture above, with
`components: [{ label: "Portunus", href: "/portunus" }]`
**When** `FrameworkCard` renders its component-chip list
**Then** exactly one chip renders with visible text "Portunus" and an `href`
of `/portunus` (relative, no leading `https://`, no trailing slash) — same
`<a>` markup/classes every other component chip uses today (`inline-flex
items-center rounded-full border border-border px-3 py-1 text-xs font-medium
...`), nothing chip-specific added for this being a cross-tool link instead
of a same-app subroute (a chip's `href` is just a string — see
design-discussion.md §2's own note that nothing about the field requires
same-app hrefs).
**Note (out of scope for this AC, flagged so it isn't silently assumed):**
whether `/portunus` itself currently resolves to anything live is a separate
concern — at spec-writing time the real `tool-suggestion-portunus` Sanity doc
is `hidden: true` with no `live`/`pagesUrl` set, so `/portunus` has no
routing rewrite registered for it yet. This slice is about the chip's
`href` value being correct data, not about guaranteeing the destination
resolves — that's downstream of Portunus itself going live/hidden:false in
a future story, same "known move" pattern this slice's own CONTEXT.md update
documents for the next Pantheon member.

---

## AC4 — Family-only condition, precisely, including boundary cases

**Given** the condition is `!tool.live && !tool.pagesUrl && !tool.originUrl`
**Then** these boundary cases behave as follows:
- `live: false`, `pagesUrl` unset, `originUrl` unset, `components` set →
  family-only (AC1 applies). This is Pantheon today.
- `live: true`, everything else unset, `components` set → NOT family-only
  (`!tool.live` alone is false) → full `OpenAndSourceLinks` renders, hitting
  its own "Download latest release ↓" branch if `repoUrl` also happens to be
  unset — an odd but pre-existing/unrelated edge case this slice doesn't
  need to fix, since `live: true` already means there's a real deployed
  identity by definition.
- `live: false`, `pagesUrl` SET, `originUrl` unset, `components` set → NOT
  family-only (`!tool.pagesUrl` is false) → full `OpenAndSourceLinks`
  renders, "View →" branch. (No real tool is in this exact shape with
  `components` set today, but the condition must not accidentally treat a
  pagesUrl-fallback framework as family-only.)
- `live: false`, `pagesUrl` unset, `originUrl` SET, `components` set → NOT
  family-only (`!tool.originUrl` is false) → full `OpenAndSourceLinks`
  renders, "Download latest release ↓" branch (there's a real repo/origin
  even if not live/paged).
**And** the condition does not reference `tool.repoUrl` — a family-only tool
may have `repoUrl` unset too (Pantheon does, deliberately, since it isn't a
single repo), but `repoUrl` isn't part of what defines "family-only"; it's
simply irrelevant once `OpenAndSourceLinks` (the only place that reads
`repoUrl`) is skipped entirely.
**And** the condition is evaluated only inside `FrameworkCard`, only for
tools that already have `components` set — it must not be added to, or
change, the `tool.components ? <FrameworkCard/> : <ToolCard/>` branch
decision in `GroupedToolSections`'s render loop, which stays exactly as-is.

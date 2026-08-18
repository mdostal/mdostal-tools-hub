# Horizontal Plan: tool-routing-and-grouping

Scope revised after the design-discussion review gate: build a real, reusable
grouping/section component now (not defer it), ship the Pantheon featured card
now with its one public member, and give non-live tools distinct button wording
per state rather than a single fallback label. This is now Medium scope --
multiple layers, coordinated changes.

## Layers

### 1. Routing layer (`next.config.ts`)
The pagesUrl-fallback rewrite tier (3-entry pattern from the design discussion:
mount, mount/:path*, and the Pages URL's own real-case path segment). No
dependency on the other layers -- purely a rewrite-table addition.

### 2. Button-state layer (`src/app/page.tsx` -- `OpenAndSourceLinks`)
Three distinct primary-CTA states instead of two:
- `live: true` -> "Open →" (unchanged)
- `live: false` + `pagesUrl` set -> "View →" (new)
- neither -> "Download latest release ↓" (unchanged, now the true fallback of
  three tiers instead of two)
Depends on layer 1 existing conceptually (the button text change is meaningless
without the routing to back it), but is a separate code change (different
function, `OpenAndSourceLinks` vs. `next.config.ts`) and can be built/reviewed
independently -- they land in the same story since they're both small and
tightly coupled to the same "what does a non-live tool's card offer" question.

### 3. Grouping/sectioning component layer (new: `src/app/GroupedToolSections.tsx`
or similar -- exact naming decided in the vertical plan)
A real, reusable component for rendering the tool list as labeled,
independently-titled sections (not a one-off two-`<section>` hardcode). Takes an
ordered list of `{ title, tools }` groups and renders each as its own labeled
block using the existing `ToolCard`/`FrameworkCard` render logic per tool. This
is the layer that makes "add another section later" (a third grouping beyond
Live/Preview, e.g. a future "Archived" or "Experimental" bucket) a data change,
not a new component. First real usage: Live (derived from `tool.live`) and
Preview (everything else) as the two initial groups.

**Explicitly not building in this layer:** collapse/expand interactivity,
animation, or a client-side toggle. The request asked for a way to keep the page
navigable as it grows -- labeled sections alone (a real information-architecture
improvement) address that. Collapsible/expandable behavior is additive UI polish
that can layer onto this component later without changing its data shape, and
adding client-side interactivity to what's currently an `async function Home()`
server component is a bigger, separate architectural question (would need a
client boundary) not warranted by "keep it navigable" alone.

### 4. Pantheon family card layer (`src/app/page.tsx` -- `FrameworkCard` +
Sanity content)
Two parts:
- **Code:** `FrameworkCard` currently always renders `OpenAndSourceLinks`, which
  assumes the card represents one deployed thing with its own meaningful
  `originUrl`/`repoUrl`. A pure family/grouping card (Pantheon) has neither in
  the meaningful sense -- it isn't itself deployed anywhere. `FrameworkCard`
  needs a way to render *without* a primary action row when the tool is
  family-only, while still rendering one when a framework card legitimately has
  both (drone-hub: real components AND a real deployed app).
- **Content:** one hand-curated Sanity tool doc for "Pantheon" with
  `components: [{label: "Portunus", href: "/portunus"}]` (just the one public
  member today), placed in the grouping layer's structure (likely inside the
  "Live" or a dedicated top section -- vertical plan decides).
Depends on layer 3 existing (the Pantheon card needs to render *within* whichever
section structure layer 3 establishes) and is a genuinely separate concern from
layers 1-2 (routing/button wording) -- no code overlap.

## Cross-layer dependencies

```
Layer 1 (routing) ---independent---
Layer 2 (button wording) --- reads layer-1 concept, separate code, same story
Layer 3 (grouping component) ---independent of 1+2---
Layer 4 (Pantheon card) --- depends on layer 3 (needs a section to render in)
                         --- depends on a FrameworkCard code change (own subtask)
```

No layer requires a schema change in `personal-site` -- everything reuses fields
that already exist (`live`, `pagesUrl`, `components`).

# Vertical Plan: tool-routing-and-grouping

Three slices, each leaving the site in a genuinely working, deployed state.
Sequential (each depends on the prior slice existing on `main`), matching this
repo's single-commit-per-story convention.

## Slice 1 — Routing fallback + tiered button wording

**Delivers:** `coin-finder`, `gigradar`, `rolodex` become clickable ("View →")
and resolve to their real GitHub Pages sites. `next.config.ts` gets the 3-entry
pagesUrl-fallback rewrite tier (mount / mount:path* / real-case-path:path*, all
built from a normalized `pagesBase`). `OpenAndSourceLinks` gets the third button
state. No new component, no schema change -- the smallest possible working
increment, and the one piece of this epic that was unambiguously requested
from the start (not scope-expanded at the review gate).

**Working state after this slice:** the site looks and behaves exactly as
today except those 3 (soon more, as the crawler surfaces new pagesUrl-having
suggestions) tools are now clickable instead of dead-ended on a download link.

## Slice 2 — Reusable grouping component + Live/Preview sections

**Delivers:** `GroupedToolSections` (or final chosen name) component,
consuming an ordered `{title, tools}[]` list and rendering each group's tools
via the existing `ToolCard`/`FrameworkCard` logic (unchanged) under a labeled
heading. `src/app/page.tsx`'s tool-rendering `<section>` is replaced with this
component, fed two groups computed from `tool.live`: "Live" and "Preview."

**Working state after this slice:** every tool still renders exactly as before
(same cards, same routing from slice 1), just under two labeled headings
instead of one flat grid. Zero visual regression for card content itself --
purely an information-architecture change.

## Slice 3 — Pantheon featured card

**Delivers:** `FrameworkCard` gains a family-only render path (no
`OpenAndSourceLinks` row when the tool has `components` but no live/pagesUrl
identity of its own). One new Sanity tool doc: "Pantheon," `components:
[{label: "Portunus", href: "/portunus"}]`, placed in the Live section (it's a
real, current, working piece of the family, even though the umbrella entry
itself isn't "deployed" anywhere) -- alternatively a new dedicated top section;
final placement is an implementation-time call the developer makes and notes
in their step summary, not a planning-time fork, since it doesn't change any
code shape either way.

**Working state after this slice:** the full epic is delivered. Depends on
slice 2 existing (needs a section to render inside).

## Dependency graph

```
slice-1-routing-and-buttons
slice-2-grouping-component --> slice-3-pantheon-card
```

Slice 1 has no dependency on slices 2/3 and could theoretically run in
parallel, but ships sequentially anyway since these are small, single-developer
stories in a repo with a fine-grained/single-commit convention -- no benefit to
parallel dispatch here (see `parallel_allowed` guidance: none of these are
`read-only`, `variation`, or a cleanly `bounded-slice` pair with disjoint
declared touch-sets, since slice 1 and slice 2 both touch `src/app/page.tsx`).

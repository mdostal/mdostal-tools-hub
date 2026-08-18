# Behavior Specs — Slice 2: Reusable Grouping Component + Live/Preview Sections

Source: design-discussion.md §3 part B item 2 (Live/Preview sectioning) and
horizontal-plan.md layer 3 (grouping/sectioning component — real reusable
component, ordered `{title, tools}[]` data shape, explicitly NOT
collapse/expand/animation/client-state).

Fixtures below are real, queried directly from Sanity (project `dafshiq1`,
dataset `production`) on 2026-08-18 via the `allToolsQuery` shape (`hidden !=
true`, `order(sortOrder asc)`) — NOT the 4-live/5-preview/9-total counts named
in the story description, which are stale. The actual current visible set is
**7 tools total: 4 live, 3 preview**, in this exact `sortOrder`:

```
sortOrder  mount             label                   live
0          allergy-locator   Allergy Locator         true
1          mapstack          Mapstack                true
2          study-tracker     Medical Study Tracker    true
3          coin-finder       Coin Finder             false
4          framework         Drone Components        true
5          gigradar          Gigradar                false
6          rolodex           Rolodex                 false
```

Derived groups (computed by the caller per AC4 below, NOT stored in Sanity —
there is no grouping field in the schema):

```
"Live" group (relative order preserved from the table above):
  1. allergy-locator  (sortOrder 0)
  2. mapstack          (sortOrder 1)
  3. study-tracker     (sortOrder 2)
  4. framework          (sortOrder 4)   <-- FrameworkCard, not ToolCard

"Preview" group (relative order preserved from the table above):
  1. coin-finder  (sortOrder 3)
  2. gigradar     (sortOrder 5)
  3. rolodex      (sortOrder 6)
```

Note the interleaving: `framework` (live) sits at `sortOrder 4`, between
`coin-finder` (preview, sortOrder 3) and `gigradar` (preview, sortOrder 5) in
the flat list. This is the load-bearing case for AC1/AC4 below — a naive
"just show tools in sortOrder, add a header when live-ness changes" approach
would produce three sections (Live, Preview, Live) or misorder `framework`;
the correct behavior partitions ALL live tools into one group and ALL preview
tools into the other, each internally preserving flat-list relative order,
not a single top-to-bottom scan with section breaks on toggle.

If Sanity content changes before this slice is implemented/verified, re-run
the query below and update this fixture table — do not trust these exact
counts blindly, same caveat the story description itself carries:

```
*[_type == "tool" && hidden != true] | order(sortOrder asc) {
  label, "mount": mount.current, live, sortOrder
}
```

---

## AC1 — Two labeled headings, correct membership, preserved relative order

**Given** the 7 current visible tools listed above
**When** the landing page's tool section renders
**Then** exactly two group headings appear, in this order top-to-bottom:
1. "Live" — containing exactly `allergy-locator`, `mapstack`, `study-tracker`,
   `framework`, in that relative order (their relative order among
   themselves in the original flat `TOOLS` array, i.e. sortOrder 0, 1, 2, 4 —
   NOT re-sorted, NOT alphabetized, NOT grouped by card type even though
   `framework` renders as a `FrameworkCard` and the other three as
   `ToolCard`).
2. "Preview" — containing exactly `coin-finder`, `gigradar`, `rolodex`, in
   that relative order (sortOrder 3, 5, 6).

**And** no tool appears in both groups, and no tool is dropped (7 in, 7 out
across the two groups combined).

**And** the "Live" heading appears before ANY live tool's card in the
rendered DOM order, and the "Preview" heading appears before ANY preview
tool's card — i.e. it's a real two-block structure (all Live cards, then all
Preview cards), not headings interleaved with cards in original flat order.

---

## AC2 — Individual card markup/styling is unchanged (grouping is layout-only)

**Given** any one of the 7 tools above, rendered inside its new group section
**When** its card's rendered HTML is compared against its rendered HTML from
before this slice (i.e. slice 1's final state — flat single grid, no
headings)
**Then** the card's own markup is byte-identical: same `ToolCard`/
`FrameworkCard` branch selection (`tool.components ? <FrameworkCard/> :
<ToolCard/>`, unchanged condition), same screenshot/`IconBadge`/`IconInline`/
`LiveBadge`/description/`OpenAndSourceLinks` output for that tool, same
CSS classes on every element within the card.
**And** specifically, `study-tracker`'s and `framework`'s `OpenAndSourceLinks`
still render "Open →" (both are `live: true`, unaffected by slice 1's
pagesUrl-fallback tier — see behavior-specs-slice-1.md AC3), and
`coin-finder`, `gigradar`, `rolodex` still render "View →" (per slice 1 AC2)
— this slice must not touch button-state logic at all, only what wraps
around the grid of cards.
**And** the grid container itself keeps the exact same classes
(`grid grid-cols-1 gap-5 sm:grid-cols-2`) it had before, just now scoped
per-group instead of once for the whole flat list.

---

## AC3 — Zero-tool group renders no heading (synthetic empty-group scenario)

**Given** a synthetic invocation of the new component with a groups array
containing at least one group whose `tools` array has zero entries, e.g.:
```
[
  { title: "Live", tools: [/* 4 real ToolEntry fixtures from AC1 */] },
  { title: "Experimental", tools: [] },
]
```
(This is a component-level/unit-level scenario, not reachable via today's
real `TOOLS` data — both real groups (Live, Preview) are non-empty today —
but must be verified directly against the component's own render output,
since horizontal-plan.md layer 3 promises this as part of the component's
own contract, not just an emergent property of the current 7-tool fixture.)

**When** the component renders
**Then** no heading element, no grid container, and no other DOM output
whatsoever is produced for the "Experimental" group — not an empty `<h2>`,
not an empty `<div className="grid ...">` with zero children, nothing.
**And** the "Live" group's heading and 4 cards still render normally,
unaffected by the adjacent empty group (i.e. skipping a group must not
disturb sibling groups' output or introduce a stray gap/spacing artifact
from an unrendered empty container).

**Given** a groups array where EVERY group is empty (e.g. `[{title: "Live",
tools: []}, {title: "Preview", tools: []}]`)
**When** the component renders
**Then** it produces no heading and no grid output at all — an empty
render, not an error, not a fallback "no tools" message (no such message is
specified anywhere in this epic; inventing one would be scope creep).

---

## AC4 — Component API contract: ordered `{title, tools}[]`, computed by the caller

**Given** the new component as a standalone unit (not the page that calls it)
**When** its props/type signature is inspected
**Then** it accepts a single prop that is an ordered array of objects, each
shaped `{ title: string, tools: ToolEntry[] }` — the component's own type
does not hardcode "Live" or "Preview" as literal strings anywhere in its
rendering logic, and does not itself read `tool.live` or compute group
membership. Any string is a valid `title` (e.g. the "Experimental" fixture in
AC3), and the component would just as validly render a totally different set
of group titles/counts if the caller passed different data — grouping-by-
liveness is a *caller* decision, not something baked into the component.

**Given** `src/app/page.tsx`'s `Home` component (the caller)
**When** its source is inspected
**Then** the Live/Preview partition itself — deciding which tools are
"Live" vs. "Preview" by checking `tool.live`, and building the two
`{title, tools}` objects in that order — happens in `Home`, not inside the
new component. The new component receives the already-computed two-element
array as a prop; it does not import or reference `tool.live` directly.

**And** as a consequence of both of the above: a future third group (e.g. a
hypothetical "Archived" section, per horizontal-plan.md layer 3's own framing
of why this component exists) would be addable entirely by changing the array
`Home` builds and passes in — zero changes to the grouping component itself.
This is not separately tested against a real third group in this slice (no
such group exists or is requested), but the component's API shape (AC4's
first paragraph) is the thing that makes it true, and that shape IS what
this AC verifies.

---

## Cross-cutting: page-level spacing unchanged

**Given** the outer `<section>` wrapper that currently contains the flat
grid (`className="mx-auto w-full max-w-4xl px-6 pb-24"` in today's
`src/app/page.tsx`)
**When** the new grouped component is substituted in for the flat grid
**Then** that same outer `<section>` element and its exact className persist
unchanged around the new component's output — the new component renders
group headings + grids *inside* that existing wrapper, it does not replace,
duplicate, or add a second competing wrapper with different padding/margin
values. Page-level top/bottom spacing before and after this slice's tool
section must be identical.

# Design brief: tools.mdostal.com landing page

Produced via Hive's `/design` skill (ui-designer persona quality bar), using the
text-based fallback since Frame0 CLI isn't installed in this environment. Grounded in
real, curl-verified brand tokens from the two sibling sites, not invented.

## Brand inputs (verified live, not guessed)

| | mdostal.com | life.mdostal.com | tools.mdostal.com (this) |
|---|---|---|---|
| Font | Inter | DM Sans + Playfair Display | **Inter** (leans mdostal.com — technical/utility) |
| Accent | `#ff6b00` (orange) | `#f59e0b` (amber) | **`#ff6b00`** (same family, mdostal.com side) |
| Neutrals | cool gray (Tailwind gray) | warm stone (Tailwind stone) | **cool gray** |
| Theme | dark-first | dark-first | **dark-first** |
| Nav mark | "MD" text mark | "life.mdostal" text mark | **"tools.mdostal" text mark** |
| Cross-link | — | "mdostal.com →" | **"mdostal.com →" + "life.mdostal.com →"** |

## Layout

1. **Header** — "tools.mdostal" wordmark (left), theme toggle + "mdostal.com →" link (right).
2. **Hero** — one real headline + one-line description framing this as Mathew Dostal's
   open-source tools shelf, not generic boilerplate. Orange used as an accent underline/
   highlight word, never as small body text (contrast risk on near-black — verified
   against WCAG AA by keeping orange to buttons/large accents, body text stays gray).
3. **Tool grid** — replaces the current bare bordered-list with real cards: each tool
   gets a short mark/initial, live-status badge, description, and a clear primary CTA
   (orange button) + secondary link (GitHub source). Cards use the same card/border
   language as mdostal.com's own numbered-pillar sections (subtle border, hover lift).
4. **Footer** — cross-links to both sibling sites + GitHub profile, matching the
   family's existing footer convention.

## Accessibility (WCAG 2.1 AA, per ui-designer quality standard)

- Orange (`#ff6b00`) reserved for buttons (dark text on orange, high contrast) and
  large accent text/underlines — never small gray-replacement body text on black.
- All interactive elements (Open/Preview buttons, nav links) keep a real focus-visible
  ring — inherited from existing Tailwind defaults, verified in the implementation pass.
- Touch targets stay ≥44px tall on the primary CTA buttons.

## Nielsen heuristics spot-check

- **Visibility of system status**: live vs. not-yet-mounted tools get a real, distinct
  badge (not just a different button style easy to miss).
- **Consistency & standards**: matches the established mdostal.com/life.mdostal.com
  nav + cross-link + footer conventions exactly, not a new pattern.
- **Aesthetic & minimalist design**: two tools today — grid must not look sparse/empty
  at n=2; hero copy and section framing carry visual weight so the page doesn't read
  as "unfinished."

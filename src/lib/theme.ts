/**
 * Chart color palette — single source of truth for Recharts.
 *
 * Recharts sets `fill` / `stroke` as SVG presentation *attributes*, where CSS
 * `var(--…)` does not resolve — so chart colors live here as literal hexes
 * rather than CSS variables. Keep these in sync with the matching custom
 * properties in `src/app/globals.css` (the DOM/Tailwind side of the palette).
 *
 * Semantic model — Broadsheet single-accent (oxblood on paper):
 *   oxblood    = up / premium / over-fair / emphasis
 *   warm grey  = down / under-fair (no second color — restraint is the point)
 */
export const chartColors = {
  /** appreciating · premium · over-fair · the one accent */
  up: "#8a3324",
  /** depreciating · under-fair (neutral grey, not a second hue) */
  down: "#6f685b",
  /** no clear trend / flat */
  flat: "#b3aa97",
  /** ink data — scatter dots, individual-sales dots, the fair-price line */
  dataPrimary: "#2a261d",
  /** axis ticks & secondary labels */
  axis: "#8c8472",
  /** emphasized axis labels (e.g. category names) */
  axisStrong: "#4a4439",
  /** faint cartesian grid lines on paper */
  grid: "#e2dac9",
  /** bold black baseline rules / reference lines / hover cursors */
  gridStrong: "#1a1712",
} as const;

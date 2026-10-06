/**
 * Chart color palette — single source of truth for Recharts.
 *
 * Recharts sets `fill` / `stroke` as SVG presentation *attributes*, where CSS
 * `var(--…)` does not resolve — so chart colors live here as literal hexes
 * rather than CSS variables. Keep these in sync with the matching custom
 * properties in `src/app/globals.css` (the DOM/Tailwind side of the palette).
 *
 * Semantic model — Night broadsheet single-accent (rust on charcoal):
 *   oxblood    = up / premium / over-fair / emphasis
 *   warm grey  = down / under-fair (no second color — restraint is the point)
 */
export const chartColors = {
  /** appreciating · premium · over-fair · the one accent */
  up: "#d0674f",
  /** depreciating · under-fair (neutral grey, not a second hue) */
  down: "#a39a88",
  /** no clear trend / flat */
  flat: "#6b6455",
  /** ink data — scatter dots, individual-sales dots, the fair-price line */
  dataPrimary: "#e3dccd",
  /** axis ticks & secondary labels */
  axis: "#8f8775",
  /** emphasized axis labels (e.g. category names) */
  axisStrong: "#c2b9a6",
  /** faint cartesian grid lines on charcoal */
  grid: "#2c2821",
  /** bold light baseline rules / reference lines / hover cursors */
  gridStrong: "#cfc6b4",
} as const;

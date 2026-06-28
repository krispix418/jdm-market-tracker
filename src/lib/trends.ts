export interface TrendWindow {
  recentStart: string; // ISO yyyy-mm-dd
  recentEnd: string;
  priorStart: string;
  priorEnd: string;
}

export interface TrendResult extends TrendWindow {
  direction: "up" | "down" | "flat";
  percentChange: number;
  label: string;
  recentN: number; // sales in the recent window
  priorN: number; // sales in the prior window
}

const MIN_PER_WINDOW = 3; // need at least this many sales in each window to call a trend

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function monthsAgo(n: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() - n);
  return d;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Date windows for a "recent N months vs the prior block" comparison. */
function windowsFor(recentMonths: number, priorMonths: number, now: Date = new Date()): TrendWindow {
  return {
    recentStart: iso(monthsAgo(recentMonths, now)),
    recentEnd: iso(now),
    priorStart: iso(monthsAgo(priorMonths, now)),
    priorEnd: iso(monthsAgo(recentMonths, now)),
  };
}

function pricesInRange(
  auctions: { sale_price: number; sale_date: string }[],
  startISO: string,
  endISO: string
): number[] {
  const start = new Date(startISO);
  const end = new Date(endISO);
  return auctions
    .filter((a) => {
      const d = new Date(a.sale_date);
      return d >= start && d < end;
    })
    .map((a) => a.sale_price);
}

function computeTrend(
  auctions: { sale_price: number; sale_date: string }[],
  recentMonths: number,
  priorMonths: number,
  label: string
): TrendResult {
  const w = windowsFor(recentMonths, priorMonths);
  const recent = pricesInRange(auctions, w.recentStart, w.recentEnd);
  const prior = pricesInRange(auctions, w.priorStart, w.priorEnd);
  const base = { label, ...w, recentN: recent.length, priorN: prior.length };

  if (recent.length < MIN_PER_WINDOW || prior.length < MIN_PER_WINDOW) {
    return { direction: "flat", percentChange: 0, ...base };
  }

  const change = ((median(recent) - median(prior)) / median(prior)) * 100;
  if (Math.abs(change) < 2) {
    return { direction: "flat", percentChange: 0, ...base };
  }

  return {
    direction: change > 0 ? "up" : "down",
    percentChange: Math.round(change),
    ...base,
  };
}

export function computeYoY(auctions: { sale_price: number; sale_date: string }[]): TrendResult {
  return computeTrend(auctions, 12, 24, "YoY");
}

export function compute6Month(auctions: { sale_price: number; sale_date: string }[]): TrendResult {
  return computeTrend(auctions, 6, 12, "vs 6mo ago");
}

/** Window bounds without needing data — for section captions. */
export function yoyWindow(): TrendWindow {
  return windowsFor(12, 24);
}
export function sixMonthWindow(): TrendWindow {
  return windowsFor(6, 12);
}

export const MIN_SALES_PER_WINDOW = MIN_PER_WINDOW;

/** "Jun 2024 – Jun 2025" for a [startISO, endISO) range. UTC so month labels don't drift. */
export function formatMonthRange(startISO: string, endISO: string): string {
  const fmt = (s: string) =>
    new Date(`${s}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  return `${fmt(startISO)} – ${fmt(endISO)}`;
}

/** "Jun 28, 2026" for a single ISO date. */
export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export interface ValueSignal {
  baseline: number; // median over the prior block (months 3–12 ago)
  current: number; // median over the last 3 months
  discountPct: number; // (baseline − current) / baseline · positive = trading below its own trend (a deal)
  baselineN: number;
  currentN: number;
  baseStart: string;
  baseEnd: string;
  currentStart: string;
  currentEnd: string;
}

/**
 * "Best value" = trading below its own recent level. Compares the last 3 months
 * (current) against the prior 9 months (months 3–12 ago, the baseline). A
 * positive discount means it's currently cheaper than its own recent norm.
 */
export function computeValueSignal(
  auctions: { sale_price: number; sale_date: string }[],
  now: Date = new Date()
): ValueSignal | null {
  const baseStart = iso(monthsAgo(12, now));
  const baseEnd = iso(monthsAgo(3, now));
  const currentStart = baseEnd;
  const currentEnd = iso(now);

  const baseVals = pricesInRange(auctions, baseStart, baseEnd);
  const curVals = pricesInRange(auctions, currentStart, currentEnd);

  if (baseVals.length < 4 || curVals.length < 2) return null; // need a real baseline + a recent read

  const baseline = median(baseVals);
  const current = median(curVals);
  if (baseline <= 0) return null;

  return {
    baseline,
    current,
    discountPct: Math.round(((baseline - current) / baseline) * 100),
    baselineN: baseVals.length,
    currentN: curVals.length,
    baseStart,
    baseEnd,
    currentStart,
    currentEnd,
  };
}

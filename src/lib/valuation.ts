import type { AuctionResult } from "./types";

export interface Regression {
  slope: number; // $ per mile (negative = depreciation)
  intercept: number; // predicted $ at 0 miles
  r2: number; // goodness of fit, 0–1
  n: number; // sample size
  predict: (miles: number) => number;
}

/** Ordinary least-squares linear fit. Returns null if there's too little data. */
export function linearRegression(
  points: { x: number; y: number }[]
): Regression | null {
  const n = points.length;
  if (n < 5) return null;

  const sx = points.reduce((s, p) => s + p.x, 0);
  const sy = points.reduce((s, p) => s + p.y, 0);
  const sxx = points.reduce((s, p) => s + p.x * p.x, 0);
  const sxy = points.reduce((s, p) => s + p.x * p.y, 0);

  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;

  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;

  const meanY = sy / n;
  const ssTot = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssRes = points.reduce(
    (s, p) => s + (p.y - (slope * p.x + intercept)) ** 2,
    0
  );
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2, n, predict: (m) => slope * m + intercept };
}

/** Linear-interpolated percentile (p in 0–100). */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * A single "segment" label per auction for condition/spec breakdowns.
 * Priority: special edition (most notable) → modified → stock.
 */
export function segmentLabel(a: AuctionResult): string {
  if (a.special_edition) return a.special_edition;
  if (a.is_modified) return "Modified";
  return "Stock";
}

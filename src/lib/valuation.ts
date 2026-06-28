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

// ---- Hedonic regression: marginal value of each attribute -------------------

/** Solve A·x = b (A is k×k) via Gauss-Jordan with partial pivoting. */
function solveLinear(A: number[][], b: number[]): number[] | null {
  const k = b.length;
  const M = A.map((row, i) => [...row, b[i]]); // augmented matrix

  for (let col = 0; col < k; col++) {
    let pivot = col;
    for (let r = col + 1; r < k; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-9) return null; // singular / collinear
    [M[col], M[pivot]] = [M[pivot], M[col]];

    for (let r = 0; r < k; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= k; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => row[k] / row[i]);
}

/** Ordinary least squares for a design matrix X (incl. an intercept column) and target y. */
function multipleRegression(X: number[][], y: number[]): { coef: number[]; r2: number } | null {
  const n = X.length;
  const k = X[0]?.length ?? 0;
  if (n <= k) return null; // not enough rows to estimate

  const A = Array.from({ length: k }, () => new Array(k).fill(0));
  const b = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    for (let r = 0; r < k; r++) {
      b[r] += X[i][r] * y[i];
      for (let c = 0; c < k; c++) A[r][c] += X[i][r] * X[i][c];
    }
  }

  const coef = solveLinear(A, b);
  if (!coef) return null;

  const meanY = y.reduce((s, v) => s + v, 0) / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const pred = X[i].reduce((s, xv, j) => s + xv * coef[j], 0);
    ssTot += (y[i] - meanY) ** 2;
    ssRes += (y[i] - pred) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { coef, r2 };
}

export interface HedonicTerm {
  key: string;
  label: string;
  unit: string; // e.g. "per 10k mi", "per year older", "vs stock"
  amount: number; // marginal $ effect
  heuristic: boolean; // true = derived from listing text (modified/import) → lower confidence
}

export interface HedonicModel {
  terms: HedonicTerm[];
  r2: number;
  n: number; // rows used (those with mileage + model year)
}

const HEDONIC_MIN_ROWS = 20;
const BINARY_MIN_PER_SIDE = 5; // need this many on each side to trust a 0/1 predictor

/**
 * Fits sale_price against an attribute set and returns each attribute's
 * marginal dollar value. Only rows with usable mileage + model year are used.
 * Predictors with no variance — or 0/1 flags too sparse on either side — are
 * dropped so noisy/thin features don't produce junk coefficients.
 */
export function hedonicModel(auctions: AuctionResult[]): HedonicModel | null {
  const rows = auctions
    .map((a) => {
      if (!a.mileage || a.mileage <= 0 || !a.year || !a.sale_date) return null;
      const age = new Date(a.sale_date).getUTCFullYear() - a.year;
      if (age < 0) return null;
      return {
        price: a.sale_price,
        mileage: a.mileage / 10000,
        age,
        modified: a.is_modified ? 1 : 0,
        special: a.special_edition ? 1 : 0,
        imported: a.is_import ? 1 : 0,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length < HEDONIC_MIN_ROWS) return null;

  const hasSpread = (vals: number[]) => new Set(vals).size > 1;
  const binaryOk = (vals: number[]) => {
    const ones = vals.filter((v) => v === 1).length;
    return ones >= BINARY_MIN_PER_SIDE && vals.length - ones >= BINARY_MIN_PER_SIDE;
  };

  const candidates = [
    { key: "mileage", label: "Mileage", unit: "per 10k mi", heuristic: false, get: (r: (typeof rows)[number]) => r.mileage, ok: hasSpread },
    { key: "age", label: "Age", unit: "per year older", heuristic: false, get: (r: (typeof rows)[number]) => r.age, ok: hasSpread },
    { key: "modified", label: "Modified", unit: "vs stock", heuristic: true, get: (r: (typeof rows)[number]) => r.modified, ok: binaryOk },
    { key: "special", label: "Special edition", unit: "vs standard", heuristic: false, get: (r: (typeof rows)[number]) => r.special, ok: binaryOk },
    { key: "import", label: "Import (RHD/JDM)", unit: "vs domestic", heuristic: true, get: (r: (typeof rows)[number]) => r.imported, ok: binaryOk },
  ];

  const used = candidates.filter((c) => c.ok(rows.map(c.get)));
  if (used.length === 0) return null;

  const X = rows.map((r) => [1, ...used.map((c) => c.get(r))]); // intercept + predictors
  const y = rows.map((r) => r.price);
  const fit = multipleRegression(X, y);
  if (!fit) return null;

  const terms: HedonicTerm[] = used.map((c, i) => ({
    key: c.key,
    label: c.label,
    unit: c.unit,
    amount: fit.coef[i + 1], // skip intercept
    heuristic: c.heuristic,
  }));

  return { terms, r2: fit.r2, n: rows.length };
}

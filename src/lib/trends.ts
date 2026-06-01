export interface TrendResult {
  direction: "up" | "down" | "flat";
  percentChange: number;
  label: string;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function filterByMonths(
  auctions: { sale_price: number; sale_date: string }[],
  monthsAgo: number,
  monthsEnd: number = 0
): number[] {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - monthsAgo);
  const end = new Date(now);
  end.setMonth(end.getMonth() - monthsEnd);

  return auctions
    .filter((a) => {
      const d = new Date(a.sale_date);
      return d >= start && d < end;
    })
    .map((a) => a.sale_price);
}

export function computeYoY(
  auctions: { sale_price: number; sale_date: string }[]
): TrendResult {
  const recent = filterByMonths(auctions, 12, 0);
  const prior = filterByMonths(auctions, 24, 12);

  if (recent.length < 3 || prior.length < 3) {
    return { direction: "flat", percentChange: 0, label: "YoY" };
  }

  const recentMedian = median(recent);
  const priorMedian = median(prior);
  const change = ((recentMedian - priorMedian) / priorMedian) * 100;

  if (Math.abs(change) < 2) {
    return { direction: "flat", percentChange: 0, label: "YoY" };
  }

  return {
    direction: change > 0 ? "up" : "down",
    percentChange: Math.round(change),
    label: "YoY",
  };
}

export function compute6Month(
  auctions: { sale_price: number; sale_date: string }[]
): TrendResult {
  const recent = filterByMonths(auctions, 6, 0);
  const prior = filterByMonths(auctions, 12, 6);

  if (recent.length < 3 || prior.length < 3) {
    return { direction: "flat", percentChange: 0, label: "vs 6mo ago" };
  }

  const recentMedian = median(recent);
  const priorMedian = median(prior);
  const change = ((recentMedian - priorMedian) / priorMedian) * 100;

  if (Math.abs(change) < 2) {
    return { direction: "flat", percentChange: 0, label: "vs 6mo ago" };
  }

  return {
    direction: change > 0 ? "up" : "down",
    percentChange: Math.round(change),
    label: "vs 6mo ago",
  };
}

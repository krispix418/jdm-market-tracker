"use client";

import type { AuctionResult } from "@/lib/types";

interface TrimStat {
  trim: string;
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

function formatPrice(price: number): string {
  return `$${price.toLocaleString()}`;
}

export default function TrimBreakdown({ auctions }: { auctions: AuctionResult[] }) {
  const trimMap = new Map<string, number[]>();

  for (const a of auctions) {
    const label = a.trim || "Base / Standard";
    const prices = trimMap.get(label) || [];
    prices.push(a.sale_price);
    trimMap.set(label, prices);
  }

  if (trimMap.size <= 1) return null;

  const stats: TrimStat[] = [...trimMap.entries()]
    .map(([trim, prices]) => ({
      trim,
      count: prices.length,
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    }))
    .sort((a, b) => b.avgPrice - a.avgPrice);

  return (
    <div className="space-y-4">
      {stats.map((s) => {
        const maxAvg = stats[0].avgPrice;
        const barWidth = maxAvg > 0 ? (s.avgPrice / maxAvg) * 100 : 0;

        return (
          <div key={s.trim} className="border-b border-card-border pb-4">
            <div className="flex justify-between items-baseline mb-2">
              <div className="flex items-baseline gap-3">
                <span className="text-sm text-white">{s.trim}</span>
                <span className="text-xs text-subtle">{s.count} sold</span>
              </div>
              <span className="text-sm font-medium text-data-primary">
                {formatPrice(s.avgPrice)}
              </span>
            </div>
            <div className="w-full bg-card-border h-px mb-1.5">
              <div
                className="h-px"
                style={{ width: `${barWidth}%`, background: "#c9a84c" }}
              />
            </div>
            <div className="flex justify-between text-xs text-subtle">
              <span>{formatPrice(s.minPrice)}</span>
              <span>{formatPrice(s.maxPrice)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

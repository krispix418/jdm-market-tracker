"use client";

import type { AuctionResult } from "@/lib/types";
import { segmentLabel } from "@/lib/valuation";
import { chartColors } from "@/lib/theme";

interface SegStat {
  label: string;
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

function formatPrice(price: number): string {
  return `$${price.toLocaleString()}`;
}

export default function ConditionBreakdown({ auctions }: { auctions: AuctionResult[] }) {
  const groups = new Map<string, number[]>();
  for (const a of auctions) {
    const label = segmentLabel(a);
    const prices = groups.get(label) || [];
    prices.push(a.sale_price);
    groups.set(label, prices);
  }

  // Only meaningful if there's more than one segment (e.g. stock + modified).
  if (groups.size <= 1) return null;

  const stats: SegStat[] = [...groups.entries()]
    .map(([label, prices]) => ({
      label,
      count: prices.length,
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    }))
    .sort((a, b) => b.avgPrice - a.avgPrice);

  const stock = stats.find((s) => s.label === "Stock");
  const maxAvg = stats[0].avgPrice;

  return (
    <div className="space-y-4">
      {stats.map((s) => {
        const barWidth = maxAvg > 0 ? (s.avgPrice / maxAvg) * 100 : 0;
        // Premium vs stock (skip for the stock row itself).
        const premium =
          stock && s.label !== "Stock" && stock.avgPrice > 0
            ? Math.round(((s.avgPrice - stock.avgPrice) / stock.avgPrice) * 100)
            : null;

        return (
          <div key={s.label} className="border-b border-card-border pb-4">
            <div className="flex justify-between items-baseline mb-2">
              <div className="flex items-baseline gap-3">
                <span className="text-sm text-foreground">{s.label}</span>
                <span className="text-xs text-subtle">{s.count} sold</span>
                {premium !== null && (
                  <span
                    className="text-xs"
                    style={{ color: premium >= 0 ? chartColors.up : chartColors.down }}
                  >
                    {premium >= 0 ? "+" : ""}
                    {premium}% vs stock
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-data-primary">
                {formatPrice(s.avgPrice)}
              </span>
            </div>
            <div className="w-full bg-card-border h-px mb-1.5">
              <div
                className="h-px"
                style={{ width: `${barWidth}%`, background: chartColors.up }}
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

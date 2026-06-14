"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { AuctionResult } from "@/lib/types";
import { percentile } from "@/lib/valuation";

function formatPrice(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value}`;
}

function computeMovingAverage(auctions: AuctionResult[], window: number): (number | null)[] {
  return auctions.map((_, i) => {
    if (i < window - 1) return null;
    const slice = auctions.slice(i - window + 1, i + 1);
    const avg = slice.reduce((sum, a) => sum + a.sale_price, 0) / window;
    return Math.round(avg);
  });
}

interface ChartDataPoint {
  sale_date: string;
  sale_price: number;
  mileage: number | null;
  moving_avg: number | null;
  trim: string | null;
}

function CustomTooltip({
  active,
  payload,
  windowSize,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  windowSize?: number;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-black border border-card-border p-3 text-sm">
      <p className="text-white font-medium">${point.sale_price.toLocaleString()}</p>
      {point.moving_avg && (
        <p className="text-data-primary text-xs">
          {windowSize ?? ""}-sale avg: ${point.moving_avg.toLocaleString()}
        </p>
      )}
      <p className="text-muted text-xs mt-1">{point.sale_date}</p>
      {point.mileage && (
        <p className="text-muted text-xs">{point.mileage.toLocaleString()} mi</p>
      )}
      {point.trim && (
        <p className="text-muted text-xs">{point.trim}</p>
      )}
    </div>
  );
}

export default function PriceChart({ auctions }: { auctions: AuctionResult[] }) {
  if (auctions.length === 0) {
    return <p className="text-muted italic">No auction data to chart.</p>;
  }

  const windowSize = Math.max(5, Math.round(auctions.length * 0.05));
  const movingAvg = computeMovingAverage(auctions, windowSize);

  const prices = auctions.map((a) => a.sale_price);
  const p25 = Math.round(percentile(prices, 25));
  const p75 = Math.round(percentile(prices, 75));

  const data: ChartDataPoint[] = auctions.map((a, i) => ({
    sale_date: a.sale_date,
    sale_price: a.sale_price,
    mileage: a.mileage,
    moving_avg: movingAvg[i],
    trim: a.trim,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
          {/* 25th–75th percentile "typical range" band */}
          <ReferenceArea
            y1={p25}
            y2={p75}
            fill="#c9a84c"
            fillOpacity={0.07}
            stroke="#c9a84c"
            strokeOpacity={0.15}
            ifOverflow="extendDomain"
          />
          <XAxis
            dataKey="sale_date"
            tick={{ fill: "#6b6560", fontSize: 11 }}
            tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
          />
          <YAxis
            tick={{ fill: "#6b6560", fontSize: 11 }}
            tickFormatter={formatPrice}
            width={55}
          />
          <Tooltip content={<CustomTooltip windowSize={windowSize} />} />
          <Line
            type="monotone"
            dataKey="sale_price"
            stroke="#6b6560"
            strokeWidth={1}
            dot={{ fill: "#d4cfc4", r: 1.5, strokeWidth: 0 }}
            activeDot={{ fill: "#c9a84c", r: 4, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="moving_avg"
            stroke="#c9a84c"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center justify-end gap-4 mt-3 text-xs text-subtle">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-px inline-block" style={{ background: "#6b6560" }} />
          Individual sales
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 inline-block" style={{ background: "#c9a84c" }} />
          {windowSize}-sale moving avg
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 inline-block" style={{ background: "#c9a84c", opacity: 0.15 }} />
          Typical range (25–75th): ${p25.toLocaleString()}–${p75.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

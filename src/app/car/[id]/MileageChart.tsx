"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { AuctionResult } from "@/lib/types";

function formatPrice(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value}`;
}

function formatMileage(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return `${value}`;
}

interface ScatterPoint {
  mileage: number;
  sale_price: number;
  sale_date: string;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterPoint }> }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-black border border-card-border p-3 text-sm">
      <p className="text-white font-medium">${point.sale_price.toLocaleString()}</p>
      <p className="text-muted text-xs mt-1">{point.mileage.toLocaleString()} miles</p>
      <p className="text-muted text-xs">{point.sale_date}</p>
    </div>
  );
}

export default function MileageChart({ auctions }: { auctions: AuctionResult[] }) {
  const withMileage = auctions.filter((a) => a.mileage && a.mileage > 0);

  if (withMileage.length < 5) {
    return <p className="text-muted italic">Not enough mileage data to chart.</p>;
  }

  const data: ScatterPoint[] = withMileage.map((a) => ({
    mileage: a.mileage!,
    sale_price: a.sale_price,
    sale_date: a.sale_date,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
          <XAxis
            dataKey="mileage"
            type="number"
            tick={{ fill: "#6b6560", fontSize: 11 }}
            tickFormatter={formatMileage}
          />
          <YAxis
            dataKey="sale_price"
            type="number"
            tick={{ fill: "#6b6560", fontSize: 11 }}
            tickFormatter={formatPrice}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={data} fill="#d4cfc4" fillOpacity={0.5} r={2.5} />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="text-xs text-subtle mt-3 text-right">
        {withMileage.length} auctions with mileage data
      </p>
    </div>
  );
}

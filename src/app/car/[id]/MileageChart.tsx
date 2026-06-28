"use client";

import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { AuctionResult } from "@/lib/types";
import { linearRegression, percentile } from "@/lib/valuation";
import { chartColors } from "@/lib/theme";

const DEAL = chartColors.down; // under fair price (neutral grey)
const PREMIUM = chartColors.up; // over fair price (oxblood)

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
  delta: number; // actual − fair price
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterPoint }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if (p.mileage === undefined) return null;
  const over = p.delta >= 0;
  return (
    <div className="bg-card-bg border border-card-border p-3 text-sm">
      <p className="text-foreground font-medium">${p.sale_price.toLocaleString()}</p>
      <p className="text-muted text-xs mt-1">{p.mileage.toLocaleString()} miles</p>
      <p className="text-xs" style={{ color: over ? PREMIUM : DEAL }}>
        {over ? "+" : "−"}${Math.abs(Math.round(p.delta)).toLocaleString()} vs fair price
      </p>
      <p className="text-muted text-xs mt-1">{p.sale_date}</p>
    </div>
  );
}

export default function MileageChart({ auctions }: { auctions: AuctionResult[] }) {
  const withMileage = auctions.filter((a) => a.mileage && a.mileage > 0);

  if (withMileage.length < 5) {
    return <p className="text-muted italic">Not enough mileage data to chart.</p>;
  }

  const reg = linearRegression(
    withMileage.map((a) => ({ x: a.mileage!, y: a.sale_price }))
  );

  const all: ScatterPoint[] = withMileage.map((a) => ({
    mileage: a.mileage!,
    sale_price: a.sale_price,
    sale_date: a.sale_date,
    delta: reg ? a.sale_price - reg.predict(a.mileage!) : 0,
  }));

  const below = all.filter((p) => p.delta < 0); // good deal — under the line
  const above = all.filter((p) => p.delta >= 0); // premium — over the line

  const miles = withMileage.map((a) => a.mileage!);
  const minMi = Math.min(...miles);
  const maxMi = Math.max(...miles);
  const fairLine = reg
    ? [
        { mileage: minMi, fair: Math.max(0, reg.predict(minMi)) },
        { mileage: maxMi, fair: Math.max(0, reg.predict(maxMi)) },
      ]
    : [];

  const per10k = reg ? Math.round(reg.slope * 10000) : 0;
  const medianMi = percentile(miles, 50);
  const fairAtMedian = reg ? Math.max(0, Math.round(reg.predict(medianMi))) : 0;

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis
            dataKey="mileage"
            type="number"
            tick={{ fill: chartColors.axis, fontSize: 11 }}
            tickFormatter={formatMileage}
            domain={["dataMin", "dataMax"]}
          />
          <YAxis
            dataKey="sale_price"
            type="number"
            tick={{ fill: chartColors.axis, fontSize: 11 }}
            tickFormatter={formatPrice}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter name="Under fair price" data={below} fill={DEAL} fillOpacity={0.55} />
          <Scatter name="Over fair price" data={above} fill={PREMIUM} fillOpacity={0.55} />
          {reg && (
            <Line
              data={fairLine}
              dataKey="fair"
              stroke={chartColors.dataPrimary}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              legendType="none"
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {reg ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs">
          <span className="text-muted">
            Depreciation ≈{" "}
            <span className="text-foreground font-medium">${Math.abs(per10k).toLocaleString()}</span>{" "}
            per 10k mi · fair price at {formatMileage(medianMi)} mi ≈{" "}
            <span className="text-foreground font-medium">${fairAtMedian.toLocaleString()}</span>
          </span>
          <span className="text-subtle">
            fit R² {reg.r2.toFixed(2)} · {withMileage.length} with mileage
          </span>
        </div>
      ) : (
        <p className="text-xs text-subtle mt-3 text-right">
          {withMileage.length} auctions with mileage data
        </p>
      )}
    </div>
  );
}

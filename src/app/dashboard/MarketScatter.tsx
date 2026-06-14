"use client";

import { useRouter } from "next/navigation";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const UP = "#c9a84c";
const DOWN = "#b85450";
const FLAT = "#6b6560";

export interface ScatterDatum {
  id: string;
  label: string;
  totalSold: number;
  medianPrice: number;
  yoyChange: number;
}

function formatPrice(v: number): string {
  return v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterDatum }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (!d?.label) return null;
  const up = d.yoyChange >= 0;
  return (
    <div className="bg-black border border-card-border p-3 text-sm">
      <p className="text-white">{d.label}</p>
      <p className="text-muted text-xs mt-1">${d.medianPrice.toLocaleString()} median · {d.totalSold} sold</p>
      {d.yoyChange !== 0 && (
        <p className="text-xs" style={{ color: up ? UP : DOWN }}>
          {up ? "+" : ""}{d.yoyChange}% YoY
        </p>
      )}
    </div>
  );
}

export default function MarketScatter({ data }: { data: ScatterDatum[] }) {
  const router = useRouter();
  const up = data.filter((d) => d.yoyChange > 0);
  const down = data.filter((d) => d.yoyChange < 0);
  const flat = data.filter((d) => d.yoyChange === 0);
  const go = (point: { payload?: ScatterDatum }) => {
    const id = point?.payload?.id;
    if (id) router.push(`/car/${id}`);
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
          <XAxis
            type="number"
            dataKey="totalSold"
            name="Sold"
            tick={{ fill: "#6b6560", fontSize: 11 }}
            label={{ value: "auctions sold (liquidity)", position: "insideBottom", offset: -2, fill: "#6b6560", fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="medianPrice"
            name="Median"
            tick={{ fill: "#6b6560", fontSize: 11 }}
            tickFormatter={formatPrice}
            width={55}
          />
          <ZAxis range={[40, 40]} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3", stroke: "#3a3631" }} />
          <Scatter data={up} fill={UP} fillOpacity={0.65} onClick={go} className="cursor-pointer" />
          <Scatter data={down} fill={DOWN} fillOpacity={0.65} onClick={go} className="cursor-pointer" />
          <Scatter data={flat} fill={FLAT} fillOpacity={0.5} onClick={go} className="cursor-pointer" />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-end gap-4 mt-2 text-xs text-subtle">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: UP }} />Appreciating</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: DOWN }} />Depreciating</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: FLAT }} />Flat</span>
      </div>
    </div>
  );
}

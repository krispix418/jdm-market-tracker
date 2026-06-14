"use client";

import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const UP = "#c9a84c";
const DOWN = "#b85450";

export interface MoverDatum {
  id: string;
  label: string;
  yoyChange: number;
  medianPrice: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: MoverDatum }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const up = d.yoyChange >= 0;
  return (
    <div className="bg-black border border-card-border p-3 text-sm">
      <p className="text-white">{d.label}</p>
      <p className="text-xs mt-1" style={{ color: up ? UP : DOWN }}>
        {up ? "+" : ""}{d.yoyChange}% YoY
      </p>
      <p className="text-muted text-xs">${d.medianPrice.toLocaleString()} median</p>
    </div>
  );
}

export default function MoversChart({ data }: { data: MoverDatum[] }) {
  const router = useRouter();
  if (data.length === 0) {
    return <p className="text-subtle text-sm italic">Not enough data for YoY comparison.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 30)}>
      <BarChart layout="vertical" data={data} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis
          type="number"
          tick={{ fill: "#6b6560", fontSize: 11 }}
          tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={120}
          tick={{ fill: "#a8a29a", fontSize: 11 }}
          interval={0}
        />
        <ReferenceLine x={0} stroke="#3a3631" />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff08" }} />
        <Bar
          dataKey="yoyChange"
          radius={2}
          onClick={(bar: { payload?: MoverDatum }) => {
            const id = bar?.payload?.id;
            if (id) router.push(`/car/${id}`);
          }}
          className="cursor-pointer"
        >
          {data.map((d) => (
            <Cell key={d.id} fill={d.yoyChange >= 0 ? UP : DOWN} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

"use client";

import { useRef, useState } from "react";
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
import { chartColors } from "@/lib/theme";

const UP = chartColors.up;
const DOWN = chartColors.down;
const FLAT = chartColors.flat;

const DRAG_THRESHOLD = 8; // px — below this, treat as a click (navigate), not a zoom

export interface ScatterDatum {
  id: string;
  label: string;
  totalSold: number;
  medianPrice: number;
  yoyChange: number;
}

type Range = [number, number];
interface Domain {
  x: Range;
  y: Range;
}
interface PlotRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function formatPrice(v: number): string {
  return v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterDatum }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (!d?.label) return null;
  const up = d.yoyChange >= 0;
  return (
    <div className="bg-card-bg border border-card-border p-3 text-sm">
      <p className="text-foreground">{d.label}</p>
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
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<PlotRect | null>(null);
  const justZoomedRef = useRef(false);

  const [zoom, setZoom] = useState<Domain | null>(null);
  // pixel-space selection box while dragging
  const [drag, setDrag] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Full data extents (with a little headroom), used when not zoomed.
  const maxSold = Math.max(1, ...data.map((d) => d.totalSold));
  const maxPrice = Math.max(1, ...data.map((d) => d.medianPrice));
  const fullDomain: Domain = { x: [0, Math.ceil(maxSold * 1.05)], y: [0, Math.ceil(maxPrice * 1.05)] };
  const domain = zoom ?? fullDomain;

  const up = data.filter((d) => d.yoyChange > 0);
  const down = data.filter((d) => d.yoyChange < 0);
  const flat = data.filter((d) => d.yoyChange === 0);

  const go = (point: { payload?: ScatterDatum }) => {
    const id = point?.payload?.id;
    if (id) router.push(`/car/${id}`);
  };

  // Measure the actual plotting rectangle from the rendered grid group, in
  // wrapper-pixel space — exact, no reliance on margin/axis-size guesses.
  function measurePlot(): PlotRect | null {
    const grid = containerRef.current?.querySelector(".recharts-cartesian-grid") as SVGGElement | null;
    if (!grid) return null;
    const b = grid.getBBox();
    return { left: b.x, top: b.y, width: b.width, height: b.height };
  }

  function pixelToData(px: number, py: number, rect: PlotRect) {
    const fx = clamp((px - rect.left) / rect.width, 0, 1);
    const fy = clamp((py - rect.top) / rect.height, 0, 1);
    const [x0, x1] = domain.x;
    const [y0, y1] = domain.y;
    return { x: x0 + fx * (x1 - x0), y: y1 - fy * (y1 - y0) }; // y axis is inverted in screen space
  }

  function relative(e: React.MouseEvent) {
    const r = containerRef.current!.getBoundingClientRect();
    return { px: e.clientX - r.left, py: e.clientY - r.top };
  }

  function onMouseDown(e: React.MouseEvent) {
    plotRef.current = measurePlot();
    if (!plotRef.current) return;
    const { px, py } = relative(e);
    setDrag({ x1: px, y1: py, x2: px, y2: py });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!drag) return;
    const { px, py } = relative(e);
    setDrag((d) => (d ? { ...d, x2: px, y2: py } : d));
  }

  function onMouseUp() {
    if (drag && plotRef.current) {
      const w = Math.abs(drag.x2 - drag.x1);
      const h = Math.abs(drag.y2 - drag.y1);
      if (w > DRAG_THRESHOLD && h > DRAG_THRESHOLD) {
        const a = pixelToData(Math.min(drag.x1, drag.x2), Math.min(drag.y1, drag.y2), plotRef.current);
        const b = pixelToData(Math.max(drag.x1, drag.x2), Math.max(drag.y1, drag.y2), plotRef.current);
        setZoom({
          x: [Math.min(a.x, b.x), Math.max(a.x, b.x)],
          y: [Math.min(a.y, b.y), Math.max(a.y, b.y)],
        });
        justZoomedRef.current = true; // swallow the click that fires right after this drag
      }
    }
    setDrag(null);
  }

  // Stop the drag-release click from also navigating into a car.
  function onClickCapture(e: React.MouseEvent) {
    if (justZoomedRef.current) {
      e.stopPropagation();
      justZoomedRef.current = false;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-subtle">
          {zoom ? "Drag to zoom further · " : "Drag a box to zoom in"}
        </p>
        {zoom && (
          <button
            onClick={() => setZoom(null)}
            className="text-xs uppercase tracking-[0.15em] text-muted border border-card-border px-2 py-1 hover:text-foreground hover:border-foreground transition-colors"
          >
            Reset zoom
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative select-none"
        style={{ height: 340, cursor: "crosshair" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => setDrag(null)}
        onClickCapture={onClickCapture}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis
              type="number"
              dataKey="totalSold"
              name="Sold"
              domain={domain.x}
              allowDataOverflow
              tick={{ fill: chartColors.axis, fontSize: 11 }}
              label={{ value: "auctions sold (liquidity)", position: "insideBottom", offset: -2, fill: chartColors.axis, fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="medianPrice"
              name="Median"
              domain={domain.y}
              allowDataOverflow
              tick={{ fill: chartColors.axis, fontSize: 11 }}
              tickFormatter={formatPrice}
              width={55}
            />
            <ZAxis range={[40, 40]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3", stroke: chartColors.gridStrong }} />
            <Scatter data={up} fill={UP} fillOpacity={0.65} onClick={go} className="cursor-pointer" />
            <Scatter data={down} fill={DOWN} fillOpacity={0.65} onClick={go} className="cursor-pointer" />
            <Scatter data={flat} fill={FLAT} fillOpacity={0.5} onClick={go} className="cursor-pointer" />
          </ScatterChart>
        </ResponsiveContainer>

        {drag && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: Math.min(drag.x1, drag.x2),
              top: Math.min(drag.y1, drag.y2),
              width: Math.abs(drag.x2 - drag.x1),
              height: Math.abs(drag.y2 - drag.y1),
              border: `1px solid ${chartColors.up}`,
              background: `${chartColors.up}22`,
            }}
          />
        )}
      </div>

      <div className="flex items-center justify-end gap-4 mt-2 text-xs text-subtle">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: UP }} />Appreciating</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: DOWN }} />Depreciating</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: FLAT }} />Flat</span>
      </div>
    </div>
  );
}

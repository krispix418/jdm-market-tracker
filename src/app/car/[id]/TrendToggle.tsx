"use client";

import { useState } from "react";
import type { TrendResult } from "@/lib/trends";

export default function TrendToggle({
  yoy,
  sixMonth,
}: {
  yoy: TrendResult;
  sixMonth: TrendResult;
}) {
  const [mode, setMode] = useState<"yoy" | "6mo">("yoy");

  const trend = mode === "yoy" ? yoy : sixMonth;

  const trendLabel =
    trend.direction === "up"
      ? `+${trend.percentChange}%`
      : trend.direction === "down"
        ? `${trend.percentChange}%`
        : "Stable";

  const trendColor =
    trend.direction === "up"
      ? "text-trend-up"
      : trend.direction === "down"
        ? "text-trend-down"
        : "text-muted";

  return (
    <div>
      <p className={`text-2xl font-bold tracking-tight ${trendColor}`}>
        {trendLabel}{" "}
        <span className="text-sm font-normal text-muted">
          {trend.label}
        </span>
      </p>
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => setMode("yoy")}
          className={`px-2 py-0.5 text-xs border transition-colors ${
            mode === "yoy"
              ? "border-foreground text-foreground"
              : "border-subtle text-subtle hover:text-muted hover:border-muted"
          }`}
        >
          YoY
        </button>
        <button
          onClick={() => setMode("6mo")}
          className={`px-2 py-0.5 text-xs border transition-colors ${
            mode === "6mo"
              ? "border-foreground text-foreground"
              : "border-subtle text-subtle hover:text-muted hover:border-muted"
          }`}
        >
          6mo
        </button>
      </div>
    </div>
  );
}

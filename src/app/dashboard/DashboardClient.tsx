"use client";

import Link from "next/link";
import MoversChart, { type MoverDatum } from "./MoversChart";
import MarketScatter, { type ScatterDatum } from "./MarketScatter";

interface CarTrend {
  id: string;
  make: string;
  model: string;
  generation: string;
  medianPrice: number;
  yoyChange: number;
  totalSold: number;
}

function formatPrice(price: number): string {
  return `$${price.toLocaleString()}`;
}

function CompactRow({ car }: { car: CarTrend }) {
  return (
    <Link href={`/car/${car.id}`}>
      <div className="flex justify-between items-center py-2.5 border-b border-card-border card-hover px-2 -mx-2">
        <div className="min-w-0">
          <p className="text-sm text-white truncate">
            {car.make} {car.model} <span className="text-muted">{car.generation}</span>
          </p>
          <p className="text-xs text-subtle mt-0.5">{car.totalSold} sold</p>
        </div>
        <p className="text-sm font-medium text-data-primary whitespace-nowrap">
          {formatPrice(car.medianPrice)}
        </p>
      </div>
    </Link>
  );
}

export default function DashboardClient({
  trends,
  totalAuctions,
  totalCars,
  overallMedian,
}: {
  trends: CarTrend[];
  totalAuctions: number;
  totalCars: number;
  overallMedian: number;
}) {
  const label = (t: CarTrend) => `${t.model} ${t.generation}`;

  // Biggest movers — balanced set of top appreciating + depreciating, sorted desc.
  const moving = trends.filter((t) => Math.abs(t.yoyChange) >= 2);
  const up = moving.filter((t) => t.yoyChange > 0).sort((a, b) => b.yoyChange - a.yoyChange).slice(0, 8);
  const down = moving.filter((t) => t.yoyChange < 0).sort((a, b) => a.yoyChange - b.yoyChange).slice(0, 8);
  const moverData: MoverDatum[] = [...up, ...down]
    .sort((a, b) => b.yoyChange - a.yoyChange)
    .map((t) => ({ id: t.id, label: label(t), yoyChange: t.yoyChange, medianPrice: t.medianPrice }));

  const scatterData: ScatterDatum[] = trends
    .filter((t) => t.totalSold > 0 && t.medianPrice > 0)
    .map((t) => ({ id: t.id, label: `${t.make} ${label(t)}`, totalSold: t.totalSold, medianPrice: t.medianPrice, yoyChange: t.yoyChange }));

  const bestValue = [...trends].filter((t) => t.medianPrice > 0).sort((a, b) => a.medianPrice - b.medianPrice).slice(0, 6);
  const mostExpensive = [...trends].sort((a, b) => b.medianPrice - a.medianPrice).slice(0, 6);

  const kpis = [
    { label: "Models tracked", value: totalCars.toLocaleString() },
    { label: "Auctions", value: totalAuctions.toLocaleString() },
    { label: "Overall median", value: formatPrice(overallMedian) },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-card-border">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Link href="/" className="text-xs uppercase tracking-[0.15em] text-muted hover:text-white transition-colors">
            ← Back to Cars
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mt-8 tracking-tight">
            Market
            <br />
            Dashboard
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-14">
        {/* KPI tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-card-border">
          {kpis.map((k) => (
            <div key={k.label} className="bg-background p-6">
              <p className="text-xs uppercase tracking-[0.15em] text-muted">{k.label}</p>
              <p className="text-3xl font-bold text-white mt-2 tracking-tight">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Biggest movers */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-1">
            Biggest Movers — Year over Year
          </h2>
          <p className="text-xs text-subtle mb-6">Median price change · click a bar for detail</p>
          <MoversChart data={moverData} />
        </section>

        {/* Market map */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-1">Market Map</h2>
          <p className="text-xs text-subtle mb-6">
            Median price vs how often it trades — top-left is expensive &amp; rare, bottom-right is affordable &amp; liquid
          </p>
          <MarketScatter data={scatterData} />
        </section>

        {/* Supporting lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14">
          <section>
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-1">Best Value</h2>
            <p className="text-xs text-subtle mb-4">Lowest median price</p>
            {bestValue.map((car) => (
              <CompactRow key={car.id} car={car} />
            ))}
          </section>
          <section>
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-1">Most Expensive</h2>
            <p className="text-xs text-subtle mb-4">Highest median price</p>
            {mostExpensive.map((car) => (
              <CompactRow key={car.id} car={car} />
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}

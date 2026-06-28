"use client";

import Link from "next/link";
import MoversChart, { type MoverDatum } from "./MoversChart";
import MarketScatter, { type ScatterDatum } from "./MarketScatter";

export interface CarTrend {
  id: string;
  make: string;
  model: string;
  generation: string;
  medianPrice: number;
  yoyChange: number;
  totalSold: number;
}

export interface ValueEntry {
  id: string;
  make: string;
  model: string;
  generation: string;
  current: number; // median, last 3 mo
  baseline: number; // median, prior 9 mo
  discountPct: number; // how far below its own recent median
}

function formatPrice(price: number): string {
  return `$${price.toLocaleString()}`;
}

function CompactRow({ car }: { car: CarTrend }) {
  return (
    <Link href={`/car/${car.id}`}>
      <div className="flex justify-between items-center py-2.5 border-b border-card-border card-hover px-2 -mx-2">
        <div className="min-w-0">
          <p className="text-sm text-foreground truncate">
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

function ValueRow({ car }: { car: ValueEntry }) {
  return (
    <Link href={`/car/${car.id}`}>
      <div className="flex justify-between items-center py-2.5 border-b border-card-border card-hover px-2 -mx-2">
        <div className="min-w-0">
          <p className="text-sm text-foreground truncate">
            {car.make} {car.model} <span className="text-muted">{car.generation}</span>
          </p>
          <p className="text-xs text-subtle mt-0.5">
            now {formatPrice(car.current)} · recent median {formatPrice(car.baseline)}
          </p>
        </div>
        <p className="text-sm font-medium text-muted whitespace-nowrap">−{car.discountPct}%</p>
      </div>
    </Link>
  );
}

export default function DashboardClient({
  trends,
  bestValue,
  totalAuctions,
  totalCars,
  overallMedian,
  moversCaption,
  valueCaption,
  asOf,
  latestSale,
}: {
  trends: CarTrend[];
  bestValue: ValueEntry[];
  totalAuctions: number;
  totalCars: number;
  overallMedian: number;
  moversCaption: string;
  valueCaption: string;
  asOf: string;
  latestSale: string | null;
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

  const mostExpensive = [...trends].sort((a, b) => b.medianPrice - a.medianPrice).slice(0, 6);

  const kpis = [
    { label: "Models tracked", value: totalCars.toLocaleString() },
    { label: "Auctions", value: totalAuctions.toLocaleString() },
    { label: "Overall median", value: formatPrice(overallMedian) },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-card-border">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-baseline justify-between">
            <Link href="/" className="font-serif text-lg font-bold text-foreground hover:text-trend-up transition-colors">
              The JDM Ledger
            </Link>
            <Link href="/" className="text-xs uppercase tracking-[0.15em] text-muted hover:text-foreground transition-colors">
              ← Back to Cars
            </Link>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-foreground mt-8 tracking-tight">
            Market Dashboard
          </h1>
          <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-subtle">
            Figures as of {asOf}
            {latestSale ? ` · latest recorded sale ${latestSale}` : ""}
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-14">
        {/* KPI tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-card-border">
          {kpis.map((k) => (
            <div key={k.label} className="bg-background p-6">
              <p className="text-xs uppercase tracking-[0.15em] text-muted">{k.label}</p>
              <p className="font-serif text-3xl font-bold text-foreground mt-2 tracking-tight">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Biggest movers */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-1">
            Biggest Movers — Year over Year
          </h2>
          <p className="text-xs text-subtle mb-6">{moversCaption} · click a bar for detail</p>
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
            <p className="text-xs text-subtle mb-4">{valueCaption}</p>
            {bestValue.length > 0 ? (
              bestValue.map((car) => <ValueRow key={car.id} car={car} />)
            ) : (
              <p className="text-sm text-subtle italic">No cars trading below their recent median right now.</p>
            )}
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

"use client";

import Link from "next/link";

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

function TrendRow({ car, showChange }: { car: CarTrend; showChange?: boolean }) {
  return (
    <Link href={`/car/${car.id}`}>
      <div className="flex justify-between items-center py-3 border-b border-card-border card-hover px-2 -mx-2">
        <div>
          <p className="text-sm text-white">
            {car.make} {car.model}
          </p>
          <p className="text-xs text-subtle mt-0.5">
            {car.generation} · {car.totalSold} sold
          </p>
        </div>
        <div className="text-right">
          {showChange ? (
            <p className={`text-sm font-medium ${car.yoyChange > 0 ? "text-trend-up" : "text-trend-down"}`}>
              {car.yoyChange > 0 ? "+" : ""}
              {car.yoyChange}%
            </p>
          ) : (
            <p className="text-sm font-medium text-data-primary">
              {formatPrice(car.medianPrice)}
            </p>
          )}
        </div>
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
  const appreciating = [...trends]
    .filter((t) => t.yoyChange > 2)
    .sort((a, b) => b.yoyChange - a.yoyChange);

  const depreciating = [...trends]
    .filter((t) => t.yoyChange < -2)
    .sort((a, b) => a.yoyChange - b.yoyChange);

  const bestValue = [...trends]
    .filter((t) => t.medianPrice > 0)
    .sort((a, b) => a.medianPrice - b.medianPrice)
    .slice(0, 8);

  const mostExpensive = [...trends]
    .sort((a, b) => b.medianPrice - a.medianPrice)
    .slice(0, 8);

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
          <p className="text-muted mt-3">
            {totalCars} models · {totalAuctions.toLocaleString()} auctions ·{" "}
            {formatPrice(overallMedian)} median
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14">
          {/* Appreciating */}
          <section>
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-1">
              Appreciating
            </h2>
            <p className="text-xs text-subtle mb-6">
              Year-over-year median increase
            </p>
            {appreciating.length > 0 ? (
              appreciating.map((car) => (
                <TrendRow key={car.id} car={car} showChange />
              ))
            ) : (
              <p className="text-subtle text-sm italic">
                Not enough data for YoY comparison
              </p>
            )}
          </section>

          {/* Depreciating */}
          <section>
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-1">
              Depreciating
            </h2>
            <p className="text-xs text-subtle mb-6">
              Year-over-year median decrease
            </p>
            {depreciating.length > 0 ? (
              depreciating.map((car) => (
                <TrendRow key={car.id} car={car} showChange />
              ))
            ) : (
              <p className="text-subtle text-sm italic">
                Not enough data for YoY comparison
              </p>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14">
          {/* Best Value */}
          <section>
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-1">
              Best Value
            </h2>
            <p className="text-xs text-subtle mb-6">
              Lowest median price
            </p>
            {bestValue.map((car) => (
              <TrendRow key={car.id} car={car} />
            ))}
          </section>

          {/* Most Expensive */}
          <section>
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-1">
              Most Expensive
            </h2>
            <p className="text-xs text-subtle mb-6">
              Highest median price
            </p>
            {mostExpensive.map((car) => (
              <TrendRow key={car.id} car={car} />
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}

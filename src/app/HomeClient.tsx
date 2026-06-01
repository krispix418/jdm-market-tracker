"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { CarWithStats } from "@/lib/types";
import type { TopMover } from "./page";

type SortOption = "name" | "price-high" | "price-low" | "most-sold";

function formatPrice(price: number): string {
  return price > 0 ? `$${price.toLocaleString()}` : "—";
}

function CarCard({ car }: { car: CarWithStats }) {
  const yearRange = car.year_end
    ? `${car.year_start}–${car.year_end}`
    : `${car.year_start}+`;

  return (
    <Link href={`/car/${car.id}`}>
      <div className="group cursor-pointer">
        <div className="aspect-[16/10] overflow-hidden bg-subtle mb-3">
          {car.thumbnail_url ? (
            <img
              src={car.thumbnail_url}
              alt={`${car.make} ${car.model} ${car.generation}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-muted text-sm">No image</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-baseline">
          <div>
            <h3 className="text-sm text-white group-hover:underline">
              {car.model} <span className="text-muted">{car.generation}</span>
            </h3>
            <p className="text-xs text-subtle mt-0.5">
              {yearRange}
            </p>
          </div>
          {car.total_sold > 0 && (
            <div className="text-right">
              <p className="text-sm font-medium text-data-primary">
                {formatPrice(car.avg_price)}
              </p>
              <p className="text-xs text-subtle">{car.total_sold} sold</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

const MODERN_MODELS = new Set(["RX-8"]);

function isClassic(car: CarWithStats): boolean {
  if (MODERN_MODELS.has(car.model)) return false;
  return (car.year_start ?? 0) < 2003;
}

export default function HomeClient({ cars, topMovers }: { cars: CarWithStats[]; topMovers: TopMover[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("name");
  const [activeMake, setActiveMake] = useState<string | null>(null);

  const allMakes = useMemo(() => {
    return [...new Set(cars.filter((c) => c.total_sold > 0).map((c) => c.make))].sort();
  }, [cars]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = cars.filter(
      (c) =>
        c.total_sold > 0 &&
        (!activeMake || c.make === activeMake) &&
        (c.make.toLowerCase().includes(q) ||
          c.model.toLowerCase().includes(q) ||
          c.generation.toLowerCase().includes(q))
    );

    result.sort((a, b) => {
      switch (sort) {
        case "price-high":
          return b.avg_price - a.avg_price;
        case "price-low":
          return (a.avg_price || Infinity) - (b.avg_price || Infinity);
        case "most-sold":
          return b.total_sold - a.total_sold;
        default:
          return `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`);
      }
    });

    return result;
  }, [cars, search, sort, activeMake]);

  const makes = useMemo(() => {
    const makeSet = [...new Set(filtered.map((c) => c.make))];
    return makeSet.sort();
  }, [filtered]);

  const totalAuctions = cars.reduce((a, c) => a + c.total_sold, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-card-border">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-16">
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter text-white leading-none">
            JDM Market
            <br />
            Tracker
          </h1>
          <p className="mt-4 text-muted text-lg max-w-xl">
            Auction data and price trends for Japanese domestic market
            and modern sport cars.
          </p>
          <div className="mt-6 flex items-center gap-6 text-xs text-muted">
            <span>{totalAuctions.toLocaleString()} auctions tracked</span>
            <span>·</span>
            <Link
              href="/dashboard"
              className="text-white underline underline-offset-4 hover:no-underline"
            >
              Market Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b border-card-border">
        <div className="max-w-7xl mx-auto px-6 py-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border border-card-border px-4 py-2 text-sm text-white placeholder-subtle focus:outline-none focus:border-muted transition-colors"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="bg-transparent border border-card-border px-4 py-2 text-sm text-muted focus:outline-none focus:border-muted transition-colors"
            >
              <option value="name">Name</option>
              <option value="price-high">Price ↑</option>
              <option value="price-low">Price ↓</option>
              <option value="most-sold">Most Sold</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveMake(null)}
              className={`px-3 py-1 text-xs border transition-colors ${
                !activeMake
                  ? "border-white text-white"
                  : "border-card-border text-subtle hover:text-muted hover:border-muted"
              }`}
            >
              All
            </button>
            {allMakes.map((make) => (
              <button
                key={make}
                onClick={() => setActiveMake(activeMake === make ? null : make)}
                className={`px-3 py-1 text-xs border transition-colors ${
                  activeMake === make
                    ? "border-white text-white"
                    : "border-card-border text-subtle hover:text-muted hover:border-muted"
                }`}
              >
                {make}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Movers */}
      {topMovers.length > 0 && !activeMake && !search && (
        <div className="max-w-7xl mx-auto px-6 pt-12 pb-6">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-6">
            Top Movers — Last 6 Months
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-card-border">
            {topMovers.map((mover) => (
              <Link key={mover.id} href={`/car/${mover.id}`}>
                <div className="bg-background p-4 card-hover h-full">
                  <p className={`text-lg font-bold tracking-tight ${
                    mover.percentChange > 0 ? "text-trend-up" : "text-trend-down"
                  }`}>
                    {mover.percentChange > 0 ? "+" : ""}{mover.percentChange}%
                  </p>
                  <p className="text-xs text-white mt-2">
                    {mover.model} <span className="text-muted">{mover.generation}</span>
                  </p>
                  <p className="text-xs text-subtle mt-0.5">
                    ${mover.medianPrice.toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Cars */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {makes.map((make) => {
          const makeCars = filtered.filter((c) => c.make === make);
          const classics = makeCars.filter(isClassic);
          const modern = makeCars.filter((c) => !isClassic(c));

          return (
            <section key={make} className="mb-16">
              <div className="flex items-baseline gap-4 mb-8 border-b border-card-border pb-4">
                <h2 className="text-3xl font-bold text-white tracking-tight">
                  {make}
                </h2>
                <span className="text-sm text-muted">
                  {makeCars.length} model{makeCars.length !== 1 ? "s" : ""}
                </span>
              </div>

              {classics.length > 0 && (
                <div className="mb-10">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted mb-6">
                    Classic
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                    {classics.map((car) => (
                      <CarCard key={car.id} car={car} />
                    ))}
                  </div>
                </div>
              )}

              {modern.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted mb-6">
                    Modern
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                    {modern.map((car) => (
                      <CarCard key={car.id} car={car} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}

        {makes.length === 0 && (
          <p className="text-center text-muted py-20">
            No cars match your search.
          </p>
        )}
      </main>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { CarWithStats } from "@/lib/types";
import type { TopMover } from "./page";

type SortOption = "name" | "price-high" | "price-low" | "most-sold";

interface ModelGroup {
  model: string;
  generations: CarWithStats[];
}

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
            <h3 className="text-sm text-foreground group-hover:underline">
              {car.generation}
            </h3>
            <p className="text-xs text-subtle mt-0.5">{yearRange}</p>
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

// A model's representative price = its priciest generation (the lineage ceiling).
function modelPrice(gens: CarWithStats[]): number {
  return Math.max(...gens.map((g) => g.avg_price));
}

function modelSold(gens: CarWithStats[]): number {
  return gens.reduce((sum, g) => sum + g.total_sold, 0);
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
    return cars.filter(
      (c) =>
        c.total_sold > 0 &&
        (!activeMake || c.make === activeMake) &&
        (c.make.toLowerCase().includes(q) ||
          c.model.toLowerCase().includes(q) ||
          c.generation.toLowerCase().includes(q))
    );
  }, [cars, search, activeMake]);

  // Order makes by total auctions sold — most-traded make at the top.
  const makes = useMemo(() => {
    const soldByMake = new Map<string, number>();
    for (const c of filtered) {
      soldByMake.set(c.make, (soldByMake.get(c.make) ?? 0) + c.total_sold);
    }
    return [...soldByMake.keys()].sort(
      (a, b) => (soldByMake.get(b) ?? 0) - (soldByMake.get(a) ?? 0)
    );
  }, [filtered]);

  // Group a make's cars by model (generations chronological within each model),
  // then order the model groups themselves by the active sort.
  const groupModels = useMemo(() => {
    return (makeCars: CarWithStats[]): ModelGroup[] => {
      const byModel = new Map<string, CarWithStats[]>();
      for (const c of makeCars) {
        const arr = byModel.get(c.model);
        if (arr) arr.push(c);
        else byModel.set(c.model, [c]);
      }

      const groups: ModelGroup[] = [...byModel.entries()].map(([model, gens]) => ({
        model,
        generations: [...gens].sort(
          (a, b) => (a.year_start ?? 0) - (b.year_start ?? 0)
        ),
      }));

      groups.sort((a, b) => {
        switch (sort) {
          case "price-high":
            return modelPrice(b.generations) - modelPrice(a.generations);
          case "price-low":
            return modelPrice(a.generations) - modelPrice(b.generations);
          case "most-sold":
            return modelSold(b.generations) - modelSold(a.generations);
          default:
            return a.model.localeCompare(b.model);
        }
      });

      return groups;
    };
  }, [sort]);

  const totalAuctions = cars.reduce((a, c) => a + c.total_sold, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Masthead */}
      <header className="border-b-2 border-card-border">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-16">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
            Japanese Domestic Market · Auction Values · Est. 2026
          </p>
          <h1 className="mt-3 font-serif font-black text-6xl sm:text-8xl tracking-tight text-foreground leading-[0.95]">
            The JDM Ledger
          </h1>
          <p className="mt-4 text-muted text-lg max-w-xl">
            Auction data and price trends for Japanese domestic market
            and modern sport cars.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <span className="text-xs text-muted">
              {totalAuctions.toLocaleString()} auctions tracked
            </span>
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 border border-trend-up/40 px-4 py-2 text-xs uppercase tracking-[0.15em] text-trend-up hover:bg-trend-up/10 hover:border-trend-up transition-colors"
            >
              Market Dashboard
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
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
              className="flex-1 bg-transparent border border-card-border px-4 py-2 text-sm text-foreground placeholder-subtle focus:outline-none focus:border-muted transition-colors"
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
                  ? "border-foreground text-foreground"
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
                    ? "border-foreground text-foreground"
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
                  <p className="text-xs text-foreground mt-2">
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

      {/* Cars — grouped by make, then by model lineage */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {makes.map((make) => {
          const makeCars = filtered.filter((c) => c.make === make);
          const groups = groupModels(makeCars);

          return (
            <section key={make} className="mb-16">
              <div className="flex items-baseline gap-4 mb-8 border-b-2 border-card-border pb-4">
                <h2 className="font-serif text-4xl font-bold text-foreground tracking-tight">
                  {make}
                </h2>
                <span className="text-sm text-muted">
                  {makeCars.length} car{makeCars.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-10">
                {groups.map((group) => (
                  <div key={group.model}>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted mb-6">
                      {group.model}
                      {group.generations.length > 1 && (
                        <span className="ml-2 normal-case tracking-normal text-subtle">
                          {group.generations.length} generations
                        </span>
                      )}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                      {group.generations.map((car) => (
                        <CarCard key={car.id} car={car} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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

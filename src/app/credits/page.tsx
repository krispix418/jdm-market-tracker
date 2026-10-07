import type { Metadata } from "next";
import Link from "next/link";
import { getMarketData } from "@/lib/data";
import PhotoCredit from "../PhotoCredit";

export const metadata: Metadata = { title: "Photo Credits · The JDM Ledger" };
export const revalidate = 3600;

export default async function Credits() {
  const { cars } = await getMarketData();
  const credited = cars
    .filter((c) => c.image_url)
    .sort((a, b) => `${a.make} ${a.model} ${a.year_start}`.localeCompare(`${b.make} ${b.model} ${b.year_start}`));

  return (
    <div className="bg-background">
      <header className="border-b-2 border-card-border">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Link href="/" className="font-serif text-lg font-bold text-foreground hover:text-trend-up transition-colors">
            The JDM Ledger
          </Link>
          <h1 className="mt-8 font-serif text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
            Photo Credits
          </h1>
          <p className="text-muted mt-3 max-w-2xl">
            Car photos are freely licensed images from Wikimedia Commons, shown with a duotone filter
            (edited). Thanks to every photographer below.
          </p>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10">
        {credited.length === 0 ? (
          <p className="text-muted">No photos yet.</p>
        ) : (
          <ul className="divide-y divide-card-border/30">
            {credited.map((car) => (
              <li key={car.id} className="py-3 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <Link href={`/car/${car.id}`} className="text-sm text-foreground hover:underline">
                  {car.make} {car.model} {car.generation}
                </Link>
                <PhotoCredit car={car} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

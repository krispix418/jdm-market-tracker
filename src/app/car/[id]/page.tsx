import Link from "next/link";
import { notFound } from "next/navigation";
import { getCar, getAuctionResults } from "@/lib/data";
import { computeYoY, compute6Month } from "@/lib/trends";
import PriceChart from "./PriceChart";
import MileageChart from "./MileageChart";
import TrimBreakdown from "./TrimBreakdown";
import TrendToggle from "./TrendToggle";

function formatPrice(price: number): string {
  return `$${price.toLocaleString()}`;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export const revalidate = 3600;

export default async function CarDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const car = await getCar(id);
  if (!car) notFound();

  const auctions = await getAuctionResults(car.id);

  const prices = auctions.map((a) => a.sale_price);
  const avgPrice =
    prices.length > 0
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : 0;
  const medianPrice = prices.length > 0 ? median(prices) : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  const yoyTrend = computeYoY(auctions);
  const sixMonthTrend = compute6Month(auctions);

  const yearRange = car.year_end
    ? `${car.year_start}–${car.year_end}`
    : `${car.year_start}+`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-card-border">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Link href="/" className="text-xs uppercase tracking-[0.15em] text-muted hover:text-white transition-colors">
            ← Back
          </Link>
          <div className="mt-8 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                {car.make}
              </p>
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mt-2">
                {car.model}
              </h1>
              <p className="text-muted mt-2">
                {car.generation} · {yearRange}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.15em] text-muted mb-1">
                Median
              </p>
              <p className="text-3xl font-bold text-white tracking-tight">
                {prices.length > 0 ? formatPrice(medianPrice) : "—"}
              </p>
              <div className="mt-2">
                <TrendToggle yoy={yoyTrend} sixMonth={sixMonthTrend} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-14">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-card-border">
          {[
            { label: "Sold", value: auctions.length.toString() },
            { label: "Median", value: prices.length > 0 ? formatPrice(medianPrice) : "—" },
            { label: "Average", value: prices.length > 0 ? formatPrice(avgPrice) : "—" },
            { label: "Low", value: prices.length > 0 ? formatPrice(minPrice) : "—" },
            { label: "High", value: prices.length > 0 ? formatPrice(maxPrice) : "—" },
          ].map((stat) => (
            <div key={stat.label} className="bg-background p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-muted">{stat.label}</p>
              <p className="text-xl font-medium text-white mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Price History */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-6">
            Price History
          </h2>
          <PriceChart auctions={auctions} />
        </section>

        {/* Price vs Mileage */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-6">
            Price vs Mileage
          </h2>
          <MileageChart auctions={auctions} />
        </section>

        {/* Trim Breakdown */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-6">
            Trim Comparison
          </h2>
          <TrimBreakdown auctions={auctions} />
        </section>

        {/* Recent auctions */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted mb-6">
            Auctions ({auctions.length})
          </h2>
          <div className="divide-y divide-card-border">
            {[...auctions]
              .reverse()
              .slice(0, 50)
              .map((auction) => (
                <a
                  key={auction.id}
                  href={auction.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block py-4 card-hover px-2 -mx-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">
                        {auction.title}
                      </p>
                      <div className="flex gap-3 mt-1 text-xs text-subtle">
                        <span>{auction.sale_date}</span>
                        {auction.mileage && (
                          <span>{auction.mileage.toLocaleString()} mi</span>
                        )}
                        {auction.trim && (
                          <span className="text-muted">{auction.trim}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-medium text-white whitespace-nowrap">
                      {formatPrice(auction.sale_price)}
                    </p>
                  </div>
                </a>
              ))}
          </div>
          {auctions.length > 50 && (
            <p className="text-center text-subtle text-xs py-6">
              Showing 50 of {auctions.length}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

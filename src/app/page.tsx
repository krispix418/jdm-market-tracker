import { getCarsWithStats, getAuctionResults } from "@/lib/data";
import { compute6Month } from "@/lib/trends";
import type { CarWithStats } from "@/lib/types";
import HomeClient from "./HomeClient";

export interface TopMover {
  id: string;
  make: string;
  model: string;
  generation: string;
  percentChange: number;
  medianPrice: number;
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

export default async function Home() {
  const cars = await getCarsWithStats();

  const movers: TopMover[] = [];
  for (const car of cars) {
    if (car.total_sold < 10) continue;
    const auctions = await getAuctionResults(car.id);
    const trend = compute6Month(auctions);
    if (trend.direction === "flat") continue;
    movers.push({
      id: car.id,
      make: car.make,
      model: car.model,
      generation: car.generation,
      percentChange: trend.percentChange,
      medianPrice: median(auctions.map((a) => a.sale_price)),
    });
  }

  const topMovers = [...movers]
    .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
    .slice(0, 6);

  return <HomeClient cars={cars} topMovers={topMovers} />;
}

import { getMarketData } from "@/lib/data";
import { compute6Month, sixMonthWindow, formatMonthRange, formatDate } from "@/lib/trends";
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
  const { cars, seriesByCar, latestSaleDate } = await getMarketData();

  const movers: TopMover[] = [];
  for (const car of cars) {
    if (car.total_sold < 10) continue;
    const series = seriesByCar.get(car.id) ?? [];
    const trend = compute6Month(series);
    if (trend.direction === "flat") continue;
    movers.push({
      id: car.id,
      make: car.make,
      model: car.model,
      generation: car.generation,
      percentChange: trend.percentChange,
      medianPrice: median(series.map((s) => s.sale_price)),
    });
  }

  const topMovers = [...movers]
    .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
    .slice(0, 6);

  const w = sixMonthWindow();
  const moversCaption = `Median of the last 6 mo (${formatMonthRange(w.recentStart, w.recentEnd)}) vs the prior 6 mo (${formatMonthRange(w.priorStart, w.priorEnd)}) · needs ≥3 sales per window`;
  const asOf = formatDate(new Date().toISOString().slice(0, 10));
  const latestSale = latestSaleDate ? formatDate(latestSaleDate) : null;

  return (
    <HomeClient
      cars={cars}
      topMovers={topMovers}
      moversCaption={moversCaption}
      asOf={asOf}
      latestSale={latestSale}
    />
  );
}

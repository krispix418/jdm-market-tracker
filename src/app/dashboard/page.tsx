import { getMarketData } from "@/lib/data";
import { computeYoY, computeValueSignal, yoyWindow, formatMonthRange, formatDate } from "@/lib/trends";
import DashboardClient, { type CarTrend, type ValueEntry } from "./DashboardClient";

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export const revalidate = 3600;

export default async function Dashboard() {
  const { cars, seriesByCar, latestSaleDate } = await getMarketData();

  const trends: CarTrend[] = [];
  const valueEntries: ValueEntry[] = [];

  for (const car of cars) {
    if (car.total_sold < 5) continue;
    const series = seriesByCar.get(car.id) ?? [];
    if (series.length < 5) continue;

    const yoy = computeYoY(series);
    trends.push({
      id: car.id,
      make: car.make,
      model: car.model,
      generation: car.generation,
      medianPrice: median(series.map((s) => s.sale_price)),
      yoyChange: yoy.percentChange,
      totalSold: car.total_sold,
    });

    // Best value = trading below its own recent median (a dip-buy signal).
    const vs = computeValueSignal(series);
    if (vs && vs.discountPct > 0) {
      valueEntries.push({
        id: car.id,
        make: car.make,
        model: car.model,
        generation: car.generation,
        current: vs.current,
        baseline: vs.baseline,
        discountPct: vs.discountPct,
      });
    }
  }

  const bestValue = [...valueEntries].sort((a, b) => b.discountPct - a.discountPct).slice(0, 6);

  const carsWithData = cars.filter((c) => c.total_sold > 0);
  const totalAuctions = cars.reduce((a, c) => a + c.total_sold, 0);
  const totalCars = carsWithData.length;
  const overallMedian = median(carsWithData.map((c) => c.avg_price));

  const yw = yoyWindow();
  const moversCaption = `Median of the last 12 mo (${formatMonthRange(yw.recentStart, yw.recentEnd)}) vs the prior 12 mo (${formatMonthRange(yw.priorStart, yw.priorEnd)}) · needs ≥3 sales per window`;
  const valueCaption = "Trading furthest below its own recent median — last 3 mo vs the prior 9 mo, biggest discount first";
  const asOf = formatDate(new Date().toISOString().slice(0, 10));
  const latestSale = latestSaleDate ? formatDate(latestSaleDate) : null;

  return (
    <DashboardClient
      trends={trends}
      bestValue={bestValue}
      totalAuctions={totalAuctions}
      totalCars={totalCars}
      overallMedian={overallMedian}
      moversCaption={moversCaption}
      valueCaption={valueCaption}
      asOf={asOf}
      latestSale={latestSale}
    />
  );
}

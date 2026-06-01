import Link from "next/link";
import { getCarsWithStats } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { computeYoY } from "@/lib/trends";
import DashboardClient from "./DashboardClient";

interface CarTrend {
  id: string;
  make: string;
  model: string;
  generation: string;
  medianPrice: number;
  yoyChange: number;
  totalSold: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

async function getCarTrends(): Promise<CarTrend[]> {
  const cars = await getCarsWithStats();
  const trends: CarTrend[] = [];

  for (const car of cars) {
    if (car.total_sold < 5) continue;

    const { data: auctions } = await supabase
      .from("auction_results")
      .select("sale_price, sale_date")
      .eq("car_id", car.id)
      .order("sale_date", { ascending: true });

    if (!auctions || auctions.length < 5) continue;

    const yoy = computeYoY(auctions);
    const prices = auctions.map((a) => a.sale_price);

    trends.push({
      id: car.id,
      make: car.make,
      model: car.model,
      generation: car.generation,
      medianPrice: median(prices),
      yoyChange: yoy.percentChange,
      totalSold: car.total_sold,
    });
  }

  return trends;
}

export const revalidate = 3600;

export default async function Dashboard() {
  const trends = await getCarTrends();
  const cars = await getCarsWithStats();

  const totalAuctions = cars.reduce((a, c) => a + c.total_sold, 0);
  const carsWithData = cars.filter((c) => c.total_sold > 0);
  const totalCars = carsWithData.length;
  const allPrices = carsWithData.map((c) => c.avg_price);
  const overallMedian = median(allPrices);

  return (
    <DashboardClient
      trends={trends}
      totalAuctions={totalAuctions}
      totalCars={totalCars}
      overallMedian={overallMedian}
    />
  );
}

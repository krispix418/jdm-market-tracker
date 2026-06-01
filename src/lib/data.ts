import { supabase } from "./supabase";
import type { Car, AuctionResult, CarWithStats } from "./types";

async function fetchAllRows<T>(
  table: string,
  select: string,
  order?: { column: string; ascending: boolean },
  filter?: { column: string; value: string }
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const allRows: T[] = [];
  let from = 0;

  while (true) {
    let query = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1);
    if (order) query = query.order(order.column, { ascending: order.ascending });
    if (filter) query = query.eq(filter.column, filter.value);

    const { data } = await query;
    if (!data || data.length === 0) break;

    allRows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows;
}

export async function getCarsWithStats(): Promise<CarWithStats[]> {
  const { data: cars } = await supabase
    .from("cars")
    .select("*")
    .order("make")
    .order("model")
    .order("year_start");

  if (!cars) return [];

  const auctions = await fetchAllRows<{ car_id: string; sale_price: number; sale_date: string; thumbnail_url: string | null }>(
    "auction_results",
    "car_id, sale_price, sale_date, thumbnail_url",
    { column: "sale_date", ascending: false }
  );

  const auctionsByCar = new Map<string, { prices: number[]; latest: number; thumbnail: string | null }>();
  for (const a of auctions) {
    const entry = auctionsByCar.get(a.car_id);
    if (entry) {
      entry.prices.push(a.sale_price);
      if (!entry.thumbnail && a.thumbnail_url) entry.thumbnail = a.thumbnail_url;
    } else {
      auctionsByCar.set(a.car_id, { prices: [a.sale_price], latest: a.sale_price, thumbnail: a.thumbnail_url });
    }
  }

  return cars.map((car) => {
    const entry = auctionsByCar.get(car.id);
    if (!entry) {
      return { ...car, avg_price: 0, min_price: 0, max_price: 0, total_sold: 0, latest_price: 0, thumbnail_url: null };
    }
    const { prices, latest, thumbnail } = entry;
    return {
      ...car,
      avg_price: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      min_price: Math.min(...prices),
      max_price: Math.max(...prices),
      total_sold: prices.length,
      latest_price: latest,
      thumbnail_url: thumbnail,
    };
  });
}

export async function getCar(id: string): Promise<Car | null> {
  const { data } = await supabase.from("cars").select("*").eq("id", id).single();
  return data;
}

export async function getAuctionResults(carId: string): Promise<AuctionResult[]> {
  const auctions = await fetchAllRows<AuctionResult>(
    "auction_results",
    "*",
    { column: "sale_date", ascending: true },
    { column: "car_id", value: carId }
  );
  return auctions;
}

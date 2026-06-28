import { supabase } from "./supabase";
import type { Car, AuctionResult, CarWithStats } from "./types";

async function fetchAllRows<T>(
  table: string,
  select: string,
  order?: { column: string; ascending: boolean },
  filter?: { column: string; value: string }
): Promise<T[]> {
  const PAGE_SIZE = 1000; // PostgREST caps a response at 1000 rows, so we page.

  // One count query up front, then fetch every page concurrently instead of
  // walking them serially (turns ~N sequential round-trips into ~one).
  let countQuery = supabase.from(table).select(select, { count: "exact", head: true });
  if (filter) countQuery = countQuery.eq(filter.column, filter.value);
  const { count } = await countQuery;

  const total = count ?? 0;
  if (total === 0) return [];

  const pages = Math.ceil(total / PAGE_SIZE);
  const requests = Array.from({ length: pages }, (_, p) => {
    let query = supabase.from(table).select(select).range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1);
    if (order) query = query.order(order.column, { ascending: order.ascending });
    if (filter) query = query.eq(filter.column, filter.value);
    return query;
  });

  const results = await Promise.all(requests);
  const allRows: T[] = [];
  for (const { data } of results) {
    if (data) allRows.push(...(data as T[]));
  }
  return allRows;
}

/** A car's price history, oldest → newest. */
export type CarSeries = { sale_price: number; sale_date: string }[];

export interface MarketData {
  cars: CarWithStats[];
  /** car_id → chronological sale history, for trend/value computation in JS. */
  seriesByCar: Map<string, CarSeries>;
  /** newest sale_date present in the data (ISO yyyy-mm-dd), or null if empty. */
  latestSaleDate: string | null;
}

/**
 * One pass over the data: a single `cars` query + a single (paginated) bulk
 * fetch of all auctions, from which we derive both per-car stats and per-car
 * time-series. This replaces the old per-car N+1 queries on the home and
 * dashboard pages.
 */
export async function getMarketData(): Promise<MarketData> {
  const { data: cars } = await supabase
    .from("cars")
    .select("*")
    .order("make")
    .order("model")
    .order("year_start");

  if (!cars) return { cars: [], seriesByCar: new Map(), latestSaleDate: null };

  // Ascending so each car's series is chronological and the newest row wins for latest/thumbnail.
  const rows = await fetchAllRows<{ car_id: string; sale_price: number; sale_date: string; thumbnail_url: string | null }>(
    "auction_results",
    "car_id, sale_price, sale_date, thumbnail_url",
    { column: "sale_date", ascending: true }
  );

  const seriesByCar = new Map<string, CarSeries>();
  const metaByCar = new Map<string, { latest: number; thumbnail: string | null }>();
  let latestSaleDate: string | null = null;

  for (const r of rows) {
    let series = seriesByCar.get(r.car_id);
    if (!series) {
      series = [];
      seriesByCar.set(r.car_id, series);
    }
    series.push({ sale_price: r.sale_price, sale_date: r.sale_date });

    // asc order → the last row seen per car is the newest sale.
    const meta = metaByCar.get(r.car_id) ?? { latest: r.sale_price, thumbnail: null };
    meta.latest = r.sale_price;
    if (r.thumbnail_url) meta.thumbnail = r.thumbnail_url;
    metaByCar.set(r.car_id, meta);

    if (!latestSaleDate || r.sale_date > latestSaleDate) latestSaleDate = r.sale_date;
  }

  const carsWithStats: CarWithStats[] = cars.map((car) => {
    const series = seriesByCar.get(car.id);
    const meta = metaByCar.get(car.id);
    if (!series || series.length === 0 || !meta) {
      return { ...car, avg_price: 0, min_price: 0, max_price: 0, total_sold: 0, latest_price: 0, thumbnail_url: null };
    }
    const prices = series.map((s) => s.sale_price);
    return {
      ...car,
      avg_price: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      min_price: Math.min(...prices),
      max_price: Math.max(...prices),
      total_sold: prices.length,
      latest_price: meta.latest,
      thumbnail_url: meta.thumbnail,
    };
  });

  return { cars: carsWithStats, seriesByCar, latestSaleDate };
}

export async function getCarsWithStats(): Promise<CarWithStats[]> {
  return (await getMarketData()).cars;
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

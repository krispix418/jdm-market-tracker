import { supabase } from "./supabase";
import type { Car, AuctionResult, CarWithStats, Insight } from "./types";

type QueryResult = { data: unknown; error: unknown; count?: number | null };

/** Run a Supabase query with small backoff retries; throw rather than ever
 *  return silently-incomplete data (a dropped page = wrong stats). */
async function withRetry(label: string, exec: () => PromiseLike<QueryResult>): Promise<QueryResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await exec();
    if (!res.error) return res;
    lastError = res.error;
    await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
  }
  throw new Error(`Supabase ${label} failed after retries: ${JSON.stringify(lastError)}`);
}

async function fetchAllRows<T>(
  table: string,
  select: string,
  order?: { column: string; ascending: boolean },
  filter?: { column: string; value: string }
): Promise<T[]> {
  const PAGE_SIZE = 1000; // PostgREST caps a response at 1000 rows, so we page.

  const buildPage = (opts: { head?: boolean; from?: number }) => {
    let query = supabase
      .from(table)
      .select(select, opts.head ? { count: "exact", head: true } : undefined);
    if (opts.from !== undefined) query = query.range(opts.from, opts.from + PAGE_SIZE - 1);
    if (order) query = query.order(order.column, { ascending: order.ascending });
    if (filter) query = query.eq(filter.column, filter.value);
    return query as unknown as PromiseLike<QueryResult>;
  };

  // One count query up front, then fetch all pages concurrently (turns ~N
  // sequential round-trips into ~one) — with retries so a rate-limited page
  // is retried, never silently skipped.
  const { count } = await withRetry("count", () => buildPage({ head: true }));
  const total = count ?? 0;
  if (total === 0) return [];

  const pages = Math.ceil(total / PAGE_SIZE);
  const chunks = await Promise.all(
    Array.from({ length: pages }, (_, p) => withRetry(`page ${p}`, () => buildPage({ from: p * PAGE_SIZE })))
  );

  const allRows: T[] = [];
  for (const { data } of chunks) {
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

  // Ascending so each car's series is chronological and the newest row wins for latest.
  const rows = await fetchAllRows<{ car_id: string; sale_price: number; sale_date: string }>(
    "auction_results",
    "car_id, sale_price, sale_date",
    { column: "sale_date", ascending: true }
  );

  const seriesByCar = new Map<string, CarSeries>();
  const metaByCar = new Map<string, { latest: number }>();
  let latestSaleDate: string | null = null;

  for (const r of rows) {
    let series = seriesByCar.get(r.car_id);
    if (!series) {
      series = [];
      seriesByCar.set(r.car_id, series);
    }
    series.push({ sale_price: r.sale_price, sale_date: r.sale_date });

    // asc order → the last row seen per car is the newest sale.
    const meta = metaByCar.get(r.car_id) ?? { latest: r.sale_price };
    meta.latest = r.sale_price;
    metaByCar.set(r.car_id, meta);

    if (!latestSaleDate || r.sale_date > latestSaleDate) latestSaleDate = r.sale_date;
  }

  const carsWithStats: CarWithStats[] = cars.map((car) => {
    const series = seriesByCar.get(car.id);
    const meta = metaByCar.get(car.id);
    if (!series || series.length === 0 || !meta) {
      return { ...car, avg_price: 0, min_price: 0, max_price: 0, total_sold: 0, latest_price: 0 };
    }
    const prices = series.map((s) => s.sale_price);
    return {
      ...car,
      avg_price: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      min_price: Math.min(...prices),
      max_price: Math.max(...prices),
      total_sold: prices.length,
      latest_price: meta.latest,
    };
  });

  return { cars: carsWithStats, seriesByCar, latestSaleDate };
}

export async function getCarsWithStats(): Promise<CarWithStats[]> {
  return (await getMarketData()).cars;
}

/** WS4 fun-facts. Returns [] gracefully if the table doesn't exist yet. */
export async function getInsights(scope: "market" | "car" = "market", carId?: string): Promise<Insight[]> {
  let query = supabase.from("insights").select("*").eq("scope", scope).order("metric_value", { ascending: false });
  if (carId) query = query.eq("car_id", carId);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as Insight[];
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

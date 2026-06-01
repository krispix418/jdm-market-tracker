export interface Car {
  id: string;
  make: string;
  model: string;
  generation: string;
  year_start: number | null;
  year_end: number | null;
}

export interface AuctionResult {
  id: string;
  car_id: string;
  source: string;
  title: string;
  sale_price: number;
  sale_date: string;
  year: number | null;
  mileage: number | null;
  url: string;
  thumbnail_url: string | null;
  trim: string | null;
  created_at: string;
}

export interface CarWithStats extends Car {
  avg_price: number;
  min_price: number;
  max_price: number;
  total_sold: number;
  latest_price: number;
  thumbnail_url: string | null;
}

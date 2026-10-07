export interface Car {
  id: string;
  make: string;
  model: string;
  generation: string;
  year_start: number | null;
  year_end: number | null;
  // Wikimedia Commons hero photo + attribution (migration 005).
  image_url: string | null;
  image_author: string | null;
  image_license: string | null;
  image_license_url: string | null;
  image_source_url: string | null;
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
  // Phase 2 · WS1 enrichment
  excerpt: string | null;
  no_reserve: boolean | null;
  country_code: string | null;
  comments_count: number | null;
  is_modified: boolean | null;
  special_edition: string | null;
  condition_flag: string | null;
  is_import: boolean | null;
}

export interface Insight {
  id: string;
  scope: string; // 'market' | 'car'
  car_id: string | null;
  kind: string; // 'mover' | 'ratio' | 'icon_entry' | 'deal' | 'premium'
  text: string;
  metric_value: number | null;
  generated_at: string;
}

export interface CarWithStats extends Car {
  avg_price: number;
  min_price: number;
  max_price: number;
  total_sold: number;
  latest_price: number;
}

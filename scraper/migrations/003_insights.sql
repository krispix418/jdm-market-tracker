-- Phase 2 · Workstream 4 — insights ("fun facts") engine.
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- BEFORE running the insights generator (scraper/insights.py), which writes here.
--
-- Safe to re-run.

create table if not exists insights (
  id           uuid primary key default gen_random_uuid(),
  scope        text not null,            -- 'market' (whole board) | 'car' (a specific car)
  car_id       uuid references cars (id) on delete cascade,
  kind         text not null,            -- 'mover' | 'ratio' | 'icon_entry' | 'deal' | 'premium'
  text         text not null,            -- Claude-phrased copy (grounded — numbers come from us)
  metric_value numeric,                  -- the underlying number, for sorting/display
  generated_at timestamptz not null default now()
);

create index if not exists idx_insights_scope on insights (scope);
create index if not exists idx_insights_car   on insights (car_id);

-- The frontend reads with the anon key, so insights must be publicly readable.
alter table insights enable row level security;
drop policy if exists "insights public read" on insights;
create policy "insights public read" on insights for select using (true);

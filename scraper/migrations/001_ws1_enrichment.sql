-- Phase 2 · Workstream 1 — data enrichment columns on auction_results.
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- BEFORE running the enriched scraper, which inserts these columns.
--
-- Safe to re-run: every statement uses IF NOT EXISTS.

alter table auction_results add column if not exists excerpt          text;
alter table auction_results add column if not exists no_reserve       boolean;
alter table auction_results add column if not exists country_code     text;
alter table auction_results add column if not exists comments_count   integer;
alter table auction_results add column if not exists is_modified      boolean default false;
alter table auction_results add column if not exists special_edition  text;
alter table auction_results add column if not exists condition_flag   text;
alter table auction_results add column if not exists is_import        boolean default false;

-- Helpful indexes for the segmentation/valuation work in Workstream 2.
create index if not exists idx_auction_results_is_modified     on auction_results (is_modified);
create index if not exists idx_auction_results_special_edition on auction_results (special_edition);

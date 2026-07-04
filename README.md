# The JDM Ledger 🚗

**An editorial market paper for JDM and sport-car auction values.**

Live at **[jdm-market-tracker.vercel.app](https://jdm-market-tracker.vercel.app)**

The JDM Ledger tracks auction results for 55 Japanese sports cars, from Initial D-era icons (AE86, FD RX-7, R34 Skyline GT-R) to modern metal (GR Corolla, FL5 Civic Type R). It turns roughly 15,000 historical sales into a market almanac: price trends, valuation signals, and a breakdown of what actually drives the hammer price.

The design is a broadsheet newspaper. Warm paper, ink, one oxblood accent, serif masthead. It's built for the investor watching appreciation and the buyer hunting a fair deal alike.

## What it does

- **Market dashboard.** YoY and 6-month movers, a market-map scatter of every tracked model with drag-to-zoom, and headline stats that always show their date windows
- **Per-car pages.** Price and mileage trend charts with percentile bands and moving averages, plus trim, condition, and special-edition breakdowns
- **"What Drives the Price."** A hedonic regression (multivariate OLS) per model that estimates how many dollars mileage, age, modifications, special editions, and import provenance each add or subtract
- **Value signal.** Flags cars trading below their own recent median (last 3 months vs the prior 9). It's a dip signal, not a "cheapest = best" trap
- **"The Ledger Says."** An insights strip where computed market facts get phrased by Claude Haiku, grounded in the actual numbers so it can't make things up
- **Data quality first.** The scraper filters out parts listings (no BBS wheels masquerading as cars), pulls condition and modification signals out of listing text, and dedupes by listing URL

## Architecture

```
GitHub Actions (weekly cron)
        |
        v
Python scraper (BringATrailer)
  simple mode: HTTP, newest listings     full mode: Playwright, complete backfill
        |
        v
Supabase (Postgres): cars, auction_results, insights
        |
        v
Next.js (App Router) on Vercel, charts in Recharts
```

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), Tailwind CSS 4, Recharts |
| Database | Supabase (Postgres) |
| Scraper | Python. requests/BeautifulSoup for the weekly run, Playwright for backfills |
| Scheduling | GitHub Actions cron (weekly) plus manual `workflow_dispatch` backfills |
| Insights | Anthropic API (Claude Haiku) over precomputed stats |
| Hosting | Vercel |

## Data and modeling notes

- **Grain:** one row per auction sale, deduped by listing URL. Only true sales (`Sold for $X`) are kept; reserve-not-met bids are excluded
- **Feature extraction:** `is_modified`, `special_edition` (22B, Nür, V-Spec, and friends), `condition_flag` (project, restored, salvage, track), and `is_import` are parsed from titles and descriptions. They feed both the breakdowns and the regression
- **Hedonic model:** per-model OLS with an n>=20 guard. Zero-variance and sparse binary features get auto-dropped, and text-detected flags are labeled as approximate in the UI
- **Honest metrics:** every relative metric carries its date window and sample count. No unlabeled "up 12%!" claims

## Running locally

```bash
npm install
npm run dev            # frontend at localhost:3000

cd scraper
python scraper.py --simple    # quick scrape (newest listings per model)
python scraper.py             # full Playwright backfill
```

The frontend needs `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the scraper needs `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`.

## Roadmap

- Activate the insights engine in production (key and migration are staged)
- Add Cars & Bids as a second auction source
- Hedonic model stretch goals: interaction terms, time-varying effects
- A "hype index" from cultural-trend data, currently deferred until there's a source I can actually ground it in

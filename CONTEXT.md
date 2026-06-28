# The JDM Ledger (JDM Market Tracker) — Project Context

> Branded as **The JDM Ledger** — an editorial "broadsheet" market paper for JDM /
> sport-car auction values. Internal/repo name remains jdm-market-tracker.

## What is this?
A web app that tracks JDM and sport car auction prices over time. Users can browse specific makes/models/generations, view price trends, and see recent auction results. Data is scraped from public auction sites on a schedule.

## Architecture
- **Frontend:** Next.js on Vercel
- **Database:** Supabase (Postgres) — stores historical auction results
- **Scraper:** Python, runs on GitHub Actions (scheduled)
- **Flow:** GitHub Actions cron → Python scraper → writes to Supabase → Next.js frontend queries Supabase

## Tech Stack
| Layer | Tech |
|---|---|
| Frontend | Next.js (App Router) |
| Styling | TBD (Tailwind CSS likely) |
| Charts | Recharts |
| Database | Supabase (Postgres, free tier) |
| Scraper | Python + BeautifulSoup/requests |
| Hosting | Vercel (free tier) |
| Scraper runtime | GitHub Actions cron |

## Data Sources
- **BringATrailer** (primary) — public auction results, well-structured
- **Cars & Bids** (secondary) — similar format, good JDM coverage
- Japanese auction sites (future stretch goal)

## Cars Tracked

### Classic JDM (Initial D era & 90s icons)
| Make | Model | Generations |
|---|---|---|
| Toyota | AE86 (Sprinter Trueno / Corolla Levin) | AE86 |
| Mazda | RX-7 | FC, FD |
| Nissan | Skyline GT-R | R32, R33, R34 |
| Nissan | Silvia | S13, S14, S15 |
| Honda | S2000 | AP1, AP2 |
| Honda | Integra Type R | DC2, DC5 |
| Toyota | Supra | A80 |
| Mitsubishi | Lancer Evolution | III, IV, V, VI, VII, VIII, IX |
| Subaru | Impreza WRX STI | GC8, GDB |
| Mazda | MX-5 Miata | NA, NB |

### Modern Sport Cars
| Make | Model | Generations |
|---|---|---|
| Toyota | GR86 / Subaru BRZ | ZN8 / ZD8 |
| Toyota | GR Supra | A90 |
| Mazda | MX-5 Miata | NC, ND |
| Mazda | RX-8 | SE3P |
| Honda | Civic Type R | FK8, FL5 |
| Honda | Integra Type S | DE5 |
| Acura | TLX Type S | UA3 |
| Nissan | Z | RZ34 |
| Toyota | GR Corolla | GZEA14H |

## Database Schema (draft)
```
cars
  - id (uuid)
  - make (text)
  - model (text)
  - generation (text)
  - year_start (int)
  - year_end (int)

auction_results
  - id (uuid)
  - car_id (fk → cars)
  - source (text) — 'bringatrailer', 'carsandbids'
  - title (text) — original listing title
  - sale_price (int) — in USD
  - sale_date (date)
  - year (int) — model year of the car
  - mileage (int, nullable)
  - trim (text, nullable) — parsed from title (e.g. V-Spec, Nismo, CR)
  - url (text) — link to listing; used as dedup key
  - thumbnail_url (text, nullable)
  - created_at (timestamptz)
  -- Phase 2 · WS1 enrichment (migration 001_ws1_enrichment.sql) --
  - excerpt (text, nullable) — listing description text
  - no_reserve (bool, nullable)
  - country_code (text, nullable) — seller location
  - comments_count (int, nullable)
  - is_modified (bool) — parsed from title/excerpt
  - special_edition (text, nullable) — e.g. 22B, Nür, Type RA
  - condition_flag (text, nullable) — project / salvage / restored / track / rust
  - is_import (bool) — RHD/JDM/non-US signal
```

See `PHASE2_PLAN.md` for the Phase 2 roadmap (data quality → valuation → dashboard viz →
insights) and the Claude API cost/billing notes.

## GitHub / Account Info
- Repo: `krispix418/jdm-market-tracker`
- Personal GitHub: krispix418
- `gh auth switch` to toggle between work (chris-halim) and personal (krispix418)

## Status
- [x] Repo initialized, git identity set
- [x] Set up Next.js project (App Router + Tailwind + Recharts)
- [x] Set up Supabase project & schema (55 cars, ~14.8k auction_results)
- [x] Build scraper for BringATrailer (Playwright full + simple HTTP modes, dedup by URL)
- [x] Build frontend: home, dashboard, car detail with price/mileage charts + trim breakdown
- [x] GitHub Actions workflow for scheduled scraping (weekly simple cron + manual full backfill)
- [x] Deploy to Vercel — live at https://jdm-market-tracker.vercel.app
- [ ] Connect Vercel ↔ GitHub for push-to-deploy (currently deploys via `vercel --prod`)
- [ ] Add Cars & Bids as second source

### Phase 2 (see PHASE2_PLAN.md for detail)
- [x] WS1 — data quality + enrichment (parts filter, condition/spec fields) + 18-car volume expansion
- [x] WS2 — condition-aware valuation (mileage depreciation curve, stock/modified segmentation, percentile bands)
- [x] WS3 — dashboard viz overhaul (diverging movers chart + market-map scatter); homepage ordered by volume
- [x] WS5 — chart polish (moving-avg relabel, percentile band); km-mileage parsing fixed
- [x] Editorial rebrand → **"The JDM Ledger"**: broadsheet light theme (warm paper + ink + single oxblood accent), Fraunces serif masthead/headlines paired with Helvetica labels, bold rules. Chart palette centralized in `src/lib/theme.ts` (kept in sync with the CSS vars in `globals.css`).
- [x] Chart interactivity: drag-to-zoom + "Reset zoom" on the Market Map scatter (plot rect measured from the rendered grid for exact px→data); time-range `<Brush>` on the per-car price chart.
- [x] Dashboard/home perf — replaced the per-car N+1 query loops with a single `getMarketData()` bulk fetch (cars + all auctions grouped in JS) and parallelized `fetchAllRows` pagination. Static-gen ~60s timeout → <1s; dev loads minutes → ~2s.
- [x] Metric transparency — relative metrics now carry their date windows + "figures as of / latest recorded sale" datelines (YoY movers, 6-mo movers, TrendToggle). `trends.ts` returns window bounds + per-window sample counts.
- [x] Best Value redefined — was "cheapest median"; now **"trading below its own recent median"** (last 3 mo vs the prior 9 mo dip signal) via `computeValueSignal`.
- [ ] WS4 — insights / fun-facts engine (hybrid Claude Haiku; needs `ANTHROPIC_API_KEY`)
- Next session: WS4 fun-facts engine + hedonic-regression stretch

## Scraper Notes
- `scraper/config.py` maps each car/generation → a BaT autocomplete query. A few (Integra Type S, TLX Type S, GR Corolla) are `None` — no BaT page exists yet.
- **Simple mode** (`python scraper.py --simple`): plain HTTP, newest ~24 per model. Used by the weekly cron.
- **Full mode** (`python scraper.py`): Playwright clicks "Show More" through all pages (up to MAX_PAGES=50). For backfills.
- Workflow: `.github/workflows/scrape.yml` — weekly Mondays ~6am ET (simple), plus manual `workflow_dispatch` with a `mode` dropdown (`gh workflow run "Scrape BaT auctions" -f mode=full`).
- Secrets `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set in the GitHub repo.

## Deployment (Vercel)
- Live: https://jdm-market-tracker.vercel.app (project `krispix418/jdm-market-tracker`, team "Chris' projects").
- `vercel.json` pins `"framework": "nextjs"` (auto-detection whiffed once, so it's explicit).
- Env vars set in Vercel for Production + Development: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon key — safe client-side). Preview not set yet.
- Deploy manually with `vercel --prod` from the project root. Push-to-deploy not wired yet (connect repo in Vercel dashboard → Settings → Git to enable).
- ⚠️ Frontend reads with the anon key, so the `cars` + `auction_results` tables must stay readable by the Supabase `anon` role or the live site shows no data.

## Decisions Made
- **Design = editorial "broadsheet"** (light paper/ink, single oxblood accent, Fraunces serif headlines + Helvetica labels). Oxblood is a **neutral price-level cue** — "higher / pricier / hotter" (appreciating, premium, over-fair) — *not* a good/bad signal; depreciating/under-fair is neutral grey. Framing is a **market almanac** (serves both investors and buyers) rather than a deal-finder. Swapping the headline font is a one-line change in `layout.tsx` (CSS var `--font-serif-display` is stable).
- Generation-specific tracking (e.g., NA Miata vs ND Miata are separate entries)
- Supabase for data storage over static JSON (need historical time-series)
- Next.js + Vercel over GitHub Pages (better DX, SSR options, Vercel familiarity goal)
- Start with BringATrailer as primary data source

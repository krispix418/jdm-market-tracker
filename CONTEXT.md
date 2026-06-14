# JDM Market Tracker — Project Context

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
```

## GitHub / Account Info
- Repo: `krispix418/jdm-market-tracker`
- Personal GitHub: krispix418
- `gh auth switch` to toggle between work (chris-halim) and personal (krispix418)

## Status
- [x] Repo initialized, git identity set
- [x] Set up Next.js project (App Router + Tailwind + Recharts)
- [x] Set up Supabase project & schema (37 cars seeded, ~3.9k auction_results)
- [x] Build scraper for BringATrailer (Playwright full + simple HTTP modes, dedup by URL)
- [x] Build frontend: home, dashboard, car detail with price/mileage charts + trim breakdown
- [x] GitHub Actions workflow for scheduled scraping (weekly simple cron + manual full backfill)
- [ ] Deploy to Vercel
- [ ] Add Cars & Bids as second source

## Scraper Notes
- `scraper/config.py` maps each car/generation → a BaT autocomplete query. A few (Integra Type S, TLX Type S, GR Corolla) are `None` — no BaT page exists yet.
- **Simple mode** (`python scraper.py --simple`): plain HTTP, newest ~24 per model. Used by the weekly cron.
- **Full mode** (`python scraper.py`): Playwright clicks "Show More" through all pages (up to MAX_PAGES=50). For backfills.
- Workflow: `.github/workflows/scrape.yml` — weekly Mondays ~6am ET (simple), plus manual `workflow_dispatch` with a `mode` dropdown (`gh workflow run "Scrape BaT auctions" -f mode=full`).
- Secrets `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set in the GitHub repo.

## Decisions Made
- Generation-specific tracking (e.g., NA Miata vs ND Miata are separate entries)
- Supabase for data storage over static JSON (need historical time-series)
- Next.js + Vercel over GitHub Pages (better DX, SSR options, Vercel familiarity goal)
- Start with BringATrailer as primary data source

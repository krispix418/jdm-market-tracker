# JDM Market Tracker — Phase 2 Plan

**Theme:** From a price *list* to a *valuation tool*. Clean the data, understand each
listing's condition, then visualize and narrate the market.

Guiding principle: **garbage in, garbage out.** Everything below depends on clean,
well-featured data, so data quality comes first.

---

## Workstream 1 — Data Quality & Enrichment (foundation)

The "BBS wheels" bug exposed that we ingest non-car listings and discard useful fields.

**Findings from the raw BaT item JSON:**
- Parts listings have **no parseable year** and URL slugs like `/listing/wheels-430/`;
  real cars have a year in the title and slugs like `/listing/2012-subaru-impreza-wrx-sti-35/`.
- Each item also exposes fields we currently ignore: `excerpt` (full description text),
  `noreserve`, `country_code` (JDM-import provenance), `comments` (engagement).
- `sold_text` distinguishes real sales (`Sold for $X`) from reserve-not-met (`Bid to $X`);
  we already keep only true sales.

**Tasks:**
1. **Filter out parts/non-car listings** in the scraper:
   - Require a parsed model year, AND
   - Reject URL slugs starting with parts terms (`wheels-`, `engine-`, `transmission-`, etc.).
2. **Capture richer fields** (schema migration on `auction_results`):
   `excerpt`, `no_reserve` (bool), `country_code`, `comments_count` (int).
3. **Feature extraction** from title + excerpt:
   - `is_modified` (modified, stroker, built, swapped)
   - `special_edition` (22B, Nür, V-Spec, Type RA, Spec-R, etc.)
   - `condition_flag` (restored, project, salvage, track car)
   - `is_import` (RHD / non-US `country_code`)
4. **Fix thumbnail selection** in `data.ts`: pick the newest listing *that is a real car
   with an image*, not a parts listing.
5. **Backfill**: purge existing parts rows; re-scrape (full mode) to populate new columns.

### WS1 status — code complete (2026-06-13)
Implemented in `scraper/scraper.py`:
- `is_parts_listing()` — skips listings with no model year or a parts-style URL slug
  (verified: catches the "19×9″ BBS Forged Wheels" listing, keeps all real cars).
- `parse_is_modified` / `parse_special_edition` / `parse_condition_flag` / `parse_is_import`,
  plus capture of `excerpt`, `no_reserve`, `country_code`, `comments_count`.
- Frontend `AuctionResult` type updated (`src/lib/types.ts`).

**Run order (the remaining manual steps):**
1. Run `scraper/migrations/001_ws1_enrichment.sql` in the Supabase SQL editor (adds the columns).
2. Run `scraper/migrations/002_purge_parts.sql` — review the SELECT, then run the DELETE.
3. Backfill: trigger a **full** scrape (`gh workflow run "Scrape BaT auctions" -f mode=full`)
   to populate the new columns across history. The enriched insert *requires* step 1 first.

Note: the data.ts thumbnail bug is resolved by the parts purge — once parts rows are gone,
the newest auction per car (whose thumbnail the card uses) is always a real vehicle.

---

## Workstream 2 — Condition-Aware Valuation

Today we average *everything* together — a $200k 22B and a $15k modified beater land in the
same "GC8 average," which is meaningless. Segment and adjust.

**Tasks:**
1. **Segment** prices by `is_modified` / `special_edition` (stock vs modified vs special).
2. **Mileage-adjusted price curve** per generation: regress `sale_price ~ mileage` (and
   year where data allows) → a fair-price-for-the-miles line. Surfaces "sold $X above/below
   the curve." Directly proxies condition. Build this first (works with thin data).
3. **Percentile bands** (25th–75th) for distribution context.
4. **Hedonic regression** (stretch): `price ~ year + mileage + trim + mods` → marginal value
   of each attribute ("+$3k per special edition, –$0.8k per 10k miles"). Only on
   well-populated generations.

### WS2 status — v1 shipped (2026-06-14)
- `src/lib/valuation.ts`: OLS linear regression + percentile + segment-label helpers.
- `MileageChart`: fair-price depreciation line over the scatter, above/below-curve coloring,
  `$/10k-mi` depreciation + R² readout. Verified sensible (NSX ≈ $3,169/10k mi, etc.).
- `ConditionBreakdown`: stock / modified / special-edition segmentation with premium-vs-stock %.
- Stats row: 25th–median–75th percentile band (replaces noisy average).
- **Deferred:** hedonic regression (#4, stretch); log/power curve; km-mileage parsing
  (many JDM imports list km, not miles — currently unparsed → those cars skip the curve).

---

## Workstream 3 — Dashboard Visualization Overhaul

Current dashboard = four text lists + three header numbers. Make it *visual*.

**Tasks:**
1. **KPI cards** with sparklines instead of plain header numbers.
2. **Diverging bar chart** for Appreciating vs Depreciating (YoY %).
3. **Scatter: price vs volume** ("market heat") — which cars are liquid vs thinly traded.
4. **Price distribution** visual across the whole tracked set.
5. Keep ranked lists but pair each with its chart; add visual hierarchy.

---

## Workstream 4 — Insights / Fun Facts Engine

**Decision: hybrid.** Code computes the true facts (always accurate); **Claude Haiku 4.5**
phrases them in a fun, varied voice. Grounded → cannot invent numbers.

**Architecture:** generated **weekly in the scraper** (Python) after new data lands, written
to a new `insights` Supabase table; the frontend just reads them (pennies/month, zero
page-load cost).

**Candidate computed facts:**
- Biggest YoY mover (up & down)
- Best value per 1k miles
- Most liquid / most thinly traded
- Price ratios ("N Miatas = one R34")
- Modification discount / special-edition premium
- Cheapest entry into an icon (e.g., GT-R ownership)

**Tasks:**
1. New `insights` table: `id, scope ('market'|car_id), kind, text, metric_value, generated_at`.
2. Compute candidate facts in the scraper.
3. One grounded Claude call to phrase them; store results.
4. "Insights" section on the dashboard (and per-car blurbs on detail pages).
5. **Prereq:** `ANTHROPIC_API_KEY` as a scraper/GitHub-Actions secret (only needed for WS4).

---

## Workstream 5 — Chart & Trend Polish (quick wins)

1. **Relabel the moving-average tooltip** — "Trend: $X" → "{N}-sale moving avg" (it's the
   rolling average of the last N sales; currently unclear).
2. Add percentile-band shading to the price chart.
3. Optionally overlay the mileage-adjusted line.

---

## Claude API — Cost & Billing (for WS4)

**When does it bill?** Only once a week, inside the scraper. The Claude call runs during
the weekly GitHub Actions scrape, writes the phrased insights into a Supabase `insights`
table, and the frontend just reads that table. **Page refreshes never call Claude** — a
million page views cost $0. The only billable event is the weekly generation.

**Pricing (per million tokens):**
| Model | Input | Output |
|---|---|---|
| Haiku 4.5 (chosen for phrasing) | $1.00 | $5.00 |
| Opus 4.8 (optional, wittier) | $5.00 | $25.00 |

**Projected usage:** ~2K input + ~1K output tokens per weekly run.
- Haiku 4.5: ≈ $0.007/run → **~$0.36/year**.
- Opus 4.8: ≈ $0.035/run → **~$1.80/year**.

**⚠️ Claude Pro ≠ Claude API — they are separate products with separate billing.**
- **Claude Pro** ($20/mo) covers the **claude.ai chat app** + Claude Code. It does **not**
  include API access — there's no API quota bundled with it.
- The scraper makes programmatic `messages.create()` calls, which go through the **Anthropic
  API**, billed pay-as-you-go from prepaid credits in the Anthropic Console (console.anthropic.com).
- So a personal Pro subscription does **not** cover this. You need a separate API key + credits.

**Real-world cost:** the per-token cost is a rounding error (~cents/year). The only actual
spend is the **~$5 minimum credit top-up** in the Console — and at ~$0.36/year of usage, that
one top-up lasts a decade-plus. Everything else in the stack stays free.

**Setup when we reach WS4:** create a personal Anthropic API key → add the ~$5 credit →
store it as a GitHub Actions secret `ANTHROPIC_API_KEY` (same way the Supabase keys are set) →
the weekly scraper uses it. No key needed for WS1–WS3.

## Recommended Sequence

1. **WS1** (data quality & enrichment) — the unlock; everything depends on it.
2. **WS5** quick wins (trend relabel) — tiny, can slot in anytime.
3. **WS2** (condition-aware valuation).
4. **WS3** (dashboard viz overhaul).
5. **WS4** (insights engine) — richest once WS1+WS2 land.

## Prerequisites
- WS4 needs a personal `ANTHROPIC_API_KEY` (scraper + GitHub Actions secret).
- WS1 schema migration + backfill will trigger a full re-scrape.

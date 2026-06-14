-- Phase 2 · Workstream 1 — purge non-vehicle rows already stored.
-- Parts/memorabilia listings (e.g. the BBS wheels) were ingested with year = NULL.
--
-- STEP 1 — REVIEW FIRST. Run this and eyeball the titles to confirm they're all
-- parts/non-cars (not real cars that happened to miss year parsing):
select id, title, url, sale_price
from auction_results
where year is null
order by sale_price desc;

-- STEP 2 — PURGE. Only after the list above looks correct, run the delete:
-- delete from auction_results where year is null;

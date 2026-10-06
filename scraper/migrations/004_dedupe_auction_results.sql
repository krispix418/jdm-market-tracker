-- Dedupe auction_results + enforce one row per auction URL.
-- get_existing_urls() only saw Supabase's first 1000 rows, so every weekly
-- scrape re-inserted already-stored auctions. As of 2026-10-06: 17,477 rows,
-- 7,307 unique URLs, 10,170 extra copies (always same car_id). The newest copy
-- of each URL always carries the most complete enrichment, so we keep it.
--
-- Run each step separately in the Supabase SQL editor.

-- STEP 1 — BACKUP. Full copy of the table before touching anything.
create table auction_results_backup_20261006 as
select * from auction_results;
-- New public tables are reachable via the API by default; lock the backup down.
alter table auction_results_backup_20261006 enable row level security;

-- Sanity check: should equal the live row count (17,477 or a bit more).
select
  (select count(*) from auction_results) as live_rows,
  (select count(*) from auction_results_backup_20261006) as backup_rows;

-- STEP 2 — PREVIEW. Expect roughly: total 17,477 · unique 7,307 · to_delete 10,170.
select
  count(*) as total_rows,
  count(distinct url) as unique_urls,
  count(*) - count(distinct url) as to_delete
from auction_results;

-- STEP 3 — DELETE duplicates, keeping the newest copy per URL (id breaks ties).
delete from auction_results
where id in (
  select id from (
    select id,
           row_number() over (
             partition by url
             order by created_at desc, id desc
           ) as rn
    from auction_results
  ) ranked
  where rn > 1
);

-- Verify: total_rows should now equal unique_urls.
select count(*) as total_rows, count(distinct url) as unique_urls
from auction_results;

-- STEP 4 — GUARDRAIL. The database now rejects any future duplicate URL.
alter table auction_results
  add constraint auction_results_url_key unique (url);

-- ROLLBACK (only if something looks wrong after STEP 3, before STEP 4):
-- truncate auction_results;
-- insert into auction_results select * from auction_results_backup_20261006;

-- CLEANUP (a few weeks later, once everything looks right):
-- drop table auction_results_backup_20261006;

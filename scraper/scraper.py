import json
import re
import time
from datetime import datetime

import requests
from dotenv import load_dotenv
import os
from supabase import create_client
from playwright.sync_api import sync_playwright

load_dotenv()

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}
CRAWL_DELAY = 1.5
MAX_PAGES = 50


def get_model_url(query: str) -> str | None:
    resp = requests.get(
        "https://bringatrailer.com/wp-json/bringatrailer/1.0/data/autocomplete",
        params={"term": query},
        headers=HEADERS,
    )
    resp.raise_for_status()
    results = resp.json().get("results", [])
    if results:
        return results[0]["url"]
    return None


def parse_sold_text(sold_text: str) -> dict | None:
    sold_match = re.search(
        r"Sold for \w+ \$([\d,]+).*?on ([\d/]+)", sold_text
    )
    if sold_match:
        price = int(sold_match.group(1).replace(",", ""))
        date_str = sold_match.group(2)
        sale_date = datetime.strptime(date_str, "%m/%d/%Y").date()
        return {"price": price, "date": sale_date}
    return None


def parse_year_from_title(title: str) -> int | None:
    match = re.search(r"\b(19[6-9]\d|20[0-2]\d)\b", title)
    return int(match.group(1)) if match else None


def parse_mileage_from_title(title: str) -> int | None:
    match = re.search(r"([\d,.]+)[kK]-[Mm]ile", title)
    if match:
        num = float(match.group(1).replace(",", ""))
        return int(num * 1000)
    match = re.search(r"([\d,]+)-[Mm]ile", title)
    if match:
        return int(match.group(1).replace(",", ""))
    return None


def parse_trim_from_title(title: str) -> str | None:
    trim_patterns = [
        r"\b(V-Spec(?:\s*II)?(?:\s*Nür)?)\b",
        r"\b(Nismo)\b",
        r"\b(CR)\b",
        r"\b(MR)\b",
        r"\b(GSR)\b",
        r"\b(RS)\b",
        r"\b(GT-S)\b",
        r"\b(SE)\b",
        r"\b(LE)\b",
        r"\b(Limited Edition)\b",
        r"\b(Mazdaspeed)\b",
        r"\b(Club Sport)\b",
        r"\b(Launch Edition)\b",
        r"\b(Premium)\b",
        r"\b(Sport)\b",
        r"\b(Grand Touring)\b",
        r"\b(Core)\b",
        r"\b(Morizo)\b",
        r"\b(Circuit Edition)\b",
    ]
    for pattern in trim_patterns:
        match = re.search(pattern, title, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def items_to_results(items: list[dict]) -> list[dict]:
    results = []
    for item in items:
        sold_info = parse_sold_text(item.get("sold_text", ""))
        if not sold_info:
            continue
        title = item.get("title", "")
        results.append({
            "title": title,
            "sale_price": sold_info["price"],
            "sale_date": sold_info["date"].isoformat(),
            "year": parse_year_from_title(title),
            "mileage": parse_mileage_from_title(title),
            "trim": parse_trim_from_title(title),
            "url": item.get("url", ""),
            "thumbnail_url": item.get("thumbnail_url", ""),
            "source": "bringatrailer",
        })
    return results


def scrape_model_page_full(url: str) -> list[dict]:
    """Use Playwright to click Show More and intercept all paginated results."""
    all_items = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        api_items: list[dict] = []

        def handle_response(response):
            if "listings-filter" in response.url and response.status == 200:
                try:
                    data = response.json()
                    items = data.get("items", [])
                    if items:
                        api_items.extend(items)
                except Exception:
                    pass

        page.on("response", handle_response)
        page.goto(url, wait_until="networkidle", timeout=30000)

        content = page.content()

        match = re.search(
            r"var auctionsCompletedInitialData = ({.*?});", content, re.DOTALL
        )
        if not match:
            print(f"  No auction data found on {url}")
            browser.close()
            return []

        initial_data = json.loads(match.group(1))
        all_items.extend(initial_data.get("items", []))
        total_pages = initial_data.get("pages_total", 1)
        items_total = initial_data.get("items_total", len(all_items))

        print(f"  Found {items_total} total auctions across {total_pages} pages")

        if total_pages > 1:
            # Button 1 (index 1) is the completed auctions "Show More"
            pages_loaded = 1
            while pages_loaded < min(total_pages, MAX_PAGES):
                try:
                    show_more_btn = page.locator(
                        ".auctions-completed-container button.auctions-footer-button, "
                        ".auctions-completed-container .items-more button"
                    ).first

                    if show_more_btn.count() == 0:
                        break

                    show_more_btn.scroll_into_view_if_needed(timeout=5000)
                    show_more_btn.click()
                    page.wait_for_timeout(2500)
                    pages_loaded += 1

                    if pages_loaded % 5 == 0:
                        print(f"  Loaded page {pages_loaded}/{total_pages}...")

                except Exception as e:
                    print(f"  Pagination stopped at page {pages_loaded}: {e}")
                    break

        all_items.extend(api_items)
        browser.close()

    print(f"  Total items scraped: {len(all_items)}")
    return items_to_results(all_items)


def scrape_model_page_simple(url: str) -> list[dict]:
    """Fallback: just grab the initial 24 from embedded JSON."""
    resp = requests.get(url, headers=HEADERS)
    resp.raise_for_status()

    match = re.search(
        r"var auctionsCompletedInitialData = ({.*?});", resp.text, re.DOTALL
    )
    if not match:
        print(f"  No auction data found on {url}")
        return []

    data = json.loads(match.group(1))
    return items_to_results(data.get("items", []))


def get_cars_from_db() -> list[dict]:
    resp = supabase.table("cars").select("*").execute()
    return resp.data


def get_existing_urls() -> set[str]:
    resp = supabase.table("auction_results").select("url").execute()
    return {r["url"] for r in resp.data}


def auction_matches_car(auction: dict, car: dict) -> bool:
    year = auction.get("year")
    if not year or not car.get("year_start"):
        return True
    if car.get("year_end"):
        return car["year_start"] <= year <= car["year_end"]
    return year >= car["year_start"]


def run(use_playwright: bool = True):
    cars = get_cars_from_db()
    existing_urls = get_existing_urls()
    total_new = 0

    from config import BAT_SEARCH_QUERIES

    scraped_cache: dict[str, list[dict]] = {}

    scrape_fn = scrape_model_page_full if use_playwright else scrape_model_page_simple

    for car in cars:
        key = f"{car['make']} {car['model']} {car['generation']}"
        query = BAT_SEARCH_QUERIES.get(key)

        if query is None:
            print(f"⏭ Skipping {key} (no BaT page exists yet)")
            continue

        if query not in scraped_cache:
            print(f"🔍 Searching BaT for: {key} (query: '{query}')")
            model_url = get_model_url(query)
            if not model_url:
                print(f"  ❌ No BaT page found")
                scraped_cache[query] = []
                time.sleep(CRAWL_DELAY)
                continue

            print(f"  📄 Scraping: {model_url}")
            time.sleep(CRAWL_DELAY)

            scraped_cache[query] = scrape_fn(model_url)
            time.sleep(CRAWL_DELAY)
        else:
            print(f"🔁 Reusing cached results for: {key}")

        auctions = scraped_cache[query]

        new_auctions = []
        for auction in auctions:
            if auction["url"] in existing_urls:
                continue
            if not auction_matches_car(auction, car):
                continue

            new_auction = {**auction, "car_id": car["id"]}
            existing_urls.add(auction["url"])
            new_auctions.append(new_auction)

        if new_auctions:
            for i in range(0, len(new_auctions), 500):
                batch = new_auctions[i:i+500]
                supabase.table("auction_results").insert(batch).execute()
            total_new += len(new_auctions)
            print(f"  ✅ Inserted {len(new_auctions)} new auctions for {key}")
        else:
            print(f"  — No new auctions for {key}")

    print(f"\n🏁 Done! {total_new} new auction results added.")


if __name__ == "__main__":
    import sys
    use_pw = "--simple" not in sys.argv
    if use_pw:
        print("🚀 Running with Playwright (full pagination)")
    else:
        print("⚡ Running in simple mode (first 24 only)")
    run(use_playwright=use_pw)

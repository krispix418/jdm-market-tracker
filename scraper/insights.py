"""Phase 2 · WS4 — fun-facts engine.

Computes *true* facts from the auction data (medians, YoY moves, ratios, deals,
premiums), then asks Claude Haiku to phrase them in a fun, car-geek voice. The
model only re-words a grounded draft — it never sees free rein to invent numbers,
so the figures are always correct.

Runs after the weekly scrape (called from scraper.py) and writes to the
`insights` table; the frontend just reads that table. Needs ANTHROPIC_API_KEY.
"""
import json
import os
from datetime import date
from statistics import median

from dateutil.relativedelta import relativedelta

MODEL = "claude-haiku-4-5"

# High-pedigree halo cars for "cheapest entry into an icon".
ICON_MODELS = {
    "Skyline GT-R", "GT-R", "NSX", "Supra", "GR Supra", "RX-7",
    "Lancer Evolution", "Impreza WRX STI", "Integra Type R", "S2000", "Z",
}

MIN_PER_WINDOW = 3  # sales needed in each side of a YoY comparison


# ---- data loading -----------------------------------------------------------

def _fetch_all(supabase, table, columns):
    rows, start = [], 0
    while True:
        resp = supabase.table(table).select(columns).range(start, start + 999).execute()
        batch = resp.data or []
        rows.extend(batch)
        if len(batch) < 1000:
            break
        start += 1000
    return rows


def _load(supabase):
    cars = {c["id"]: c for c in _fetch_all(supabase, "cars", "id, make, model, generation")}
    auctions = _fetch_all(
        supabase, "auction_results", "car_id, sale_price, sale_date, special_edition"
    )
    series = {}  # car_id -> list[(date, price, special_edition)]
    for a in auctions:
        if not a.get("sale_date") or a.get("sale_price") is None:
            continue
        try:
            d = date.fromisoformat(a["sale_date"][:10])
        except ValueError:
            continue
        series.setdefault(a["car_id"], []).append((d, a["sale_price"], a.get("special_edition")))
    return cars, series


# ---- stats helpers ----------------------------------------------------------

def _in_window(series, months_start, months_end, today):
    start = today - relativedelta(months=months_start)
    end = today - relativedelta(months=months_end)
    return [p for (d, p, _) in series if start <= d < end]


def _yoy_pct(series, today):
    recent = _in_window(series, 12, 0, today)
    prior = _in_window(series, 24, 12, today)
    if len(recent) < MIN_PER_WINDOW or len(prior) < MIN_PER_WINDOW:
        return None
    pm = median(prior)
    if pm <= 0:
        return None
    return round((median(recent) - pm) / pm * 100)


def _value_discount(series, today):
    """How far the last 3 months trade below the prior 9 (a dip-buy signal)."""
    base = _in_window(series, 12, 3, today)
    cur = _in_window(series, 3, 0, today)
    if len(base) < 4 or len(cur) < 2:
        return None
    bm = median(base)
    if bm <= 0:
        return None
    return round((bm - median(cur)) / bm * 100), round(median(cur)), round(bm)


def _name(car):
    return f"{car['make']} {car['model']} {car['generation']}"


# ---- fact computation -------------------------------------------------------

def compute_facts(cars, series, today=None):
    today = today or date.today()
    facts = []

    medians = {}  # car_id -> overall median (cars with enough volume)
    for cid, s in series.items():
        if cid in cars and len(s) >= 5:
            medians[cid] = median([p for (_, p, _) in s])

    # 1) Biggest movers (YoY) — top 2 up, top 2 down.
    moves = []
    for cid in medians:
        pct = _yoy_pct(series[cid], today)
        if pct is not None and abs(pct) >= 2:
            moves.append((cid, pct))
    ups = sorted(moves, key=lambda m: -m[1])[:2]
    downs = sorted(moves, key=lambda m: m[1])[:2]
    for cid, pct in ups:
        facts.append({
            "key": f"mover_up_{cid}", "scope": "market", "car_id": cid, "kind": "mover",
            "metric_value": pct,
            "draft": f"The {_name(cars[cid])} is up {pct}% year-over-year (median now ${medians[cid]:,}).",
        })
    for cid, pct in downs:
        facts.append({
            "key": f"mover_down_{cid}", "scope": "market", "car_id": cid, "kind": "mover",
            "metric_value": pct,
            "draft": f"The {_name(cars[cid])} is down {abs(pct)}% year-over-year (median now ${medians[cid]:,}).",
        })

    # 2) Price ratio — priciest vs most affordable (decently-traded) car.
    if len(medians) >= 2:
        priciest = max(medians, key=medians.get)
        cheapest = min(medians, key=medians.get)
        if medians[cheapest] > 0 and priciest != cheapest:
            ratio = round(medians[priciest] / medians[cheapest])
            if ratio >= 2:
                facts.append({
                    "key": "ratio", "scope": "market", "car_id": None, "kind": "ratio",
                    "metric_value": ratio,
                    "draft": (f"One {_name(cars[priciest])} (median ${medians[priciest]:,}) "
                              f"costs about {ratio}× a {_name(cars[cheapest])} (median ${medians[cheapest]:,})."),
                })

    # 3) Cheapest entry into an icon.
    icons = {cid: m for cid, m in medians.items() if cars[cid]["model"] in ICON_MODELS}
    if icons:
        cheapest_icon = min(icons, key=icons.get)
        facts.append({
            "key": "icon_entry", "scope": "market", "car_id": cheapest_icon, "kind": "icon_entry",
            "metric_value": icons[cheapest_icon],
            "draft": (f"The cheapest way into an icon right now is the {_name(cars[cheapest_icon])} "
                      f"at a ${icons[cheapest_icon]:,} median."),
        })

    # 4) Deals — biggest below-own-trend discount.
    deals = []
    for cid in medians:
        v = _value_discount(series[cid], today)
        if v and v[0] >= 5:
            deals.append((cid, v))  # (car_id, (discount_pct, current, baseline))
    for cid, (pct, cur, base) in sorted(deals, key=lambda d: -d[1][0])[:2]:
        facts.append({
            "key": f"deal_{cid}", "scope": "market", "car_id": cid, "kind": "deal",
            "metric_value": pct,
            "draft": (f"The {_name(cars[cid])} is trading {pct}% below its recent median "
                      f"(${cur:,} now vs ${base:,})."),
        })

    # 5) Special-edition premiums — biggest premium vs stock within a car.
    premiums = []
    for cid, s in series.items():
        if cid not in cars:
            continue
        special = [p for (_, p, se) in s if se]
        stock = [p for (_, p, se) in s if not se]
        if len(special) >= 3 and len(stock) >= 3:
            sm, km = median(special), median(stock)
            if km > 0 and sm > km:
                premiums.append((cid, round((sm - km) / km * 100), round(sm), round(km)))
    for cid, pct, sm, km in sorted(premiums, key=lambda p: -p[1])[:2]:
        facts.append({
            "key": f"premium_{cid}", "scope": "market", "car_id": cid, "kind": "premium",
            "metric_value": pct,
            "draft": (f"Special-edition {_name(cars[cid])}s command a {pct}% premium over stock "
                      f"(${sm:,} vs ${km:,})."),
        })

    return facts


# ---- Claude phrasing --------------------------------------------------------

SYSTEM = (
    "You write punchy, fun one-liners about car auction prices for JDM and "
    "sport-car enthusiasts. You will receive a list of factual statements. Rewrite "
    "each into a single lively, confident sentence with personality — but you MUST "
    "keep every number, percentage, and car name exactly as given. Never invent or "
    "change figures. Keep each under ~22 words. Return ONLY a JSON array of "
    '{"key": "...", "text": "..."} objects, one per input fact, same keys.'
)


def phrase_facts(facts):
    from anthropic import Anthropic

    client = Anthropic()  # reads ANTHROPIC_API_KEY
    payload = [{"key": f["key"], "fact": f["draft"]} for f in facts]
    msg = client.messages.create(
        model=MODEL,
        max_tokens=1500,
        system=SYSTEM,
        messages=[{"role": "user", "content": json.dumps(payload, indent=2)}],
    )
    raw = msg.content[0].text.strip()
    # Be forgiving if the model wraps the JSON in prose or fences.
    start, end = raw.find("["), raw.rfind("]")
    if start == -1 or end == -1:
        raise ValueError(f"Claude did not return JSON: {raw[:200]}")
    phrased = {item["key"]: item["text"] for item in json.loads(raw[start : end + 1])}
    return phrased


# ---- entry point ------------------------------------------------------------

def generate_insights(supabase):
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("⏭ Skipping insights — ANTHROPIC_API_KEY not set.")
        return

    cars, series = _load(supabase)
    facts = compute_facts(cars, series)
    if not facts:
        print("⏭ No insight-worthy facts found.")
        return

    print(f"🧠 Phrasing {len(facts)} facts with {MODEL}...")
    try:
        phrased = phrase_facts(facts)
    except Exception as e:
        print(f"⚠️ Insight phrasing failed, falling back to plain drafts: {e}")
        phrased = {}

    rows = [{
        "scope": f["scope"],
        "car_id": f["car_id"],
        "kind": f["kind"],
        "text": phrased.get(f["key"], f["draft"]),
        "metric_value": f["metric_value"],
    } for f in facts]

    # Replace the prior batch with this week's.
    supabase.table("insights").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    supabase.table("insights").insert(rows).execute()
    print(f"✅ Wrote {len(rows)} insights.")


if __name__ == "__main__":
    from dotenv import load_dotenv
    from supabase import create_client

    load_dotenv()
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    generate_insights(sb)

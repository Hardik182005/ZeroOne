"""
Anakin.io web scraper integration — fetches real financial data by scraping
NSE India, Screener.in, Economic Times, Moneycontrol, etc.
API: POST https://api.anakin.io/v1/url-scraper  →  GET /v1/url-scraper/{jobId}
"""
import os
import asyncio
import re
import httpx
from typing import Optional

from utils.env import clean_env
ANAKIN_IO_KEY  = clean_env("ANAKIN_API_KEY")
ANAKIN_IO_BASE = "https://api.anakin.io/v1"
POLL_INTERVAL  = 3    # seconds between polls
MAX_POLLS      = 35   # max ~105s wait per job (browser scrapes are slow)


async def _noop():
    """Awaitable that resolves to None (replaces removed asyncio.coroutine)."""
    return None


def _headers():
    return {"X-API-Key": ANAKIN_IO_KEY, "Content-Type": "application/json"}


def _available() -> bool:
    return bool(ANAKIN_IO_KEY) and not ANAKIN_IO_KEY.startswith("your_")


async def _submit(client: httpx.AsyncClient, url: str, use_browser: bool = True) -> Optional[str]:
    """Submit a scrape job. Returns job_id or None."""
    try:
        r = await client.post(
            f"{ANAKIN_IO_BASE}/url-scraper",
            headers=_headers(),
            json={"url": url, "useBrowser": use_browser, "generateJson": True, "country": "in"},
            timeout=20.0,
        )
        if r.status_code == 202:
            return r.json().get("jobId")
        print(f"[anakin.io] submit {url} → {r.status_code}: {r.text[:100]}")
    except Exception as e:
        print(f"[anakin.io] submit error: {e}")
    return None


async def _poll(client: httpx.AsyncClient, job_id: str) -> Optional[dict]:
    """Poll until job completes. Returns full result dict or None."""
    last_status = ""
    for i in range(MAX_POLLS):
        await asyncio.sleep(POLL_INTERVAL)
        try:
            r = await client.get(f"{ANAKIN_IO_BASE}/url-scraper/{job_id}", headers=_headers(), timeout=15.0)
            if r.status_code != 200:
                print(f"[anakin.io] poll {job_id} → HTTP {r.status_code}: {r.text[:120]}")
                continue
            d = r.json()
            status = d.get("status", "")
            if status != last_status:
                print(f"[anakin.io] job {job_id} status: {status or '(none)'} (poll {i+1})")
                last_status = status
            if status == "completed":
                return d
            if status == "failed":
                print(f"[anakin.io] job {job_id} failed: {d.get('error','')}")
                return None
        except Exception as e:
            print(f"[anakin.io] poll error: {e}")
    print(f"[anakin.io] job {job_id} timed out after ~{MAX_POLLS * POLL_INTERVAL}s (last status: {last_status or 'none'})")
    return None


def _sections(result: dict) -> list:
    """Extract sections list from generatedJson response."""
    try:
        return result.get("generatedJson", {}).get("data", {}).get("sections", [])
    except Exception:
        return []


def _markdown(result: dict) -> str:
    return result.get("markdown", "") or result.get("content", "") or ""


# ── Parsers ───────────────────────────────────────────────────────────────────

def _last_pct(text: str) -> Optional[str]:
    """Extract the last percentage number in a string (most recent quarter)."""
    matches = re.findall(r"(\d+\.\d+)%", text)
    return matches[-1] if matches else None


def _last_num(text: str, pattern: str) -> Optional[str]:
    """Find all matches and return the last one (most recent data)."""
    all_matches = re.findall(pattern, text)
    return all_matches[-1] if all_matches else None


def parse_screener(result: dict) -> dict:
    """Parse Screener.in generatedJson into fundamentals + shareholding."""
    out = {"fundamentals": {}, "quote_extras": {}, "shareholding": {}, "pros": [], "cons": []}

    # Also try the raw markdown for flexible parsing
    md = _markdown(result)

    for section in _sections(result):
        h = section.get("heading", "")
        c = section.get("content", "")

        if h in ("Key Metrics", "Ratios") or "P/E" in c:
            # Flexible extraction — try multiple patterns
            def ex(patterns, text=c + "\n" + md):
                for pat in patterns:
                    m = re.search(pat, text, re.IGNORECASE | re.DOTALL)
                    if m:
                        return m.group(1).replace(",", "").strip()
                return "N/A"

            pe   = ex([r"Stock P/E[:\s\n]+([\d.]+)", r"P/E[:\s\n]+([\d.]+)"])
            roce = ex([r"ROCE[:\s\n]+([\d.]+)"])
            roe  = ex([r"\bROE[:\s\n]+([\d.]+)"])
            bv   = ex([r"Book Value[:\s₹\n]+([\d,]+)"])
            div  = ex([r"Dividend Yield[:\s\n]+([\d.]+)"])
            curr = ex([r"Current Price[:\s₹\n\s]+([\d,]+)"])
            high = ex([r"High[:\s/₹\n\s]+([\d,]+)"])
            low_ = ex([r"Low[:\s/₹\n\s]+([\d,]+)"])
            mcap = ex([r"Market Cap[:\s₹\n\s]+([\d,]+)"])

            if pe != "N/A":
                # Calculate P/B ratio = Current Price / Book Value per share
                try:
                    bv_num    = float(bv.replace(",","")) if bv != "N/A" else 0
                    price_num = float(curr.replace(",","")) if curr != "N/A" else 0
                    pb_ratio  = str(round(price_num / bv_num, 2)) if bv_num > 0 else "N/A"
                except Exception:
                    pb_ratio = "N/A"
                out["fundamentals"].update({
                    "pe": pe, "pb": pb_ratio, "roce": roce, "roe": roe,
                    "de": "N/A", "interest_coverage": "N/A",
                    "revenue_growth_5y": "N/A", "profit_growth_5y": "N/A",
                })
            if curr != "N/A":
                out["quote_extras"].update({
                    "price_str": curr, "high": high, "low": low_, "market_cap": mcap
                })

        elif h == "Shareholding Pattern":
            flat = c.replace("\n", " ")
            # Extract all % values from each category — take the LAST (most recent)
            # Pattern: "Promoters +50.39%50.27%...50.00%" — all values concatenated
            p_chunk = re.search(r"Promoters \+?(.*?)(?=FIIs|$)", flat)
            f_chunk = re.search(r"FIIs \+?(.*?)(?=DIIs|$)", flat)
            d_chunk = re.search(r"DIIs \+?(.*?)(?=Government|Public|$)", flat)

            p_all = re.findall(r"(\d{2,3}\.\d{2})%", p_chunk.group(1) if p_chunk else "")
            f_all = re.findall(r"(\d{2,3}\.\d{2})%", f_chunk.group(1) if f_chunk else "")
            d_all = re.findall(r"(\d{2,3}\.\d{2})%", d_chunk.group(1) if d_chunk else "")

            out["shareholding"] = {
                "promoter_pct":      float(p_all[-1])  if p_all else 50.0,
                "prev_promoter_pct": float(p_all[-2])  if len(p_all) >= 2 else (float(p_all[-1]) if p_all else 50.0),
                "pledge_pct":        0.0,
                "fii_pct":           float(f_all[-1])  if f_all else 22.0,
                "dii_pct":           float(d_all[-1])  if d_all else 16.0,
                "public_pct":        10.0,
            }

        elif h == "Pros":
            out["pros"] = [l.strip().lstrip("- ") for l in c.split("\n") if l.strip().startswith("-")]

        elif h == "Cons":
            out["cons"] = [l.strip().lstrip("- ") for l in c.split("\n") if l.strip().startswith("-")]

    # Fallback: try parsing from markdown if sections missed
    if not out["fundamentals"]:
        for pat, key in [
            (r"Stock P/E[:\s\n]+([\d.]+)", "pe"),
            (r"ROCE[:\s\n]+([\d.]+)",       "roce"),
            (r"\bROE[:\s\n]+([\d.]+)",       "roe"),
            (r"Book Value[:\s₹\n\s]+([\d,]+)", "pb"),
        ]:
            m = re.search(pat, md, re.IGNORECASE)
            if m:
                out["fundamentals"][key] = m.group(1).replace(",", "")
        if out["fundamentals"]:
            out["fundamentals"].setdefault("de", "N/A")
            out["fundamentals"].setdefault("interest_coverage", "N/A")
            out["fundamentals"].setdefault("revenue_growth_5y", "N/A")
            out["fundamentals"].setdefault("profit_growth_5y", "N/A")

    return out


def parse_et_news(result: dict, ticker: str) -> list:
    """Parse Economic Times page into news list."""
    md = _markdown(result)
    news = []
    # ET pages have headlines as markdown headings or bold lines
    patterns = [
        r"#{1,3}\s+(.{20,150})",        # ## Headline
        r"\*\*(.{20,150})\*\*",          # **Headline**
        r"^\s*[-*]\s+(.{20,150})$",      # - Headline (list item)
    ]
    seen = set()
    for pat in patterns:
        for m in re.finditer(pat, md, re.MULTILINE):
            title = m.group(1).strip()
            key = title[:40]
            if key not in seen and len(title) > 20 and ticker.lower() in title.lower() or True:
                seen.add(key)
                news.append({"title": title, "source": "Economic Times", "time": "recent", "url": ""})
            if len(news) >= 6:
                break
        if len(news) >= 6:
            break

    # Deduplicate and filter nav/menu items
    bad = {"markets", "home", "news", "login", "subscribe", "latest", "trending"}
    news = [n for n in news if not any(b in n["title"].lower() for b in bad)]
    return news[:6]


def parse_moneycontrol(result: dict) -> dict:
    """Parse Moneycontrol into analyst consensus."""
    md = _markdown(result)
    consensus = {"buy_count": 0, "hold_count": 0, "sell_count": 0, "avg_target": 0, "upside_pct": 0}
    buy  = re.search(r"Buy[:\s]+(\d+)", md, re.IGNORECASE)
    hold = re.search(r"Hold[:\s]+(\d+)", md, re.IGNORECASE)
    sell = re.search(r"Sell[:\s]+(\d+)", md, re.IGNORECASE)
    target = re.search(r"[Tt]arget.*?[₹\s]+([\d,]+)", md)
    if buy:   consensus["buy_count"]  = int(buy.group(1))
    if hold:  consensus["hold_count"] = int(hold.group(1))
    if sell:  consensus["sell_count"] = int(sell.group(1))
    if target: consensus["avg_target"] = int(target.group(1).replace(",", ""))
    return consensus


def parse_nse_page(result: dict) -> dict:
    """Parse NSE page for price and basic data."""
    md = _markdown(result)
    out = {}
    price_m = re.search(r"₹\s*([\d,]+\.?\d*)", md)
    if price_m:
        out["price"] = float(price_m.group(1).replace(",", ""))
    return out


# ── Main entry point ───────────────────────────────────────────────────────────

SCREENER_URL  = "https://www.screener.in/company/{ticker}/"
ET_URL        = "https://economictimes.indiatimes.com/{ticker_lower}/stocks/companyid-{cid}.cms"
MC_URL        = "https://www.moneycontrol.com/india/stockpricequote/{sector}/{ticker}/{code}"
NSE_URL       = "https://www.nseindia.com/get-quotes/equity?symbol={ticker}"

# ET company IDs for major stocks (fallback to generic search)
ET_IDS = {
    "RELIANCE": "13215", "TCS": "8010", "INFY": "10960", "HDFCBANK": "9195",
    "ICICIBANK": "18860", "SBIN": "3813", "WIPRO": "13787", "BAJFINANCE": "24160",
    "TATAMOTORS": "13770", "AXISBANK": "21854", "MARUTI": "12089",
    "SUNPHARMA": "13445", "LT": "11473", "BHARTIARTL": "47",
}


async def fetch_all_anakin(ticker: str) -> dict:
    """
    Submit all anakin.io scrape jobs in parallel, poll for results, parse.
    Returns dict with: screener, news, consensus keys.
    """
    if not _available():
        return {}

    ticker = ticker.upper()
    screener_url = SCREENER_URL.format(ticker=ticker)

    et_id = ET_IDS.get(ticker, "")
    et_url = (
        f"https://economictimes.indiatimes.com/{ticker.lower()}/stocks/companyid-{et_id}.cms"
        if et_id else
        f"https://economictimes.indiatimes.com/topic/{ticker.lower()}-share-price"
    )
    mc_url = f"https://www.moneycontrol.com/india/stockpricequote/{ticker.lower()}/{ticker}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Submit all jobs in parallel
        job_ids = await asyncio.gather(
            _submit(client, screener_url,  use_browser=True),
            _submit(client, et_url,        use_browser=True),
            _submit(client, mc_url,        use_browser=True),
        )

        screener_jid, et_jid, mc_jid = job_ids
        print(f"[anakin.io] Jobs — Screener:{screener_jid} ET:{et_jid} MC:{mc_jid}")

        # Poll all in parallel
        results = await asyncio.gather(
            _poll(client, screener_jid) if screener_jid else _noop(),
            _poll(client, et_jid)       if et_jid       else _noop(),
            _poll(client, mc_jid)       if mc_jid       else _noop(),
            return_exceptions=True,
        )
        results = [None if isinstance(r, Exception) else r for r in results]

    screener_raw, et_raw, mc_raw = results

    out = {}
    if screener_raw:
        out["screener"] = parse_screener(screener_raw)
        print(f"[anakin.io] Screener parsed: {out['screener'].get('fundamentals',{})}")

    if et_raw:
        out["news"] = parse_et_news(et_raw, ticker)
        print(f"[anakin.io] ET news: {len(out['news'])} items")

    if mc_raw:
        out["consensus"] = parse_moneycontrol(mc_raw)
        print(f"[anakin.io] MC consensus: {out['consensus']}")

    return out

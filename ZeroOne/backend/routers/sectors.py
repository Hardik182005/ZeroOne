from fastapi import APIRouter
from services.cache import get_cached, set_cached
from services.wire import fetch_sector_data
from utils.helpers import parse_sector_data

router = APIRouter(prefix="/api/sectors", tags=["sectors"])

@router.get("")
async def get_sector_rotation():
    cache_key = "zeroonone:sectors:rotation"
    cached = await get_cached(cache_key)
    if cached:
        return cached

    try:
        raw = await fetch_sector_data()
        data = parse_sector_data(raw)
    except Exception as e:
        print(f"[SECTORS ROUTER] Wire calls failed: {e}")
        from utils.helpers import parse_sector_data
        data = parse_sector_data([{}, {}])

    # Try Claude for market summary
    ai_summary = "Sector rotation data loaded. Monitor FII flows for directional cues."
    try:
        from services.claude import get_claude_verdict
        sector_text = f"Sectors by FII flow: {data.get('sectors', [])[:5]}. Top buying: {data.get('top_buying', [])}. Top selling: {data.get('top_selling', [])}."
        summary_data = {
            "quote": {"price": 0, "change_pct": 0, "volume": "N/A", "week52_high": 0, "week52_low": 0, "market_cap": "N/A", "sector": "Market"},
            "fundamentals": {},
            "fii_dii": data.get("fii_summary", {}),
            "shareholding": {}, "bulk_deals": [], "consensus": {}, "mf_holdings": {},
            "trends": {}, "stocktwits": {}, "fear_greed": {},
            "pcr": 1.0, "max_pain": 0, "earnings_within_72h": False,
            "sector_overview": sector_text
        }
        verdict = await get_claude_verdict("NIFTY50", summary_data)
        ai_summary = verdict.get("analysis", ai_summary)
    except Exception as e:
        print(f"[SECTORS] AI summary failed: {e}")

    response = {
        "sectors": data.get("sectors", []),
        "fii_total": data.get("fii_total", 0),
        "dii_total": data.get("dii_total", 0),
        "gainers": data.get("gainers", []),
        "losers": data.get("losers", []),
        "top_buying_sectors": data.get("top_buying", []),
        "top_selling_sectors": data.get("top_selling", []),
        "ai_summary": ai_summary,
        "heatmap": data.get("heatmap", [])
    }

    await set_cached(cache_key, response, ttl=300)
    return response

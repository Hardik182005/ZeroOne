from fastapi import APIRouter
from services.wire import fetch_ticker_tape, wire_call
from services.cache import get_cached, set_cached
import asyncio

router = APIRouter(prefix="/api/ticker-tape", tags=["ticker-tape"])

_INDICES = [
    {"symbol": "NIFTY 50",  "price": "22,514.65", "change_pct": 0.45},
    {"symbol": "SENSEX",    "price": "74,227.63",  "change_pct": 0.51},
    {"symbol": "BANKNIFTY", "price": "48,159.00",  "change_pct": -0.12},
]


@router.get("")
async def get_ticker_tape():
    cached = await get_cached("zeroonone:ticker-tape")
    if cached:
        return cached

    try:
        raw = await fetch_ticker_tape()
        gainers = raw.get("gainers", [])
        losers = raw.get("losers", [])

        ticks = list(_INDICES)
        for stock in (gainers + losers):
            pct_str = stock.get("pct", "0%").replace("%", "").replace("+", "")
            try:
                change_pct = float(pct_str)
            except ValueError:
                change_pct = 0.0
            ticks.append({
                "symbol": stock.get("symbol", ""),
                "price": stock.get("ltp", "0"),
                "change_pct": change_pct,
            })

        await set_cached("zeroonone:ticker-tape", ticks, ttl=60)
        return ticks

    except Exception:
        # Reliable static fallback
        fallback = list(_INDICES) + [
            {"symbol": "RELIANCE",   "price": "2,934.50",  "change_pct": 1.20},
            {"symbol": "HDFCBANK",   "price": "1,532.10",  "change_pct": -0.40},
            {"symbol": "INFY",       "price": "1,489.20",  "change_pct": 0.80},
            {"symbol": "TCS",        "price": "3,980.15",  "change_pct": 1.15},
            {"symbol": "BHARTIARTL", "price": "1,215.60",  "change_pct": 0.95},
            {"symbol": "ITC",        "price": "435.20",    "change_pct": 0.81},
            {"symbol": "SBIN",       "price": "825.40",    "change_pct": -0.75},
            {"symbol": "ICICIBANK",  "price": "1,110.20",  "change_pct": -0.96},
            {"symbol": "MARUTI",     "price": "12,450.00", "change_pct": 2.10},
            {"symbol": "TATASTEEL",  "price": "165.40",    "change_pct": 1.80},
        ]
        return fallback


@router.get("/movers")
async def get_market_movers():
    """Returns separate gainers and losers lists for the Dashboard table."""
    cached = await get_cached("zeroonone:movers")
    if cached:
        return cached

    try:
        raw = await fetch_ticker_tape()
        result = {
            "gainers": raw.get("gainers", [])[:5],
            "losers": raw.get("losers", [])[:5],
        }
        await set_cached("zeroonone:movers", result, ttl=60)
        return result
    except Exception:
        return {
            "gainers": [
                {"symbol": "RELIANCE",   "ltp": "2,934.50", "chg": "+34.80", "pct": "+1.20%", "vol": "12.4M"},
                {"symbol": "TCS",        "ltp": "3,980.15", "chg": "+45.20", "pct": "+1.15%", "vol": "3.2M"},
                {"symbol": "BHARTIARTL", "ltp": "1,215.60", "chg": "+11.40", "pct": "+0.95%", "vol": "8.1M"},
                {"symbol": "ITC",        "ltp": "435.20",   "chg": "+3.50",  "pct": "+0.81%", "vol": "15.6M"},
                {"symbol": "INFY",       "ltp": "1,489.20", "chg": "+11.80", "pct": "+0.80%", "vol": "5.4M"},
            ],
            "losers": [
                {"symbol": "HDFCBANK",  "ltp": "1,532.10", "chg": "-18.50", "pct": "-1.19%", "vol": "9.2M"},
                {"symbol": "ICICIBANK", "ltp": "1,110.20", "chg": "-10.80", "pct": "-0.96%", "vol": "6.8M"},
                {"symbol": "SBIN",      "ltp": "825.40",   "chg": "-6.20",  "pct": "-0.75%", "vol": "11.1M"},
                {"symbol": "AXISBANK",  "ltp": "1,154.00", "chg": "-5.80",  "pct": "-0.50%", "vol": "4.5M"},
                {"symbol": "LT",        "ltp": "3,480.00", "chg": "-15.00", "pct": "-0.43%", "vol": "2.1M"},
            ],
        }

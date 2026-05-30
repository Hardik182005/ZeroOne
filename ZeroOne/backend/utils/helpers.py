from datetime import datetime, timedelta
import pytz

def parse_wire_responses(raw: list, ticker: str) -> dict:
    def safe(i):
        try:
            r = raw[i]
            if isinstance(r, Exception):
                return {}
            if isinstance(r, dict) and "error" in r:
                return {}
            return r or {}
        except Exception:
            return {}

    return {
        "quote": safe(0),
        "option_chain": safe(1),
        "bulk_deals": safe(2),
        "insider_activity": safe(3),
        "fii_dii": safe(4),
        "pre_open": safe(5),
        "corporate_actions": safe(6),
        "shareholding": safe(7),
        "fundamentals": safe(8),
        "peers": safe(9) if isinstance(safe(9), list) else safe(9).get("peers", []),
        "news": safe(10) if isinstance(safe(10), list) else safe(10).get("articles", []),
        "analyst_consensus": safe(11),
        "mf_holdings": safe(12),
        "fear_greed": safe(13),
        "google_trend": safe(14),
        "stocktwits": safe(15),
        "promoter_data": {
            "current_holding": safe(7).get("promoter_pct"),
            "prev_holding": safe(7).get("prev_promoter_pct"),
            "pledging_pct": safe(7).get("pledge_pct"),
            "bulk_deals": safe(2) if isinstance(safe(2), list) else [],
            "insider_trades": safe(3) if isinstance(safe(3), list) else []
        }
    }

def calculate_pcr(option_chain: dict) -> float:
    try:
        calls_oi = sum(c.get("oi", 0) for c in option_chain.get("calls", []))
        puts_oi = sum(p.get("oi", 0) for p in option_chain.get("puts", []))
        if calls_oi == 0:
            return 1.24
        return round(puts_oi / calls_oi, 2)
    except Exception:
        return 1.24

def calculate_max_pain(option_chain: dict) -> float:
    try:
        if "max_pain" in option_chain:
            return float(option_chain["max_pain"])
        strikes = {}
        for opt in option_chain.get("calls", []) + option_chain.get("puts", []):
            strike = opt.get("strike", 0)
            oi = opt.get("oi", 0)
            strikes[strike] = strikes.get(strike, 0) + oi
        return float(max(strikes, key=strikes.get)) if strikes else 0.0
    except Exception:
        return 0.0

def calculate_bull_ratio(stocktwits: dict) -> float:
    try:
        if "bull_ratio" in stocktwits:
            return float(stocktwits["bull_ratio"])
        messages = stocktwits.get("messages", [])
        if not messages:
            return 50.0
        bulls = sum(
            1 for m in messages
            if m.get("sentiment", "").lower() == "bullish"
            or m.get("entities", {}).get("sentiment", {}).get("basic", "").lower() == "bullish"
        )
        return round((bulls / len(messages)) * 100, 1)
    except Exception:
        return 50.0

def classify_news_sentiment(news: list) -> str:
    if not news:
        return "Neutral"
    positive_words = ["surge", "rally", "gains", "profit", "beat", "strong", "growth", "record", "high", "buy", "upgrade"]
    negative_words = ["fall", "drop", "loss", "miss", "weak", "decline", "sell", "crash", "low", "concern", "downgrade"]
    score = 0
    for article in news[:5]:
        title = (article.get("title", "") + " " + article.get("snippet", "")).lower()
        score += sum(1 for w in positive_words if w in title)
        score -= sum(1 for w in negative_words if w in title)
    if score > 2:
        return "Positive"
    elif score < -2:
        return "Negative"
    return "Neutral"

def check_earnings_proximity(corporate_actions: list) -> bool:
    try:
        ist = pytz.timezone("Asia/Kolkata")
        now = datetime.now(ist)
        cutoff = now + timedelta(hours=72)
        for action in corporate_actions:
            action_type = (action.get("type", "") + " " + action.get("desc", "")).lower()
            if any(kw in action_type for kw in ["result", "earnings", "board meeting", "quarterly"]):
                date_str = action.get("date", "")
                if date_str:
                    action_date = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=ist)
                    if now <= action_date <= cutoff:
                        return True
        return False
    except Exception:
        return False

def parse_sector_data(raw: list) -> dict:
    try:
        gainers_losers = raw[0] if not isinstance(raw[0], Exception) and isinstance(raw[0], dict) else {}
        fii_dii = raw[1] if not isinstance(raw[1], Exception) and isinstance(raw[1], dict) else {}
        sectors = gainers_losers.get("sectors", [
            {"name": "IT", "change": 1.2, "fii_flow": 450, "dii_flow": 120, "top_stock": "INFY"},
            {"name": "BANK", "change": -0.8, "fii_flow": -780, "dii_flow": 310, "top_stock": "KOTAKBANK"},
            {"name": "AUTO", "change": 2.1, "fii_flow": 350, "dii_flow": 90, "top_stock": "MARUTI"},
            {"name": "FMCG", "change": 0.1, "fii_flow": -40, "dii_flow": 85, "top_stock": "ITC"},
            {"name": "PHARMA", "change": 0.5, "fii_flow": 120, "dii_flow": -20, "top_stock": "SUNPHARMA"},
            {"name": "METAL", "change": -1.5, "fii_flow": -320, "dii_flow": 150, "top_stock": "JINDALSTEL"},
            {"name": "REALTY", "change": -0.3, "fii_flow": -90, "dii_flow": 65, "top_stock": "DLF"},
            {"name": "MEDIA", "change": 0.0, "fii_flow": 15, "dii_flow": -5, "top_stock": "ZEEL"},
            {"name": "ENERGY", "change": 1.8, "fii_flow": 620, "dii_flow": 110, "top_stock": "RELIANCE"},
            {"name": "INFRA", "change": 0.4, "fii_flow": 80, "dii_flow": 45, "top_stock": "LT"},
            {"name": "PSU", "change": -0.7, "fii_flow": -180, "dii_flow": 220, "top_stock": "SBIN"},
            {"name": "MNCS", "change": 0.2, "fii_flow": 30, "dii_flow": 10, "top_stock": "NESTLEIND"}
        ])
        return {
            "sectors": sectors,
            "fii_summary": fii_dii,
            "fii_total": fii_dii.get("fii_net", -125),
            "dii_total": fii_dii.get("dii_net", 820),
            "top_buying": sorted(sectors, key=lambda x: x.get("fii_flow", 0), reverse=True)[:3],
            "top_selling": sorted(sectors, key=lambda x: x.get("fii_flow", 0))[:3],
            "heatmap": [{"name": s.get("name"), "change": s.get("change"), "fii_flow": s.get("fii_flow")} for s in sectors],
            "gainers": gainers_losers.get("gainers", []),
            "losers": gainers_losers.get("losers", [])
        }
    except Exception:
        return {"sectors": [], "fii_summary": {}, "fii_total": 0, "dii_total": 0, "top_buying": [], "top_selling": [], "heatmap": [], "gainers": [], "losers": []}

def get_market_status() -> dict:
    try:
        ist = pytz.timezone("Asia/Kolkata")
        now = datetime.now(ist)
        market_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
        market_close = now.replace(hour=15, minute=30, second=0, microsecond=0)
        pre_open_start = now.replace(hour=9, minute=0, second=0, microsecond=0)
        is_weekday = now.weekday() < 5
        is_open = is_weekday and market_open <= now <= market_close
        is_pre_open = is_weekday and pre_open_start <= now < market_open
        if is_open:
            session = "live"
        elif is_pre_open:
            session = "pre-open"
        else:
            session = "closed"
        return {
            "is_open": is_open,
            "current_time_ist": now.strftime("%Y-%m-%dT%H:%M:%S+05:30"),
            "session": session,
            "market_open": market_open.strftime("%H:%M"),
            "market_close": market_close.strftime("%H:%M")
        }
    except Exception:
        return {"is_open": False, "session": "closed", "current_time_ist": datetime.utcnow().isoformat()}

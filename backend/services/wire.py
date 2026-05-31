import os
import asyncio
import httpx
import json

ANAKIN_API_KEY = os.getenv("ANAKIN_API_KEY", "")
ANAKIN_BASE    = "https://api.anakin.ai/v1/chatbots"
ANAKIN_API_VERSION = "2024-05-06"

WIRE_CONNECTOR_IDS = {
    "nse-india":        os.getenv("ANAKIN_ID_NSE_INDIA", ""),
    "bse-india":        os.getenv("ANAKIN_ID_BSE_INDIA", ""),
    "screener-in":      os.getenv("ANAKIN_ID_SCREENER", ""),
    "economic-times":   os.getenv("ANAKIN_ID_ET", ""),
    "moneycontrol":     os.getenv("ANAKIN_ID_MC", ""),
    "fear-greed-index": os.getenv("ANAKIN_ID_FG", ""),
    "google-trends":    os.getenv("ANAKIN_ID_GT", ""),
    "stocktwits":       os.getenv("ANAKIN_ID_ST", ""),
}

def is_mock_mode():
    return not ANAKIN_API_KEY or ANAKIN_API_KEY.startswith("your_")

def _get_headers():
    return {
        "Authorization": f"Bearer {ANAKIN_API_KEY}",
        "X-Anakin-Api-Version": ANAKIN_API_VERSION,
        "Content-Type": "application/json",
    }

HEADERS = _get_headers()

# ── yfinance real data cache (per request, not persistent) ───────────────────
_yf_cache: dict = {}

def _safe_float(v, multiplier=1.0, decimals=2):
    try:
        return str(round(float(v) * multiplier, decimals)) if v is not None else "N/A"
    except Exception:
        return "N/A"

def _fetch_yf_all(ticker: str) -> dict:
    """Blocking yfinance fetch — run in executor. Returns full data dict."""
    import yfinance as yf

    t = yf.Ticker(f"{ticker}.NS")
    fi   = t.fast_info
    info = t.info or {}

    # ── Price ────────────────────────────────────────────────────────────────
    price    = round(float(fi.last_price or 0), 2)
    prev     = round(float(fi.previous_close or price), 2)
    chg      = round(price - prev, 2)
    chg_p    = round((chg / prev) * 100, 2) if prev else 0.0
    mkt_cap  = getattr(fi, "market_cap", None) or 0
    avg_vol  = getattr(fi, "three_month_average_volume", None) or 0
    yr_high  = getattr(fi, "year_high", None) or 0
    yr_low   = getattr(fi, "year_low", None) or 0

    quote = {
        "price":       price,
        "change":      chg,
        "change_pct":  chg_p,
        "volume":      f"{avg_vol/1e6:.1f}M" if avg_vol else "N/A",
        "market_cap":  f"₹{mkt_cap/1e12:.2f}T" if mkt_cap else "N/A",
        "week52_high": round(float(yr_high), 2),
        "week52_low":  round(float(yr_low), 2),
        "sector":      info.get("sector", "N/A"),
        "company_name": info.get("longName", f"{ticker} India Limited"),
    }

    # ── Fundamentals ─────────────────────────────────────────────────────────
    de_raw = info.get("debtToEquity")  # yfinance gives D/E as percentage (e.g. 38.2 = 0.382x)
    fundamentals = {
        "pe":               _safe_float(info.get("trailingPE")),
        "pb":               _safe_float(info.get("priceToBook")),
        "roe":              _safe_float(info.get("returnOnEquity"), 100),
        "roce":             _safe_float(info.get("returnOnAssets"), 100),
        "de":               _safe_float(de_raw, 0.01) if de_raw else "N/A",
        "interest_coverage": _safe_float(info.get("ebitda"), 1e-9),
        "revenue_growth_5y": _safe_float(info.get("revenueGrowth"), 100),
        "profit_growth_5y":  _safe_float(info.get("earningsGrowth"), 100),
    }

    # ── Options chain ─────────────────────────────────────────────────────────
    option_data = {
        "pcr": 1.0, "max_pain": price, "iv_percentile": 40,
        "calls": [], "puts": [],
        "highest_oi_call": "N/A", "highest_oi_put": "N/A",
    }
    try:
        expiries = t.options
        if expiries:
            chain    = t.option_chain(expiries[0])
            calls_df = chain.calls.fillna(0)
            puts_df  = chain.puts.fillna(0)

            call_oi  = float(calls_df["openInterest"].sum())
            put_oi   = float(puts_df["openInterest"].sum())
            pcr      = round(put_oi / call_oi, 2) if call_oi > 0 else 1.0

            # Max pain
            all_strikes = sorted(set(
                calls_df["strike"].tolist() + puts_df["strike"].tolist()
            ))
            min_pain, max_pain = float("inf"), price
            for s in all_strikes:
                c_loss = float(((s - calls_df["strike"]).clip(lower=0) * calls_df["openInterest"]).sum())
                p_loss = float(((puts_df["strike"] - s).clip(lower=0) * puts_df["openInterest"]).sum())
                total  = c_loss + p_loss
                if total < min_pain:
                    min_pain, max_pain = total, s

            # IV percentile
            avg_iv  = float(calls_df["impliedVolatility"].mean() or 0.4) * 100
            iv_pct  = min(95, max(5, int(avg_iv)))

            # Top OI
            top_call = calls_df.nlargest(1, "openInterest")
            top_put  = puts_df.nlargest(1, "openInterest")
            hoi_call = f"{int(top_call.iloc[0]['strike'])} CE" if not top_call.empty else "N/A"
            hoi_put  = f"{int(top_put.iloc[0]['strike'])} PE" if not top_put.empty else "N/A"

            option_data = {
                "pcr":            pcr,
                "max_pain":       max_pain,
                "iv_percentile":  iv_pct,
                "highest_oi_call": hoi_call,
                "highest_oi_put":  hoi_put,
                "calls": calls_df[["strike", "openInterest"]].rename(
                    columns={"openInterest": "oi"}).head(20).to_dict("records"),
                "puts":  puts_df[["strike", "openInterest"]].rename(
                    columns={"openInterest": "oi"}).head(20).to_dict("records"),
            }
    except Exception as oe:
        print(f"[yfinance options] {ticker}: {oe}")

    # ── News ──────────────────────────────────────────────────────────────────
    raw_news = []
    try:
        raw_news = t.news or []
    except Exception:
        pass
    news = []
    for n in raw_news[:6]:
        # yfinance v0.2.40+ wraps news in a 'content' object
        content = n.get("content", n)
        title   = content.get("title", "") or n.get("title", "")
        source  = (content.get("provider", {}) or {}).get("displayName", "") or n.get("publisher", "Yahoo Finance")
        url     = (content.get("canonicalUrl", {}) or {}).get("url", "") or n.get("link", "")
        pub     = content.get("pubDate", "") or ""
        if title:
            news.append({"title": title, "source": source, "time": pub[:10] if pub else "recent", "url": url})

    # ── Shareholding (approximate from yfinance) ──────────────────────────────
    promoter_pct = round(float(info.get("heldPercentInsiders", 0) or 0) * 100, 2)
    fii_pct      = round(float(info.get("heldPercentInstitutions", 0) or 0) * 100, 2)
    shareholding = {
        "promoter_pct":      promoter_pct,
        "prev_promoter_pct": promoter_pct,
        "pledge_pct":        0.0,
        "fii_pct":           fii_pct,
        "dii_pct":           max(0.0, 100.0 - promoter_pct - fii_pct - 10.0),
        "public_pct":        10.0,
    }

    return {
        "quote":        quote,
        "fundamentals": fundamentals,
        "option_data":  option_data,
        "news":         news,
        "shareholding": shareholding,
    }

async def get_yfinance_data(ticker: str) -> dict:
    """Async wrapper — caches per ticker for the lifetime of the request."""
    if ticker in _yf_cache:
        return _yf_cache[ticker]
    try:
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(None, lambda: _fetch_yf_all(ticker))
        _yf_cache[ticker] = data
        return data
    except Exception as e:
        print(f"[yfinance] {ticker}: {e}")
        return {}

# ── Mock fallback data ────────────────────────────────────────────────────────
def get_mock_data(connector: str, action: str, params: dict):
    symbol = params.get("symbol", "RELIANCE").upper()

    if connector == "nse-india":
        if action == "get_quote":
            PRICES = {
                "RELIANCE":2847.50,"TCS":3980.15,"INFY":1489.20,"HDFCBANK":1532.10,
                "ICICIBANK":1110.20,"WIPRO":452.10,"SBIN":810.50,"TATAMOTORS":985.30,
                "BAJFINANCE":7234.80,"AXISBANK":1089.40,"MARUTI":12450.00,
                "SUNPHARMA":1654.20,"LT":3567.80,"KOTAKBANK":1876.50,
                "BHARTIARTL":1678.90,"ADANIENT":2456.70,"TITAN":3421.60,
            }
            price = PRICES.get(symbol, 1250 + (hash(symbol) % 1000))
            chg_p = round((hash(symbol) % 300 - 150) / 100, 2)
            return {"symbol":symbol,"price":price,"change_pct":chg_p,
                    "change":round(price*chg_p/100,2),"volume":"12.4M",
                    "market_cap":"19.2T","week52_high":price*1.1,"week52_low":price*0.8,
                    "sector":"Diversified"}
        elif action == "get_option_chain":
            return {"pcr":1.24,"max_pain":2820,"iv_percentile":42,
                    "calls":[{"strike":2800,"oi":25000}],"puts":[{"strike":2800,"oi":31000}]}
        elif action == "get_bulk_deals":
            return [{"date":"2026-05-24","client":"Vanguard","action":"BUY","quantity":"1,200,000","price":"2835.40"}]
        elif action == "get_insider_trading":
            return [{"date":"2026-05-20","person":"Promoter","action":"Acquisition","shares":"15,000","value":"₹42,600,000"}]
        elif action == "get_fii_dii":
            return {"fii_net":450,"dii_net":820,"fii_direction":"INFLOW","dii_direction":"INFLOW"}
        elif action == "get_pre_open":
            return {"symbol":symbol,"pre_open_price":2855.00,"quantity":45000}
        elif action == "get_gainers_losers":
            return {
                "gainers":[
                    {"symbol":"RELIANCE","ltp":"2,934.50","chg":"+34.80","pct":"+1.20%","vol":"12.4M"},
                    {"symbol":"TCS","ltp":"3,980.15","chg":"+45.20","pct":"+1.15%","vol":"3.2M"},
                    {"symbol":"INFY","ltp":"1,489.20","chg":"+11.80","pct":"+0.80%","vol":"4.8M"},
                ],
                "losers":[
                    {"symbol":"HDFCBANK","ltp":"1,532.10","chg":"-18.50","pct":"-1.19%","vol":"9.2M"},
                    {"symbol":"ICICIBANK","ltp":"1,110.20","chg":"-10.80","pct":"-0.96%","vol":"6.8M"},
                ],
            }
    elif connector == "bse-india":
        if action == "get_corporate_actions":
            return [{"date":"2026-06-15","type":"Earnings","desc":"Board Meeting Q4 Results"}]
        elif action == "get_shareholding":
            return {"promoter_pct":50.39,"prev_promoter_pct":50.39,"pledge_pct":0.0,"fii_pct":22.4,"dii_pct":14.5,"public_pct":12.71}
    elif connector == "screener-in":
        if action == "get_fundamentals":
            return {"pe":"28.5","pb":"2.4","roe":"9.8","roce":"12.2","de":"0.38","interest_coverage":"6.8","revenue_growth_5y":"14.2","profit_growth_5y":"12.8"}
        elif action == "get_peers":
            return [{"symbol":"TCS","price":"3980.15","pe":"30.2"},{"symbol":"INFY","price":"1489.20","pe":"22.1"}]
    elif connector == "economic-times":
        if action == "search_articles":
            return [
                {"title":f"{symbol} Q4 earnings beat consensus by 4.2%","source":"Economic Times","time":"2h ago"},
                {"title":f"Institutional investors accumulate {symbol}","source":"Economic Times","time":"6h ago"},
                {"title":f"{symbol} technicals: breakout above resistance","source":"Mint","time":"1d ago"},
            ]
    elif connector == "moneycontrol":
        if action == "get_analyst_consensus":
            return {"buy_count":32,"hold_count":5,"sell_count":1,"avg_target":3120,"upside_pct":9.5}
        elif action == "get_mf_holdings":
            return {"mf_change":"Increased (+0.85% net addition)"}
    elif connector == "fear-greed-index":
        if action == "get_current":
            return {"fg_score":62,"fg_label":"Greed"}
    elif connector == "google-trends":
        if action == "get_interest_over_time":
            return {"trend_direction":"Upward (+14% search volume)"}
        elif action == "get_related_queries":
            return ["block deals","options max pain","dividend date"]
    elif connector == "stocktwits":
        if action == "get_symbol_messages":
            return {"bull_ratio":68,"messages":[
                {"body":f"{symbol} breakout looks imminent!","sentiment":"Bullish"},
                {"body":f"Accumulating {symbol} at support.","sentiment":"Bullish"},
            ]}
        elif action == "get_trending":
            return {"trending":[{"symbol":"RELIANCE","sentiment":"Bullish"},{"symbol":"TCS","sentiment":"Bullish"}]}
    return {}

# ── Anakin Wire call (only used if chatbot ID configured AND API key valid) ───
async def _anakin_call(connector: str, action: str, params: dict):
    chatbot_id = WIRE_CONNECTOR_IDS.get(connector, "")
    if not chatbot_id or is_mock_mode():
        return None
    msg = json.dumps({"action": action, "params": params})
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            r = await client.post(
                f"{ANAKIN_BASE}/{chatbot_id}/messages",
                headers=_get_headers(),
                json={"content": msg},
            )
            if r.status_code == 200:
                data = r.json()
                msgs = data.get("messages", [])
                if msgs:
                    try:
                        return json.loads(msgs[-1].get("content", "{}"))
                    except Exception:
                        return None
            else:
                print(f"[Anakin] {connector}/{action} → {r.status_code}")
        except Exception as e:
            print(f"[Anakin] {connector}/{action} exception: {e}")
    return None

# ── Main wire_call: yfinance first → Anakin → mock ───────────────────────────
async def wire_call(connector: str, action: str, params: dict):
    symbol = params.get("symbol", "").upper()

    # ── NSE quote: yfinance is always authoritative ───────────────────────────
    if connector == "nse-india" and action == "get_quote":
        yf = await get_yfinance_data(symbol) if symbol else {}
        q  = yf.get("quote", {})
        if q and q.get("price"):
            mock = get_mock_data(connector, action, params)
            return {**mock, **q, "symbol": symbol}
        return get_mock_data(connector, action, params)

    # ── Options chain: yfinance ───────────────────────────────────────────────
    if connector == "nse-india" and action == "get_option_chain":
        yf = await get_yfinance_data(symbol) if symbol else {}
        od = yf.get("option_data", {})
        if od and od.get("pcr"):
            return od
        anakin = await _anakin_call(connector, action, params)
        return anakin or get_mock_data(connector, action, params)

    # ── Fundamentals: yfinance ────────────────────────────────────────────────
    if connector == "screener-in" and action == "get_fundamentals":
        yf = await get_yfinance_data(symbol) if symbol else {}
        fd = yf.get("fundamentals", {})
        if fd and fd.get("pe") != "N/A":
            return fd
        anakin = await _anakin_call(connector, action, params)
        return anakin or get_mock_data(connector, action, params)

    # ── News: yfinance ────────────────────────────────────────────────────────
    if connector == "economic-times" and action == "search_articles":
        yf = await get_yfinance_data(symbol) if symbol else {}
        news = yf.get("news", [])
        if news:
            return news
        anakin = await _anakin_call(connector, action, params)
        return anakin or get_mock_data(connector, action, params)

    # ── Shareholding: yfinance ────────────────────────────────────────────────
    if connector == "bse-india" and action == "get_shareholding":
        yf = await get_yfinance_data(symbol) if symbol else {}
        sh = yf.get("shareholding", {})
        if sh and sh.get("promoter_pct") is not None:
            return sh
        anakin = await _anakin_call(connector, action, params)
        return anakin or get_mock_data(connector, action, params)

    # ── Fear & Greed: free alternative.me API ────────────────────────────────
    if connector == "fear-greed-index" and action == "get_current":
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get("https://api.alternative.me/fng/")
                if r.status_code == 200:
                    d = r.json()
                    score = int(d["data"][0]["value"])
                    label = d["data"][0]["value_classification"]
                    return {"fg_score": score, "fg_label": label}
        except Exception as e:
            print(f"[FG API] {e}")
        anakin = await _anakin_call(connector, action, params)
        return anakin or get_mock_data(connector, action, params)

    # ── All other connectors: Anakin → mock ───────────────────────────────────
    anakin = await _anakin_call(connector, action, params)
    return anakin or get_mock_data(connector, action, params)

# ── Batch fetchers ─────────────────────────────────────────────────────────────
async def fetch_all_stock_data(ticker: str, company_name: str):
    # Pre-warm yfinance cache so all subsequent wire_calls reuse it
    await get_yfinance_data(ticker)
    _yf_cache.clear()  # reset after this request completes later

    results = await asyncio.gather(
        wire_call("nse-india",        "get_quote",              {"symbol": ticker}),
        wire_call("nse-india",        "get_option_chain",       {"symbol": ticker}),
        wire_call("nse-india",        "get_bulk_deals",         {"symbol": ticker}),
        wire_call("nse-india",        "get_insider_trading",    {"symbol": ticker}),
        wire_call("nse-india",        "get_fii_dii",            {}),
        wire_call("bse-india",        "get_corporate_actions",  {"symbol": ticker}),
        wire_call("bse-india",        "get_shareholding",       {"symbol": ticker}),
        wire_call("screener-in",      "get_fundamentals",       {"symbol": ticker}),
        wire_call("screener-in",      "get_peers",              {"symbol": ticker}),
        wire_call("economic-times",   "search_articles",        {"query": ticker, "limit": 10}),
        wire_call("moneycontrol",     "get_analyst_consensus",  {"symbol": ticker}),
        wire_call("moneycontrol",     "get_mf_holdings",        {"symbol": ticker}),
        wire_call("fear-greed-index", "get_current",            {}),
        wire_call("google-trends",    "get_interest_over_time", {"keyword": company_name}),
        wire_call("stocktwits",       "get_symbol_messages",    {"symbol": ticker, "limit": 100}),
        return_exceptions=True,
    )
    _yf_cache.clear()
    return results

async def fetch_sector_data() -> list:
    return await asyncio.gather(
        wire_call("nse-india",  "get_gainers_losers", {"sector": "all"}),
        wire_call("nse-india",  "get_fii_dii",        {}),
        wire_call("stocktwits", "get_trending",        {}),
        return_exceptions=True,
    )

async def fetch_ticker_tape() -> dict:
    return await wire_call("nse-india", "get_gainers_losers", {"sector": "all"})

def parse_all_wire_responses(raw_results: list) -> dict:
    def safe(r): return r if not isinstance(r, Exception) else {}
    def safel(r): return r if not isinstance(r, Exception) else []
    return {
        "quote":            safe(raw_results[0]),
        "option_chain":     safe(raw_results[1]),
        "bulk_deals":       safel(raw_results[2]),
        "insider_trading":  safel(raw_results[3]),
        "fii_dii":          safe(raw_results[4]),
        "corporate_actions":safel(raw_results[5]),
        "shareholding":     safe(raw_results[6]),
        "fundamentals":     safe(raw_results[7]),
        "peers":            safel(raw_results[8]),
        "news":             safel(raw_results[9]),
        "consensus":        safe(raw_results[10]),
        "mf_holdings":      safe(raw_results[11]),
        "fear_greed":       safe(raw_results[12]),
        "trends":           safe(raw_results[13]),
        "stocktwits":       safe(raw_results[14]),
    }

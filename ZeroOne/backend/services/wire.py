import os
import asyncio
import httpx
import random

ANAKIN_API_KEY = os.getenv("ANAKIN_API_KEY", "")
ANAKIN_BASE = "https://api.anakin.ai/v1/wire"

# Helper to check if key is unset
def is_mock_mode():
    return not ANAKIN_API_KEY or ANAKIN_API_KEY.startswith("your_")

HEADERS = {
    "Authorization": f"Bearer {ANAKIN_API_KEY}",
    "Content-Type": "application/json"
}

# Dynamic mock data generators for each connector + action
def get_mock_data(connector: str, action: str, params: dict):
    symbol = params.get("symbol", "RELIANCE").upper()
    
    if connector == "nse-india":
        if action == "get_quote":
            price = 2847.50 if symbol == "RELIANCE" else 1489.20 if symbol == "INFY" else 1250.00
            change_pct = 2.34 if symbol == "RELIANCE" else 0.80 if symbol == "INFY" else -1.25
            change = round(price * (change_pct / 100.0), 2)
            return {
                "symbol": symbol,
                "company_name": f"{symbol} India Limited",
                "price": price,
                "change_pct": change_pct,
                "change": change,
                "volume": "12.4M",
                "market_cap": "19.2T" if symbol == "RELIANCE" else "6.5T",
                "week52_high": price * 1.1,
                "week52_low": price * 0.8,
                "sector": "Energy & Retail" if symbol == "RELIANCE" else "Technology"
            }
        elif action == "get_option_chain":
            return {
                "pcr": 1.24,
                "max_pain": 2820 if symbol == "RELIANCE" else 1480,
                "iv_percentile": 42,
                "calls": [{"strike": 2800, "oi": 25000}, {"strike": 2900, "oi": 42000}],
                "puts": [{"strike": 2800, "oi": 31000}, {"strike": 2900, "oi": 15000}]
            }
        elif action == "get_bulk_deals":
            return [
                {"date": "2026-05-24", "client": "Vanguard Group", "action": "BUY", "quantity": "1,200,000", "price": "2835.40"},
                {"date": "2026-05-18", "client": "Morgan Stanley", "action": "BUY", "quantity": "850,000", "price": "2810.20"}
            ]
        elif action == "get_insider_trading":
            return [
                {"date": "2026-05-20", "person": "Promoter Group", "action": "Acquisition", "shares": "15,000", "value": "₹42,600,000"}
            ]
        elif action == "get_fii_dii":
            return {"fii_net": 450, "dii_net": 820, "fii_direction": "INFLOW", "dii_direction": "INFLOW"}
        elif action == "get_pre_open":
            return {"symbol": symbol, "pre_open_price": 2855.00, "quantity": 45000}
        elif action == "get_gainers_losers":
            return {
                "gainers": [
                    {"symbol": "RELIANCE", "ltp": "2,934.50", "chg": "+34.80", "pct": "+1.20%", "vol": "12.4M"},
                    {"symbol": "TCS", "ltp": "3,980.15", "chg": "+45.20", "pct": "+1.15%", "vol": "3.2M"}
                ],
                "losers": [
                    {"symbol": "HDFCBANK", "ltp": "1,532.10", "chg": "-18.50", "pct": "-1.19%", "vol": "9.2M"},
                    {"symbol": "ICICIBANK", "ltp": "1,110.20", "chg": "-10.80", "pct": "-0.96%", "vol": "6.8M"}
                ]
            }
            
    elif connector == "bse-india":
        if action == "get_corporate_actions":
            return [
                {"date": "2026-06-15", "type": "Earnings Announcement", "desc": "Board Meeting for Q4 Financial Results"},
                {"date": "2026-05-12", "type": "Dividend", "desc": "Interim Dividend of ₹15 per share"}
            ]
        elif action == "get_shareholding":
            return {
                "promoter_pct": 50.39,
                "prev_promoter_pct": 50.39,
                "pledge_pct": 0.0,
                "fii_pct": 22.40,
                "dii_pct": 14.50,
                "public_pct": 12.71
            }
            
    elif connector == "screener-in":
        if action == "get_fundamentals":
            return {
                "pe": "28.5", "pb": "2.4", "roe": "9.8", "roce": "12.2",
                "de": "0.38", "interest_coverage": "6.8",
                "revenue_growth_5y": "14.2", "profit_growth_5y": "12.8"
            }
        elif action == "get_peers":
            return [
                {"symbol": "TCS", "price": "3980.15", "pe": "30.2"},
                {"symbol": "INFY", "price": "1489.20", "pe": "22.1"},
                {"symbol": "WIPRO", "price": "452.10", "pe": "18.5"}
            ]
            
    elif connector == "economic-times":
        if action == "search_articles":
            return [
                {"title": f"{symbol} shares surge as block deals signal institutional accumulation", "url": "https://economictimes.indiatimes.com/article1", "time": "2h ago", "source": "Economic Times"},
                {"title": f"Why brokerage houses are upgrading targets on {symbol}", "url": "https://economictimes.indiatimes.com/article2", "time": "12h ago", "source": "Economic Times"},
                {"title": f"Technical charts show breakout potential in {symbol} above resistance", "url": "https://economictimes.indiatimes.com/article3", "time": "1d ago", "source": "Economic Times"}
            ]
        elif action == "get_article":
            return {"content": "This is a mock full text of the Economic Times news article discussing stock valuations and market sentiments."}
            
    elif connector == "moneycontrol":
        if action == "get_analyst_consensus":
            return {"buy_count": 32, "hold_count": 5, "sell_count": 1, "avg_target": 3120, "upside_pct": 9.5}
        elif action == "get_mf_holdings":
            return {"mf_change": "Increased (+0.85% net addition by domestic mutual funds)"}
            
    elif connector == "fear-greed-index":
        if action == "get_current":
            return {"fg_score": 68, "fg_label": "Greed"}
            
    elif connector == "google-trends":
        if action == "get_interest_over_time":
            return {"trend_direction": "Upward (+14% search volume)"}
        elif action == "get_related_queries":
            return ["block deals", "options max pain", "dividend date"]
            
    elif connector == "stocktwits":
        if action == "get_symbol_messages":
            return {
                "bull_ratio": 76,
                "messages": [
                    {"body": f"Buying call options for {symbol}, breakout looks imminent!", "sentiment": "Bullish"},
                    {"body": f"Solid support on the daily chart for {symbol}. Accumulating here.", "sentiment": "Bullish"}
                ]
            }
        elif action == "get_trending":
            return {
                "trending": [
                    {"symbol": "RELIANCE", "sentiment": "Bullish"},
                    {"symbol": "TCS", "sentiment": "Bullish"},
                    {"symbol": "HDFCBANK", "sentiment": "Bearish"}
                ]
            }

    return {}

async def wire_call(connector: str, action: str, params: dict):
    if is_mock_mode():
        # Artificial delay to mimic API call
        await asyncio.sleep(0.05)
        return get_mock_data(connector, action, params)
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(
                f"{ANAKIN_BASE}/{connector}",
                headers=HEADERS,
                json={"action": action, "params": params}
            )
            if response.status_code == 200:
                return response.json()
            else:
                print(f"[WIRE API ERROR] {connector}/{action} returned status {response.status_code}")
                return get_mock_data(connector, action, params)
        except Exception as e:
            print(f"[WIRE API EXCEPT] {connector}/{action} failed: {e}")
            return get_mock_data(connector, action, params)

async def fetch_all_stock_data(ticker: str, company_name: str):
    # Fire all 15 calls in parallel as specified
    results = await asyncio.gather(
        wire_call("nse-india", "get_quote", {"symbol": ticker}),
        wire_call("nse-india", "get_option_chain", {"symbol": ticker}),
        wire_call("nse-india", "get_bulk_deals", {"symbol": ticker}),
        wire_call("nse-india", "get_insider_trading", {"symbol": ticker}),
        wire_call("nse-india", "get_fii_dii", {}),
        wire_call("bse-india", "get_corporate_actions", {"symbol": ticker}),
        wire_call("bse-india", "get_shareholding", {"symbol": ticker}),
        wire_call("screener-in", "get_fundamentals", {"symbol": ticker}),
        wire_call("screener-in", "get_peers", {"symbol": ticker}),
        wire_call("economic-times", "search_articles", {"query": ticker, "limit": 10}),
        wire_call("moneycontrol", "get_analyst_consensus", {"symbol": ticker}),
        wire_call("moneycontrol", "get_mf_holdings", {"symbol": ticker}),
        wire_call("fear-greed-index", "get_current", {}),
        wire_call("google-trends", "get_interest_over_time", {"keyword": company_name, "timeframe": "today 1-m"}),
        wire_call("stocktwits", "get_symbol_messages", {"symbol": ticker, "limit": 100}),
        return_exceptions=True
    )
    return results

async def fetch_sector_data() -> list:
    return await asyncio.gather(
        wire_call("nse-india", "get_gainers_losers", {"sector": "all"}),
        wire_call("nse-india", "get_fii_dii", {}),
        wire_call("stocktwits", "get_trending", {}),
        return_exceptions=True
    )

async def fetch_ticker_tape() -> dict:
    return await wire_call("nse-india", "get_gainers_losers", {"sector": "all"})

def parse_all_wire_responses(raw_results: list) -> dict:
    # Safely extract indices matching the parallel gather list
    parsed = {}
    
    # 0. nse-india: get_quote
    parsed["quote"] = raw_results[0] if not isinstance(raw_results[0], Exception) else {}
    # 1. nse-india: get_option_chain
    parsed["option_chain"] = raw_results[1] if not isinstance(raw_results[1], Exception) else {}
    # 2. nse-india: get_bulk_deals
    parsed["bulk_deals"] = raw_results[2] if not isinstance(raw_results[2], Exception) else []
    # 3. nse-india: get_insider_trading
    parsed["insider_trading"] = raw_results[3] if not isinstance(raw_results[3], Exception) else []
    # 4. nse-india: get_fii_dii
    parsed["fii_dii"] = raw_results[4] if not isinstance(raw_results[4], Exception) else {}
    # 5. bse-india: get_corporate_actions
    parsed["corporate_actions"] = raw_results[5] if not isinstance(raw_results[5], Exception) else []
    # 6. bse-india: get_shareholding
    parsed["shareholding"] = raw_results[6] if not isinstance(raw_results[6], Exception) else {}
    # 7. screener-in: get_fundamentals
    parsed["fundamentals"] = raw_results[7] if not isinstance(raw_results[7], Exception) else {}
    # 8. screener-in: get_peers
    parsed["peers"] = raw_results[8] if not isinstance(raw_results[8], Exception) else []
    # 9. economic-times: search_articles
    parsed["news"] = raw_results[9] if not isinstance(raw_results[9], Exception) else []
    # 10. moneycontrol: get_analyst_consensus
    parsed["consensus"] = raw_results[10] if not isinstance(raw_results[10], Exception) else {}
    # 11. moneycontrol: get_mf_holdings
    parsed["mf_holdings"] = raw_results[11] if not isinstance(raw_results[11], Exception) else {}
    # 12. fear-greed-index: get_current
    parsed["fear_greed"] = raw_results[12] if not isinstance(raw_results[12], Exception) else {}
    # 13. google-trends: get_interest_over_time
    parsed["trends"] = raw_results[13] if not isinstance(raw_results[13], Exception) else {}
    # 14. stocktwits: get_symbol_messages
    parsed["stocktwits"] = raw_results[14] if not isinstance(raw_results[14], Exception) else {}
    
    return parsed

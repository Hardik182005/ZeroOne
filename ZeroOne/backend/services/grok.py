import os
import json
import httpx
from services.gemini import get_gemini_verdict

GROK_API_KEY = os.getenv("GROK_API_KEY", "")
GROK_BASE = "https://api.x.ai/v1"

def is_mock_mode():
    return not GROK_API_KEY or GROK_API_KEY.startswith("your_") or not GROK_API_KEY.strip()

def build_grok_prompt(ticker: str, data: dict) -> str:
    # Safely pull values with reasonable defaults for prompt completion
    q = data.get("quote", {})
    f = data.get("fundamentals", {})
    o = data.get("option_chain", {})
    fd = data.get("fii_dii", {})
    sh = data.get("shareholding", {})
    bd = data.get("bulk_deals", [])
    c = data.get("consensus", {})
    m = data.get("mf_holdings", {})
    s = data.get("sentiment", {})
    t = data.get("trends", {})
    st = data.get("stocktwits", {})
    fg = data.get("fear_greed", {})
    
    # Summarize bulk deals
    bulk_deals_summary = "None"
    if bd and len(bd) > 0:
        bulk_deals_summary = ", ".join([f"{d.get('client')} {d.get('action')} {d.get('quantity')} sh at ₹{d.get('price')}" for d in bd[:2]])

    return f"""
Analyze the following real-time market data for {ticker} and return a JSON object with these exact keys:

{{
  "analysis": "3-sentence analysis: (1) price/momentum, (2) fundamental strength/weakness, (3) sentiment/positioning",
  "verdict": "BULLISH" | "CAUTIOUS" | "AVOID",
  "promoter_trust_score": 0-100,
  "risks": ["risk 1 max 10 words", "risk 2 max 10 words", "risk 3 max 10 words"],
  "verdict_changer": "one sentence on what would change this verdict",
  "earnings_verdict": "Beat probability: High/Medium/Low — one sentence" (only if earnings_within_72h is true, else null),
  "sector_summary": null (only populate for sector rotation endpoint)
}}

DATA:
- Ticker: {ticker}
- Live Price: ₹{q.get('price')} | Change: {q.get('change_pct')}% | Volume: {q.get('volume')}
- 52W High: ₹{q.get('week52_high')} | 52W Low: ₹{q.get('week52_low')}
- Market Cap: ₹{q.get('market_cap')} | Sector: {q.get('sector')}
- P/E: {f.get('pe')} | P/B: {f.get('pb')} | ROE: {f.get('roe')}% | ROCE: {f.get('roce')}%
- Debt/Equity: {f.get('de')} | Interest Coverage: {f.get('interest_coverage')}
- Revenue Growth (5Y): {f.get('revenue_growth_5y')}% | Profit Growth (5Y): {f.get('profit_growth_5y')}%
- PCR (Put-Call Ratio): {data.get('pcr')} | Max Pain: ₹{data.get('max_pain')}
- FII Activity Today: ₹{fd.get('fii_net')}Cr net {fd.get('fii_direction')}
- Promoter Holding: {sh.get('promoter_pct')}% (prev quarter: {sh.get('prev_promoter_pct')}%)
- Promoter Pledging: {sh.get('pledge_pct')}%
- Recent Bulk Deals: {bulk_deals_summary}
- Analyst Consensus: {c.get('buy_count', 0)} Buy | {c.get('hold_count', 0)} Hold | {c.get('sell_count', 0)} Sell
- Avg Target Price: ₹{c.get('avg_target', 0)} ({c.get('upside_pct', 0)}% upside)
- MF Holdings Change: {m.get('mf_change')}
- News Sentiment (7 days): {s.get('news_sentiment')}
- Google Trend (30 day): {t.get('trend_direction')}
- StockTwits Bull Ratio: {st.get('bull_ratio', 50)}%
- Fear & Greed Score: {fg.get('fg_score', 50)}/100 ({fg.get('fg_label', 'Neutral')})
- Earnings Within 72h: {data.get('earnings_within_72h', False)}

Respond ONLY with valid JSON. No preamble. No markdown. No explanation outside the JSON object.
Max 150 words total across all text fields.
If earnings within 72 hours, lead the analysis with that context.
"""

def parse_grok_response(resp_json: dict) -> dict:
    try:
        content = resp_json["choices"][0]["message"]["content"]
        # Strip markdown syntax if returned
        if content.startswith("```json"):
            content = content.replace("```json", "", 1)
        if content.endswith("```"):
            content = content.rsplit("```", 1)[0]
        return json.loads(content.strip())
    except Exception as e:
        print(f"[GROK PARSE ERROR] Failed to parse: {e}")
        raise e

async def get_grok_verdict(ticker: str, data: dict) -> dict:
    if is_mock_mode():
        print("[GROK] No API key set. Falling back to Gemini...")
        from services.gemini import get_gemini_verdict
        return await get_gemini_verdict(ticker, data)
        
    prompt = build_grok_prompt(ticker, data)
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{GROK_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "grok-2-1212", # default Grok text model or grok-3 if supported
                    "messages": [
                        {"role": "system", "content": "You are ZeroOne, an expert Indian equity analyst. Be direct, factual, and plain-English only. No jargon. Return ONLY JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 500,
                    "temperature": 0.3
                }
            )
            if response.status_code == 200:
                return parse_grok_response(response.json())
            else:
                print(f"[GROK API ERROR] Status {response.status_code}. Falling back to Gemini...")
                return await get_gemini_verdict(ticker, data)
    except Exception as e:
        print(f"[GROK EXCEPT] Failed: {e}. Falling back to Gemini...")
        return await get_gemini_verdict(ticker, data)

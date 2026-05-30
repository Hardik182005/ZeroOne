import os
import json
import anthropic
from services.gemini import get_gemini_verdict, get_mock_verdict_fallback

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")


def is_mock_mode():
    return not ANTHROPIC_API_KEY or ANTHROPIC_API_KEY.startswith("your_")


def build_claude_prompt(ticker: str, data: dict) -> str:
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
        bulk_deals_summary = ", ".join([
            f"{d.get('client')} {d.get('action')} {d.get('quantity')} sh at ₹{d.get('price')}"
            for d in bd[:2]
        ])

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


async def get_claude_verdict(ticker: str, data: dict) -> dict:
    if is_mock_mode():
        print("[CLAUDE] Mock Mode: No valid API key set. Returning mock verdict.")
        return get_mock_verdict_fallback()

    prompt = build_claude_prompt(ticker, data)

    try:
        client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}]
        )
        content = response.content[0].text.strip()

        # Strip markdown syntax if returned
        if content.startswith("```json"):
            content = content.replace("```json", "", 1)
        if content.endswith("```"):
            content = content.rsplit("```", 1)[0]

        return json.loads(content.strip())
    except Exception as e:
        print(f"[CLAUDE ERROR] Verdict failed: {e}. Falling back to Gemini...")
        return await get_gemini_verdict(ticker, data)


async def get_claude_comparison(ticker1: str, data1: dict, ticker2: str, data2: dict) -> dict:
    ticker1 = ticker1.upper()
    ticker2 = ticker2.upper()

    prompt = (
        f"You are ZeroOne. Compare {ticker1} vs {ticker2} for Indian retail investor. "
        f"Data1: {json.dumps(data1)}. Data2: {json.dumps(data2)}. "
        f"Provide: (1) Valuation winner and why, (2) Growth momentum winner, "
        f"(3) Risk: which is safer, (4) Final verdict: pick one stock decisively. "
        f"Plain English, max 200 words, be decisive."
    )

    try:
        client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}]
        )
        text = response.content[0].text.strip()

        # Determine winner by checking which ticker appears more prominently
        # in the last 2 sentences of the response
        sentences = [s.strip() for s in text.replace("\n", " ").split(".") if s.strip()]
        last_two = " ".join(sentences[-2:]) if len(sentences) >= 2 else text
        t1_count = last_two.upper().count(ticker1)
        t2_count = last_two.upper().count(ticker2)
        winner = ticker1 if t1_count >= t2_count else ticker2

        return {
            "analysis": text,
            "winner": winner,
            "ticker1": ticker1,
            "ticker2": ticker2
        }
    except Exception as e:
        print(f"[CLAUDE ERROR] Comparison failed: {e}. Returning mock comparison.")
        # Minimal fallback
        return {
            "analysis": (
                f"{ticker1} and {ticker2} both present opportunities for Indian retail investors. "
                f"Based on available data, {ticker1} shows stronger momentum while {ticker2} "
                f"offers better valuation. Consider {ticker1} for growth, {ticker2} for safety."
            ),
            "winner": ticker1,
            "ticker1": ticker1,
            "ticker2": ticker2
        }


async def get_claude_morning_briefing(tickers: list, stock_data: dict) -> str:
    tickers_str = ", ".join(tickers)

    prompt = (
        f"You are ZeroOne, an Indian stock intelligence terminal. "
        f"Generate a morning market briefing audio script for these stocks: {tickers_str}. "
        f"Stock data: {json.dumps(stock_data)}. "
        f"The script must be 250-300 words, flow naturally as spoken audio, "
        f"and open with exactly: 'Good morning. Here's your ZeroOne market briefing.' "
        f"Cover key movers, sentiment, and any risk flags for the day. "
        f"End with exactly: 'The market speaks. We translate. Have a great trading day.' "
        f"Write in plain English. No bullet points. No headers. Continuous prose only."
    )

    try:
        client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text.strip()
    except Exception as e:
        print(f"[CLAUDE ERROR] Morning briefing failed: {e}. Returning static briefing.")
        tickers_display = " and ".join(tickers) if tickers else "the market"
        return (
            f"Good morning. Here's your ZeroOne market briefing. "
            f"Today we are tracking {tickers_display}. "
            f"Markets open with mixed signals as global cues remain cautious. "
            f"FII flows showed net selling in the last session, while DII buying provided support. "
            f"Keep a close eye on options data for key support and resistance levels. "
            f"Risk management remains paramount — size your positions wisely and avoid overleveraging. "
            f"The market speaks. We translate. Have a great trading day."
        )

import os
import json
import re
from openai import AsyncOpenAI


def _clean_key(name: str) -> str:
    """Read an env var and strip a UTF-8 BOM (U+FEFF) and surrounding whitespace.

    Secrets uploaded via PowerShell often carry a BOM and/or trailing newline.
    str.strip() does NOT remove U+FEFF, so removing it explicitly is required —
    otherwise the key triggers gRPC "Illegal header value" / ascii-codec errors.
    """
    return os.getenv(name, "").replace("﻿", "").strip()


GROQ_API_KEY  = _clean_key("GROQ_API_KEY")
OPENAI_API_KEY = _clean_key("OPENAI_API_KEY")

def is_groq_mock():
    return not GROQ_API_KEY or GROQ_API_KEY.startswith("your_")

def is_openai_mock():
    return not OPENAI_API_KEY or OPENAI_API_KEY.startswith("your_")

_groq_client   = None
_openai_client = None

def get_groq_client():
    global _groq_client
    if _groq_client is None:
        _groq_client = AsyncOpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
    return _groq_client

def get_openai_client():
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    return _openai_client

def clean_text(text: str) -> str:
    """Remove markdown symbols (* # ` _) and extra whitespace from AI responses."""
    text = re.sub(r'[*#`_]+', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def build_prompt(ticker: str, data: dict) -> str:
    q  = data.get("quote", {})
    f  = data.get("fundamentals", {})
    fd = data.get("fii_dii", {})
    sh = data.get("shareholding", {})
    bd = data.get("bulk_deals", [])
    c  = data.get("consensus", {})
    m  = data.get("mf_holdings", {})
    t  = data.get("trends", {})
    st = data.get("stocktwits", {})
    fg = data.get("fear_greed", {})

    bulk_summary = "None"
    if bd and isinstance(bd, list):
        bulk_summary = ", ".join(
            f"{d.get('client')} {d.get('action')} {d.get('quantity')} sh at {d.get('price')}"
            for d in bd[:2]
        )

    return f"""
Analyze this real-time market data for {ticker} and return a JSON object with EXACTLY these keys:

{{
  "analysis": "3-sentence analysis: (1) price/momentum, (2) fundamental strength/weakness, (3) sentiment/positioning",
  "verdict": "BULLISH" or "CAUTIOUS" or "AVOID",
  "promoter_trust_score": integer 0-100,
  "risks": ["risk 1 max 10 words", "risk 2", "risk 3"],
  "verdict_changer": "one sentence on what would change this verdict",
  "earnings_verdict": null
}}

DATA:
- Price: {q.get('price')} | Change: {q.get('change_pct')}% | Volume: {q.get('volume')}
- 52W High: {q.get('week52_high')} | 52W Low: {q.get('week52_low')}
- Market Cap: {q.get('market_cap')} | Sector: {q.get('sector')}
- P/E: {f.get('pe')} | P/B: {f.get('pb')} | ROE: {f.get('roe')}% | ROCE: {f.get('roce')}%
- D/E: {f.get('de')} | Interest Coverage: {f.get('interest_coverage')}
- Rev Growth 5Y: {f.get('revenue_growth_5y')}% | PAT Growth 5Y: {f.get('profit_growth_5y')}%
- PCR: {data.get('pcr')} | Max Pain: {data.get('max_pain')}
- FII Net: {fd.get('fii_net')}Cr {fd.get('fii_direction')}
- Promoter: {sh.get('promoter_pct')}% (prev: {sh.get('prev_promoter_pct')}%) | Pledge: {sh.get('pledge_pct')}%
- Bulk Deals: {bulk_summary}
- Analyst: {c.get('buy_count',0)} Buy | {c.get('hold_count',0)} Hold | {c.get('sell_count',0)} Sell | Target: {c.get('avg_target')}
- MF Change: {m.get('mf_change')}
- Google Trend: {t.get('trend_direction')}
- StockTwits Bull%: {st.get('bull_ratio',50)}
- Fear & Greed: {fg.get('fg_score',50)}/100 {fg.get('fg_label','')}

RULES: Respond ONLY with valid raw JSON. Zero preamble. Zero markdown. Max 150 words total.
Plain English only. Indian Rupee context. Be direct.
"""


async def get_groq_verdict(ticker: str, data: dict) -> dict:
    prompt = build_prompt(ticker, data)
    sys_msg = "You are ZeroOne, an expert Indian equity analyst. Return ONLY valid JSON, no markdown, no preamble."

    # 1. Try Groq (llama-3.3-70b — fastest)
    if not is_groq_mock():
        try:
            r = await get_groq_client().chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "system", "content": sys_msg}, {"role": "user", "content": prompt}],
                max_tokens=600, temperature=0.3,
            )
            content = re.sub(r'```json|```', '', r.choices[0].message.content.strip()).strip()
            return json.loads(content)
        except Exception as e:
            print(f"[GROQ] failed: {e} — trying OpenAI fallback")

    # 2. Try OpenAI gpt-4o-mini
    if not is_openai_mock():
        try:
            r = await get_openai_client().chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": sys_msg}, {"role": "user", "content": prompt}],
                max_tokens=600, temperature=0.3,
            )
            content = re.sub(r'```json|```', '', r.choices[0].message.content.strip()).strip()
            return json.loads(content)
        except Exception as e:
            print(f"[OPENAI] failed: {e} — using mock fallback")

    # 3. Mock fallback
    from services.gemini import get_mock_verdict_fallback
    return get_mock_verdict_fallback()


async def get_groq_comparison(ticker1: str, data1: dict, ticker2: str, data2: dict) -> dict:
    prompt = (
        f"Compare {ticker1} vs {ticker2} for an Indian retail investor. "
        f"Data {ticker1}: {json.dumps(data1, default=str)[:1000]}. "
        f"Data {ticker2}: {json.dumps(data2, default=str)[:1000]}. "
        f"Give: valuation winner, growth winner, safety winner, final pick. "
        f"Plain English, max 200 words. Name {ticker1} or {ticker2} as each winner clearly."
    )
    try:
        response = await get_groq_client().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400,
            temperature=0.3,
        )
        text = clean_text(response.choices[0].message.content.strip())
        sentences = [s.strip() for s in text.replace("\n", " ").split(".") if s.strip()]
        last_two = " ".join(sentences[-2:]) if len(sentences) >= 2 else text
        winner = ticker1 if last_two.upper().count(ticker1) >= last_two.upper().count(ticker2) else ticker2
        return {"analysis": text, "winner": winner, "ticker1": ticker1, "ticker2": ticker2}
    except Exception as e:
        print(f"[GROQ COMPARE ERROR] {e}")
        return {"analysis": f"{ticker1} vs {ticker2} comparison unavailable.", "winner": ticker1, "ticker1": ticker1, "ticker2": ticker2}


async def get_groq_chat_response(message: str, context: str = "") -> str:
    """Chat via GPT-4o-mini. Falls back to Groq if OpenAI unavailable."""
    system = (
        "You are ZeroOne AI, an expert Indian stock market analyst. "
        "Answer questions about NSE/BSE stocks, sectors, options, and investing in plain English. "
        "Be concise, direct, practical. No asterisks, no hashtags, no markdown formatting. "
        "Write in clean plain text only. The market speaks. We translate."
    )
    messages = [{"role": "system", "content": system}]
    if context:
        messages.append({"role": "assistant", "content": f"Context: {context}"})
    messages.append({"role": "user", "content": message})

    # Try GPT-4o-mini first
    if not is_openai_mock():
        try:
            response = await get_openai_client().chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=400,
                temperature=0.5,
            )
            return clean_text(response.choices[0].message.content.strip())
        except Exception as e:
            print(f"[GPT-4O-MINI CHAT ERROR] {e} — falling back to Groq")

    # Fallback: Groq
    if not is_groq_mock():
        try:
            response = await get_groq_client().chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                max_tokens=400,
                temperature=0.5,
            )
            return clean_text(response.choices[0].message.content.strip())
        except Exception as e:
            print(f"[GROQ CHAT ERROR] {e}")

    return "I'm unable to process that right now. Please try again in a moment."

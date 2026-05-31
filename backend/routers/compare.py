from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.wire import wire_call

router = APIRouter(prefix="/api/compare", tags=["compare"])

class CompareRequest(BaseModel):
    ticker1: str
    ticker2: str


def _num(v):
    """Best-effort parse of a metric value (handles "N/A", "1,234", "12.3%", "₹...")."""
    if v is None:
        return None
    try:
        return float(str(v).replace(",", "").replace("%", "").replace("₹", "").strip())
    except (ValueError, TypeError):
        return None


def _pick(v1, v2, t1, t2, lower_better):
    """Return whichever ticker wins on a metric; '—' if neither is comparable."""
    a, b = _num(v1), _num(v2)
    if a is None and b is None:
        return "—"
    if a is None:
        return t2
    if b is None:
        return t1
    if a == b:
        return t1
    if lower_better:
        return t1 if a < b else t2
    return t1 if a > b else t2


def _fmt_change(cp):
    n = _num(cp)
    if n is None:
        return "0.0%"
    return f"+{n}%" if n >= 0 else f"{n}%"


def _mcap(v):
    """Parse a market cap into a comparable number (handles T/B/Cr/L suffixes)."""
    if v is None:
        return None
    s = str(v).upper().replace("₹", "").replace(",", "").strip()
    mult = 1.0
    if s.endswith("T"):    mult, s = 1e12, s[:-1]
    elif s.endswith("B"):  mult, s = 1e9, s[:-1]
    elif s.endswith("CR"): mult, s = 1e7, s[:-2]
    elif s.endswith("L"):  mult, s = 1e5, s[:-1]
    try:
        return float(s) * mult
    except (ValueError, TypeError):
        return None


def _pick_val(a, b, t1, t2, lower_better):
    if a is None and b is None:
        return "—"
    if a is None:
        return t2
    if b is None:
        return t1
    if a == b:
        return t1
    return (t1 if a < b else t2) if lower_better else (t1 if a > b else t2)

@router.post("")
async def run_comparison(req: CompareRequest):
    t1 = req.ticker1.upper()
    t2 = req.ticker2.upper()
    
    if not t1 or not t2:
        raise HTTPException(status_code=400, detail="Both symbols must be provided")

    try:
        # Parallel fetch quotes and fundamentals for both symbols
        import asyncio
        data1_raw, data2_raw = await asyncio.gather(
            asyncio.gather(
                wire_call("nse-india", "get_quote", {"symbol": t1}),
                wire_call("screener-in", "get_fundamentals", {"symbol": t1}),
                wire_call("nse-india", "get_option_chain", {"symbol": t1})
            ),
            asyncio.gather(
                wire_call("nse-india", "get_quote", {"symbol": t2}),
                wire_call("screener-in", "get_fundamentals", {"symbol": t2}),
                wire_call("nse-india", "get_option_chain", {"symbol": t2})
            )
        )
        
        quote1, fund1, opt1 = data1_raw
        quote2, fund2, opt2 = data2_raw
        
        # Structure payload for GPT-4o comparison
        data1 = {
            "price": quote1.get("price"),
            "change_pct": quote1.get("change_pct"),
            "market_cap": quote1.get("market_cap"),
            "pe": fund1.get("pe"),
            "pb": fund1.get("pb"),
            "roe": fund1.get("roe"),
            "de": fund1.get("de"),
            "pcr": opt1.get("pcr", 1.0)
        }
        
        data2 = {
            "price": quote2.get("price"),
            "change_pct": quote2.get("change_pct"),
            "market_cap": quote2.get("market_cap"),
            "pe": fund2.get("pe"),
            "pb": fund2.get("pb"),
            "roe": fund2.get("roe"),
            "de": fund2.get("de"),
            "pcr": opt2.get("pcr", 1.0)
        }
        
        # ── Per-category winners from REAL numbers (fully deterministic) ──────
        m1, m2 = _mcap(quote1.get("market_cap")), _mcap(quote2.get("market_cap"))
        winner_valuation = _pick(data1["pe"], data2["pe"], t1, t2, lower_better=True)
        winner_growth    = _pick(data1["roe"], data2["roe"], t1, t2, lower_better=False)
        winner_risk      = _pick(data1["de"], data2["de"], t1, t2, lower_better=True)
        winner_scale     = _pick_val(m1, m2, t1, t2, lower_better=False)  # bigger company

        # Overall: who leads on more of the 4 weighted dimensions. Tie → bigger
        # company (scale) wins. No AI free-text → no hallucination.
        dims = [winner_valuation, winner_growth, winner_risk, winner_scale]
        w1, w2 = dims.count(t1), dims.count(t2)
        if w1 > w2:
            overall_winner = t1
        elif w2 > w1:
            overall_winner = t2
        else:
            overall_winner = t1 if (m1 or 0) >= (m2 or 0) else t2

        def _strengths(sym):
            s = []
            if winner_scale == sym:      s.append("Larger company by market capitalisation (scale leader)")
            if winner_valuation == sym:  s.append("Cheaper on earnings (lower P/E)")
            if winner_growth == sym:     s.append("Higher return on equity (ROE)")
            if winner_risk == sym:       s.append("Lower leverage (debt/equity)")
            return s or ["Balanced across the key metrics"]

        # Factual, data-grounded summary — built from the real numbers only.
        scale_leader = winner_scale if winner_scale in (t1, t2) else t1
        value_leader = winner_valuation if winner_valuation in (t1, t2) else t1
        summary = (
            f"{t1} vs {t2}, on live fundamentals: "
            f"P/E {data1['pe']} vs {data2['pe']} (cheaper: {winner_valuation}); "
            f"ROE {data1['roe']} vs {data2['roe']} (higher: {winner_growth}); "
            f"Debt/Equity {data1['de']} vs {data2['de']} (lower: {winner_risk}); "
            f"market cap {quote1.get('market_cap')} vs {quote2.get('market_cap')} (larger: {winner_scale}). "
            f"Overall edge: {overall_winner} (leads on more dimensions). "
            f"In short, {scale_leader} is the larger, more dominant business by size, "
            f"while {value_leader} is the cheaper stock on earnings — they suit different objectives."
        )

        def _display(sym, q, f, o):
            roe = f.get("roe", "N/A")
            return {
                "ticker": sym,
                "price": str(q.get("price", "N/A")),
                "change_pct": _fmt_change(q.get("change_pct")),
                "market_cap": str(q.get("market_cap", "N/A")),
                "pe": str(f.get("pe", "N/A")),
                "pb": str(f.get("pb", "N/A")),
                "roe": f"{roe}%" if roe not in (None, "N/A") else "N/A",
                "de": str(f.get("de", "N/A")),
                "pcr": str(o.get("pcr", 1.0)),
            }

        # Flat shape — matches exactly what frontend Compare.jsx renders.
        return {
            "overall_winner": overall_winner,
            "comparison_summary": summary,
            "winner_valuation": winner_valuation,
            "winner_growth": winner_growth,
            "winner_scale": winner_scale,
            "winner_risk": winner_risk,
            "ticker1_strengths": _strengths(t1),
            "ticker2_strengths": _strengths(t2),
            "data1": _display(t1, quote1, fund1, opt1),
            "data2": _display(t2, quote2, fund2, opt2),
        }
    except Exception as e:
        print(f"[COMPARE ROUTER ERROR] Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

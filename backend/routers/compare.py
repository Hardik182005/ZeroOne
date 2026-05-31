from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.claude import get_claude_comparison
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
        
        # Get AI comparison assessment — try Claude, fall back to Groq
        try:
            ai_res = await get_claude_comparison(t1, data1, t2, data2)
        except Exception:
            from services.groq_svc import get_groq_comparison
            ai_res = await get_groq_comparison(t1, data1, t2, data2)

        # Derive per-category winners from the real numbers (deterministic).
        winner_valuation = _pick(data1["pe"], data2["pe"], t1, t2, lower_better=True)
        winner_growth    = _pick(data1["roe"], data2["roe"], t1, t2, lower_better=False)
        winner_momentum  = _pick(data1["change_pct"], data2["change_pct"], t1, t2, lower_better=False)
        winner_risk      = _pick(data1["de"], data2["de"], t1, t2, lower_better=True)

        ai_winner = (ai_res or {}).get("winner") or ""
        overall_winner = ai_winner if ai_winner in (t1, t2) else (
            t1 if [winner_valuation, winner_growth, winner_momentum, winner_risk].count(t1)
                  >= 2 else t2
        )

        def _strengths(sym):
            s = []
            if winner_valuation == sym: s.append("More attractive valuation (lower P/E)")
            if winner_growth == sym:    s.append("Higher return on equity (ROE)")
            if winner_momentum == sym:  s.append("Stronger recent price momentum")
            if winner_risk == sym:      s.append("Lower leverage (debt/equity)")
            return s or ["Balanced fundamentals across key metrics"]

        def _display(sym, q, f, o):
            return {
                "ticker": sym,
                "price": str(q.get("price", "N/A")),
                "change_pct": _fmt_change(q.get("change_pct")),
                "market_cap": str(q.get("market_cap", "N/A")),
                "pe": str(f.get("pe", "N/A")),
                "pb": str(f.get("pb", "N/A")),
                "roe": f"{f.get('roe', 'N/A')}%",
                "de": str(f.get("de", "N/A")),
                "pcr": str(o.get("pcr", 1.0)),
            }

        # Flat shape — matches exactly what frontend Compare.jsx renders.
        return {
            "overall_winner": overall_winner,
            "comparison_summary": (ai_res or {}).get("analysis", f"{t1} vs {t2} comparison."),
            "winner_valuation": winner_valuation,
            "winner_growth": winner_growth,
            "winner_momentum": winner_momentum,
            "winner_risk": winner_risk,
            "ticker1_strengths": _strengths(t1),
            "ticker2_strengths": _strengths(t2),
            "data1": _display(t1, quote1, fund1, opt1),
            "data2": _display(t2, quote2, fund2, opt2),
        }
    except Exception as e:
        print(f"[COMPARE ROUTER ERROR] Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

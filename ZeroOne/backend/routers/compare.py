from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.claude import get_claude_comparison
from services.wire import wire_call

router = APIRouter(prefix="/api/compare", tags=["compare"])

class CompareRequest(BaseModel):
    ticker1: str
    ticker2: str

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
        
        # Get Claude comparison assessment
        ai_res = await get_claude_comparison(t1, data1, t2, data2)
        
        # Merge side-by-side details
        ai_res["data1"] = data1
        ai_res["data2"] = data2
        
        return ai_res
    except Exception as e:
        print(f"[COMPARE ROUTER ERROR] Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

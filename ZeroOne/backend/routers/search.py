from fastapi import APIRouter, Query
from typing import List
from utils.tickers import TICKERS

router = APIRouter(prefix="/api/tickers", tags=["search"])

@router.get("/search")
async def search_ticker(q: str = Query("", description="Search term for symbol or name")):
    if not q:
        return []
    
    q_lower = q.lower()
    matches = []
    
    for item in TICKERS:
        if q_lower in item["symbol"].lower() or q_lower in item["name"].lower():
            matches.append(item)
            if len(matches) >= 10: # Limit to 10 results
                break
                
    return matches

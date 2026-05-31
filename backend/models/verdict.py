from pydantic import BaseModel
from typing import Optional, List

class VerdictResponse(BaseModel):
    analysis: str
    verdict: str  # BULLISH | CAUTIOUS | AVOID
    promoter_trust_score: int
    risks: List[str]
    verdict_changer: str
    earnings_verdict: Optional[str] = None
    sector_summary: Optional[str] = None

class StockQuote(BaseModel):
    symbol: str
    price: float
    change_pct: float
    volume: Optional[str] = None
    market_cap: Optional[str] = None

class CompareRequest(BaseModel):
    ticker1: str
    ticker2: str

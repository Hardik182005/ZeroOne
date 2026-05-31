from pydantic import BaseModel
from typing import List, Optional

class StockQuote(BaseModel):
    company_name: str
    price: float
    change_pct: float
    change: float
    volume: str
    market_cap: str
    week52_high: float
    week52_low: float
    sector: str

class StockFundamentals(BaseModel):
    pe: str
    pb: str
    roe: str
    roce: str
    de: str
    interest_coverage: str
    revenue_growth_5y: str
    profit_growth_5y: str

class OptionsSummary(BaseModel):
    pcr: float
    max_pain: float
    iv_percentile: float
    highest_oi_call: str
    highest_oi_put: str

class NewsItem(BaseModel):
    title: str
    source: str
    time: str

class StockVerdict(BaseModel):
    analysis: str
    verdict: str
    promoter_trust_score: int
    risks: List[str]
    verdict_changer: str
    earnings_verdict: Optional[str] = None
    sector_summary: Optional[str] = None

class PeerItem(BaseModel):
    symbol: str
    price: str
    pe: str

class FinancialQuarter(BaseModel):
    quarter: str
    revenue: float
    pat: float

class StockIntelligenceResponse(BaseModel):
    ticker: str
    timestamp: str
    quote: StockQuote
    fundamentals: StockFundamentals
    options: OptionsSummary
    insider: dict
    promoter: dict
    news: List[NewsItem]
    sentiment: dict
    sector: dict
    earnings_radar: Optional[dict] = None
    verdict: StockVerdict
    peers: List[PeerItem]
    financials: Optional[List[FinancialQuarter]] = None

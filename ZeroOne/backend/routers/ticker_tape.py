from fastapi import APIRouter
from typing import List

router = APIRouter(prefix="/api/ticker-tape", tags=["ticker-tape"])

@router.get("")
async def get_ticker_tape():
    # Return array of symbol, price, change_pct for top stocks
    return [
        {"symbol": "NIFTY 50", "price": "22,514.65", "change_pct": 0.45},
        {"symbol": "SENSEX", "price": "74,227.63", "change_pct": 0.51},
        {"symbol": "BANKNIFTY", "price": "48,159.00", "change_pct": -0.12},
        {"symbol": "RELIANCE", "price": "2,934.50", "change_pct": 1.20},
        {"symbol": "HDFCBANK", "price": "1,532.10", "change_pct": -0.40},
        {"symbol": "INFY", "price": "1,489.20", "change_pct": 0.80},
        {"symbol": "TCS", "price": "3,980.15", "change_pct": 1.15},
        {"symbol": "BHARTIARTL", "price": "1,215.60", "change_pct": 0.95},
        {"symbol": "ITC", "price": "435.20", "change_pct": 0.81},
        {"symbol": "SBI", "price": "825.40", "change_pct": -0.75},
        {"symbol": "ICICIBANK", "price": "1,110.20", "change_pct": -0.96},
        {"symbol": "AXISBANK", "price": "1,154.00", "change_pct": -0.50},
        {"symbol": "LT", "price": "3,480.00", "change_pct": -0.43},
        {"symbol": "SUNPHARMA", "price": "1,540.20", "change_pct": 0.50},
        {"symbol": "TATASTEEL", "price": "165.40", "change_pct": 1.80},
        {"symbol": "MARUTI", "price": "12,450.00", "change_pct": 2.10},
        {"symbol": "WIPRO", "price": "452.10", "change_pct": 0.35},
        {"symbol": "NTPC", "price": "362.40", "change_pct": -0.20},
        {"symbol": "POWERGRID", "price": "285.60", "change_pct": 0.15},
        {"symbol": "ONGC", "price": "280.40", "change_pct": 0.65}
    ]

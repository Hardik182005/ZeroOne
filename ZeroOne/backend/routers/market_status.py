from fastapi import APIRouter
from datetime import datetime

router = APIRouter(prefix="/api/market-status", tags=["market-status"])

@router.get("")
async def get_market_status():
    # Return mock session info
    now = datetime.now()
    # Market hours 9:15 AM to 3:30 PM (9 to 15 hours)
    is_weekday = now.weekday() < 5
    is_hours = 9 <= now.hour < 16 or (now.hour == 15 and now.minute <= 30)
    is_open = is_weekday and is_hours
    
    return {
        "is_open": is_open,
        "next_open": datetime(now.year, now.month, now.day, 9, 15).isoformat(),
        "session": "Regular Trading" if is_open else "Post-Market"
    }

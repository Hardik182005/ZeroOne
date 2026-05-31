from fastapi import APIRouter
from services.marketpulse_svc import (
    fetch_narratives,
    get_sentiment_history,
    store_snapshot,
    get_snapshots_for_playback,
)

router = APIRouter(prefix="/api/marketpulse", tags=["marketpulse"])


@router.get("")
async def get_market_pulse():
    narratives_data = await fetch_narratives()
    sentiment_history = await get_sentiment_history()
    return {
        **narratives_data,
        "sentiment_history": sentiment_history,
    }


@router.get("/snapshots")
async def get_playback_snapshots():
    snapshots = await get_snapshots_for_playback()
    return {"snapshots": snapshots, "total": len(snapshots)}


@router.post("/snapshot")
async def trigger_snapshot():
    await store_snapshot()
    return {"status": "ok", "message": "Snapshot stored"}

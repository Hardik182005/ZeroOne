from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
from services.elevenlabs_svc import generate_voice
import io

router = APIRouter(prefix="/api/briefing", tags=["briefing"])

class BriefingRequest(BaseModel):
    tickers: List[str]

@router.post("")
async def get_briefing(req: BriefingRequest):
    if not req.tickers:
        raise HTTPException(status_code=400, detail="List of tickers cannot be empty")

    try:
        # Generate AI briefing script with Claude
        from services.claude import get_claude_morning_briefing
        script = await get_claude_morning_briefing(req.tickers, {})

        # Convert to audio with ElevenLabs
        audio_bytes = await generate_voice(script, voice_type="briefing")
        return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/mpeg")
    except Exception as e:
        print(f"[BRIEFING ROUTER ERROR] Morning brief generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

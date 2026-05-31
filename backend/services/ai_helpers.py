from services.groq_svc import (
    get_groq_verdict as get_ai_verdict,
    get_groq_comparison as get_ai_comparison,
    build_prompt as build_ai_prompt,
)
from services.gemini import get_mock_verdict_fallback


async def get_ai_morning_briefing(tickers: list, stock_data: dict) -> str:
    """Generate morning briefing script via Groq."""
    from services.groq_svc import get_groq_chat_response
    tickers_str = ", ".join(tickers) if tickers else "the market"
    prompt = (
        f"Generate a 250-word morning market briefing audio script for these NSE stocks: {tickers_str}. "
        f"Open with: 'Good morning. Here's your ZeroOne market briefing.' "
        f"Cover key movers, sentiment, risk flags. "
        f"End with: 'The market speaks. We translate. Have a great trading day.' "
        f"Plain English, continuous prose, no bullet points."
    )
    try:
        return await get_groq_chat_response(prompt)
    except Exception:
        return (
            f"Good morning. Here's your ZeroOne market briefing. "
            f"Today we are tracking {tickers_str}. Markets open with mixed signals as global cues remain cautious. "
            f"Keep a close eye on options data and FII flows for direction. "
            f"The market speaks. We translate. Have a great trading day."
        )

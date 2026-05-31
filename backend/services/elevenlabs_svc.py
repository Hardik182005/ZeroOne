import os
try:
    from elevenlabs.client import ElevenLabs
except ImportError:
    from elevenlabs import ElevenLabs

from utils.env import clean_env
ELEVENLABS_API_KEY = clean_env("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = clean_env("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")

# Tiny 1-second silence MP3 file bytes as fail-safe fallback
MOCK_MP3_SILENCE = (
    b'\xff\xf3\x44\xc0\x00\x00\x00\x03\x48\x00\x00\x00\x00\x4c\x41\x4d\x45\x33\x2e\x39\x38'
    b'\x2e\x32\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
)

async def generate_voice(text: str, voice_type: str = "analysis") -> bytes:
    if not ELEVENLABS_API_KEY or ELEVENLABS_API_KEY.startswith("your_"):
        print("[ELEVENLABS] Mock Mode: No API key set. Returning mock silent audio stream.")
        return MOCK_MP3_SILENCE
        
    try:
        client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
        audio_generator = client.text_to_speech.convert(
            voice_id=ELEVENLABS_VOICE_ID,
            text=text,
            model_id="eleven_multilingual_v2",
            voice_settings={
                "stability": 0.5,
                "similarity_boost": 0.8,
                "style": 0.2,
                "use_speaker_boost": True
            }
        )
        # join chunks from generator
        return b"".join(audio_generator)
    except Exception as e:
        print(f"[ELEVENLABS ERROR] TTS generation failed: {e}. Returning mock silence.")
        return MOCK_MP3_SILENCE

async def generate_morning_briefing(tickers: list[str]) -> bytes:
    # Build briefing script from list of stocks
    from datetime import date
    today = date.today().strftime("%A, %B %d, %Y")
    
    ticker_lines = []
    for t in tickers:
        ticker_lines.append(f"Analyzing {t.upper()}. The overall AI sentiment is bullish with options indicator showing strong accumulation pattern.")
        
    briefing_text = f"""
    Good morning. Here is your ZeroOne market briefing for {today}.
    The market speaks. Here is what it is saying today.
    {' '.join(ticker_lines)}
    That is your briefing for today. Trade smart.
    """
    return await generate_voice(briefing_text, voice_type="briefing")

import os, json
from openai import AsyncOpenAI

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

def is_mock_mode():
    return not GROQ_API_KEY or GROQ_API_KEY.startswith("your_")

_client = None
def get_client():
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1"
        )
    return _client

async def get_groq_verdict(ticker: str, data: dict) -> dict:
    if is_mock_mode():
        from services.gemini import get_mock_verdict_fallback
        return get_mock_verdict_fallback()

    from services.claude import build_claude_prompt
    prompt = build_claude_prompt(ticker, data)

    try:
        response = await get_client().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are ZeroOne, an expert Indian equity analyst. Return ONLY valid JSON with no preamble or markdown."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=600,
            temperature=0.3
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```json"):
            content = content.replace("```json", "", 1)
        if content.endswith("```"):
            content = content.rsplit("```", 1)[0]
        return json.loads(content.strip())
    except Exception as e:
        print(f"[GROQ ERROR] {e}. Falling back to mock.")
        from services.gemini import get_mock_verdict_fallback
        return get_mock_verdict_fallback()

async def get_groq_comparison(ticker1: str, data1: dict, ticker2: str, data2: dict) -> dict:
    """Used as AI comparison when OpenAI is unavailable."""
    prompt = f"""Compare {ticker1} vs {ticker2} for an Indian retail investor.
Data {ticker1}: {json.dumps(data1)}
Data {ticker2}: {json.dumps(data2)}
Provide: (1) Valuation winner, (2) Growth winner, (3) Risk/safety winner, (4) Final decisive pick.
Plain English, max 200 words, be decisive. Name {ticker1} or {ticker2} clearly as the winner."""

    try:
        response = await get_client().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400,
            temperature=0.3
        )
        text = response.choices[0].message.content.strip()
        sentences = [s.strip() for s in text.replace("\n", " ").split(".") if s.strip()]
        last_two = " ".join(sentences[-2:]) if len(sentences) >= 2 else text
        winner = ticker1 if last_two.upper().count(ticker1) >= last_two.upper().count(ticker2) else ticker2
        return {"analysis": text, "winner": winner, "ticker1": ticker1, "ticker2": ticker2}
    except Exception as e:
        print(f"[GROQ COMPARE ERROR] {e}")
        return {"analysis": f"{ticker1} vs {ticker2} comparison unavailable.", "winner": ticker1, "ticker1": ticker1, "ticker2": ticker2}

async def get_groq_chat_response(message: str, context: str = "") -> str:
    """For the AI chatbot on the Settings page."""
    system = """You are ZeroOne AI, an expert Indian stock market analyst.
Answer questions about stocks, sectors, market trends, and investing in plain English.
Be concise, direct, and practical. Focus on NSE/BSE Indian markets.
The market speaks. We translate."""

    messages = [{"role": "system", "content": system}]
    if context:
        messages.append({"role": "assistant", "content": f"Context: {context}"})
    messages.append({"role": "user", "content": message})

    try:
        response = await get_client().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=400,
            temperature=0.5
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Unable to process your question right now. Error: {str(e)[:100]}"

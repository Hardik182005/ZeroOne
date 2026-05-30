import os
import json

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

def is_mock_mode():
    return not OPENAI_API_KEY or OPENAI_API_KEY.startswith("your_")

async def compare_stocks(ticker1: str, data1: dict, ticker2: str, data2: dict) -> dict:
    if is_mock_mode():
        return {
            "winner_valuation": ticker1,
            "winner_growth": ticker1,
            "winner_momentum": ticker2,
            "winner_risk": ticker2,
            "overall_winner": ticker1,
            "comparison_summary": f"{ticker1} offers better valuation while {ticker2} shows stronger momentum. Overall {ticker1} is the preferred pick for long-term investors.",
            f"{ticker1}_strengths": ["Strong fundamentals", "Low debt ratio", "Consistent dividends"],
            f"{ticker2}_strengths": ["High growth momentum", "Strong brand presence", "Expanding margins"]
        }

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": f"""Compare {ticker1} vs {ticker2} for an Indian retail investor.
Return ONLY valid raw JSON with exactly these keys:
{{
  "winner_valuation": "ticker symbol",
  "winner_growth": "ticker symbol",
  "winner_momentum": "ticker symbol",
  "winner_risk": "ticker symbol",
  "overall_winner": "ticker symbol",
  "comparison_summary": "3 sentences max",
  "{ticker1}_strengths": ["strength 1", "strength 2", "strength 3"],
  "{ticker2}_strengths": ["strength 1", "strength 2", "strength 3"]
}}

{ticker1} data: {json.dumps(data1, default=str)}
{ticker2} data: {json.dumps(data2, default=str)}

Zero preamble. Zero markdown. Raw JSON only."""
            }],
            max_tokens=600,
            temperature=0.2
        )
        text = response.choices[0].message.content
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"[OPENAI] Failed: {e}")
        return {
            "winner_valuation": ticker1,
            "winner_growth": ticker1,
            "winner_momentum": ticker2,
            "winner_risk": ticker2,
            "overall_winner": ticker1,
            "comparison_summary": f"Analysis for {ticker1} vs {ticker2} temporarily unavailable.",
            f"{ticker1}_strengths": ["Data pending"],
            f"{ticker2}_strengths": ["Data pending"]
        }

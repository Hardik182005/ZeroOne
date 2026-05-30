# ZeroOne
**The market speaks. We translate.**

India's AI-powered equity intelligence terminal. Built for the Anakin Wire Buildathon 2026.

## AI Stack
- **Primary AI**: Claude claude-sonnet-4-6 (Anthropic) — verdict, comparison, briefing
- **Fallback AI**: Gemini 1.5 Flash (Google) — PDF reports + Claude fallback
- **Voice**: ElevenLabs — TTS narration
- **Data**: Anakin Wire API (7 connectors: NSE, BSE, Screener, ET, Moneycontrol, StockTwits, Trends)
- **Cache**: Redis (5-min TTL on stock data)

## Setup

```bash
# 1. Backend
cd backend
cp .env.example .env
# Fill in ANTHROPIC_API_KEY, ANAKIN_API_KEY, ELEVENLABS_API_KEY, GEMINI_API_KEY

pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080 --reload

# 2. Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

## Docker
```bash
docker-compose up
```

## API Endpoints
- `POST /api/stock/{ticker}` — Full stock analysis
- `GET /api/sectors` — Sector rotation heatmap
- `POST /api/compare` — Compare two stocks (Claude AI)
- `POST /api/voice/{ticker}` — ElevenLabs voice narration
- `GET /api/pdf/{ticker}` — PDF research report
- `POST /api/briefing` — Morning AI briefing audio
- `GET /api/tickers/search?q=REL` — Ticker autocomplete
- `GET /api/ticker-tape` — Live ticker data
- `GET /api/market-status` — NSE market open/closed status
- `GET /api/health` — Health check

## Environment Variables
All keys in `backend/.env.example`. Claude + Anakin are the only required keys for full functionality. Everything else falls back to mock data gracefully.

## Deploy to Google Cloud Run
```bash
cd backend
gcloud run deploy zeroonone-backend \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars ANTHROPIC_API_KEY=xxx,ANAKIN_API_KEY=xxx,GEMINI_API_KEY=xxx,ELEVENLABS_API_KEY=xxx,REDIS_URL=redis://...
```

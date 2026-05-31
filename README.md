<div align="center">

# ⚡ ZeroOne
### India's AI-Powered Equity Intelligence Terminal

**The market speaks. We translate.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Open%20App-6434ed?style=for-the-badge&logo=google-cloud&logoColor=white)](https://zeroone-in.web.app)
[![Cloud Run](https://img.shields.io/badge/Deployed%20on-Cloud%20Run%20Mumbai-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://zeroone-3692981377.asia-south1.run.app)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![Made in India](https://img.shields.io/badge/Made%20in-India%20%F0%9F%87%AE%F0%9F%87%B3-FF9933?style=for-the-badge)](https://github.com/Hardik182005/ZeroOne)

</div>

---

## What is ZeroOne?

ZeroOne is a real-time stock intelligence terminal for Indian retail investors. It fuses live NSE/BSE data from 8 simultaneous Anakin Wire sources with institutional-grade AI to deliver a single, decisive verdict in plain English.

Built for the **Anakin Wire Buildathon 2026**.

**Live:** https://zeroone-in.web.app  (also served from Cloud Run: https://zeroone-3692981377.asia-south1.run.app)

---

## Features

| Feature | Description |
|---|---|
| AI Verdict | Groq Llama 3.3 reads 16 data points, gives BULLISH / CAUTIOUS / AVOID in plain English |
| MarketPulse | Narrative tracker — detects story shifts across ET, Moneycontrol, StockTwits before price moves |
| Options Pulse | Live PCR, Max Pain, IV percentile, OI strikes |
| Promoter Intel | Holding %, pledging %, insider trades, bulk deals |
| Sector Rotation | FII/DII net flow heatmap with clickable tiles |
| Stock Compare | Head-to-head on real fundamentals — winners per category (Valuation, ROE, Scale/M-Cap, Risk) computed from live numbers, decisive overall verdict |
| Voice Narration | ElevenLabs TTS reads your analysis aloud |
| PDF Reports | Gemini Flash generates full equity research PDFs |
| AI Assistant | Page-aware chat (knows the stock you're viewing) with two-way voice — speaks replies + mic input; available as a full page and a floating orb on every screen |
| Real-Time Ticker | Live SSE stream pushes index + mover prices every ~12s (polling fallback) |
| Smart Caching | Redis (30 min) + localStorage (30 min) = Anakin credits preserved |

---

## Tech Stack

```
Frontend    React 18 + Vite + TailwindCSS + Recharts
Backend     FastAPI + Python 3.11 + asyncio
AI Models   Groq Llama 3.3 (verdicts) + GPT-4o-mini (chat) + Gemini Flash (PDF) + GPT-4o (compare)
Voice       ElevenLabs eleven_multilingual_v2
Data        Anakin Wire — 8 connectors, parallel asyncio.gather
Cache       Redis + browser localStorage
Deploy      Google Cloud Run, asia-south1 (Mumbai)
```

---

## API Endpoints

```
GET  /api/health
POST /api/stock/{ticker}         Full analysis (cached 30 min)
GET  /api/sectors                Sector rotation + FII/DII
GET  /api/ticker-tape            Live ticker bar
GET  /api/ticker-tape/stream     Live SSE ticker stream (real-time)
GET  /api/ticker-tape/movers     Gainers + losers
POST /api/compare                Real-data stock comparison
POST /api/voice/{ticker}         ElevenLabs voice narration
POST /api/voice/speak            ElevenLabs TTS for chat replies
GET  /api/pdf/{ticker}           PDF report download
POST /api/briefing               Morning audio briefing
GET  /api/marketpulse            Narratives + sentiment chart
GET  /api/marketpulse/snapshots  48h playback snapshots
POST /api/chat                   GPT-4o-mini AI assistant
GET  /api/market-status          NSE open/closed/pre-open
GET  /api/tickers/search?q=      Ticker autocomplete
```

---

## Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in API keys
uvicorn main:app --reload --port 8080

# Frontend
cd frontend
npm install
npm run dev            # http://localhost:5173 (proxies /api to :8080)
```

---

## Deploy

Single command from project root:

```bash
gcloud run deploy zeroone \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --min-instances 1 \
  --no-cpu-throttling \
  --timeout 3600
```

`--no-cpu-throttling` keeps CPU allocated so background Anakin scrapes finish; `--min-instances 1` keeps the SSE live-ticker stream warm.

The root `Dockerfile` is multi-stage: Node 20 builds the frontend, Python 3.11 serves both via FastAPI StaticFiles.

---

## Caching

| Layer | Storage | TTL |
|---|---|---|
| Backend | Redis | 30 min |
| Frontend | localStorage | 30 min |

Stock data is cached both server-side and client-side. Repeated analyses of the same ticker cost zero Anakin credits within the window.

---

## Wire Connectors

| Connector | Data |
|---|---|
| NSE India | Quotes, options, bulk deals, insider trades, FII/DII, gainers/losers |
| BSE India | Corporate actions, shareholding |
| Screener.in | Fundamentals, peers |
| Economic Times | News, sentiment |
| Moneycontrol | Analyst consensus, MF holdings |
| Fear & Greed Index | Market sentiment score |
| Google Trends | Search interest |
| StockTwits | Social sentiment, trending symbols |

---

## Built By

**Hardik Hinduja** — Anakin Wire Buildathon 2026

> The market speaks. We translate.

---

<div align="center">

[![Anakin Wire](https://img.shields.io/badge/Powered%20by-Anakin%20Wire-6434ed?style=flat-square)](https://anakin.ai)
[![Groq](https://img.shields.io/badge/AI-Groq%20Llama%203.3-F55036?style=flat-square)](https://groq.com)
[![OpenAI](https://img.shields.io/badge/AI-GPT--4o--mini-412991?style=flat-square)](https://openai.com)
[![Gemini](https://img.shields.io/badge/AI-Gemini%20Flash-4285F4?style=flat-square)](https://ai.google.dev)
[![ElevenLabs](https://img.shields.io/badge/Voice-ElevenLabs-000000?style=flat-square)](https://elevenlabs.io)

</div>

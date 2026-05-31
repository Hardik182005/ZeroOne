import os
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup must NEVER hang — uvicorn only begins serving HTTP after this
    # completes. Guard Redis init with a hard timeout so a slow/unreachable
    # Redis can't wedge the whole service (was causing Cloud Run 504s).
    from services.cache import init_redis, close_redis
    try:
        await asyncio.wait_for(init_redis(), timeout=3.0)
    except Exception as e:
        print(f"[STARTUP] Redis init skipped ({e}). Running without cache layer.")
    yield
    try:
        await close_redis()
    except Exception:
        pass

app = FastAPI(
    title="ZeroOne API",
    version="1.0.0",
    description="The market speaks. We translate.",
    lifespan=lifespan
)

from utils.env import clean_env
_default_origins = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,https://zeroone-in.web.app,https://zeroonone.web.app,https://zeroonone.firebaseapp.com"
# clean_env strips a BOM that would otherwise corrupt the first origin; also
# strip each entry so no origin carries stray whitespace.
origins = [o.strip() for o in clean_env("CORS_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import stock, sectors, compare, voice, pdf, briefing, search, ticker_tape, market_status, chat
from routers import marketpulse

app.include_router(stock.router)
app.include_router(sectors.router)
app.include_router(compare.router)
app.include_router(voice.router)
app.include_router(pdf.router)
app.include_router(briefing.router)
app.include_router(search.router)
app.include_router(ticker_tape.router)
app.include_router(market_status.router)
app.include_router(chat.router)
app.include_router(marketpulse.router)

@app.get("/api/health", tags=["health"])
async def health_check():
    return {"status": "ok", "app": "ZeroOne", "tagline": "The market speaks. We translate."}

# Serve React frontend — must be LAST so API routes take priority
import os
from fastapi.staticfiles import StaticFiles

_static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(_static_dir):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="frontend")

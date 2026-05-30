import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    from services.cache import init_redis, close_redis
    await init_redis()
    yield
    await close_redis()

app = FastAPI(
    title="ZeroOne API",
    version="1.0.0",
    description="The market speaks. We translate.",
    lifespan=lifespan
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,https://zeroonone.web.app,https://zeroonone.firebaseapp.com").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import stock, sectors, compare, voice, pdf, briefing, search, ticker_tape, market_status, chat

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

@app.get("/api/health", tags=["health"])
async def health_check():
    return {"status": "ok", "app": "ZeroOne", "tagline": "The market speaks. We translate."}

import os
import json
import redis.asyncio as redis

REDIS_URL = os.getenv("REDIS_URL", "")
_redis_client = None


async def init_redis():
    """Initialize Redis connection. Gracefully no-ops if no REDIS_URL is set
    (e.g. on Cloud Run without a Redis instance)."""
    global _redis_client
    if not REDIS_URL or REDIS_URL.startswith("your_"):
        print("[CACHE] No REDIS_URL set. Running without cache layer.")
        _redis_client = None
        return
    try:
        _redis_client = redis.from_url(
            REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=2.0,
            socket_connect_timeout=2.0,
        )
        # Verify connectivity; if it fails, disable cache rather than crash
        await _redis_client.ping()
        print("[CACHE] Redis connected.")
    except Exception as e:
        print(f"[CACHE] Redis unavailable ({e}). Running without cache layer.")
        _redis_client = None


async def close_redis():
    global _redis_client
    if _redis_client is not None:
        try:
            await _redis_client.aclose()
        except Exception:
            pass
        _redis_client = None


async def get_cached(key: str):
    if _redis_client is None:
        return None
    try:
        data = await _redis_client.get(key)
        return json.loads(data) if data else None
    except Exception as e:
        print(f"[CACHE] Redis GET error: {e}")
        return None


async def set_cached(key: str, data: dict, ttl: int = 300):
    if _redis_client is None:
        return
    try:
        await _redis_client.setex(key, ttl, json.dumps(data, default=str))
    except Exception as e:
        print(f"[CACHE] Redis SET error: {e}")


async def delete_cached(key: str):
    if _redis_client is None:
        return
    try:
        await _redis_client.delete(key)
    except Exception as e:
        print(f"[CACHE] Redis DELETE error: {e}")


async def zadd_sorted(key: str, score: float, value: str):
    if _redis_client is None:
        return
    try:
        await _redis_client.zadd(key, {value: score})
    except Exception as e:
        print(f"[CACHE] Redis ZADD error: {e}")


async def zrange_sorted(key: str, start: int = 0, end: int = -1, withscores: bool = False):
    if _redis_client is None:
        return []
    try:
        return await _redis_client.zrange(key, start, end, withscores=withscores)
    except Exception:
        return []


async def zremrangebyrank_sorted(key: str, start: int, stop: int):
    if _redis_client is None:
        return
    try:
        await _redis_client.zremrangebyrank(key, start, stop)
    except Exception:
        pass

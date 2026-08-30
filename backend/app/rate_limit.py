import time
from collections import defaultdict
from threading import Lock
from fastapi import HTTPException, Request

_lock = Lock()
_hits = defaultdict(list)


def rate_limit(key: str, limit: int, window_sec: int = 60):
    now = time.time()
    with _lock:
        bucket = [t for t in _hits[key] if now - t < window_sec]
        if len(bucket) >= limit:
            raise HTTPException(status_code=429, detail="Too many requests. Slow down.")
        bucket.append(now)
        _hits[key] = bucket


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for") or ""
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

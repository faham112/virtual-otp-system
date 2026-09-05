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


def limit_login(request: Request):
    ip = client_ip(request)
    rate_limit(f"login:{ip}", limit=10, window_sec=900)


def limit_register(request: Request):
    ip = client_ip(request)
    rate_limit(f"register:{ip}", limit=5, window_sec=3600)


def limit_deposit(request: Request, user_id: int):
    ip = client_ip(request)
    rate_limit(f"deposit:ip:{ip}", limit=8, window_sec=3600)
    rate_limit(f"deposit:user:{user_id}", limit=5, window_sec=3600)


def limit_buy(request: Request, user_id: int):
    rate_limit(f"buy:user:{user_id}", limit=20, window_sec=60)

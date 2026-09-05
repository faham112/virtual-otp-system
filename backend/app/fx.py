import time
from typing import Dict, Any
import httpx

_cache: Dict[str, Any] = {"rate": 280.0, "at": 0.0, "source": "fallback"}


def _fetch_rate_sync() -> Dict[str, Any]:
    """Server-side only FX. Never trust client-sent rates."""
    now = time.time()
    if now - float(_cache.get("at") or 0) < 300 and _cache.get("rate"):
        return {"ok": True, "rate": float(_cache["rate"]), "source": _cache.get("source", "cache"), "cached": True}
    rate = None
    source = "fallback"
    urls = [
        "https://api.frankfurter.dev/v1/latest?base=USD&symbols=PKR",
        "https://open.er-api.com/v6/latest/USD",
    ]
    with httpx.Client(timeout=8.0) as client:
        for url in urls:
            try:
                res = client.get(url)
                data = res.json()
                if "rates" in data and data["rates"].get("PKR"):
                    rate = float(data["rates"]["PKR"])
                    source = url.split("/")[2]
                    break
            except Exception:
                continue
    if not rate or rate < 50 or rate > 1000:
        rate = float(_cache.get("rate") or 280.0)
        source = "fallback"
    _cache.update({"rate": round(rate, 4), "at": now, "source": source})
    return {"ok": True, "rate": _cache["rate"], "source": source, "cached": False}


async def pkr_per_usd() -> Dict[str, Any]:
    now = time.time()
    if now - float(_cache.get("at") or 0) < 300 and _cache.get("rate"):
        return {"ok": True, **_cache, "cached": True, "quote": "PKR per 1 USDT"}
    rate = None
    source = "fallback"
    urls = [
        "https://api.frankfurter.dev/v1/latest?base=USD&symbols=PKR",
        "https://open.er-api.com/v6/latest/USD",
    ]
    async with httpx.AsyncClient(timeout=8.0) as client:
        for url in urls:
            try:
                res = await client.get(url)
                data = res.json()
                if "rates" in data and data["rates"].get("PKR"):
                    rate = float(data["rates"]["PKR"])
                    source = url.split("/")[2]
                    break
            except Exception:
                continue
    if not rate or rate < 50 or rate > 1000:
        rate = float(_cache.get("rate") or 280.0)
        source = "fallback"
    _cache.update({"rate": round(rate, 4), "at": now, "source": source})
    return {"ok": True, "rate": _cache["rate"], "source": source, "cached": False, "quote": "PKR per 1 USDT"}


def usd_from_pkr(pkr: float, rate: float) -> float:
    if rate <= 0:
        return 0.0
    return round(float(pkr) / float(rate), 4)


def server_usd_from_pkr(pkr: float) -> Dict[str, Any]:
    """Convert PKR using server FX only. Client rates are ignored."""
    fx = _fetch_rate_sync()
    rate = float(fx["rate"])
    usd = usd_from_pkr(pkr, rate)
    return {"rate": rate, "usd": usd, "source": fx.get("source", "server")}

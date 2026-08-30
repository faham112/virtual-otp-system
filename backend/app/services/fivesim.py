import httpx
from typing import Dict, Any, Optional
import os
from dotenv import load_dotenv

load_dotenv()

# Known plain-text error bodies 5sim returns with HTTP 200
FIVESIM_TEXT_ERRORS = {
    "no free phones": "No free phones available for this country/service right now. Try another country or wait a few minutes.",
    "not enough user balance": "5sim provider wallet has insufficient balance. Top up the 5sim account.",
    "not enough rating": "5sim account rating is too low. Wait or contact 5sim support.",
    "select country": "Invalid country selected.",
    "select operator": "Invalid operator selected.",
    "bad country": "Invalid country code for 5sim.",
    "bad operator": "Invalid operator for 5sim.",
    "no product": "This service/product is not available on 5sim.",
    "server offline": "5sim server is temporarily offline. Try again later.",
}


def _safe_json(response: httpx.Response) -> Dict[str, Any]:
    text = (response.text or "").strip()
    if not text:
        raise Exception(
            f"5sim returned empty body (HTTP {response.status_code}). Check API key."
        )

    # 5sim often returns plain-text errors with HTTP 200
    lower = text.lower()
    for key, friendly in FIVESIM_TEXT_ERRORS.items():
        if key in lower:
            raise Exception(friendly)

    try:
        return response.json()
    except Exception:
        snippet = text[:200].replace("\n", " ")
        # If it looks like a known short error, surface it cleanly
        if len(text) < 80 and text.isascii():
            raise Exception(f"5sim: {text}")
        raise Exception(
            f"5sim non-JSON response (HTTP {response.status_code}): {snippet}"
        )


class FiveSimService:
    BASE_URL = "https://5sim.net/v1"

    def __init__(self, api_key: Optional[str] = None):
        key = (api_key or os.getenv("FIVESIM_API_KEY") or "").strip()
        if not key or key in ("your_5sim_api_key_here", "CHANGE_ME"):
            raise ValueError(
                "5sim API key not configured. Set it in Admin Panel → Settings or .env FIVESIM_API_KEY"
            )
        self.api_key = key
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
        }
        self.guest_headers = {"Accept": "application/json"}

    async def get_balance(self) -> float:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/user/profile", headers=self.headers
            )
            if response.status_code != 200:
                raise Exception(
                    f"5sim profile error ({response.status_code}): {response.text[:200]}"
                )
            data = _safe_json(response)
            return float(data.get("balance", 0))

    async def get_prices(
        self,
        country: Optional[str] = None,
        product: Optional[str] = None,
    ) -> Dict[str, Any]:
        params = {}
        if country and country != "any":
            params["country"] = country
        if product:
            params["product"] = product
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/guest/prices",
                headers=self.guest_headers,
                params=params or None,
            )
            if response.status_code != 200:
                raise Exception(
                    f"5sim prices error ({response.status_code}): {response.text[:200]}"
                )
            return _safe_json(response)

    def parse_best_price(
        self,
        data: Dict[str, Any],
        country: str,
        product: str,
    ) -> Dict[str, Any]:
        best_cost = None
        best_stock = 0
        best_rate = 0.0
        best_operator = None
        total_stock = 0

        def scan_operators(ops: dict):
            nonlocal best_cost, best_stock, best_rate, best_operator, total_stock
            if not isinstance(ops, dict):
                return
            for op_name, info in ops.items():
                if not isinstance(info, dict):
                    continue
                cost = float(info.get("cost") or 0)
                count = int(info.get("count") or 0)
                rate = float(info.get("rate") or 0)
                total_stock += count
                if count <= 0 or cost <= 0:
                    continue
                if best_cost is None or cost < best_cost:
                    best_cost = cost
                    best_stock = count
                    best_rate = rate
                    best_operator = op_name

        if country and country != "any" and product:
            block = data.get(country) or data
            if isinstance(block, dict):
                ops = block.get(product) or block
                if isinstance(ops, dict) and any(
                    isinstance(v, dict) and ("cost" in v or "count" in v)
                    for v in ops.values()
                ):
                    scan_operators(ops)
                else:
                    for ckey, cval in block.items():
                        if isinstance(cval, dict) and product in cval:
                            scan_operators(cval[product])
                        elif ckey == product and isinstance(cval, dict):
                            scan_operators(cval)
        elif product and (not country or country == "any"):
            root = data.get(product) or data
            if isinstance(root, dict):
                for ckey, cval in root.items():
                    if isinstance(cval, dict):
                        if any(
                            isinstance(v, dict) and "cost" in v for v in cval.values()
                        ):
                            scan_operators(cval)
                        else:
                            for pkey, pval in cval.items():
                                if pkey == product:
                                    scan_operators(
                                        pval if isinstance(pval, dict) else {}
                                    )
                                elif isinstance(pval, dict) and "cost" in next(
                                    iter(pval.values()), {}
                                ):
                                    scan_operators(pval)
        else:
            for v1 in data.values() if isinstance(data, dict) else []:
                if not isinstance(v1, dict):
                    continue
                for v2 in v1.values():
                    if isinstance(v2, dict) and any(
                        isinstance(x, dict) and "cost" in x for x in v2.values()
                    ):
                        scan_operators(v2)

        if best_cost is None or total_stock <= 0:
            return {
                "available": False,
                "provider_cost": 0.0,
                "stock": 0,
                "total_stock": int(total_stock),
                "rate": 0.0,
                "operator": None,
            }

        return {
            "available": True,
            "provider_cost": float(best_cost),
            "stock": int(best_stock),
            "total_stock": int(total_stock),
            "rate": float(best_rate),
            "operator": best_operator,
        }

    async def buy_number(
        self, country: str, operator: str, product: str
    ) -> Dict[str, Any]:
        country = (country or "any").lower().strip()
        operator = (operator or "any").lower().strip()
        product = (product or "").lower().strip()
        if not product:
            raise Exception("Product/service is required")
        url = f"{self.BASE_URL}/user/buy/activation/{country}/{operator}/{product}"
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.get(url, headers=self.headers)
            text = (response.text or "").strip()
            if response.status_code != 200:
                lower = text.lower()
                for key, friendly in FIVESIM_TEXT_ERRORS.items():
                    if key in lower:
                        raise Exception(friendly)
                body = text[:300]
                raise Exception(f"5sim Error ({response.status_code}): {body}")
            data = _safe_json(response)
            if not data.get("id"):
                raise Exception(
                    f"5sim buy failed: missing order id. Response: {str(data)[:200]}"
                )
            return data

    async def check_order(self, order_id: str) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/user/check/{order_id}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=self.headers)
            if response.status_code != 200:
                raise Exception(
                    f"5sim check error ({response.status_code}): {response.text[:200]}"
                )
            return _safe_json(response)

    async def cancel_order(self, order_id: str) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/user/cancel/{order_id}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=self.headers)
            if not (response.text or "").strip():
                return {"status": "cancelled"}
            try:
                return response.json()
            except Exception:
                return {"status": "cancelled"}

    async def finish_order(self, order_id: str) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/user/finish/{order_id}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=self.headers)
            if not (response.text or "").strip():
                return {"status": "finished"}
            try:
                return response.json()
            except Exception:
                return {"status": "finished"}

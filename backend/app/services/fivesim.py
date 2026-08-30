import httpx
from typing import Dict, Any, Optional
import os
from dotenv import load_dotenv

load_dotenv()

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
    lower = text.lower()
    for key, friendly in FIVESIM_TEXT_ERRORS.items():
        if key in lower:
            raise Exception(friendly)
    try:
        return response.json()
    except Exception:
        snippet = text[:200].replace("\n", " ")
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
        listed_cost = None
        live_cost = None
        live_stock = 0
        live_rate = 0.0
        live_operator = None
        total_stock = 0

        def is_op_info(val: Any) -> bool:
            return isinstance(val, dict) and ("cost" in val or "count" in val)

        def consider(op_name: str, info: Any) -> None:
            nonlocal listed_cost, live_cost, live_stock, live_rate, live_operator, total_stock
            if not is_op_info(info):
                return
            cost = float(info.get("cost") or 0)
            count = int(info.get("count") or 0)
            rate = float(info.get("rate") or 0)
            if cost > 0 and (listed_cost is None or cost < listed_cost):
                listed_cost = cost
            if str(op_name).lower() == "any":
                return
            total_stock += max(count, 0)
            if count > 0 and cost > 0:
                if live_cost is None or cost < live_cost:
                    live_cost = cost
                    live_stock = count
                    live_rate = rate
                    live_operator = op_name

        def scan_operators(ops: Any) -> None:
            if not isinstance(ops, dict):
                return
            for op_name, info in ops.items():
                consider(str(op_name), info)

        def scan_product_block(block: Any) -> None:
            if not isinstance(block, dict):
                return
            if product and product in block and isinstance(block.get(product), dict):
                inner = block[product]
                if any(is_op_info(v) for v in inner.values()):
                    scan_operators(inner)
                    return
            if any(is_op_info(v) for v in block.values()):
                scan_operators(block)
                return
            for val in block.values():
                if isinstance(val, dict) and product and product in val:
                    scan_operators(val.get(product))

        def match_key(mapping: Dict[str, Any], needle: str):
            if needle in mapping:
                return mapping.get(needle)
            needle_l = needle.lower()
            for key, val in mapping.items():
                if str(key).lower() == needle_l:
                    return val
            return None

        country = (country or "").lower().strip()
        product = (product or "").lower().strip()
        payload = data if isinstance(data, dict) else {}

        if country and country != "any":
            block = match_key(payload, country)
            if block is None and product:
                product_map = match_key(payload, product)
                if isinstance(product_map, dict):
                    block = match_key(product_map, country)
            scan_product_block(block if block is not None else {})
        else:
            product_map = match_key(payload, product) if product else None
            if isinstance(product_map, dict) and not any(is_op_info(v) for v in product_map.values()):
                for cval in product_map.values():
                    scan_product_block(cval)
            else:
                for cval in payload.values():
                    scan_product_block(cval)

        provider_cost = float(live_cost if live_cost is not None else (listed_cost or 0.0))
        available = live_cost is not None and total_stock > 0
        return {
            "available": available,
            "provider_cost": provider_cost,
            "stock": int(live_stock),
            "total_stock": int(total_stock),
            "rate": float(live_rate),
            "operator": live_operator,
        }

    def _country_operators(self, data: Dict[str, Any], country: str, product: str) -> list:
        country = (country or "").lower().strip()
        product = (product or "").lower().strip()
        payload = data if isinstance(data, dict) else {}
        block = payload.get(country)
        if block is None and product in payload and isinstance(payload.get(product), dict):
            block = payload[product].get(country)
        if not isinstance(block, dict):
            return []
        ops = block.get(product) if product in block and isinstance(block.get(product), dict) else block
        out = []
        if not isinstance(ops, dict):
            return out
        for name, info in ops.items():
            if not isinstance(info, dict):
                continue
            if "cost" not in info and "count" not in info:
                continue
            if str(name).lower() == "any":
                continue
            cost = float(info.get("cost") or 0)
            count = int(info.get("count") or 0)
            if count <= 0 or cost <= 0:
                continue
            out.append({"name": str(name), "cost": cost, "count": count})
        out.sort(key=lambda x: (x["cost"], -x["count"]))
        return out

    def _cheapest_country(self, data: Dict[str, Any], product: str) -> str:
        product = (product or "").lower().strip()
        payload = data if isinstance(data, dict) else {}
        best_country = None
        best_cost = None
        if product in payload and isinstance(payload.get(product), dict):
            for ckey, cval in payload[product].items():
                ops = cval.get(product, cval) if isinstance(cval, dict) else {}
                if not isinstance(ops, dict):
                    continue
                for op_name, info in ops.items():
                    if not isinstance(info, dict) or str(op_name).lower() == "any":
                        continue
                    cost = float(info.get("cost") or 0)
                    count = int(info.get("count") or 0)
                    if count > 0 and cost > 0 and (best_cost is None or cost < best_cost):
                        best_cost = cost
                        best_country = str(ckey).lower()
            return best_country or "any"
        for ckey, cval in payload.items():
            if not isinstance(cval, dict):
                continue
            ops = cval.get(product) if product in cval else None
            if not isinstance(ops, dict):
                continue
            for op_name, info in ops.items():
                if not isinstance(info, dict) or str(op_name).lower() == "any":
                    continue
                cost = float(info.get("cost") or 0)
                count = int(info.get("count") or 0)
                if count > 0 and cost > 0 and (best_cost is None or cost < best_cost):
                    best_cost = cost
                    best_country = str(ckey).lower()
        return best_country or "any"

    async def buy_best(self, country: str, product: str) -> Dict[str, Any]:
        country = (country or "any").lower().strip()
        product = (product or "").lower().strip()
        raw = await self.get_prices(
            country=None if country == "any" else country,
            product=product,
        )
        target = country
        if target == "any":
            target = self._cheapest_country(raw, product)
        operators = self._country_operators(raw, target, product)
        names = []
        parsed = self.parse_best_price(raw, target, product)
        if parsed.get("operator") and str(parsed.get("operator")).lower() != "any":
            names.append(str(parsed["operator"]))
        for item in operators:
            if item["name"] not in names:
                names.append(item["name"])
        names.append("any")
        last_err = None
        for op in names:
            try:
                result = await self.buy_number(target, op, product)
                result["_resolved_country"] = target
                result["_resolved_operator"] = op
                return result
            except Exception as e:
                last_err = e
                msg = str(e).lower()
                if "no free phones" in msg or "out of stock" in msg or "unavailable" in msg:
                    continue
                raise
        raise last_err or Exception("No free phones available for this country/service right now.")

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

    async def request_next_sms(self, order_id: str):
        return {"status": "waiting"}

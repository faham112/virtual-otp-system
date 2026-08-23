import httpx
from typing import Dict, Any, Optional, List
import os
from dotenv import load_dotenv

load_dotenv()

class FiveSimService:
    BASE_URL = "https://5sim.net/v1"

    def __init__(self):
        self.api_key = os.getenv("FIVESIM_API_KEY")
        if not self.api_key or self.api_key == "your_5sim_api_key_here":
            raise ValueError("FIVESIM_API_KEY is not set or is still the example value in .env")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json"
        }
        self.guest_headers = {"Accept": "application/json"}

    async def get_balance(self) -> float:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{self.BASE_URL}/user/profile", headers=self.headers)
            response.raise_for_status()
            data = response.json()
            return float(data.get("balance", 0))

    async def get_prices(
        self,
        country: Optional[str] = None,
        product: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Live prices + stock from 5sim guest API.
        GET /v1/guest/prices?country=&product=
        """
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
                raise Exception(f"5sim prices error ({response.status_code}): {response.text}")
            return response.json()

    def parse_best_price(
        self,
        data: Dict[str, Any],
        country: str,
        product: str,
    ) -> Dict[str, Any]:
        """
        From 5sim prices JSON, find cheapest operator with stock > 0.
        Returns: provider_cost, stock, rate, operator, available
        """
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

        # Shapes:
        # 1) { country: { product: { operator: {cost,count,rate} } } }
        # 2) { product: { country: { operator: ... } } }
        # 3) { country: { product: ... } } when both filters set

        if country and country != "any" and product:
            # try country -> product -> operators
            block = data.get(country) or data
            if isinstance(block, dict):
                ops = block.get(product) or block
                if isinstance(ops, dict) and any(
                    isinstance(v, dict) and ("cost" in v or "count" in v) for v in ops.values()
                ):
                    scan_operators(ops)
                else:
                    # nested country/product
                    for ckey, cval in block.items():
                        if isinstance(cval, dict) and product in cval:
                            scan_operators(cval[product])
                        elif ckey == product and isinstance(cval, dict):
                            scan_operators(cval)
        elif product and (not country or country == "any"):
            # product filter: { product: { country: { op: ... } } } or mixed
            root = data.get(product) or data
            if isinstance(root, dict):
                for ckey, cval in root.items():
                    if isinstance(cval, dict):
                        # country -> operators OR product nested
                        if any(isinstance(v, dict) and "cost" in v for v in cval.values()):
                            scan_operators(cval)
                        else:
                            for pkey, pval in cval.items():
                                if pkey == product or product in (pkey,):
                                    scan_operators(pval if isinstance(pval, dict) else {})
                                elif isinstance(pval, dict) and "cost" in next(iter(pval.values()), {}):
                                    scan_operators(pval)
        else:
            # generic walk
            for v1 in data.values() if isinstance(data, dict) else []:
                if not isinstance(v1, dict):
                    continue
                for v2 in v1.values():
                    if isinstance(v2, dict) and any(
                        isinstance(x, dict) and "cost" in x for x in v2.values()
                    ):
                        scan_operators(v2)

        if best_cost is None:
            return {
                "available": False,
                "provider_cost": 0.0,
                "stock": 0,
                "total_stock": total_stock,
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

    async def buy_number(self, country: str, operator: str, product: str) -> Dict[str, Any]:
        """
        Buy activation number for the EXACT country requested.
        country: e.g. england, russia, usa, any
        operator: any (recommended)
        product: facebook, whatsapp, telegram, etc.
        """
        url = f"{self.BASE_URL}/user/buy/activation/{country}/{operator}/{product}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=self.headers)
            if response.status_code != 200:
                raise Exception(f"5sim Error ({response.status_code}): {response.text}")
            return response.json()

    async def check_order(self, order_id: str) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/user/check/{order_id}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def cancel_order(self, order_id: str) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/user/cancel/{order_id}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=self.headers)
            return response.json()

    async def finish_order(self, order_id: str) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/user/finish/{order_id}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=self.headers)
            return response.json()

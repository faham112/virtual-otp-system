import httpx
from typing import Dict, Any, Optional, List

SERVICE_CODES = {
    "facebook": "fb",
    "whatsapp": "wa",
    "telegram": "tg",
    "google": "go",
    "instagram": "ig",
    "twitter": "tw",
    "tiktok": "lf",
    "discord": "ds",
    "microsoft": "mm",
    "amazon": "am",
}

COUNTRY_IDS = {
    "russia": 0, "ukraine": 1, "kazakhstan": 2, "china": 3, "philippines": 4,
    "myanmar": 5, "indonesia": 6, "malaysia": 7, "kenya": 8, "tanzania": 9,
    "vietnam": 10, "kyrgyzstan": 11, "usa": 12, "israel": 13, "hongkong": 14,
    "poland": 15, "england": 16, "uk": 16, "madagascar": 17, "congo": 18,
    "nigeria": 19, "macau": 20, "egypt": 21, "india": 22, "ireland": 23,
    "cambodia": 24, "laos": 25, "haiti": 26, "ivory": 27, "gambia": 28,
    "serbia": 29, "yemen": 30, "southafrica": 31, "romania": 32, "colombia": 33,
    "estonia": 34, "azerbaijan": 35, "canada": 36, "morocco": 37, "ghana": 38,
    "argentina": 39, "uzbekistan": 40, "cameroon": 41, "chad": 42, "germany": 43,
    "lithuania": 44, "croatia": 45, "sweden": 46, "iraq": 47, "netherlands": 48,
    "latvia": 49, "austria": 50, "belarus": 51, "thailand": 52, "saudiarabia": 53,
    "mexico": 54, "taiwan": 55, "spain": 56, "iran": 57, "algeria": 58,
    "slovenia": 59, "bangladesh": 60, "senegal": 61, "turkey": 62, "czech": 63,
    "srilanka": 64, "peru": 65, "pakistan": 66, "newzealand": 67, "guinea": 68,
    "mali": 69, "venezuela": 70, "ethiopia": 71, "mongolia": 72, "brazil": 73,
    "afghanistan": 74, "uganda": 75, "angola": 76, "cyprus": 77, "france": 78,
    "papua": 79, "mozambique": 80, "nepal": 81, "belgium": 82, "bulgaria": 83,
    "hungary": 84, "moldova": 85, "italy": 86, "paraguay": 87, "honduras": 88,
    "tunisia": 89, "nicaragua": 90, "timorleste": 91, "bolivia": 92, "costarica": 93,
    "guatemala": 94, "uae": 95, "zimbabwe": 96, "puertorico": 97, "sudan": 98,
    "togo": 99, "kuwait": 100, "elsalvador": 101, "libya": 102, "jamaica": 103,
    "trinidad": 104, "ecuador": 105, "swaziland": 106, "oman": 107, "bosnia": 108,
    "dominican": 109, "qatar": 111, "panama": 112, "cuba": 113, "mauritania": 114,
    "sierraleone": 115, "jordan": 116, "portugal": 117, "barbados": 118, "burundi": 119,
    "benin": 120, "brunei": 121, "bahamas": 122, "botswana": 123, "belize": 124,
    "caf": 125, "dominica": 126, "grenada": 127, "georgia": 128, "greece": 129,
    "guineabissau": 130, "guyana": 131, "iceland": 132, "comoros": 133, "saintkitts": 134,
    "liberia": 135, "lesotho": 136, "malawi": 137, "namibia": 138, "niger": 139,
    "rwanda": 140, "slovakia": 141, "suriname": 142, "tajikistan": 143, "monaco": 144,
    "bahrain": 145, "reunion": 146, "zambia": 147, "armenia": 148, "somalia": 149,
    "chile": 151, "lebanon": 153, "gabon": 154, "albania": 155, "uruguay": 156,
    "mauritius": 157, "maldives": 159, "finland": 163, "denmark": 172,
    "switzerland": 173, "norway": 174, "australia": 175, "japan": 182,
    "southkorea": 190,
}

ID_TO_SLUG = {v: k for k, v in COUNTRY_IDS.items() if k not in ("uk",)}
ID_TO_SLUG[16] = "england"
ID_TO_SLUG[12] = "usa"


class HeroSMSService:
    BASE = "https://hero-sms.com/stubs/handler_api.php"
    prefix = "hero:"
    name = "herosms"

    def __init__(self, api_key: Optional[str] = None):
        key = (api_key or "").strip()
        if not key or key in ("CHANGE_ME", "your_herosms_api_key_here"):
            raise ValueError("HeroSMS API key not configured. Admin → Provider API Keys → HeroSMS.")
        self.api_key = key

    async def _get(self, params: Dict[str, Any]) -> str:
        q = {"api_key": self.api_key, **params}
        async with httpx.AsyncClient(timeout=40.0) as client:
            res = await client.get(self.BASE, params=q)
            text = (res.text or "").strip()
            if res.status_code != 200:
                raise Exception(f"HeroSMS HTTP {res.status_code}: {text[:200]}")
            return text

    async def get_balance(self) -> float:
        text = await self._get({"action": "getBalance"})
        if text.startswith("ACCESS_BALANCE"):
            try:
                return float(text.split(":")[1])
            except Exception:
                return 0.0
        raise Exception(f"HeroSMS balance: {text[:160]}")

    def _svc(self, product: str) -> str:
        return SERVICE_CODES.get((product or "").lower(), product)

    def _cid(self, country: str) -> Optional[int]:
        if not country or country == "any":
            return None
        return COUNTRY_IDS.get(country.lower())

    async def get_prices(self, country: Optional[str] = None, product: Optional[str] = None) -> Dict[str, Any]:
        params: Dict[str, Any] = {"action": "getPrices", "currency": "usd"}
        if product:
            params["service"] = self._svc(product)
        cid = self._cid(country or "")
        if cid is not None:
            params["country"] = cid
        text = await self._get(params)
        try:
            import json
            return json.loads(text)
        except Exception:
            raise Exception(f"HeroSMS prices: {text[:200]}")

    def parse_best_price(self, data: Dict[str, Any], country: str, product: str) -> Dict[str, Any]:
        code = self._svc(product)
        listed = None
        live = None
        stock = 0
        total = 0
        best_slug = None

        def consider(slug: str, info: Any):
            nonlocal listed, live, stock, total, best_slug
            if not isinstance(info, dict):
                return
            block = info.get(code) if code in info else info
            if not isinstance(block, dict):
                return
            cost = float(block.get("cost") or 0)
            count = int(block.get("count") or 0)
            if cost > 0 and (listed is None or cost < listed):
                listed = cost
            if count > 0 and cost > 0:
                total += count
                if live is None or cost < live:
                    live = cost
                    stock = count
                    best_slug = slug

        payload = data if isinstance(data, dict) else {}
        target = (country or "").lower()
        if target and target != "any":
            cid = self._cid(target)
            if cid is not None and str(cid) in payload:
                consider(target, payload[str(cid)])
            elif cid is not None and cid in payload:
                consider(target, payload[cid])
        else:
            for key, val in payload.items():
                try:
                    slug = ID_TO_SLUG.get(int(key), str(key))
                except Exception:
                    slug = str(key)
                consider(slug, val)

        cost = float(live if live is not None else (listed or 0))
        return {
            "available": live is not None and total > 0,
            "provider_cost": cost,
            "stock": int(stock),
            "total_stock": int(total),
            "rate": 1.0 if live is not None else 0.0,
            "operator": "any",
            "country": best_slug or country,
        }

    async def buy_best(self, country: str, product: str, quality: str = "cheaper", **kwargs) -> Dict[str, Any]:
        raw = await self.get_prices(country=None if country == "any" else country, product=product)
        parsed = self.parse_best_price(raw, country, product)
        if not parsed.get("available"):
            raise Exception("No free phones available for this country/service right now.")
        target = country
        if target == "any":
            target = parsed.get("country") or "any"
        cid = self._cid(target)
        params: Dict[str, Any] = {
            "action": "getNumber",
            "service": self._svc(product),
            "operator": "any",
        }
        if cid is not None:
            params["country"] = cid
        cost = float(parsed.get("provider_cost") or 0)
        q = (quality or "cheaper").lower().strip()
        if cost > 0 and q == "cheaper":
            params["maxPrice"] = round(cost * 1.2, 4)
        elif cost > 0 and q == "balanced":
            params["maxPrice"] = round(max(cost * 3.0, cost + 0.25), 4)
        text = await self._get(params)
        if "WRONG_MAX_PRICE" in text or "MAX_PRICE" in text:
            params.pop("maxPrice", None)
            text = await self._get(params)
        if text.startswith("NO_NUMBERS") or "NO_NUMBER" in text:
            raise Exception("No free phones available for this country/service right now.")
        if text.startswith("NO_BALANCE"):
            raise Exception("HeroSMS wallet has insufficient balance. Top up the HeroSMS account.")
        if not text.startswith("ACCESS_NUMBER"):
            raise Exception(f"HeroSMS buy: {text[:200]}")
        parts = text.split(":")
        order_id = parts[1] if len(parts) > 1 else ""
        phone = parts[2] if len(parts) > 2 else ""
        if not order_id:
            raise Exception("HeroSMS buy failed: missing order id")
        return {
            "id": order_id,
            "phone": phone if str(phone).startswith("+") else f"+{phone}",
            "price": float(parsed.get("provider_cost") or 0),
            "_resolved_country": target,
            "_resolved_operator": q,
        }

    async def check_order(self, order_id: str) -> Dict[str, Any]:
        oid = str(order_id).replace("hero:", "")
        text = await self._get({"action": "getStatus", "id": oid})
        if text.startswith("STATUS_OK"):
            code = text.split(":", 1)[1] if ":" in text else ""
            return {"status": "RECEIVED", "sms": [{"code": code, "text": code}]}
        if text.startswith("STATUS_WAIT_RETRY"):
            code = text.split(":", 1)[1] if ":" in text else ""
            return {"status": "RECEIVED", "sms": [{"code": code, "text": code}]}
        if text.startswith("STATUS_CANCEL") or text.startswith("STATUS_CANCELED"):
            return {"status": "CANCELED", "sms": []}
        return {"status": "PENDING", "sms": []}

    async def cancel_order(self, order_id: str) -> Dict[str, Any]:
        oid = str(order_id).replace("hero:", "")
        try:
            await self._get({"action": "setStatus", "id": oid, "status": 8})
        except Exception:
            pass
        return {"status": "cancelled"}

    async def finish_order(self, order_id: str) -> Dict[str, Any]:
        oid = str(order_id).replace("hero:", "")
        try:
            await self._get({"action": "setStatus", "id": oid, "status": 6})
        except Exception:
            pass
        return {"status": "finished"}

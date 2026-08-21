import httpx
from typing import Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

class FiveSimService:
    BASE_URL = "https://5sim.net/v1"

    def __init__(self):
        self.api_key = os.getenv("FIVESIM_API_KEY")
        if not self.api_key:
            raise ValueError("FIVESIM_API_KEY is not set in environment variables")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json"
        }

    async def get_balance(self) -> float:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{self.BASE_URL}/user/profile", headers=self.headers)
            response.raise_for_status()
            data = response.json()
            return float(data.get("balance", 0))

    async def buy_number(self, country: str, operator: str, product: str) -> Dict[str, Any]:
        """
        Buy activation number
        country: e.g. england, russia, usa, any
        operator: any (recommended)
        product: facebook, whatsapp, telegram, etc.
        """
        url = f"{self.BASE_URL}/user/buy/activation/{country}/{operator}/{product}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=self.headers)
            if response.status_code != 200:
                raise Exception(f"5sim Error: {response.text}")
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

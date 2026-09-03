from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.models import Setting
from app.schemas import ALLOWED_SERVICES, ALLOWED_COUNTRIES, PriceQuote, CountryStock
from app.auth import get_current_user
from app.models import User
from app.services.providers import make_active_provider
from app.pricing import get_markup_usd, sell_price

router = APIRouter()


@router.get("/price", response_model=PriceQuote)
async def get_price_quote(
    service: str = Query(..., description="Service e.g. whatsapp"),
    country: str = Query("any", description="Country e.g. usa or any"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = service.lower().strip()
    country = country.lower().strip()

    if service not in ALLOWED_SERVICES:
        raise HTTPException(status_code=400, detail=f"Invalid service: {service}")
    if country not in ALLOWED_COUNTRIES:
        raise HTTPException(status_code=400, detail=f"Invalid country: {country}")

    markup = get_markup_usd(db)

    try:
        fivesim = make_active_provider(db)
        raw = await fivesim.get_prices(
            country=None if country == "any" else country,
            product=service,
        )
        parsed = fivesim.parse_best_price(raw, country, service)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch prices: {str(e)}")

    provider_cost = float(parsed.get("provider_cost") or 0)
    user_price = sell_price(provider_cost, markup)

    return PriceQuote(
        service=service,
        country=country,
        available=bool(parsed.get("available")),
        provider_cost=provider_cost,
        user_price=user_price,
        markup_percent=markup,
        stock=int(parsed.get("stock") or 0),
        total_stock=int(parsed.get("total_stock") or 0),
        rate=float(parsed.get("rate") or 0),
        operator=parsed.get("operator"),
    )


@router.get("/stock", response_model=List[CountryStock])
async def get_country_stock(
    service: str = Query(..., description="Service e.g. telegram"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = service.lower().strip()
    if service not in ALLOWED_SERVICES:
        raise HTTPException(status_code=400, detail=f"Invalid service: {service}")

    markup = get_markup_usd(db)
    countries = [c for c in ALLOWED_COUNTRIES if c != "any"]
    results: List[CountryStock] = []

    try:
        fivesim = make_active_provider(db)
        raw = await fivesim.get_prices(product=service)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch stock: {str(e)}")

    for c in countries:
        parsed = fivesim.parse_best_price(raw, c, service)
        provider_cost = float(parsed.get("provider_cost") or 0)
        user_price = sell_price(provider_cost, markup)
        results.append(
            CountryStock(
                country=c,
                available=bool(parsed.get("available")),
                stock=int(parsed.get("total_stock") or parsed.get("stock") or 0),
                provider_cost=provider_cost,
                user_price=user_price,
            )
        )

    results.sort(key=lambda x: (
        x.user_price if x.user_price > 0 else 9999.0,
        0 if x.available else 1,
        x.country,
    ))
    return results

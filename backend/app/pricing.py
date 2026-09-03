from typing import Optional
from sqlalchemy.orm import Session
from app.models import Setting

DEFAULT_MARKUP_USD = 0.035


def get_markup_usd(db: Session) -> float:
    row = db.query(Setting).filter(Setting.key == "markup_usd").first()
    if row and row.value is not None:
        try:
            val = float(row.value)
            if val >= 0:
                return round(val, 4)
        except (ValueError, TypeError):
            pass
    return DEFAULT_MARKUP_USD


def sell_price(provider_cost: float, markup_usd: Optional[float] = None, db: Optional[Session] = None) -> float:
    cost = float(provider_cost or 0)
    if cost <= 0:
        return 0.0
    extra = markup_usd if markup_usd is not None else (get_markup_usd(db) if db is not None else DEFAULT_MARKUP_USD)
    return round(cost + float(extra or 0), 4)

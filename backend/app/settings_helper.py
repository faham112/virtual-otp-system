from sqlalchemy.orm import Session
from app.models import Setting
import os

def get_setting(db: Session, key: str, default: str = "") -> str:
    row = db.query(Setting).filter(Setting.key == key).first()
    if row and row.value is not None:
        return str(row.value)
    return default

def set_setting(db: Session, key: str, value: str) -> None:
    row = db.query(Setting).filter(Setting.key == key).first()
    if row:
        row.value = value
    else:
        db.add(Setting(key=key, value=value))
    db.commit()

def get_fivesim_api_key(db: Session) -> str:
    key = get_setting(db, "fivesim_api_key", "").strip()
    if key and key not in ("your_5sim_api_key_here", "CHANGE_ME"):
        return key
    return (os.getenv("FIVESIM_API_KEY") or "").strip()

def make_fivesim(db: Session):
    from app.services.fivesim import FiveSimService
    key = get_fivesim_api_key(db)
    return FiveSimService(api_key=key if key else None)

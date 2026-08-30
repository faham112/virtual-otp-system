from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.settings_helper import get_setting
from app.pricing import pkr_rate

router = APIRouter()


@router.get("/config")
def public_config(db: Session = Depends(get_db)):
    return {
        "site_name": get_setting(db, "site_name", "Virtual OTP") or "Virtual OTP",
        "support_whatsapp": get_setting(db, "admin_whatsapp", ""),
        "usd_to_pkr": pkr_rate(db),
    }

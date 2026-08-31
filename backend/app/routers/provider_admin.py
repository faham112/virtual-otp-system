from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.auth import get_current_admin
from app.settings_helper import get_setting, set_setting, get_fivesim_api_key
from app.services.providers import (
    get_active_provider_name,
    make_fivesim_svc,
    make_herosms_svc,
)

router = APIRouter()


@router.get("/providers")
async def list_providers(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    active = get_active_provider_name(db)
    items = []
    five_err = None
    five_bal = None
    try:
        five_bal = await make_fivesim_svc(db).get_balance()
    except Exception as e:
        five_err = str(e)
    items.append({
        "id": "fivesim",
        "label": "5sim (current wallet)",
        "active": active == "fivesim",
        "has_key": bool(get_fivesim_api_key(db)),
        "balance": five_bal,
        "error": five_err,
    })
    hero_err = None
    hero_bal = None
    try:
        hero_bal = await make_herosms_svc(db).get_balance()
    except Exception as e:
        hero_err = str(e)
    items.append({
        "id": "herosms",
        "label": "HeroSMS (higher Facebook success)",
        "active": active == "herosms",
        "has_key": bool(get_setting(db, "herosms_api_key", "").strip()),
        "balance": hero_bal,
        "error": hero_err,
    })
    return {"active": active, "providers": items}


@router.post("/providers/activate")
def activate_provider(data: dict, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    name = str((data or {}).get("id") or "").strip().lower()
    if name in ("hero", "hero-sms"):
        name = "herosms"
    if name not in ("fivesim", "herosms"):
        raise HTTPException(status_code=400, detail="id must be fivesim or herosms")
    set_setting(db, "active_provider", name)
    return {"message": f"Active API set to {name}", "active": name}


@router.post("/providers/herosms-key")
def save_hero_key(data: dict, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    key = str((data or {}).get("api_key") or "").strip()
    if not key:
        raise HTTPException(status_code=400, detail="api_key required")
    set_setting(db, "herosms_api_key", key)
    return {"message": "HeroSMS API key saved"}

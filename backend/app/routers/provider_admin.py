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


PROVIDER_KEY_MAP = {
    "fivesim": "fivesim_api_key",
    "herosms": "herosms_api_key",
    "smsman": "smsman_api_key",
    "grizzly": "grizzly_api_key",
    "smspool": "smspool_api_key",
    "textverified": "textverified_api_key",
}


def _mask(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    if len(raw) <= 6:
        return "••••" + raw[-2:]
    return "••••••••" + raw[-4:]


@router.get("/providers/keys")
def list_provider_keys(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    keys = {}
    for pid, setting_key in PROVIDER_KEY_MAP.items():
        val = get_setting(db, setting_key, "").strip()
        if pid == "fivesim" and not val:
            val = get_fivesim_api_key(db)
        keys[pid] = _mask(val)
    return {"keys": keys}


@router.post("/providers/keys")
def save_provider_key(data: dict, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    pid = str((data or {}).get("provider") or "").strip().lower()
    key = str((data or {}).get("api_key") or "").strip()
    setting_key = PROVIDER_KEY_MAP.get(pid)
    if not setting_key:
        raise HTTPException(status_code=400, detail="Unknown provider")
    if not key or key.startswith("••••"):
        raise HTTPException(status_code=400, detail="api_key required")
    set_setting(db, setting_key, key)
    return {"message": f"{pid} API key saved", "provider": pid}


@router.post("/providers/herosms-key")
def save_hero_key(data: dict, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    key = str((data or {}).get("api_key") or "").strip()
    if not key:
        raise HTTPException(status_code=400, detail="api_key required")
    set_setting(db, "herosms_api_key", key)
    return {"message": "HeroSMS API key saved"}


@router.post("/adjust-balance")
def adjust_balance(data: dict, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    from app.models import Transaction
    user_id = int((data or {}).get("user_id") or 0)
    amount = float((data or {}).get("amount") or 0)
    desc = str((data or {}).get("description") or "Admin adjustment").strip() or "Admin adjustment"
    if user_id <= 0:
        raise HTTPException(status_code=400, detail="user_id required")
    if amount == 0 or abs(amount) > 100000:
        raise HTTPException(status_code=400, detail="Invalid amount")
    user = db.query(User).filter(User.id == user_id).with_for_update().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_bal = round(user.balance + amount, 4)
    if new_bal < 0:
        raise HTTPException(status_code=400, detail="Balance cannot go below 0")
    user.balance = new_bal
    db.add(Transaction(
        user_id=user.id,
        amount=amount,
        type="credit" if amount > 0 else "debit",
        description=f"{desc} ({admin.username})",
    ))
    db.commit()
    return {"message": f"Balance updated for {user.username}", "new_balance": user.balance}


@router.post("/orders/{order_id}/refund")
async def admin_refund_order(order_id: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    from app.models import Order
    from app.routers.orders import refund_order
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending orders can be refunded")
    user = db.query(User).filter(User.id == order.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await refund_order(order, user, db, reason="admin-refund")
    return {"message": f"Order #{order.id} refunded"}

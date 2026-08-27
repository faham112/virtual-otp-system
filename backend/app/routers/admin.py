from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User, Order, Transaction, Setting
from app.schemas import UserOut, AddBalance, MarkupUpdate, AdminOrderOut, ToggleUser
from app.auth import get_current_admin
from app.services.fivesim import FiveSimService
from app.settings_helper import make_fivesim, set_setting

router = APIRouter()

@router.get("/users", response_model=List[UserOut])
def list_users(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return db.query(User).order_by(User.created_at.desc()).all()

@router.post("/add-balance")
def add_balance(
    data: AddBalance,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == data.user_id).with_for_update().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.balance = round(user.balance + data.amount, 4)

    txn = Transaction(
        user_id=user.id,
        amount=data.amount,
        type="credit",
        description=data.description or f"Balance added by admin ({admin.username})"
    )
    db.add(txn)
    db.commit()

    return {
        "message": f"Added ${data.amount:.4f} to {user.username}",
        "new_balance": user.balance
    }

@router.post("/toggle-user")
def toggle_user(
    data: ToggleUser,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    if data.user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = data.is_active
    db.commit()
    status = "activated" if data.is_active else "deactivated"
    return {"message": f"User {user.username} {status}", "is_active": user.is_active}

@router.post("/set-markup")
def set_markup(
    data: MarkupUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    setting = db.query(Setting).filter(Setting.key == "markup_percent").first()
    if setting:
        setting.value = str(data.markup_percent)
    else:
        setting = Setting(key="markup_percent", value=str(data.markup_percent))
        db.add(setting)
    db.commit()
    return {"message": f"Markup set to {data.markup_percent}%", "markup_percent": data.markup_percent}

@router.get("/orders", response_model=List[AdminOrderOut])
def all_orders(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    rows = (
        db.query(Order, User.username)
        .outerjoin(User, Order.user_id == User.id)
        .order_by(Order.created_at.desc())
        .limit(200)
        .all()
    )
    out = []
    for order, username in rows:
        out.append(
            AdminOrderOut(
                id=order.id,
                user_id=order.user_id,
                username=username,
                phone_number=order.phone_number,
                service=order.service,
                country=order.country,
                cost=order.cost,
                provider_cost=order.provider_cost or 0.0,
                status=order.status,
                otp_code=order.otp_code,
                sms_text=order.sms_text,
                created_at=order.created_at,
                expires_at=order.expires_at,
            )
        )
    return out

@router.get("/settings")
def get_settings(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    settings = db.query(Setting).all()
    return {s.key: s.value for s in settings}

@router.get("/fivesim-balance")
async def fivesim_balance(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    try:
        fivesim = make_fivesim(db)
        bal = await fivesim.get_balance()
        return {"balance": bal}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/settings")
def update_settings(
    data: dict,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    allowed = {
        "fivesim_api_key", "markup_percent", "admin_whatsapp",
        "bank_local_1_name", "bank_local_1_details",
        "bank_local_2_name", "bank_local_2_details",
        "bank_national_1_name", "bank_national_1_details",
        "bank_national_2_name", "bank_national_2_details",
    }
    updated = []
    for key, value in data.items():
        if key in allowed and value is not None:
            set_setting(db, key, str(value).strip())
            updated.append(key)
    return {"message": "Settings updated", "updated": updated}


@router.get("/deposits")
def list_deposits(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    from app.models import DepositRequest
    rows = (
        db.query(DepositRequest, User.username)
        .outerjoin(User, DepositRequest.user_id == User.id)
        .order_by(DepositRequest.created_at.desc())
        .limit(100)
        .all()
    )
    out = []
    for d, username in rows:
        out.append({
            "id": d.id,
            "user_id": d.user_id,
            "username": username,
            "amount": d.amount,
            "bank_key": d.bank_key,
            "bank_name": d.bank_name,
            "slip_note": d.slip_note,
            "slip_image": d.slip_image,
            "status": d.status,
            "admin_note": d.admin_note,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "processed_at": d.processed_at.isoformat() if d.processed_at else None,
        })
    return out


@router.post("/deposits/{deposit_id}/approve")
def approve_deposit(
    deposit_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    from app.models import DepositRequest
    from datetime import datetime
    d = db.query(DepositRequest).filter(DepositRequest.id == deposit_id).with_for_update().first()
    if not d:
        raise HTTPException(status_code=404, detail="Deposit not found")
    if d.status != "pending":
        raise HTTPException(status_code=400, detail=f"Already {d.status}")
    user = db.query(User).filter(User.id == d.user_id).with_for_update().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.balance = round(user.balance + d.amount, 4)
    d.status = "approved"
    d.processed_at = datetime.utcnow()
    d.admin_note = f"Approved by {admin.username}"
    txn = Transaction(
        user_id=user.id,
        amount=d.amount,
        type="credit",
        description=f"Deposit approved #{d.id} via {d.bank_name}",
    )
    db.add(txn)
    db.commit()
    return {"message": f"Approved ${d.amount:.2f} for {user.username}", "new_balance": user.balance}


@router.post("/deposits/{deposit_id}/reject")
def reject_deposit(
    deposit_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    from app.models import DepositRequest
    from datetime import datetime
    d = db.query(DepositRequest).filter(DepositRequest.id == deposit_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Deposit not found")
    if d.status != "pending":
        raise HTTPException(status_code=400, detail=f"Already {d.status}")
    d.status = "rejected"
    d.processed_at = datetime.utcnow()
    d.admin_note = f"Rejected by {admin.username}"
    db.commit()
    return {"message": "Deposit rejected"}

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User, Order, Transaction, Setting
from app.schemas import UserOut, AddBalance, MarkupUpdate, OrderOut
from app.auth import get_current_admin

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
    return {"message": f"Markup set to {data.markup_percent}%"}

@router.get("/orders", response_model=List[OrderOut])
def all_orders(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return db.query(Order).order_by(Order.created_at.desc()).limit(200).all()

@router.get("/settings")
def get_settings(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    settings = db.query(Setting).all()
    return {s.key: s.value for s in settings}

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Transaction
from app.schemas import UserOut, TransactionOut
from app.auth import get_current_user
from typing import List

router = APIRouter()

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "balance": current_user.balance,
        "is_admin": current_user.is_admin,
        "is_active": current_user.is_active,
        "has_recovery_code": bool(getattr(current_user, "recovery_code_hash", None)),
    }

@router.get("/transactions", response_model=List[TransactionOut])
def get_my_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Transaction).filter(Transaction.user_id == current_user.id).order_by(Transaction.created_at.desc()).all()

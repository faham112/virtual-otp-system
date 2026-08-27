from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional

from app.database import get_db
from app.models import User, DepositRequest
from app.auth import get_current_user
from app.settings_helper import get_setting

router = APIRouter()

BANK_KEYS = [
    ("bank_local_1", "Local Bank 1"),
    ("bank_local_2", "Local Bank 2"),
    ("bank_national_1", "National Bank 1"),
    ("bank_national_2", "National Bank 2"),
]


class DepositCreate(BaseModel):
    amount: float = Field(..., gt=0, le=100000)
    bank_key: str
    slip_note: Optional[str] = None
    slip_image: Optional[str] = None


@router.get("/banks")
def list_banks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    banks = []
    for key, default_label in BANK_KEYS:
        name = get_setting(db, f"{key}_name", default_label)
        details = get_setting(db, f"{key}_details", "")
        if name or details:
            banks.append({
                "key": key,
                "name": name or default_label,
                "details": details,
                "type": "local" if "local" in key else "national",
            })
    return {"banks": banks}


@router.post("/request")
def create_deposit(
    data: DepositCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """User submits deposit — no WhatsApp auto. Admin reviews in panel."""
    valid_keys = {k for k, _ in BANK_KEYS}
    if data.bank_key not in valid_keys:
        raise HTTPException(status_code=400, detail="Invalid bank selected")

    bank_name = get_setting(db, f"{data.bank_key}_name", data.bank_key)
    slip_image = data.slip_image
    if slip_image and len(slip_image) > 2_000_000:
        raise HTTPException(status_code=400, detail="Slip image too large (max ~1.5MB)")

    dep = DepositRequest(
        user_id=current_user.id,
        amount=round(data.amount, 2),
        bank_key=data.bank_key,
        bank_name=bank_name,
        slip_note=(data.slip_note or "")[:500],
        slip_image=slip_image,
        status="pending",
    )
    db.add(dep)
    db.commit()
    db.refresh(dep)

    return {
        "message": "Deposit request submitted. Admin will review and credit your balance.",
        "deposit_id": dep.id,
        "status": dep.status,
    }


@router.get("/my")
def my_deposits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(DepositRequest)
        .filter(DepositRequest.user_id == current_user.id)
        .order_by(DepositRequest.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": d.id,
            "amount": d.amount,
            "bank_name": d.bank_name,
            "slip_note": d.slip_note,
            "status": d.status,
            "admin_note": d.admin_note,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "processed_at": d.processed_at.isoformat() if d.processed_at else None,
        }
        for d in rows
    ]

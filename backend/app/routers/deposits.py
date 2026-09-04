from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional

from app.database import get_db
from app.models import User, DepositRequest
from app.auth import get_current_user
from app.settings_helper import get_setting
from app.proof import proof_token, proof_path, slip_path, save_slip

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
    wa1 = get_setting(db, "admin_whatsapp", "") or ""
    wa2 = get_setting(db, "admin_whatsapp_2", "") or ""
    whatsapp_numbers = [n.strip() for n in (wa1, wa2) if n and n.strip()]
    return {"banks": banks, "whatsapp_numbers": whatsapp_numbers}


@router.post("/request")
def create_deposit(
    data: DepositCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    valid_keys = {k for k, _ in BANK_KEYS}
    if data.bank_key not in valid_keys:
        raise HTTPException(status_code=400, detail="Invalid bank selected")
    if not data.slip_image:
        raise HTTPException(status_code=400, detail="Upload the payment receipt first")

    bank_name = get_setting(db, f"{data.bank_key}_name", data.bank_key)
    dep = DepositRequest(
        user_id=current_user.id,
        amount=round(data.amount, 2),
        bank_key=data.bank_key,
        bank_name=bank_name,
        slip_note=(data.slip_note or "")[:500],
        slip_image=None,
        status="pending",
    )
    db.add(dep)
    db.commit()
    db.refresh(dep)

    try:
        dep.slip_image = save_slip(dep.id, data.slip_image)
        db.commit()
    except Exception as e:
        db.delete(dep)
        db.commit()
        raise HTTPException(status_code=400, detail=str(e))

    token = proof_token(dep.id)
    url = proof_path(dep.id, token)
    wa1 = get_setting(db, "admin_whatsapp", "") or ""
    wa2 = get_setting(db, "admin_whatsapp_2", "") or ""
    whatsapp_numbers = [n.strip() for n in (wa1, wa2) if n and n.strip()]
    message = (
        f"Assalam o Alaikum Admin,\n\n"
        f"USD deposit request ready hai.\n\n"
        f"User: {current_user.username}\n"
        f"Amount: ${dep.amount:.2f} USD\n"
        f"Bank: {bank_name}\n"
        f"Note: {(data.slip_note or '-')}\n"
        f"Request: #{dep.id}\n\n"
        f"Receipt card (image preview):\n{url}\n\n"
        f"Is link pe receipt attached hai. Verify karke approve kar dein."
    )
    return {
        "message": "Deposit request submitted",
        "deposit_id": dep.id,
        "status": dep.status,
        "amount": dep.amount,
        "bank_name": bank_name,
        "username": current_user.username,
        "proof_url": url,
        "slip_url": slip_path(dep.id, token),
        "whatsapp_message": message,
        "whatsapp_numbers": whatsapp_numbers,
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
    out = []
    for d in rows:
        token = proof_token(d.id)
        out.append({
            "id": d.id,
            "amount": d.amount,
            "bank_name": d.bank_name,
            "slip_note": d.slip_note,
            "status": d.status,
            "admin_note": d.admin_note,
            "proof_url": proof_path(d.id, token),
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "processed_at": d.processed_at.isoformat() if d.processed_at else None,
        })
    return out

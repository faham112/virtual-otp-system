from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User, Order, Setting, DepositRequest
from app.schemas import ALLOWED_COUNTRIES, ALLOWED_SERVICES
from app.proof import proof_token, token_ok, proof_path, slip_path, load_slip
from app.fx import pkr_per_usd

router = APIRouter()


@router.get("/stats")
def public_stats():
    db: Session = SessionLocal()
    try:
        users = db.query(User).count()
        completed = db.query(Order).filter(Order.status == "completed").count()
        pending = db.query(Order).filter(Order.status == "pending").count()
        name = "Virtual OTP"
        row = db.query(Setting).filter(Setting.key == "site_name").first()
        if row and row.value:
            name = row.value
        recent_rows = (
            db.query(Order.service, Order.country, Order.created_at)
            .filter(Order.status == "completed")
            .order_by(Order.created_at.desc())
            .limit(8)
            .all()
        )
        recent = [{"service": s, "country": c, "at": t.isoformat() if t else None} for s, c, t in recent_rows]
        return {
            "ok": True,
            "site": name,
            "users": users,
            "completed_otps": completed,
            "pending_otps": pending,
            "countries": max(len(ALLOWED_COUNTRIES) - 1, 0),
            "services": len(ALLOWED_SERVICES),
            "recent": recent,
            "server_time": datetime.now(timezone.utc).isoformat(),
        }
    except Exception:
        return {
            "ok": False,
            "site": "Virtual OTP",
            "users": 0,
            "completed_otps": 0,
            "pending_otps": 0,
            "countries": max(len(ALLOWED_COUNTRIES) - 1, 0),
            "services": len(ALLOWED_SERVICES),
            "recent": [],
            "server_time": datetime.now(timezone.utc).isoformat(),
        }
    finally:
        db.close()


@router.get("/fx")
async def public_fx():
    return await pkr_per_usd()


def _deposit_payload(deposit_id: int, token: str):
    if not token_ok(deposit_id, token):
        raise HTTPException(status_code=404, detail="Proof not found")
    db: Session = SessionLocal()
    try:
        d = db.query(DepositRequest).filter(DepositRequest.id == deposit_id).first()
        if not d:
            raise HTTPException(status_code=404, detail="Proof not found")
        user = db.query(User).filter(User.id == d.user_id).first()
        has_slip = bool(load_slip(d.slip_image))
        return {
            "id": d.id,
            "username": user.username if user else "user",
            "amount": float(d.amount),
            "bank_name": d.bank_name,
            "slip_note": d.slip_note or "",
            "status": d.status,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "has_slip": has_slip,
            "proof_url": proof_path(d.id, token),
            "slip_url": slip_path(d.id, token) if has_slip else "",
        }
    finally:
        db.close()


@router.get("/proof-data/{deposit_id}/{token}")
def proof_data(deposit_id: int, token: str):
    return _deposit_payload(deposit_id, token)


@router.get("/slip/{deposit_id}/{token}")
def proof_slip(deposit_id: int, token: str):
    if not token_ok(deposit_id, token):
        raise HTTPException(status_code=404, detail="Receipt not found")
    db: Session = SessionLocal()
    try:
        d = db.query(DepositRequest).filter(DepositRequest.id == deposit_id).first()
        packed = load_slip(d.slip_image if d else None)
        if not packed:
            raise HTTPException(status_code=404, detail="Receipt not found")
        data, mime = packed
        return Response(content=data, media_type=mime, headers={"Cache-Control": "public, max-age=3600"})
    finally:
        db.close()


@router.get("/proof/{deposit_id}/{token}", response_class=HTMLResponse)
def proof_html(deposit_id: int, token: str):
    data = _deposit_payload(deposit_id, token)
    img = data["slip_url"]
    title = f"Deposit ${data['amount']:.2f} USDT · {data['username']}"
    desc = f"{data['bank_name']} · {data['status']} · Request #{data['id']}"
    img_tag = f'<img src="{img}" alt="Receipt" style="width:100%;border-radius:16px;border:1px solid #2a2f3d"/>' if img else "<p>No receipt uploaded.</p>"
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>{title}</title><meta property="og:title" content="{title}"/><meta property="og:description" content="{desc}"/>{('<meta property="og:image" content="'+img+'"/>') if img else ''}</head><body style="font-family:sans-serif;background:#0f1117;color:#e5e7eb;padding:24px"><div style="max-width:520px;margin:auto;background:#1a1d27;border:1px solid #2a2f3d;border-radius:20px;padding:20px"><p>{desc}</p><p style="font-size:28px;color:#34d399">${data['amount']:.2f} USDT</p><p>User: {data['username']}</p><p>{data['slip_note']}</p>{img_tag}</div></body></html>"""

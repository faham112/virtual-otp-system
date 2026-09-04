from datetime import datetime, timezone
from fastapi import APIRouter
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User, Order, Setting
from app.schemas import ALLOWED_COUNTRIES, ALLOWED_SERVICES

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
        recent = []
        for service, country, created_at in recent_rows:
            recent.append({
                "service": service,
                "country": country,
                "at": created_at.isoformat() if created_at else None,
            })
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

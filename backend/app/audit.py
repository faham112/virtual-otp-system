from sqlalchemy.orm import Session
from app.models import AuditLog


def log_audit(db: Session, actor: str, action: str, detail: str = ""):
    try:
        db.add(AuditLog(actor=actor or "system", action=action[:80], detail=(detail or "")[:1000]))
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[AUDIT] {e}")

"""
Seed system - runs on startup.
Creates admin user + default settings if they don't exist.
Requires strong ADMIN_PASSWORD from .env (no hardcoded default).
"""
import os
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import User, Setting
from app.auth import get_password_hash
from dotenv import load_dotenv

load_dotenv()


def _password_ok(pw: str) -> bool:
    if not pw or len(pw) < 12:
        return False
    if not any(c.isupper() for c in pw):
        return False
    if not any(c.isdigit() for c in pw):
        return False
    weak = {"admin", "password", "admin123", "admin@secure123!", "changeme"}
    if pw.lower() in weak:
        return False
    return True


def seed_database():
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        markup = db.query(Setting).filter(Setting.key == "markup_percent").first()
        if not markup:
            default_markup = os.getenv("DEFAULT_MARKUP_PERCENT", "50")
            db.add(Setting(key="markup_percent", value=str(default_markup)))
            print(f"[SEED] Created default markup_percent = {default_markup}%")

        markup_usd = db.query(Setting).filter(Setting.key == "markup_usd").first()
        if not markup_usd:
            db.add(Setting(key="markup_usd", value=os.getenv("DEFAULT_MARKUP_USD", "0.035")))

        admin_username = os.getenv("ADMIN_USERNAME", "admin").lower().strip()
        admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com").strip()
        admin_password = os.getenv("ADMIN_PASSWORD") or ""

        existing_admin = db.query(User).filter(
            (User.username == admin_username) | (User.is_admin == True)
        ).first()

        if not existing_admin:
            if not _password_ok(admin_password):
                raise RuntimeError(
                    "ADMIN_PASSWORD must be set in .env (min 12 chars, 1 uppercase, 1 digit). "
                    "No default admin password is allowed."
                )
            admin = User(
                username=admin_username,
                email=admin_email,
                hashed_password=get_password_hash(admin_password),
                balance=0.0,
                is_admin=True,
                is_active=True,
            )
            db.add(admin)
            print(f"[SEED] Created admin user: {admin_username}")
        else:
            if not existing_admin.is_admin:
                existing_admin.is_admin = True
                print(f"[SEED] Promoted existing user '{existing_admin.username}' to admin")

        db.commit()
        print("[SEED] Database seed completed successfully")
    except Exception as e:
        db.rollback()
        print(f"[SEED] Error during seed: {e}")
        raise
    finally:
        db.close()

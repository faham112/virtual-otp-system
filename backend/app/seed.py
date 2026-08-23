"""
Seed system - runs on startup.
Creates admin user + default settings if they don't exist.
Only needs values from .env
"""
import os
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import User, Setting
from app.auth import get_password_hash
from dotenv import load_dotenv

load_dotenv()

def seed_database():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        # ---- Default Markup ----
        markup = db.query(Setting).filter(Setting.key == "markup_percent").first()
        if not markup:
            default_markup = os.getenv("DEFAULT_MARKUP_PERCENT", "50")
            db.add(Setting(key="markup_percent", value=str(default_markup)))
            print(f"[SEED] Created default markup_percent = {default_markup}%")

        # ---- Admin User ----
        admin_username = os.getenv("ADMIN_USERNAME", "admin").lower().strip()
        admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com").strip()
        admin_password = os.getenv("ADMIN_PASSWORD", "Admin@Secure123!")

        existing_admin = db.query(User).filter(
            (User.username == admin_username) | (User.is_admin == True)
        ).first()

        if not existing_admin:
            admin = User(
                username=admin_username,
                email=admin_email,
                hashed_password=get_password_hash(admin_password),
                balance=0.0,
                is_admin=True,
                is_active=True
            )
            db.add(admin)
            print(f"[SEED] Created admin user: {admin_username}")
            print(f"[SEED] Admin password is set from .env (ADMIN_PASSWORD)")
        else:
            # Ensure at least one admin exists
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

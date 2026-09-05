import os
import re
import secrets
import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import User
from app.auth import get_password_hash
from app.settings_helper import get_setting


def google_client_id(db: Session | None = None) -> str:
    if db is not None:
        val = get_setting(db, "google_client_id", "").strip()
        if val:
            return val
    return (os.getenv("GOOGLE_CLIENT_ID") or "").strip()


def verify_google_token(id_token: str, audience: str) -> dict:
    if not id_token or not audience:
        raise HTTPException(status_code=400, detail="Google sign-in is not configured")
    try:
        r = httpx.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
            timeout=12.0,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Google verify failed: {e}")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    data = r.json()
    aud = str(data.get("aud") or "")
    if aud != audience:
        raise HTTPException(status_code=401, detail="Google client mismatch")
    if str(data.get("email_verified")).lower() not in ("true", "1"):
        raise HTTPException(status_code=401, detail="Google email is not verified")
    email = (data.get("email") or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=401, detail="Google account has no email")
    return data


def _username_from_email(email: str) -> str:
    raw = email.split("@", 1)[0].lower()
    raw = re.sub(r"[^a-z0-9_]", "", raw)[:24]
    return raw or "user"


def find_or_create_google_user(db: Session, data: dict) -> User:
    email = (data.get("email") or "").strip().lower()
    sub = str(data.get("sub") or "")
    user = None
    if sub:
        user = db.query(User).filter(User.google_sub == sub).first()
    if not user:
        user = db.query(User).filter(User.email == email).first()
    if user:
        if not user.is_active:
            raise HTTPException(status_code=400, detail="User account is inactive")
        if sub and not getattr(user, "google_sub", None):
            user.google_sub = sub
            db.commit()
        return user
    base = _username_from_email(email)
    username = base
    n = 0
    while db.query(User).filter(User.username == username).first():
        n += 1
        username = f"{base}{n}"[:50]
    user = User(
        username=username,
        email=email,
        hashed_password=get_password_hash(secrets.token_urlsafe(24) + "Aa1"),
        google_sub=sub or None,
        balance=0.0,
        is_admin=False,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

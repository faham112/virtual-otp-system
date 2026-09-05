import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserOut, Token
from app.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_user,
    get_current_admin,
)
from app.rate_limit import limit_login, limit_register, rate_limit, client_ip
from app.mail import send_email, smtp_ready
from app.proof import SITE_URL

router = APIRouter()


def _norm_code(code: str) -> str:
    return "".join(ch for ch in (code or "").upper() if ch.isalnum())


class RecoverySet(BaseModel):
    code: str = Field(..., min_length=6, max_length=32)

    @field_validator("code")
    @classmethod
    def clean_code(cls, v: str) -> str:
        v = _norm_code(v)
        if len(v) < 6:
            raise ValueError("Recovery code must be at least 6 letters or numbers")
        return v


class ForgotEmail(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str) -> str:
        return v.strip().lower()


class ResetEmail(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    code: str = Field(..., min_length=4, max_length=12)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("code")
    @classmethod
    def clean_code(cls, v: str) -> str:
        return "".join(ch for ch in v if ch.isdigit())

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v) or not any(c.isdigit() for c in v):
            raise ValueError("Password must contain an uppercase letter and a number")
        return v


class ForgotReset(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    recovery_code: str = Field(..., min_length=6, max_length=32)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def lower_user(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("recovery_code")
    @classmethod
    def clean_code(cls, v: str) -> str:
        v = _norm_code(v)
        if len(v) < 6:
            raise ValueError("Recovery code must be at least 6 letters or numbers")
        return v

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v) or not any(c.isdigit() for c in v):
            raise ValueError("Password must contain an uppercase letter and a number")
        return v


class AdminRecovery(BaseModel):
    user_id: int
    code: str = Field(..., min_length=6, max_length=32)

    @field_validator("code")
    @classmethod
    def clean_code(cls, v: str) -> str:
        v = _norm_code(v)
        if len(v) < 6:
            raise ValueError("Recovery code must be at least 6 letters or numbers")
        return v


@router.post("/register", response_model=UserOut)
def register(user: UserCreate, request: Request, db: Session = Depends(get_db)):
    limit_register(request)
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=get_password_hash(user.password),
        balance=0.0,
        is_admin=False,
        is_active=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/login", response_model=Token)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    limit_login(request)
    user = db.query(User).filter(User.username == form_data.username.lower().strip()).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User account is inactive")
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "is_admin": bool(user.is_admin),
        "username": user.username,
    }


@router.post("/recovery-code")
def set_recovery_code(
    body: RecoverySet,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.recovery_code_hash = get_password_hash(body.code)
    db.commit()
    return {"ok": True, "has_recovery_code": True}


@router.post("/forgot")
def forgot_email(body: ForgotEmail, request: Request, db: Session = Depends(get_db)):
    ip = client_ip(request)
    rate_limit(f"forgot:{ip}", limit=6, window_sec=900)
    generic = {"ok": True, "message": "If that email is registered, a reset code was sent."}
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not user.is_active:
        return generic
    if not smtp_ready(db):
        raise HTTPException(status_code=503, detail="Email is not configured on the server yet")
    code = f"{secrets.randbelow(1000000):06d}"
    user.reset_code_hash = get_password_hash(code)
    user.reset_code_expires = datetime.utcnow() + timedelta(minutes=20)
    db.commit()
    sent = send_email(
        db,
        user.email,
        "Virtual OTP password reset",
        (
            f"Hi {user.username},\n\n"
            f"Your password reset code is: {code}\n\n"
            f"It expires in 20 minutes.\n"
            f"Open {SITE_URL}/forgot and enter this code with a new password.\n\n"
            f"If you did not ask for this, ignore the email.\n"
        ),
    )
    if not sent:
        raise HTTPException(status_code=502, detail="Could not send the reset email. Check SMTP settings.")
    return generic


@router.post("/reset")
def reset_email(body: ResetEmail, request: Request, db: Session = Depends(get_db)):
    ip = client_ip(request)
    rate_limit(f"reset:{ip}", limit=8, window_sec=900)
    user = db.query(User).filter(User.email == body.email).first()
    stored = getattr(user, "reset_code_hash", None) if user else None
    exp = getattr(user, "reset_code_expires", None) if user else None
    if not user or not stored or not body.code:
        raise HTTPException(status_code=400, detail="Invalid email or reset code")
    if exp and exp < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset code expired. Request a new one.")
    if not verify_password(body.code, stored):
        raise HTTPException(status_code=400, detail="Invalid email or reset code")
    user.hashed_password = get_password_hash(body.new_password)
    user.reset_code_hash = None
    user.reset_code_expires = None
    db.commit()
    return {"ok": True, "message": "Password updated. You can sign in now."}


@router.post("/forgot-code")
def forgot_reset(body: ForgotReset, request: Request, db: Session = Depends(get_db)):
    ip = client_ip(request)
    rate_limit(f"forgot-code:{ip}", limit=8, window_sec=900)
    user = db.query(User).filter(User.username == body.username).first()
    stored = getattr(user, "recovery_code_hash", None) if user else None
    if not user or not stored or not verify_password(body.recovery_code, stored):
        raise HTTPException(status_code=400, detail="Invalid username or recovery code")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User account is inactive")
    user.hashed_password = get_password_hash(body.new_password)
    db.commit()
    return {"ok": True, "message": "Password updated. You can sign in now."}


@router.post("/admin-recovery")
def admin_set_recovery(
    body: AdminRecovery,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.recovery_code_hash = get_password_hash(body.code)
    db.commit()
    return {"ok": True, "username": user.username}

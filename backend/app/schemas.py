from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime

# Allowed values (must match frontend + 5sim)
ALLOWED_SERVICES = {
    "facebook", "whatsapp", "telegram", "google", "instagram",
    "twitter", "tiktok", "discord", "microsoft", "amazon",
    "apple", "linkedin", "viber", "snapchat", "uber"
}

ALLOWED_COUNTRIES = {
    "any", "england", "usa", "russia", "indonesia", "india",
    "ukraine", "kazakhstan", "philippines", "vietnam",
    "brazil", "nigeria", "pakistan", "bangladesh", "china",
    "germany", "france", "netherlands", "poland", "spain"
}

# ========== Auth Schemas ==========
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        v = v.strip()
        if not v.replace("_", "").isalnum():
            raise ValueError("Username must be alphanumeric (underscore allowed)")
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    balance: float
    is_admin: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ========== Order Schemas ==========
class OrderCreate(BaseModel):
    service: str
    country: str = "any"

    @field_validator("service")
    @classmethod
    def validate_service(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in ALLOWED_SERVICES:
            raise ValueError(f"Invalid service. Allowed: {', '.join(sorted(ALLOWED_SERVICES))}")
        return v

    @field_validator("country")
    @classmethod
    def validate_country(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in ALLOWED_COUNTRIES:
            raise ValueError(f"Invalid country. Allowed: {', '.join(sorted(ALLOWED_COUNTRIES))}")
        return v

class OrderOut(BaseModel):
    id: int
    phone_number: Optional[str]
    service: str
    country: str
    cost: float
    status: str
    otp_code: Optional[str]
    sms_text: Optional[str]
    created_at: datetime
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True

# ========== Transaction ==========
class TransactionOut(BaseModel):
    id: int
    amount: float
    type: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# ========== Admin ==========
class AddBalance(BaseModel):
    user_id: int
    amount: float = Field(..., gt=0, le=100000)
    description: str = "Admin credit"

class MarkupUpdate(BaseModel):
    markup_percent: float = Field(..., ge=0, le=500)

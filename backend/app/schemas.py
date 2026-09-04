from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime

ALLOWED_SERVICES = {
    "facebook", "whatsapp", "telegram", "google", "instagram",
    "twitter", "tiktok", "discord", "microsoft", "amazon",
    "apple", "linkedin", "viber", "snapchat", "uber"
}

ALLOWED_COUNTRIES = {
    "any", "afghanistan", "albania", "algeria", "angola", "antiguaandbarbuda",
    "argentina", "armenia", "aruba", "australia", "austria", "azerbaijan",
    "bahamas", "bahrain", "bangladesh", "barbados", "belgium", "belize",
    "benin", "bhutane", "bih", "bolivia", "botswana", "brazil", "bulgaria",
    "burkinafaso", "burundi", "cambodia", "cameroon", "canada", "capeverde",
    "chad", "chile", "colombia", "comoros", "congo", "costarica", "croatia",
    "cyprus", "czech", "denmark", "djibouti", "dominicana", "easttimor",
    "ecuador", "egypt", "england", "equatorialguinea", "estonia", "ethiopia",
    "finland", "france", "frenchguiana", "gabon", "gambia", "georgia",
    "germany", "ghana", "greece", "guadeloupe", "guatemala", "guinea",
    "guineabissau", "guyana", "haiti", "honduras", "hongkong", "hungary",
    "india", "indonesia", "ireland", "israel", "italy", "ivorycoast",
    "jamaica", "jordan", "kazakhstan", "kenya", "kuwait", "kyrgyzstan",
    "laos", "latvia", "lesotho", "liberia", "lithuania", "luxembourg",
    "macau", "madagascar", "malawi", "malaysia", "maldives", "mauritania",
    "mauritius", "mexico", "moldova", "mongolia", "montenegro", "morocco",
    "mozambique", "namibia", "nepal", "netherlands", "newcaledonia",
    "nicaragua", "nigeria", "northmacedonia", "norway", "oman", "pakistan",
    "panama", "papuanewguinea", "paraguay", "peru", "philippines", "poland",
    "portugal", "puertorico", "reunion", "romania", "rwanda",
    "saintkittsandnevis", "saintlucia", "saintvincentandgrenadines",
    "salvador", "samoa", "saudiarabia", "senegal", "serbia", "seychelles",
    "sierraleone", "slovakia", "slovenia", "solomonislands", "southafrica",
    "spain", "srilanka", "suriname", "swaziland", "sweden", "taiwan",
    "tajikistan", "tanzania", "thailand", "tit", "togo", "tunisia",
    "turkmenistan", "uganda", "uruguay", "usa", "uzbekistan", "venezuela",
    "vietnam", "zambia",
}

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

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    balance: float
    is_admin: bool
    is_active: bool
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    is_admin: bool = False
    username: str = ""

class OrderCreate(BaseModel):
    service: str
    country: str = "any"
    quality: str = "cheaper"

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
            raise ValueError(f"Invalid country: {v}")
        return v

    @field_validator("quality")
    @classmethod
    def validate_quality(cls, v: str) -> str:
        v = (v or "cheaper").lower().strip()
        if v in ("cheap", "low", "budget"):
            return "cheaper"
        if v in ("better", "best", "high", "quality", "premium"):
            return "quality"
        if v in ("mid", "balanced", "normal"):
            return "balanced"
        if v not in ("cheaper", "balanced", "quality"):
            return "cheaper"
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

class AdminOrderOut(BaseModel):
    id: int
    user_id: int
    username: Optional[str] = None
    phone_number: Optional[str]
    service: str
    country: str
    cost: float
    provider_cost: float = 0.0
    status: str
    otp_code: Optional[str]
    sms_text: Optional[str]
    created_at: datetime
    expires_at: Optional[datetime]
    class Config:
        from_attributes = True

class PriceQuote(BaseModel):
    service: str
    country: str
    available: bool
    provider_cost: float
    user_price: float
    markup_percent: float
    stock: int
    total_stock: int = 0
    rate: float = 0.0
    operator: Optional[str] = None

class CountryStock(BaseModel):
    country: str
    available: bool
    stock: int
    provider_cost: float
    user_price: float

class TransactionOut(BaseModel):
    id: int
    amount: float
    type: str
    description: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class AddBalance(BaseModel):
    user_id: int
    amount: float = Field(..., gt=0, le=100000)
    description: str = "Admin credit"

class MarkupUpdate(BaseModel):
    markup_usd: float = Field(0.035, ge=0, le=100)
    markup_percent: Optional[float] = Field(None, ge=0, le=500)

class ToggleUser(BaseModel):
    user_id: int
    is_active: bool

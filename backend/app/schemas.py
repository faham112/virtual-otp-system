from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# ========== Auth Schemas ==========
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

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
    service: str          # facebook, whatsapp, telegram etc
    country: str = "any"  # england, russia, usa, any

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
    amount: float
    description: str = "Admin credit"

class MarkupUpdate(BaseModel):
    markup_percent: float

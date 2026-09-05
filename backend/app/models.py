from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    recovery_code_hash = Column(String(255), nullable=True)
    reset_code_hash = Column(String(255), nullable=True)
    reset_code_expires = Column(DateTime, nullable=True)
    balance = Column(Float, default=0.0, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    orders = relationship("Order", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    deposits = relationship("DepositRequest", back_populates="user")


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        UniqueConstraint("fivesim_order_id", name="uq_fivesim_order_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    fivesim_order_id = Column(String(50), nullable=True, index=True)
    phone_number = Column(String(30), nullable=True)
    service = Column(String(50), nullable=False)
    country = Column(String(50), nullable=False)
    cost = Column(Float, nullable=False)
    provider_cost = Column(Float, default=0.0)
    status = Column(String(30), default="pending", index=True)
    otp_code = Column(String(20), nullable=True)
    sms_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="orders")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    type = Column(String(20), nullable=False)
    description = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="transactions")


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True)
    key = Column(String(80), unique=True, nullable=False)
    value = Column(Text, nullable=False)


class DepositRequest(Base):
    __tablename__ = "deposit_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    bank_key = Column(String(50), nullable=False)
    bank_name = Column(String(120), nullable=False)
    slip_note = Column(Text, nullable=True)
    slip_image = Column(Text, nullable=True)
    status = Column(String(20), default="pending", index=True)
    admin_note = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="deposits")

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    balance = Column(Float, default=0.0, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    orders = relationship("Order", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")


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
    status = Column(String(30), default="pending", index=True)  # pending, received, failed, cancelled, completed
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
    type = Column(String(20), nullable=False)  # credit, debit, refund
    description = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="transactions")


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True)
    key = Column(String(50), unique=True, nullable=False)
    value = Column(String(255), nullable=False)

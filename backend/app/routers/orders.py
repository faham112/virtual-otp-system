from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import List

from app.database import get_db
from app.models import User, Order, Transaction, Setting
from app.schemas import OrderCreate, OrderOut
from app.auth import get_current_user
from app.services.fivesim import FiveSimService

router = APIRouter()

def get_markup_percent(db: Session) -> float:
    setting = db.query(Setting).filter(Setting.key == "markup_percent").first()
    if setting:
        try:
            return float(setting.value)
        except (ValueError, TypeError):
            return 50.0
    return 50.0


@router.post("/buy", response_model=OrderOut)
async def buy_number(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Buy a virtual number from 5sim.
    Uses row-level lock to prevent race conditions / double-spend.
    Only the selected country is sent to 5sim (no fallback).
    """
    # Lock the user row to prevent concurrent balance races
    user = db.query(User).filter(User.id == current_user.id).with_for_update().first()
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="User not found or inactive")

    if user.balance < 0.01:
        raise HTTPException(status_code=400, detail="Insufficient balance. Please top up.")

    markup = get_markup_percent(db)
    fivesim = FiveSimService()

    # Buy exactly for the selected country (no "any" override unless user chose "any")
    try:
        result = await fivesim.buy_number(
            country=order_data.country,
            operator="any",
            product=order_data.service
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to buy number: {str(e)}")

    provider_cost = float(result.get("price", 0) or 0)
    if provider_cost <= 0:
        # Safety: try cancel
        try:
            await fivesim.cancel_order(str(result.get("id", "")))
        except Exception:
            pass
        raise HTTPException(status_code=400, detail="Invalid price received from provider")

    user_cost = round(provider_cost * (1 + markup / 100), 4)

    if user.balance < user_cost:
        try:
            await fivesim.cancel_order(str(result["id"]))
        except Exception:
            pass
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Required: ${user_cost:.4f}, Available: ${user.balance:.4f}"
        )

    # Deduct
    user.balance = round(user.balance - user_cost, 4)

    new_order = Order(
        user_id=user.id,
        fivesim_order_id=str(result["id"]),
        phone_number=result.get("phone"),
        service=order_data.service,
        country=order_data.country,
        cost=user_cost,
        provider_cost=provider_cost,
        status="pending",
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=20)
    )
    db.add(new_order)

    txn = Transaction(
        user_id=user.id,
        amount=-user_cost,
        type="debit",
        description=f"Bought {order_data.service} ({order_data.country}) → {result.get('phone')}"
    )
    db.add(txn)

    db.commit()
    db.refresh(new_order)
    return new_order


@router.get("/", response_model=List[OrderOut])
def get_my_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return (
        db.query(Order)
        .filter(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
        .limit(100)
        .all()
    )


@router.get("/{order_id}", response_model=OrderOut)
async def get_order_status(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.user_id == current_user.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status in ["completed", "failed", "cancelled"]:
        return order

    # Check with 5sim
    if order.fivesim_order_id:
        fivesim = FiveSimService()
        try:
            data = await fivesim.check_order(order.fivesim_order_id)
            status = (data.get("status") or "").upper()
            sms_list = data.get("sms") or []

            if status == "RECEIVED" and sms_list:
                order.status = "completed"
                order.otp_code = sms_list[0].get("code")
                order.sms_text = sms_list[0].get("text")
                try:
                    await fivesim.finish_order(order.fivesim_order_id)
                except Exception:
                    pass
                db.commit()

            elif status in ["CANCELED", "CANCELLED", "TIMEOUT", "BANNED", "FINISHED"]:
                # FINISHED without SMS sometimes happens
                if status == "FINISHED" and not sms_list:
                    await refund_order(order, current_user, db, reason="TIMEOUT")
                elif status != "FINISHED":
                    await refund_order(order, current_user, db, reason=status)

        except Exception as e:
            print(f"[ORDER] Error checking order {order_id}: {e}")

    # Auto-expire
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if order.expires_at and now > order.expires_at and order.status == "pending":
        await refund_order(order, current_user, db, reason="TIMEOUT")

    db.refresh(order)
    return order


async def refund_order(order: Order, user: User, db: Session, reason: str = "failed"):
    if order.status in ["failed", "cancelled", "completed"]:
        return

    # Lock user for balance update
    locked_user = db.query(User).filter(User.id == user.id).with_for_update().first()
    if not locked_user:
        return

    locked_user.balance = round(locked_user.balance + order.cost, 4)
    order.status = "cancelled" if reason.lower() in ["cancelled", "canceled"] else "failed"

    txn = Transaction(
        user_id=locked_user.id,
        amount=order.cost,
        type="refund",
        description=f"Refund for order #{order.id} ({reason})"
    )
    db.add(txn)

    if order.fivesim_order_id:
        try:
            fivesim = FiveSimService()
            await fivesim.cancel_order(order.fivesim_order_id)
        except Exception:
            pass

    db.commit()


@router.post("/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.user_id == current_user.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending orders can be cancelled")

    await refund_order(order, current_user, db, reason="cancelled")
    return {"message": "Order cancelled and amount refunded to your wallet"}

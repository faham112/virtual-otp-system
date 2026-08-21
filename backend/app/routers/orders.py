from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
import asyncio

from app.database import get_db
from app.models import User, Order, Transaction, Setting
from app.schemas import OrderCreate, OrderOut
from app.auth import get_current_user
from app.services.fivesim import FiveSimService

router = APIRouter()

def get_markup_percent(db: Session) -> float:
    setting = db.query(Setting).filter(Setting.key == "markup_percent").first()
    if setting:
        return float(setting.value)
    return 100.0  # default 100% markup

@router.post("/buy", response_model=OrderOut)
async def buy_number(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Get markup
    markup = get_markup_percent(db)

    # 2. Temporary estimated cost (we will update after 5sim response)
    # For safety we check minimum balance
    if current_user.balance < 0.05:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    fivesim = FiveSimService()

    try:
        # Buy from 5sim
        result = await fivesim.buy_number(
            country=order_data.country,
            operator="any",
            product=order_data.service
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to buy number: {str(e)}")

    provider_cost = float(result.get("price", 0))
    user_cost = round(provider_cost * (1 + markup / 100), 4)

    # Check if user has enough balance after knowing real price
    if current_user.balance < user_cost:
        # Cancel the number on 5sim
        try:
            await fivesim.cancel_order(str(result["id"]))
        except:
            pass
        raise HTTPException(status_code=400, detail="Insufficient balance for this number")

    # Deduct balance
    current_user.balance -= user_cost

    # Create order
    new_order = Order(
        user_id=current_user.id,
        fivesim_order_id=str(result["id"]),
        phone_number=result.get("phone"),
        service=order_data.service,
        country=order_data.country,
        cost=user_cost,
        provider_cost=provider_cost,
        status="pending",
        expires_at=datetime.utcnow() + timedelta(minutes=20)
    )
    db.add(new_order)

    # Create transaction
    txn = Transaction(
        user_id=current_user.id,
        amount=-user_cost,
        type="debit",
        description=f"Bought {order_data.service} number ({result.get('phone')})"
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
    return db.query(Order).filter(Order.user_id == current_user.id).order_by(Order.created_at.desc()).all()


@router.get("/{order_id}", response_model=OrderOut)
async def get_order_status(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # If already completed or failed, just return
    if order.status in ["completed", "failed", "cancelled"]:
        return order

    # Check with 5sim
    if order.fivesim_order_id:
        fivesim = FiveSimService()
        try:
            data = await fivesim.check_order(order.fivesim_order_id)

            status = data.get("status")
            sms_list = data.get("sms", [])

            if status == "RECEIVED" and sms_list:
                order.status = "received"
                order.otp_code = sms_list[0].get("code")
                order.sms_text = sms_list[0].get("text")
                order.status = "completed"

                # Finish on 5sim
                await fivesim.finish_order(order.fivesim_order_id)
                db.commit()

            elif status in ["CANCELED", "TIMEOUT", "BANNED"]:
                # Refund
                await refund_order(order, current_user, db, reason=status)

        except Exception as e:
            print(f"Error checking order: {e}")

    # Auto expire check
    if order.expires_at and datetime.utcnow() > order.expires_at and order.status == "pending":
        await refund_order(order, current_user, db, reason="TIMEOUT")

    db.refresh(order)
    return order


async def refund_order(order: Order, user: User, db: Session, reason: str = "failed"):
    if order.status in ["failed", "cancelled", "completed"]:
        return

    # Refund balance
    user.balance += order.cost

    order.status = "failed" if reason != "cancelled" else "cancelled"

    # Transaction
    txn = Transaction(
        user_id=user.id,
        amount=order.cost,
        type="refund",
        description=f"Refund for order #{order.id} ({reason})"
    )
    db.add(txn)

    # Cancel on 5sim if possible
    if order.fivesim_order_id:
        try:
            fivesim = FiveSimService()
            await fivesim.cancel_order(order.fivesim_order_id)
        except:
            pass

    db.commit()


@router.post("/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending orders can be cancelled")

    await refund_order(order, current_user, db, reason="cancelled")
    return {"message": "Order cancelled and refunded"}

import asyncio
from datetime import datetime, timezone
from app.database import SessionLocal
from app.models import Order, User
from app.settings_helper import make_fivesim


async def _sync_one(db, order: Order):
    from app.routers.orders import apply_fivesim_status, refund_order

    pid = order.fivesim_order_id
    if not pid:
        return
    try:
        fivesim = make_fivesim(db)
        data = await fivesim.check_order(pid)
        user = db.query(User).filter(User.id == order.user_id).first()
        if not user:
            return
        await apply_fivesim_status(order, user, db, data, fivesim)
    except Exception as e:
        print(f"[WORKER] order {order.id}: {e}")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if order.expires_at and now > order.expires_at and order.status == "pending":
        user = db.query(User).filter(User.id == order.user_id).first()
        if user:
            await refund_order(order, user, db, reason="TIMEOUT")


async def poll_pending_orders():
    db = SessionLocal()
    try:
        pending = db.query(Order).filter(Order.status == "pending").limit(50).all()
        for order in pending:
            await _sync_one(db, order)
    finally:
        db.close()


async def background_loop():
    await asyncio.sleep(4)
    while True:
        try:
            await poll_pending_orders()
        except Exception as e:
            print(f"[WORKER] loop: {e}")
        await asyncio.sleep(6)

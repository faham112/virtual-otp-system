import httpx
from sqlalchemy.orm import Session
from app.settings_helper import get_setting


async def telegram_send(db: Session, text: str, chat_id: str | None = None) -> bool:
    token = get_setting(db, "telegram_bot_token", "").strip()
    dest = (chat_id or get_setting(db, "telegram_admin_chat_id", "")).strip()
    if not token or not dest:
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(url, json={"chat_id": dest, "text": text[:3500]})
            return r.status_code == 200
    except Exception as e:
        print(f"[TELEGRAM] {e}")
        return False

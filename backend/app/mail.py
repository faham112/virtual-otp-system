import os
import smtplib
from email.message import EmailMessage
from sqlalchemy.orm import Session
from app.settings_helper import get_setting


def _cfg(db: Session | None, key: str, env: str, default: str = "") -> str:
    if db is not None:
        val = get_setting(db, key, "").strip()
        if val:
            return val
    return (os.getenv(env) or default).strip()


def smtp_ready(db: Session | None = None) -> bool:
    return bool(_cfg(db, "smtp_host", "SMTP_HOST") and _cfg(db, "smtp_from", "SMTP_FROM", _cfg(db, "smtp_user", "SMTP_USER")))


def send_email(db: Session | None, to_addr: str, subject: str, body: str) -> bool:
    host = _cfg(db, "smtp_host", "SMTP_HOST")
    port = int(_cfg(db, "smtp_port", "SMTP_PORT", "587") or "587")
    user = _cfg(db, "smtp_user", "SMTP_USER")
    password = _cfg(db, "smtp_pass", "SMTP_PASS")
    from_addr = _cfg(db, "smtp_from", "SMTP_FROM", user)
    if not host or not from_addr or not to_addr:
        print("[MAIL] SMTP is not configured")
        return False
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_addr
    msg.set_content(body)
    try:
        with smtplib.SMTP(host, port, timeout=20) as smtp:
            smtp.ehlo()
            if port != 25:
                smtp.starttls()
                smtp.ehlo()
            if user and password:
                smtp.login(user, password)
            smtp.send_message(msg)
        return True
    except Exception as e:
        print(f"[MAIL] {e}")
        return False

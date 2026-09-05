"""Add missing columns/tables on startup without Alembic for existing installs."""
from sqlalchemy import inspect, text
from app.database import engine


def _cols(table: str) -> set:
    insp = inspect(engine)
    if table not in insp.get_table_names():
        return set()
    return {c["name"] for c in insp.get_columns(table)}


def _add(table: str, col: str, ddl: str):
    if col in _cols(table):
        return
    with engine.begin() as conn:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {ddl}"))
        print(f"[MIGRATE] {table}.{col} added")


def run_migrations():
    try:
        _add("users", "totp_secret", "totp_secret VARCHAR(64)")
        _add("users", "totp_enabled", "totp_enabled BOOLEAN DEFAULT 0")
        _add("users", "telegram_chat_id", "telegram_chat_id VARCHAR(64)")
        _add("users", "recovery_code_hash", "recovery_code_hash VARCHAR(255)")
        _add("orders", "provider", "provider VARCHAR(40) DEFAULT 'fivesim'")
        _add("orders", "provider_order_id", "provider_order_id VARCHAR(80)")
        _add("orders", "sms_count", "sms_count INTEGER DEFAULT 0")
    except Exception as e:
        print(f"[MIGRATE] warning: {e}")

from sqlalchemy.orm import Session
from app.settings_helper import get_setting, get_fivesim_api_key


def get_active_provider_name(db: Session) -> str:
    name = (get_setting(db, "active_provider", "herosms") or "herosms").strip().lower()
    if name in ("herosms", "hero", "hero-sms"):
        return "herosms"
    return "fivesim"


def make_fivesim_svc(db: Session):
    from app.services.fivesim import FiveSimService
    return FiveSimService(api_key=get_fivesim_api_key(db) or None)


def make_herosms_svc(db: Session):
    from app.services.herosms import HeroSMSService
    key = get_setting(db, "herosms_api_key", "").strip()
    return HeroSMSService(api_key=key)


def make_active_provider(db: Session):
    name = get_active_provider_name(db)
    if name == "herosms":
        return make_herosms_svc(db)
    return make_fivesim_svc(db)


def make_provider_for_order_id(db: Session, order_id: str):
    oid = str(order_id or "")
    if oid.startswith("hero:"):
        return make_herosms_svc(db)
    return make_fivesim_svc(db)


def store_provider_order_id(provider_name: str, raw_id) -> str:
    rid = str(raw_id)
    if provider_name == "herosms":
        return rid if rid.startswith("hero:") else f"hero:{rid}"
    return rid.replace("hero:", "")

import base64
import hashlib
import hmac
import os
import re
from pathlib import Path
from typing import Optional, Tuple

SITE_URL = (os.getenv("SITE_URL") or os.getenv("FRONTEND_URL") or "https://otp.globalcareerhub.org").rstrip("/")
PROJECT_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_DIR = PROJECT_ROOT / "uploads" / "deposits"


def proof_token(deposit_id: int) -> str:
    secret = os.getenv("SECRET_KEY") or "virtual-otp-proof"
    raw = hmac.new(secret.encode(), f"dep:{int(deposit_id)}".encode(), hashlib.sha256).hexdigest()
    return raw[:24]


def token_ok(deposit_id: int, token: str) -> bool:
    expected = proof_token(deposit_id)
    return hmac.compare_digest(expected, str(token or ""))


def proof_path(deposit_id: int, token: str) -> str:
    return f"{SITE_URL}/proof/{deposit_id}/{token}"


def slip_path(deposit_id: int, token: str) -> str:
    return f"{SITE_URL}/api/public/slip/{deposit_id}/{token}"


def save_slip(deposit_id: int, data_url: str) -> str:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    raw = data_url or ""
    if raw.startswith("data:"):
        raw = raw.split(",", 1)[-1]
    raw = re.sub(r"\s+", "", raw)
    blob = base64.b64decode(raw)
    if len(blob) < 40:
        raise ValueError("Receipt image is empty")
    if len(blob) > 2_500_000:
        raise ValueError("Receipt image too large (max 2MB)")
    header = blob[:12]
    ext = "jpg"
    if header.startswith(b"\x89PNG"):
        ext = "png"
    elif header.startswith(b"GIF"):
        ext = "gif"
    elif header.startswith(b"RIFF") and b"WEBP" in blob[:16]:
        ext = "webp"
    dest = UPLOAD_DIR / f"{int(deposit_id)}.{ext}"
    dest.write_bytes(blob)
    return f"file:{dest.name}"


def load_slip(ref: Optional[str]) -> Optional[Tuple[bytes, str]]:
    if not ref:
        return None
    if ref.startswith("file:"):
        name = Path(ref.split(":", 1)[1]).name
        path = UPLOAD_DIR / name
        if not path.exists():
            return None
        data = path.read_bytes()
        mime = "image/jpeg"
        if name.endswith(".png"):
            mime = "image/png"
        elif name.endswith(".webp"):
            mime = "image/webp"
        elif name.endswith(".gif"):
            mime = "image/gif"
        return data, mime
    if ref.startswith("data:"):
        header, b64 = ref.split(",", 1)
        mime = "image/jpeg"
        if "png" in header:
            mime = "image/png"
        elif "webp" in header:
            mime = "image/webp"
        try:
            return base64.b64decode(b64), mime
        except Exception:
            return None
    return None

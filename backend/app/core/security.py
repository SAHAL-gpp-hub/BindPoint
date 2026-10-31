import base64
import hmac
import hashlib
import json
import time
from typing import Optional, Dict, Any
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from backend.app.config import settings

ph = PasswordHasher(
    time_cost=2,
    memory_cost=65536,  # 64 MB
    parallelism=2,
    hash_len=32,
    salt_len=16,
)


def hash_password(password: str) -> str:
    """Hashes password with Argon2id."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies password using Argon2id."""
    try:
        return ph.verify(hashed_password, plain_password)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


def create_signed_token(payload: Dict[str, Any], expires_in_seconds: int = 86400) -> str:
    """
    Creates an HMAC-SHA256 signed URL-safe token.
    payload: dictionary containing arbitrary data
    expires_in_seconds: validity period (default: 24h)
    """
    token_data = {
        "exp": int(time.time()) + expires_in_seconds,
        "data": payload,
    }
    raw_json = json.dumps(token_data, separators=(",", ":")).encode("utf-8")
    encoded_payload = base64.urlsafe_b64encode(raw_json).decode("utf-8")
    
    signature = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        encoded_payload.encode("utf-8"),
        hashlib.sha256
    ).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).decode("utf-8")
    
    return f"{encoded_payload}.{encoded_signature}"


def verify_signed_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies an HMAC-SHA256 signed token and returns the payload if valid and unexpired.
    """
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        encoded_payload, encoded_signature = parts
        
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            encoded_payload.encode("utf-8"),
            hashlib.sha256
        ).digest()
        
        provided_sig = base64.urlsafe_b64decode(encoded_signature.encode("utf-8"))
        if not hmac.compare_digest(expected_sig, provided_sig):
            return None
        
        raw_json = base64.urlsafe_b64decode(encoded_payload.encode("utf-8"))
        token_data = json.loads(raw_json.decode("utf-8"))
        
        if token_data.get("exp", 0) < time.time():
            return None
        
        return token_data.get("data")
    except Exception:
        return None

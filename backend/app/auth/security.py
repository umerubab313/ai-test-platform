"""JWT creation and validation for the single hardcoded admin account."""

import secrets
from datetime import datetime, timedelta, timezone

import jwt

from app.config import get_settings

settings = get_settings()
ALGORITHM = "HS256"


def verify_credentials(username: str, password: str) -> bool:
    """Constant-time comparison against the single admin account in .env."""
    username_match = secrets.compare_digest(username, settings.admin_username)
    password_match = secrets.compare_digest(password, settings.admin_password)
    return username_match and password_match


def create_access_token(username: str) -> str:
    """Issue a signed JWT for the admin user."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> str:
    """Decode and validate a JWT, returning the username inside it."""
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[ALGORITHM])
    return payload["sub"]
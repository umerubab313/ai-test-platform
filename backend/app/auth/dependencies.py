"""FastAPI dependency enforcing a valid JWT on protected routes."""

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.security import decode_access_token

bearer_scheme = HTTPBearer()


def require_auth(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> str:
    """Validate the Bearer token; return the username if valid, else 401."""
    token = credentials.credentials
    try:
        return decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
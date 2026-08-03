"""Login endpoint for the single hardcoded admin account."""

from fastapi import APIRouter, HTTPException, status

from app.auth.security import create_access_token, verify_credentials
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    """Authenticate against the single admin account defined in .env."""
    if not verify_credentials(payload.username, payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    return TokenResponse(access_token=create_access_token(payload.username))
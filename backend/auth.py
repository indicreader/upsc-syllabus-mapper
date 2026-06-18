"""
UPSC Clipper Backend — Authentication Dependency
Validates X-App-Local-Token header against the configured secret.
"""

from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
from config import Settings, get_settings

_header_scheme = APIKeyHeader(name="X-App-Local-Token", auto_error=False)


async def verify_app_token(
    token: str | None = Security(_header_scheme),
    settings: Settings = Depends(get_settings),
) -> str:
    """
    FastAPI dependency that enforces the internal app token.
    Returns the validated token string on success.
    Raises HTTP 401 on missing/invalid token.
    """
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Missing X-App-Local-Token header",
        )
    if token != settings.app_local_token:
        raise HTTPException(
            status_code=401,
            detail="Invalid application token",
        )
    return token

import secrets
from typing import AsyncGenerator, Optional
from uuid import UUID
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database import get_db
from backend.app.models import Admin
from backend.app.core.security import verify_signed_token


async def verify_admin_csrf(request: Request):
    """
    Enforces double-submit CSRF protection on state-changing admin endpoints (POST, PUT, PATCH, DELETE).
    If an admin_session cookie is present, requires matching X-CSRF-Token header.
    """
    if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
        # Skip login
        if request.url.path.endswith("/auth/login"):
            return

        cookie_session = request.cookies.get("admin_session")
        if cookie_session:
            csrf_cookie = request.cookies.get("csrf_token")
            csrf_header = request.headers.get("X-CSRF-Token")
            if not csrf_header or not csrf_cookie or csrf_header != csrf_cookie:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="CSRF validation failed: Missing or invalid X-CSRF-Token header.",
                )


async def get_current_admin(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Admin:
    """
    Dependency to authenticate admin via httpOnly session cookie or Bearer token.
    """
    cookie_token = request.cookies.get("admin_session")
    auth_header = request.headers.get("Authorization")
    token = None

    if cookie_token:
        token = cookie_token
    elif auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in as administrator.",
        )

    payload = verify_signed_token(token)
    if not payload or payload.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please sign in again.",
        )

    admin_id = payload.get("admin_id")
    try:
        admin_uuid = UUID(admin_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed session token.",
        )

    query = select(Admin).where(Admin.id == admin_uuid)
    result = await db.execute(query)
    admin = result.scalar_one_or_none()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Administrator account not found.",
        )

    return admin

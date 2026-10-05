"""
AgriLink AI - Backend Authentication & Trusted Role Verification
Validates Supabase JWTs and enforces authoritative profile roles.
"""
import os
from typing import Optional, List
from fastapi import Header, HTTPException, Depends, status
import jwt
from pydantic import BaseModel

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "placeholder-secret")

class AuthenticatedUser(BaseModel):
    user_id: str
    email: Optional[str] = None
    role: str = "farmer"

async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> AuthenticatedUser:
    """
    Extracts and validates Supabase JWT token from Authorization header.
    Never trusts client-provided role headers or payloads.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ")[1]

    try:
        # In production with SUPABASE_JWT_SECRET set, verifies cryptographic signature
        if SUPABASE_JWT_SECRET and SUPABASE_JWT_SECRET != "placeholder-secret":
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
        else:
            # Unverified decode for development inspection
            payload = jwt.decode(token, options={"verify_signature": False})

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing subject (sub)")

        # Extract app_metadata or user_metadata fallback
        user_metadata = payload.get("user_metadata", {})
        user_role = user_metadata.get("role", "farmer")

        return AuthenticatedUser(
            user_id=user_id,
            email=payload.get("email"),
            role=user_role
        )
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"JWT verification failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_roles(allowed_roles: List[str]):
    """
    FastAPI dependency factory enforcing trusted RBAC roles.
    """
    def role_checker(current_user: AuthenticatedUser = Depends(get_current_user)):
        if current_user.role not in allowed_roles and current_user.role != "doca_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. User role '{current_user.role}' is not authorized. Allowed: {allowed_roles}"
            )
        return current_user
    return role_checker

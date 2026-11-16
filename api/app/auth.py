"""
Login check. The web app sends the Supabase access token (a signed JWT) as
`Authorization: Bearer <token>`. We verify its signature with Supabase's public
keys (JWKS, ES256), its expiry, issuer and audience. No shared secret is needed.
"""
from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from . import config

_bearer = HTTPBearer(auto_error=False)
_jwks = jwt.PyJWKClient(config.JWKS_URL, cache_keys=True, lifespan=3600) if config.SUPABASE_URL else None


@dataclass
class User:
    id: str          # auth.users.id (the login)
    email: str | None
    token: str       # forwarded to the database so privacy rules apply
    role: str | None = None
    person_id: str | None = None
    status: str = "active"


def verify_token(token: str) -> dict:
    if _jwks is None:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "SUPABASE_URL is not configured")
    try:
        key = _jwks.get_signing_key_from_jwt(token).key
        return jwt.decode(token, key, algorithms=["ES256", "RS256"], audience="authenticated", issuer=config.ISSUER)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired. Please sign in again.")
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid login token")


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in required")
    claims = verify_token(creds.credentials)
    return User(id=claims["sub"], email=claims.get("email"), token=creds.credentials)


SUPPORTED_ROLES = frozenset({
    "couple", "counsellor", "admin", "clinical_supervisor",
    "content_reviewer", "doh_viewer", "system_service"
})


def require_role(*allowed_roles: str):
    """FastAPI dependency to enforce RBAC permissions."""
    def _role_checker(user: User = Depends(current_user)):
        from .db import as_user
        rows = as_user(user.token).select("accounts", user_id=f"eq.{user.id}", select="role,person_id,display_name,status")
        if not rows:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Account profile not initialized")
        acc = rows[0]
        role = acc.get("role")
        user.role = role
        user.person_id = acc.get("person_id")
        user.status = acc.get("status", "active")

        if user.status in ("inactive", "suspended", "deactivated"):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is suspended or inactive")

        if role not in allowed_roles:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Access denied: Required role '{' or '.join(allowed_roles)}', current role is '{role}'"
            )
        return user
    return _role_checker

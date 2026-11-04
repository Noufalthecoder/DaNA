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

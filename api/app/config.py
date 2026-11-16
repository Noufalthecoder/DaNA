"""Settings from environment variables (api/.env locally, host settings in production)."""
import os
from pathlib import Path
from dotenv import load_dotenv

# api/.env next to this package first, then the repo root .env, then the working directory
for _env in (Path(__file__).resolve().parent.parent / ".env", Path(__file__).resolve().parent.parent.parent / ".env"):
    if _env.exists():
        load_dotenv(_env)
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5175,http://127.0.0.1:5175").split(",") if o.strip()]

JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
ISSUER = f"{SUPABASE_URL}/auth/v1"

# partner invitation emails (optional): set on the host to send automatically
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
INVITE_FROM = os.getenv("INVITE_FROM", "DaNA <onboarding@resend.dev>")
APP_URL = os.getenv("APP_URL", "https://dana-gamma-seven.vercel.app").rstrip("/")

"""Settings from environment variables (api/.env locally, host settings in production)."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load from api/.env directly relative to this file, then fallback to current working directory
_env_file = Path(__file__).resolve().parent.parent / ".env"
if _env_file.exists():
    load_dotenv(_env_file)
_root_env = Path(__file__).resolve().parent.parent.parent / ".env"
if _root_env.exists():
    load_dotenv(_root_env)
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000").split(",") if o.strip()]

JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
ISSUER = f"{SUPABASE_URL}/auth/v1"

# partner invitation emails (optional): set on the host to send automatically
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
INVITE_FROM = os.getenv("INVITE_FROM", "DaNA <onboarding@resend.dev>")
APP_URL = os.getenv("APP_URL", "https://dana-gamma-seven.vercel.app").rstrip("/")

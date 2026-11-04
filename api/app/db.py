"""
Database access through Supabase's REST API (PostgREST).
- as_user(): every request carries the user's own token, so the row-level
  security rules decide what they can see. This is the default.
- as_service(): the secret service key, for server-only jobs. It bypasses the
  privacy rules, so every caller must check permissions itself first.
"""
import httpx
from fastapi import HTTPException

from . import config


class Db:
    def __init__(self, bearer: str, apikey: str):
        self._client = httpx.Client(
            base_url=f"{config.SUPABASE_URL}/rest/v1",
            headers={"apikey": apikey, "Authorization": f"Bearer {bearer}"},
            timeout=15,
        )

    def _check(self, r: httpx.Response):
        if r.status_code >= 400:
            try:
                msg = r.json().get("message", r.text)
            except ValueError:
                msg = r.text
            raise HTTPException(r.status_code if r.status_code < 500 else 502, msg)
        return r.json() if r.content else None

    def select(self, table: str, **params):
        return self._check(self._client.get(f"/{table}", params=params))

    def insert(self, table: str, rows, upsert_on: str | None = None):
        headers = {"Prefer": "return=representation"}
        params = {}
        if upsert_on:
            headers["Prefer"] += ",resolution=merge-duplicates"
            params["on_conflict"] = upsert_on
        return self._check(self._client.post(f"/{table}", json=rows, headers=headers, params=params))

    def delete(self, table: str, **params):
        return self._check(self._client.delete(f"/{table}", params=params, headers={"Prefer": "return=minimal"}))

    def rpc(self, fn: str, args: dict | None = None):
        return self._check(self._client.post(f"/rpc/{fn}", json=args or {}))


def as_user(token: str) -> Db:
    return Db(token, config.SUPABASE_ANON_KEY)


def as_service() -> Db:
    if not config.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(503, "Server-side ingestion is not configured (SUPABASE_SERVICE_ROLE_KEY)")
    return Db(config.SUPABASE_SERVICE_ROLE_KEY, config.SUPABASE_SERVICE_ROLE_KEY)

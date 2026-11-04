"""API tests without a network: the login and database are replaced with fakes."""
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from app import auth, main


@pytest.fixture()
def client():
    return TestClient(main.app)


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_protected_routes_need_a_login(client):
    for path in ["/me", "/me/report", "/cases"]:
        assert client.get(path).status_code == 401
    assert client.post("/ingest/malaffi").status_code == 401


def test_token_signature_expiry_and_audience(monkeypatch):
    """verify_token accepts a correctly signed ES256 token and rejects forged, expired or wrong-audience ones."""
    key = ec.generate_private_key(ec.SECP256R1())
    other = ec.generate_private_key(ec.SECP256R1())

    class FakeJwks:
        def get_signing_key_from_jwt(self, token):
            return type("K", (), {"key": key.public_key()})()

    monkeypatch.setattr(auth, "_jwks", FakeJwks())
    monkeypatch.setattr(auth.config, "ISSUER", "https://x.supabase.co/auth/v1")
    base = {"sub": "u1", "aud": "authenticated", "iss": "https://x.supabase.co/auth/v1", "exp": int(time.time()) + 600}

    assert auth.verify_token(jwt.encode(base, key, algorithm="ES256"))["sub"] == "u1"
    for bad in [jwt.encode(base, other, algorithm="ES256"),                                  # forged signature
                jwt.encode({**base, "exp": int(time.time()) - 5}, key, algorithm="ES256"),    # expired
                jwt.encode({**base, "aud": "anon"}, key, algorithm="ES256")]:                 # wrong audience
        with pytest.raises(auth.HTTPException) as e:
            auth.verify_token(bad)
        assert e.value.status_code == 401


def test_validate_endpoint(client):
    main.app.dependency_overrides[auth.current_user] = lambda: auth.User(id="u1", email="a@b.c", token="t")
    try:
        from app.sample_bundle import malaffi_bundle
        ok = client.post("/ingest/validate", json=malaffi_bundle("RX")).json()
        assert ok["valid"] and ok["variants"][0]["gene_symbol"] == "HBB"
        bad = client.post("/ingest/validate", json={"resourceType": "Bundle", "entry": []}).json()
        assert not bad["valid"]
    finally:
        main.app.dependency_overrides.clear()

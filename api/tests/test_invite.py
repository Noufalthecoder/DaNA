from fastapi.testclient import TestClient

from app import invite
from app.main import app

client = TestClient(app)


def test_invite_needs_login():
    assert client.post("/invite/email", json={"email": "a@b.com", "code": "ABC123"}).status_code == 401


def test_email_check():
    assert invite.EMAIL.match("noor.ali@gmail.com")
    for bad in ["noor", "noor@", "@gmail.com", "a b@c.com", "noor@gmail"]:
        assert not invite.EMAIL.match(bad)


def test_rate_limit():
    uid = "limit-test-user"
    assert all(invite.allowed(uid) for _ in range(invite.LIMIT))
    assert not invite.allowed(uid)


def test_message_escapes_sender_name():
    subject, text, body = invite.build("<b>Eve</b>", "ABC123", "https://x.test/#/join/ABC123")
    assert "<b>Eve</b>" not in body and "&lt;b&gt;Eve&lt;/b&gt;" in body
    assert "ABC123" in text and "https://x.test/#/join/ABC123" in body

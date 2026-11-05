"""Partner invitation by email. Sent through Resend when RESEND_API_KEY is set on the host;
otherwise the endpoint answers 501 and the web app opens the user's own email app instead.
The key lives only in the host's environment (Render), never in the browser or in GitHub."""
import html
import re
import time
from collections import defaultdict, deque

import httpx

from . import config

EMAIL = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,190}\.[A-Za-z]{2,24}$")
CODE = re.compile(r"^[A-Z0-9]{6,8}$")
_sent: dict[str, deque] = defaultdict(deque)   # user id -> send times (simple abuse limit)
LIMIT, WINDOW = 10, 3600


def allowed(user_id: str) -> bool:
    now = time.time()
    q = _sent[user_id]
    while q and now - q[0] > WINDOW:
        q.popleft()
    if len(q) >= LIMIT:
        return False
    q.append(now)
    return True


def build(sender: str, code: str, link: str) -> tuple[str, str, str]:
    s = html.escape(sender)
    subject = f"{sender} invited you to DaNA premarital screening"
    text = (f"Assalamu alaikum,\n\n{sender} invited you to link on DaNA, the Abu Dhabi premarital "
            f"screening companion, so you can see your result as a couple.\n\n"
            f"Open: {link}\nOr enter this code in Connections: {code}\n\n"
            "Your results stay private: you choose what to share.\n\nDaNA")
    body = f"""<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1a1a1a">
<h2 style="color:#0a7a3e;margin:0 0 12px">DaNA</h2>
<p>Assalamu alaikum,</p>
<p><b>{s}</b> invited you to link on DaNA, the Abu Dhabi premarital screening companion,
so you can see your result as a couple.</p>
<p style="margin:22px 0"><a href="{html.escape(link)}" style="background:#0a7a3e;color:#fff;padding:12px 20px;
border-radius:8px;text-decoration:none;font-weight:bold">Accept the invitation</a></p>
<p>Or enter this code in <b>Connections</b>: <b style="font-size:20px;letter-spacing:3px">{code}</b></p>
<p style="color:#666;font-size:13px">Your results stay private: you choose what to share.
If you did not expect this email, you can ignore it.</p></div>"""
    return subject, text, body


def send(to: str, sender: str, code: str, link: str) -> None:
    subject, text, body = build(sender, code, link)
    r = httpx.post("https://api.resend.com/emails", timeout=20,
                   headers={"Authorization": f"Bearer {config.RESEND_API_KEY}"},
                   json={"from": config.INVITE_FROM, "to": [to], "subject": subject, "text": text, "html": body})
    if r.status_code >= 300:
        raise RuntimeError(f"Email service error {r.status_code}: {r.text[:200]}")

"""Arabic and Urdu speech for the DaNA guide, through Gemini text-to-speech.

The key (GEMINI_API_KEY) lives only on the server. Only signed-in users can call it, each person has a
small hourly limit, and the same sentence is spoken from a cache so the free quota lasts.
The text spoken is DaNA's own fixed answer text; nothing the person typed is sent.
"""
import base64
import hashlib
import io
import os
import time
import wave
from collections import OrderedDict, defaultdict, deque

import httpx

MODEL = "gemini-2.5-flash-preview-tts"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
VOICES = {"F": "Kore", "M": "Charon"}          # calm female / calm male
STYLE = {
    "ar": "Read this aloud in Arabic, Modern Standard Arabic with a gentle Gulf (Emirati) accent",
    "ur": "Read this aloud in Urdu",
    "en": "Read this aloud in English",
}
MAX_CHARS = 900
PER_HOUR = 40

_cache: "OrderedDict[str, bytes]" = OrderedDict()
_calls: "defaultdict[str, deque]" = defaultdict(deque)


class TTSError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def enabled() -> bool:
    return bool(os.getenv("GEMINI_API_KEY"))


def _wav(pcm: bytes, rate: int = 24000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)
    return buf.getvalue()


def _limit(user_id: str) -> None:
    now = time.time()
    q = _calls[user_id]
    while q and now - q[0] > 3600:
        q.popleft()
    if len(q) >= PER_HOUR:
        raise TTSError(429, "You have listened to many answers this hour. Please read the text, or try again later.")
    q.append(now)


def speak(text: str, lang: str, sex: str, user_id: str) -> bytes:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise TTSError(503, "Voice in Arabic and Urdu is not switched on yet.")
    text = (text or "").strip()[:MAX_CHARS]
    if not text:
        raise TTSError(400, "Nothing to read.")
    lang = lang if lang in STYLE else "ar"
    voice = VOICES.get(sex, VOICES["F"])
    ck = hashlib.sha256(f"{lang}|{voice}|{text}".encode()).hexdigest()
    if ck in _cache:
        _cache.move_to_end(ck)
        return _cache[ck]
    _limit(user_id)
    body = {
        "contents": [{"parts": [{"text": f"{STYLE[lang]}, in a warm, calm and reassuring voice, exactly as written:\n{text}"}]}],
        "generationConfig": {"responseModalities": ["AUDIO"],
                             "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}},
    }
    try:
        r = httpx.post(URL, json=body, headers={"x-goog-api-key": key}, timeout=60)
    except httpx.HTTPError:
        raise TTSError(502, "The voice service did not answer. Please try again.")
    if r.status_code == 429:
        raise TTSError(429, "The free voice quota is used up for now. Please read the text, or try again later.")
    if r.status_code != 200:
        raise TTSError(502, "The voice service could not read this answer.")
    try:
        part = r.json()["candidates"][0]["content"]["parts"][0]["inlineData"]
        rate = int(part.get("mimeType", "").split("rate=")[-1] or 24000)
        audio = _wav(base64.b64decode(part["data"]), rate)
    except (KeyError, IndexError, ValueError):
        raise TTSError(502, "The voice service could not read this answer.")
    _cache[ck] = audio
    if len(_cache) > 200:
        _cache.popitem(last=False)
    return audio

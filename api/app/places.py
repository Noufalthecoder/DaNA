"""
Places: the UAE reference locations (public.locations) and the rules that use them.

Pure functions only (no network), so the rules are easy to test against real rows.
The same rules are enforced in the database (supabase/030_location_scope.sql);
these exist so the API can explain and pre-check them.

  - an emirate is `state_name` (or the city itself when there is no state)
  - in-person visits are only offered inside one emirate; online works anywhere
  - nearest first: same area, then same emirate, then by distance
"""
import math
import re
import unicodedata

# the ways people (and the SimpleMaps import) spell each emirate -> the name used in `locations`
EMIRATE_ALIASES = {
    "abu dhabi": "Abu Dhabi", "abu zaby": "Abu Dhabi", "abudhabi": "Abu Dhabi",
    "dubai": "Dubai", "dubayy": "Dubai", "dxb": "Dubai",
    "sharjah": "Sharjah", "ash shariqah": "Sharjah", "al shariqah": "Sharjah",
    "ajman": "Ajman",
    "ras al khaimah": "Ras Al Khaimah", "ras al khaymah": "Ras Al Khaimah", "rak": "Ras Al Khaimah",
    "fujairah": "Fujairah", "al fujayrah": "Fujairah", "fujeirah": "Fujairah",
    "umm al quwain": "Umm Al Quwain", "umm al qaywayn": "Umm Al Quwain", "uaq": "Umm Al Quwain",
}


def normalize(text: str | None) -> str:
    """Lowercase, no accents, no apostrophes, single spaces: 'Ra’s al Khaymah' -> 'ras al khaymah'."""
    if not text:
        return ""
    t = unicodedata.normalize("NFKD", str(text))
    t = "".join(c for c in t if not unicodedata.combining(c)).lower()
    t = re.sub(r"[‘’ʻ`'’‘]", "", t)
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


def emirate_of(row: dict | None) -> str | None:
    if not row:
        return None
    return (row.get("state_name") or "").strip() or row.get("city")


def label_of(row: dict | None) -> str | None:
    if not row:
        return None
    em = emirate_of(row)
    return row["city"] if em == row["city"] else f"{row['city']}, {em}"


def public_place(row: dict | None) -> dict | None:
    """The shape the API returns: no source ids, coordinates kept for distance."""
    if not row:
        return None
    return {"id": row["id"], "city": row["city"], "emirate": emirate_of(row), "label": label_of(row),
            "latitude": row.get("latitude"), "longitude": row.get("longitude")}


def distance_km(a: dict | None, b: dict | None) -> float | None:
    """Great-circle distance; None if either place has no coordinates (same formula as loc_distance_km in SQL)."""
    if not a or not b or None in (a.get("latitude"), a.get("longitude"), b.get("latitude"), b.get("longitude")):
        return None
    la1, lo1, la2, lo2 = map(math.radians, (a["latitude"], a["longitude"], b["latitude"], b["longitude"]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return round(6371 * 2 * math.asin(math.sqrt(h)), 1)


def group_by_emirate(rows: list[dict]) -> list[dict]:
    by: dict[str, list[dict]] = {}
    for r in rows:
        by.setdefault(emirate_of(r), []).append(r)
    return [{"emirate": em, "places": [{"id": r["id"], "city": r["city"]} for r in sorted(items, key=lambda x: x["city"])]}
            for em, items in sorted(by.items())]


def _representative(rows: list[dict], emirate: str) -> dict | None:
    """The place that stands for a whole emirate: the one named after it, else the one nearest the emirate's centre."""
    members = [r for r in rows if emirate_of(r) == emirate]
    if not members:
        return None
    for r in members:
        if normalize(r["city"]) == normalize(emirate):
            return r
    pts = [r for r in members if r.get("latitude") is not None and r.get("longitude") is not None]
    if not pts:
        return members[0]
    centre = {"latitude": sum(r["latitude"] for r in pts) / len(pts), "longitude": sum(r["longitude"] for r in pts) / len(pts)}
    return min(pts, key=lambda r: distance_km(centre, r) or 0)


def resolve(text: str | None, rows: list[dict], limit: int = 5) -> list[dict]:
    """
    Turn free text into places, best first. Each hit has a score (0-1) and a
    precision: 'area' (a named place) or 'emirate' (the text only named an emirate,
    so the hit is the emirate's representative place).
      'Dubai Marina'        -> Dubai Marina, Dubai          (area, 1.0)
      'Dubayy'              -> a central Dubai place        (emirate, 0.9)
      'Ra’s al Khaymah'     -> Ras Al Khaimah               (area, 1.0)
      'marina, dubai'       -> Dubai Marina (emirate hint narrows 'marina')
    """
    raw = (text or "").strip()
    if not raw:
        return []
    parts = [p for p in re.split(r"[,/|]", raw) if p.strip()]
    n = normalize(parts[0])
    hint = next((EMIRATE_ALIASES[normalize(p)] for p in parts[1:] if normalize(p) in EMIRATE_ALIASES), None)
    pool = [r for r in rows if not hint or emirate_of(r) == hint]
    hits: dict[int, tuple[float, str]] = {}

    def add(r, score, precision):
        if r["id"] not in hits or hits[r["id"]][0] < score:
            hits[r["id"]] = (score, precision)

    for r in pool:
        c, ca = normalize(r["city"]), normalize(r.get("city_ascii") or "")
        if n and n in (c, ca):
            add(r, 1.0, "area")
        elif n and (c.startswith(n) or ca.startswith(n)):
            add(r, 0.75, "area")
        elif n and len(n) >= 3 and (n in c or n in ca):
            add(r, 0.6, "area")
    if n in EMIRATE_ALIASES and not any(s == 1.0 for s, _ in hits.values()):
        rep = _representative(pool, EMIRATE_ALIASES[n])
        if rep:
            add(rep, 0.9, "emirate")
    elif n in EMIRATE_ALIASES:
        pass  # an exact area (e.g. the city of Abu Dhabi) already wins over the emirate
    by_id = {r["id"]: r for r in pool}
    ordered = sorted(hits.items(), key=lambda kv: (-kv[1][0], by_id[kv[0]]["city"]))
    return [{**public_place(by_id[i]), "score": s, "precision": p} for i, (s, p) in ordered[:limit]]


def best_match(text: str | None, rows: list[dict]) -> dict | None:
    """One confident answer or None: needs score >= 0.9 and no tie with another top hit."""
    hits = resolve(text, rows, limit=2)
    if not hits or hits[0]["score"] < 0.9:
        return None
    if len(hits) > 1 and hits[1]["score"] == hits[0]["score"]:
        return None
    return hits[0]


def rank_counsellors(origin: dict | None, counsellors: list[dict], places: dict[int, dict], open_slots: dict[str, list[str]],
                     modality: str = "any") -> list[dict]:
    """
    Order counsellors for someone living at `origin` (a place row or None).
    modality: 'any' | 'online' | 'in_person'. In-person only counts inside the origin's emirate
    (the database refuses any other pairing), and a counsellor with no clinic place can only be online.
    """
    home_em = emirate_of(origin)
    out = []
    for k in counsellors:
        place = places.get(k.get("location_id"))
        same_place = bool(origin and place and place["id"] == origin["id"])
        same_em = bool(origin and place and emirate_of(place) == home_em)
        km = distance_km(origin, place)
        can_online = bool(k.get("offers_online"))
        can_in_person = bool(k.get("offers_in_person")) and place is not None and (origin is None or same_em)
        if modality == "online" and not can_online:
            continue
        if modality == "in_person" and not can_in_person:
            continue
        if not (can_online or can_in_person):
            continue
        slots = sorted(open_slots.get(k["id"], []))
        out.append({
            "id": k["id"], "name": k["name"], "gender": k.get("gender"), "languages": k.get("languages"),
            "place": public_place(place), "distance_km": km,
            "match": "same_area" if same_place else "same_emirate" if same_em else "other_emirate" if place else "no_clinic",
            "can_online": can_online, "can_in_person": can_in_person,
            "open_slots_14d": len(slots), "next_open_slot": slots[0] if slots else None,
        })
    rank = {"same_area": 0, "same_emirate": 1, "other_emirate": 2, "no_clinic": 3}
    out.sort(key=lambda c: (rank[c["match"]], c["distance_km"] if c["distance_km"] is not None else 1e9,
                            c["next_open_slot"] or "9999", c["name"]))
    return out

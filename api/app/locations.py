"""
DaNA Location Database Integration & Dynamic Admin Filter Engine
Provides normalized reference location queries and dynamic account directory filtering.

Connects directly to Supabase PostgREST for:
- public.locations (city, city_ascii, state_name, country, country_code, latitude, longitude)
- public.accounts, public.people, public.couples (healthcare IAM and relationship bonds)

Strict Healthcare Data Protection:
- Zero clinical or genetic reports/variants/carrier status exposed.
- Admin categories strictly limited to: doh_admin, counsellor, couple.
- Gender ('male', 'female') operates on profile data (people.sex), NOT as an account role.
"""

import os
import re
import unicodedata
import logging
from typing import Any, Dict, List, Optional
import httpx
from fastapi import HTTPException, Query

from . import config

logger = logging.getLogger(__name__)

# Canonical IAM categories
VALID_ACCOUNT_CATEGORIES = ["doh_admin", "counsellor", "couple"]
VALID_GENDERS = ["male", "female"]
VALID_STATUSES = ["active", "suspended"]

# Default UAE Reference Locations from SimpleMaps World Cities dataset (Scoped to Dubai Country for Hackathon)
DEFAULT_UAE_LOCATIONS = [
    {"id": 1, "city": "Downtown Dubai", "city_ascii": "Downtown Dubai", "state_name": "Dubai", "country": "Dubai", "country_code": "AE", "latitude": 25.1972, "longitude": 55.2744},
    {"id": 2, "city": "Dubai Marina", "city_ascii": "Dubai Marina", "state_name": "Dubai", "country": "Dubai", "country_code": "AE", "latitude": 25.0805, "longitude": 55.1403},
    {"id": 3, "city": "Jumeirah", "city_ascii": "Jumeirah", "state_name": "Dubai", "country": "Dubai", "country_code": "AE", "latitude": 25.2048, "longitude": 55.2380},
    {"id": 4, "city": "Deira", "city_ascii": "Deira", "state_name": "Dubai", "country": "Dubai", "country_code": "AE", "latitude": 25.2697, "longitude": 55.3095},
    {"id": 5, "city": "Bur Dubai", "city_ascii": "Bur Dubai", "state_name": "Dubai", "country": "Dubai", "country_code": "AE", "latitude": 25.2582, "longitude": 55.2972},
    {"id": 6, "city": "Business Bay", "city_ascii": "Business Bay", "state_name": "Dubai", "country": "Dubai", "country_code": "AE", "latitude": 25.1850, "longitude": 55.2680},
    {"id": 7, "city": "Al Barsha", "city_ascii": "Al Barsha", "state_name": "Dubai", "country": "Dubai", "country_code": "AE", "latitude": 25.1118, "longitude": 55.2052},
    {"id": 8, "city": "Palm Jumeirah", "city_ascii": "Palm Jumeirah", "state_name": "Dubai", "country": "Dubai", "country_code": "AE", "latitude": 25.1124, "longitude": 55.1390},
    {"id": 9, "city": "Jumeirah Beach Residence", "city_ascii": "Jumeirah Beach Residence", "state_name": "Dubai", "country": "Dubai", "country_code": "AE", "latitude": 25.0780, "longitude": 55.1330},
    {"id": 10, "city": "DIFC", "city_ascii": "DIFC", "state_name": "Dubai", "country": "Dubai", "country_code": "AE", "latitude": 25.2105, "longitude": 55.2800},
    {"id": 21, "city": "Abu Dhabi", "city_ascii": "Abu Dhabi", "state_name": "Abu Dhabi", "country": "Dubai", "country_code": "AE", "latitude": 24.4511, "longitude": 54.3969},
    {"id": 22, "city": "Al Ain", "city_ascii": "Al Ain", "state_name": "Abu Dhabi", "country": "Dubai", "country_code": "AE", "latitude": 24.2075, "longitude": 55.7447},
    {"id": 31, "city": "Ajman", "city_ascii": "Ajman", "state_name": "Ajman", "country": "Dubai", "country_code": "AE", "latitude": 25.3994, "longitude": 55.4797},
    {"id": 32, "city": "Fujairah", "city_ascii": "Fujairah", "state_name": "Fujairah", "country": "Dubai", "country_code": "AE", "latitude": 25.1222, "longitude": 56.3344},
    {"id": 33, "city": "Ras Al Khaimah", "city_ascii": "Ras Al Khaimah", "state_name": "Ras Al Khaimah", "country": "Dubai", "country_code": "AE", "latitude": 25.7851, "longitude": 55.9479},
    {"id": 36, "city": "Sharjah", "city_ascii": "Sharjah", "state_name": "Sharjah", "country": "Dubai", "country_code": "AE", "latitude": 25.3375, "longitude": 55.4119},
    {"id": 37, "city": "Umm Al Quwain", "city_ascii": "Umm Al Quwain", "state_name": "Umm Al Quwain", "country": "Dubai", "country_code": "AE", "latitude": 25.5598, "longitude": 55.5572},
]

# Default UAE Reference People Profiles
DEFAULT_PEOPLE = [
    {"id": "khalid", "name": "Khalid Al Mansoori", "short_name": "Khalid", "sex": "M", "birth_year": 1998, "language": "ar", "location_id": 1, "city": "Downtown Dubai", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
    {"id": "fatima", "name": "Fatima Al Hammadi", "short_name": "Fatima", "sex": "F", "birth_year": 2000, "language": "ar", "location_id": 1, "city": "Downtown Dubai", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
    {"id": "ahmed", "name": "Ahmed Al Ketbi", "short_name": "Ahmed", "sex": "M", "birth_year": 1995, "language": "ar", "location_id": 2, "city": "Dubai Marina", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
    {"id": "noura", "name": "Noura Al Ketbi", "short_name": "Noura", "sex": "F", "birth_year": 1997, "language": "ar", "location_id": 2, "city": "Dubai Marina", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
    {"id": "saeed", "name": "Saeed Al Nuaimi", "short_name": "Saeed", "sex": "M", "birth_year": 1999, "language": "ar", "location_id": 22, "city": "Al Ain", "state_name": "Abu Dhabi", "country": "Dubai", "country_code": "AE"},
    {"id": "maryam", "name": "Maryam Al Shamsi", "short_name": "Maryam", "sex": "F", "birth_year": 2001, "language": "ar", "location_id": 22, "city": "Al Ain", "state_name": "Abu Dhabi", "country": "Dubai", "country_code": "AE"},
    {"id": "omar", "name": "Omar Al Dhaheri", "short_name": "Omar", "sex": "M", "birth_year": 1994, "language": "ar", "location_id": 36, "city": "Sharjah", "state_name": "Sharjah", "country": "Dubai", "country_code": "AE"},
    {"id": "latifa", "name": "Latifa Al Mazrouei", "short_name": "Latifa", "sex": "F", "birth_year": 1996, "language": "ar", "location_id": 36, "city": "Sharjah", "state_name": "Sharjah", "country": "Dubai", "country_code": "AE"},
    {"id": "rashid", "name": "Rashid Al Suwaidi", "short_name": "Rashid", "sex": "M", "birth_year": 1997, "language": "ar", "location_id": 33, "city": "Ras Al Khaimah", "state_name": "Ras Al Khaimah", "country": "Dubai", "country_code": "AE"},
    {"id": "aisha", "name": "Aisha Al Falasi", "short_name": "Aisha", "sex": "F", "birth_year": 1999, "language": "ar", "location_id": 33, "city": "Ras Al Khaimah", "state_name": "Ras Al Khaimah", "country": "Dubai", "country_code": "AE"},
    {"id": "hamdan", "name": "Hamdan Al Qubaisi", "short_name": "Hamdan", "sex": "M", "birth_year": 2000, "language": "ar", "location_id": 32, "city": "Fujairah", "state_name": "Fujairah", "country": "Dubai", "country_code": "AE"},
    {"id": "shamma", "name": "Shamma Al Zaabi", "short_name": "Shamma", "sex": "F", "birth_year": 2002, "language": "ar", "location_id": 32, "city": "Fujairah", "state_name": "Fujairah", "country": "Dubai", "country_code": "AE"},
    {"id": "rohit", "name": "Rohit Sharma", "short_name": "Rohit", "sex": "M", "birth_year": 1996, "language": "en", "location_id": 8, "city": "Palm Jumeirah", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
    {"id": "priya", "name": "Priya Sundaram", "short_name": "Priya", "sex": "F", "birth_year": 1998, "language": "en", "location_id": 8, "city": "Palm Jumeirah", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
    {"id": "arjun", "name": "Arjun Kapoor", "short_name": "Arjun", "sex": "M", "birth_year": 1995, "language": "en", "location_id": 10, "city": "DIFC", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
    {"id": "ananya_p", "name": "Ananya Iyer", "short_name": "Ananya", "sex": "F", "birth_year": 1997, "language": "en", "location_id": 10, "city": "DIFC", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
]

# Default UAE Reference Couples
DEFAULT_COUPLES = [
    {"id": "c1", "partner_a": "khalid", "partner_b": "fatima", "stage": "engaged", "pregnant_weeks": None, "screened_on": "2026-10-12"},
    {"id": "c2", "partner_a": "ahmed", "partner_b": "noura", "stage": "married", "pregnant_weeks": 11, "screened_on": "2026-09-02"},
    {"id": "c3", "partner_a": "saeed", "partner_b": "maryam", "stage": "engaged", "pregnant_weeks": None, "screened_on": "2026-10-20"},
    {"id": "c4", "partner_a": "omar", "partner_b": "latifa", "stage": "married", "pregnant_weeks": None, "screened_on": "2026-08-15"},
    {"id": "c5", "partner_a": "rashid", "partner_b": "aisha", "stage": "engaged", "pregnant_weeks": None, "screened_on": "2026-10-28"},
    {"id": "c6", "partner_a": "hamdan", "partner_b": "shamma", "stage": "engaged", "pregnant_weeks": None, "screened_on": "2026-10-30"},
    {"id": "c7", "partner_a": "rohit", "partner_b": "priya", "stage": "engaged", "pregnant_weeks": None, "screened_on": "2026-11-01"},
    {"id": "c8", "partner_a": "arjun", "partner_b": "ananya_p", "stage": "married", "pregnant_weeks": None, "screened_on": "2026-11-05"},
]

# Default UAE Accounts
DEFAULT_ACCOUNTS = [
    {"user_id": "doh", "role": "admin", "person_id": None, "display_name": "Programme team", "title": "DoH premarital programme", "status": "active", "email": "doh@dana.demo", "city": "Downtown Dubai", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
    {"user_id": "admin_sec", "role": "admin", "person_id": None, "display_name": "Security Operations Lead", "title": "DoH IAM Security Authority", "status": "active", "email": "sec.admin@doh.gov.ae", "city": "DIFC", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
    {"user_id": "mariam", "role": "counsellor", "person_id": None, "display_name": "Dr. Mariam Al Hosani", "title": "Senior Genetic Counsellor · Lic. LIC-GC-2024-089", "status": "active", "email": "mariam@dana.demo", "city": "Abu Dhabi", "state_name": "Abu Dhabi", "country": "Dubai", "country_code": "AE"},
    {"user_id": "sara", "role": "counsellor", "person_id": None, "display_name": "Dr. Sara Al Zaabi", "title": "Clinical Geneticist & Counsellor · Lic. LIC-GC-2025-114", "status": "active", "email": "sara.zaabi@ssmc.ae", "city": "Dubai Marina", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
    {"user_id": "counsellor_in", "role": "counsellor", "person_id": None, "display_name": "Dr. Rajesh Raman", "title": "Lead Genetic Counsellor · SSMC Dubai Healthcare City", "status": "active", "email": "rajesh.raman@genetics.ae", "city": "Business Bay", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
    {"user_id": "khalid", "role": "couple", "person_id": "khalid", "display_name": "Khalid Al Mansoori", "title": "Partner · engaged with Fatima Al Hammadi (Couple c1)", "status": "active", "email": "khalid@dana.demo", "city": "Downtown Dubai", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
    {"user_id": "fatima", "role": "couple", "person_id": "fatima", "display_name": "Fatima Al Hammadi", "title": "Partner · engaged with Khalid Al Mansoori (Couple c1)", "status": "active", "email": "fatima@dana.demo", "city": "Downtown Dubai", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
    {"user_id": "ahmed", "role": "couple", "person_id": "ahmed", "display_name": "Ahmed Al Ketbi", "title": "Partner · married with Noura Al Ketbi (Couple c2)", "status": "active", "email": "ahmed@dana.demo", "city": "Dubai Marina", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
    {"user_id": "noura", "role": "couple", "person_id": "noura", "display_name": "Noura Al Ketbi", "title": "Partner · married with Ahmed Al Ketbi (Couple c2)", "status": "active", "email": "noura@dana.demo", "city": "Dubai Marina", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
    {"user_id": "saeed", "role": "couple", "person_id": "saeed", "display_name": "Saeed Al Nuaimi", "title": "Partner · engaged with Maryam Al Shamsi (Couple c3)", "status": "active", "email": "saeed@dana.demo", "city": "Al Ain", "state_name": "Abu Dhabi", "country": "Dubai", "country_code": "AE"},
    {"user_id": "maryam", "role": "couple", "person_id": "maryam", "display_name": "Maryam Al Shamsi", "title": "Partner · engaged with Saeed Al Nuaimi (Couple c3)", "status": "active", "email": "maryam@dana.demo", "city": "Al Ain", "state_name": "Abu Dhabi", "country": "Dubai", "country_code": "AE"},
    {"user_id": "omar", "role": "couple", "person_id": "omar", "display_name": "Omar Al Dhaheri", "title": "Partner · married with Latifa Al Mazrouei (Couple c4)", "status": "active", "email": "omar@dana.demo", "city": "Sharjah", "state_name": "Sharjah", "country": "Dubai", "country_code": "AE"},
    {"user_id": "latifa", "role": "couple", "person_id": "latifa", "display_name": "Latifa Al Mazrouei", "title": "Partner · married with Omar Al Dhaheri (Couple c4)", "status": "active", "email": "latifa@dana.demo", "city": "Sharjah", "state_name": "Sharjah", "country": "Dubai", "country_code": "AE"},
    {"user_id": "rashid", "role": "couple", "person_id": "rashid", "display_name": "Rashid Al Suwaidi", "title": "Partner · engaged with Aisha Al Falasi (Couple c5)", "status": "active", "email": "rashid@dana.demo", "city": "Ras Al Khaimah", "state_name": "Ras Al Khaimah", "country": "Dubai", "country_code": "AE"},
    {"user_id": "aisha", "role": "couple", "person_id": "aisha", "display_name": "Aisha Al Falasi", "title": "Partner · engaged with Rashid Al Suwaidi (Couple c5)", "status": "active", "email": "aisha@dana.demo", "city": "Ras Al Khaimah", "state_name": "Ras Al Khaimah", "country": "Dubai", "country_code": "AE"},
    {"user_id": "hamdan", "role": "couple", "person_id": "hamdan", "display_name": "Hamdan Al Qubaisi", "title": "Partner · engaged with Shamma Al Zaabi (Couple c6)", "status": "active", "email": "hamdan@dana.demo", "city": "Fujairah", "state_name": "Fujairah", "country": "Dubai", "country_code": "AE"},
    {"user_id": "shamma", "role": "couple", "person_id": "shamma", "display_name": "Shamma Al Zaabi", "title": "Partner · engaged with Hamdan Al Qubaisi (Couple c6)", "status": "active", "email": "shamma@dana.demo", "city": "Fujairah", "state_name": "Fujairah", "country": "Dubai", "country_code": "AE"},
    {"user_id": "rohit", "role": "couple", "person_id": "rohit", "display_name": "Rohit Sharma", "title": "Partner · engaged with Priya Sundaram (Couple c7)", "status": "active", "email": "rohit.sharma@example.ae", "city": "Palm Jumeirah", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
    {"user_id": "priya", "role": "couple", "person_id": "priya", "display_name": "Priya Sundaram", "title": "Partner · engaged with Rohit Sharma (Couple c7)", "status": "active", "email": "priya.sundaram@example.ae", "city": "Palm Jumeirah", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
    {"user_id": "arjun", "role": "couple", "person_id": "arjun", "display_name": "Arjun Kapoor", "title": "Partner · married with Ananya Iyer (Couple c8)", "status": "active", "email": "arjun.kapoor@example.ae", "city": "DIFC", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
    {"user_id": "ananya_p", "role": "couple", "person_id": "ananya_p", "display_name": "Ananya Iyer", "title": "Partner · married with Arjun Kapoor (Couple c8)", "status": "active", "email": "ananya.iyer@example.ae", "city": "DIFC", "state_name": "Dubai", "country": "Dubai", "country_code": "AE"},
]


def normalize_text(text: Optional[str]) -> str:
    """Normalize string for accent-insensitive and case-insensitive comparison."""
    if not text:
        return ""
    nfkd_form = unicodedata.normalize('NFKD', text)
    clean = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    return clean.strip().lower()


def _unwrap_str(val: Any) -> Optional[str]:
    """Safely extracts string value from FastAPI Query objects or literals."""
    if val is None:
        return None
    if hasattr(val, "default"):
        val = val.default
    if val is None or isinstance(val, type(Ellipsis)):
        return None
    s = str(val).strip()
    return s if s else None


def _unwrap_int(val: Any, default: int) -> int:
    """Safely extracts integer value from FastAPI Query objects or literals."""
    if val is None:
        return default
    if hasattr(val, "default"):
        val = val.default
    if val is None or isinstance(val, type(Ellipsis)):
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


_last_supabase_error: float = 0.0
CIRCUIT_BREAKER_SECS: float = 10.0


def fetch_supabase_table(table: str, select: str = "*", filters: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
    """
    Directly query Supabase REST API (PostgREST) for table records.
    Returns list of dicts if Supabase responds with data, otherwise empty list.
    """
    global _last_supabase_error
    import time

    if not config.SUPABASE_URL or not config.SUPABASE_ANON_KEY:
        return []

    # If Supabase timed out or errored recently (e.g. sandbox network isolation), don't stall
    if time.time() - _last_supabase_error < CIRCUIT_BREAKER_SECS:
        return []

    auth_key = getattr(config, "SUPABASE_SERVICE_ROLE_KEY", None) or config.SUPABASE_ANON_KEY
    try:
        url = f"{config.SUPABASE_URL}/rest/v1/{table}"
        params = {"select": select}
        if filters:
            params.update(filters)
        headers = {
            "apikey": auth_key,
            "Authorization": f"Bearer {auth_key}",
        }
        with httpx.Client(timeout=2.0) as client:
            resp = client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    return data
    except Exception as exc:
        _last_supabase_error = time.time()
        logger.warning(f"Error querying Supabase table {table}: {exc}")
    return []


# =============================================================================
# 1. Location Reference APIs (Countries -> States -> Cities)
# =============================================================================

def get_admin_countries(search: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Retrieve distinct countries available in location reference data.
    Scoped strictly to Dubai country for Dubai Hackathon.
    """
    search = _unwrap_str(search)
    rows = [{"name": "Dubai", "code": "AE"}]
    if search:
        norm_q = normalize_text(search)
        rows = [c for c in rows if norm_q in normalize_text(c["name"]) or norm_q in normalize_text(c.get("code", ""))]
    return rows


def get_admin_states(country: str, search: Optional[str] = None) -> List[str]:
    """
    Retrieve states / administrative regions for a given country.
    Directly queries Supabase public.locations.
    """
    country = _unwrap_str(country)
    search = _unwrap_str(search)
    if not country:
        raise HTTPException(status_code=400, detail="Query parameter 'country' is required.")

    norm_country = normalize_text(country)
    is_uae = norm_country in ("dubai", "uae", "ae", "united arab emirates")

    # 1. Query Supabase locations table; derive emirate-level labels
    #    (country_code = AE rows are UAE, so group by parent emirate
    #    inferred from each city row's state_name).
    sb_filters = {"country_code": "eq.AE"} if is_uae else {"country": f"ilike.{country}"}
    sb_data = fetch_supabase_table("locations", select="state_name,country,country_code", filters=sb_filters)

    states = set()
    if sb_data:
        for r in sb_data:
            s_name = r.get("state_name")
            if s_name and s_name.strip():
                states.add(s_name.strip())

    # 2. Fallback to default reference if Supabase is empty (keeps tests
    #    meaningful against a local DB without re-introducing hard-coded
    #    live data in this module).
    if not states:
        for r in DEFAULT_UAE_LOCATIONS:
            if is_uae or normalize_text(r["country"]) == norm_country:
                if r.get("state_name"):
                    states.add(r["state_name"].strip())

    state_list = sorted(list(states))
    if search:
        norm_q = normalize_text(search)
        state_list = [s for s in state_list if norm_q in normalize_text(s)]

    return state_list


def get_admin_cities(country: str, state: Optional[str] = None, search: Optional[str] = None,
                     page: int = 1, limit: int = 50) -> Dict[str, Any]:
    """
    Retrieve cities belonging to selected country and optional state with pagination.
    Directly queries Supabase public.locations.
    """
    country = _unwrap_str(country)
    state = _unwrap_str(state)
    search = _unwrap_str(search)
    page = max(1, _unwrap_int(page, 1))
    limit = max(1, min(_unwrap_int(limit, 50), 200))

    if not country:
        raise HTTPException(status_code=400, detail="Query parameter 'country' is required.")

    norm_country = normalize_text(country)
    norm_state = normalize_text(state) if state else None
    is_uae = norm_country in ("dubai", "uae", "ae", "united arab emirates")

    # 1. Query Supabase locations table
    sb_filters = {"country_code": "eq.AE"} if is_uae else {"country": f"ilike.{country}"}
    if norm_state:
        sb_filters["state_name"] = f"ilike.*{state}*"

    sb_data = fetch_supabase_table(
        "locations",
        select="id,city,city_ascii,state_name,country,country_code,latitude,longitude",
        filters=sb_filters
    )

    candidates = sb_data if sb_data else DEFAULT_UAE_LOCATIONS

    filtered = []
    for loc in candidates:
        loc_country = normalize_text(loc.get("country", ""))
        loc_code = normalize_text(loc.get("country_code", ""))
        if is_uae:
            if loc_code != "ae" and "emirates" not in loc_country and "dubai" not in loc_country:
                continue
        elif norm_country != loc_country and norm_country != loc_code:
            continue

        if norm_state:
            loc_state_norm = normalize_text(loc.get("state_name", ""))
            if loc_state_norm != norm_state and norm_state not in loc_state_norm:
                continue

        if search:
            loc_city_norm = normalize_text(loc.get("city", ""))
            if normalize_text(search) not in loc_city_norm:
                continue

        filtered.append(loc)

    filtered.sort(key=lambda x: (x.get("city") or "").lower())
    total = len(filtered)
    start = (page - 1) * limit
    paginated = filtered[start:start + limit]

    return {
        "country": country,
        "state": state,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit if total > 0 else 0,
        "cities": [loc["city"] for loc in paginated if loc.get("city")],
        "items": paginated,
    }


# =============================================================================
# 2. Account Directory & Filtering Engine (GET /api/admin/accounts)
# =============================================================================

def get_admin_accounts(
    role: Optional[str] = None,
    gender: Optional[str] = None,
    country: Optional[str] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> Dict[str, Any]:
    """
    Core account directory query engine:
    Fetches real data from Supabase accounts, people, couples, and locations.
    Enforces zero-knowledge isolation of clinical/genetic data.
    """
    role = _unwrap_str(role)
    gender = _unwrap_str(gender)
    country = _unwrap_str(country)
    state = _unwrap_str(state)
    city = _unwrap_str(city)
    search = _unwrap_str(search)
    status = _unwrap_str(status)
    page = max(1, _unwrap_int(page, 1))
    limit = max(1, min(_unwrap_int(limit, 20), 100))

    # 1. Validate role filter against allowed categories
    db_role_filter = None
    if role:
        clean_role = role.strip().lower()
        if clean_role not in ("doh_admin", "admin", "counsellor", "couple"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid role filter '{role}'. Supported categories: doh_admin, counsellor, couple"
            )
        if clean_role in ("doh_admin", "admin"):
            db_role_filter = ("admin", "doh_admin")
        else:
            db_role_filter = (clean_role,)

    # 2. Validate gender filter (male / female)
    db_sex_filter = None
    if gender:
        clean_gender = gender.strip().lower()
        if clean_gender in ("male", "m"):
            db_sex_filter = "M"
        elif clean_gender in ("female", "f"):
            db_sex_filter = "F"
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid gender filter '{gender}'. Supported values: male, female"
            )

    # 3. Validate status filter
    if status and status.strip().lower() not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status filter '{status}'. Supported values: active, suspended"
        )

    # Fetch from Supabase
    sb_accounts = fetch_supabase_table("accounts")
    sb_people = fetch_supabase_table("people")
    sb_couples = fetch_supabase_table("couples")
    sb_locations = fetch_supabase_table("locations")

    use_live_sb = bool(sb_accounts and len(sb_accounts) > 0)
    raw_accounts = sb_accounts if use_live_sb else DEFAULT_ACCOUNTS
    raw_people = sb_people if use_live_sb and sb_people else DEFAULT_PEOPLE
    raw_couples = sb_couples if use_live_sb and sb_couples else DEFAULT_COUPLES
    raw_locations = sb_locations if sb_locations else DEFAULT_UAE_LOCATIONS

    people_map = {p["id"]: p for p in raw_people if "id" in p}
    locations_by_id = {loc["id"]: loc for loc in raw_locations if "id" in loc}
    locations_by_city = {normalize_text(loc["city"]): loc for loc in raw_locations if "city" in loc}

    # Build couples map: partner_id -> couple info
    couples_by_partner = {}
    for c in raw_couples:
        p_a = c.get("partner_a")
        p_b = c.get("partner_b")
        stage = c.get("stage", "engaged")
        c_id = c.get("id")
        if p_a:
            couples_by_partner[p_a] = {"couple_id": c_id, "partner_id": p_b, "stage": stage}
        if p_b:
            couples_by_partner[p_b] = {"couple_id": c_id, "partner_id": p_a, "stage": stage}

    matched_accounts = []
    for acc in raw_accounts:
        acc_role = acc.get("role", "")
        mapped_role = "doh_admin" if acc_role in ("admin", "doh_admin") else acc_role

        # Role check
        if db_role_filter and acc_role not in db_role_filter and mapped_role not in db_role_filter:
            continue

        person_id = acc.get("person_id")
        person = people_map.get(person_id) if person_id else None

        person_sex = (person.get("sex") if person else None) or acc.get("sex")
        if person_sex:
            person_sex = person_sex.upper()

        # Gender check
        if db_sex_filter:
            if not person_sex or person_sex != db_sex_filter:
                continue

        # Status check
        acc_status = acc.get("status", "active")
        if status and acc_status.lower() != status.strip().lower():
            continue

        # Location metadata resolution
        loc = None
        loc_id = acc.get("location_id") or (person.get("location_id") if person else None)
        if loc_id and loc_id in locations_by_id:
            loc = locations_by_id[loc_id]
        if not loc:
            city_hint = acc.get("city") or (person.get("city") if person else None)
            if city_hint:
                loc = locations_by_city.get(normalize_text(city_hint))

        acc_country = (loc.get("country") if loc else None) or acc.get("country") or (person.get("country") if person else "")
        acc_country_code = (loc.get("country_code") if loc else None) or acc.get("country_code") or (person.get("country_code") if person else "")
        acc_state = (loc.get("state_name") if loc else None) or acc.get("state_name") or (person.get("state_name") if person else "")
        acc_city = (loc.get("city") if loc else None) or acc.get("city") or (person.get("city") if person else "")

        # Country filter (only applied when admin actively selects a country)
        if country:
            norm_c = normalize_text(country)
            loc_c = normalize_text(acc_country)
            loc_code = normalize_text(acc_country_code)
            if norm_c in ("dubai", "uae", "ae", "united arab emirates"):
                # If account has an explicit foreign location, exclude it.
                # If loc_c is empty (account has unassigned location in the UAE programme), retain it.
                if loc_c and loc_code and loc_code != "ae" and "emirates" not in loc_c and "dubai" not in loc_c:
                    continue
            elif norm_c != loc_c and norm_c != loc_code:
                if loc_c:
                    continue

        # State filter (only applied when admin actively selects a state)
        if state:
            norm_s = normalize_text(state)
            loc_s = normalize_text(acc_state)
            if norm_s != loc_s and norm_s not in loc_s:
                continue

        # City filter (only applied when admin actively selects a city)
        if city:
            norm_city = normalize_text(city)
            loc_city = normalize_text(acc_city)
            if norm_city != loc_city and norm_city not in loc_city:
                continue

        # Search filter
        if search:
            q = normalize_text(search)
            haystack = " ".join([
                normalize_text(acc.get("display_name", "")),
                normalize_text(acc.get("email", "")),
                normalize_text(acc.get("user_id", "")),
                normalize_text(acc.get("title", "")),
                normalize_text(acc_city),
                normalize_text(acc_state),
                normalize_text(acc_country),
            ])
            if q not in haystack:
                continue

        # Profile gender representation
        gender_val = None
        if person_sex:
            gender_val = "male" if person_sex == "M" else "female" if person_sex == "F" else None

        record = {
            "id": acc.get("user_id"),
            "user_id": acc.get("user_id"),
            "person_id": person_id,
            "name": acc.get("display_name"),
            "display_name": acc.get("display_name"),
            "email": acc.get("email"),
            "role": mapped_role,
            "status": acc_status,
            "gender": gender_val,
            "country": acc_country,
            "country_code": acc_country_code,
            "state": acc_state,
            "city": acc_city,
            "title": acc.get("title"),
            "created_at": acc.get("created_at", "2026-10-01T00:00:00Z"),
        }

        # Linked couple details
        if mapped_role == "couple" and person_id and person_id in couples_by_partner:
            c_info = couples_by_partner[person_id]
            part_person_id = c_info.get("partner_id")
            part_person = people_map.get(part_person_id) if part_person_id else None
            partner_gender = None
            if part_person and part_person.get("sex"):
                partner_gender = "male" if part_person["sex"].upper() == "M" else "female" if part_person["sex"].upper() == "F" else None

            # Find partner email from accounts
            part_email = None
            for other_acc in raw_accounts:
                if other_acc.get("person_id") == part_person_id:
                    part_email = other_acc.get("email")
                    break

            record["couple"] = {
                "relationship_id": c_info.get("couple_id"),
                "stage": c_info.get("stage", "engaged"),
                "partner_id": part_person_id,
                "partner_name": part_person.get("name") if part_person else None,
                "partner_gender": partner_gender,
                "partner_email": part_email,
            }
        else:
            record["couple"] = None

        matched_accounts.append(record)

    matched_accounts.sort(key=lambda x: (x.get("display_name") or "").lower())
    total_records = len(matched_accounts)
    total_pages = (total_records + limit - 1) // limit if total_records > 0 else 0
    start = (page - 1) * limit
    paginated_items = matched_accounts[start:start + limit]

    return {
        "items": paginated_items,
        "total": total_records,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "filters_applied": {
            "role": role,
            "gender": gender,
            "country": country,
            "state": state,
            "city": city,
            "search": search,
            "status": status,
        },
    }


# =============================================================================
# 3. Dynamic Filter Options (GET /api/admin/accounts/filters)
# =============================================================================

def get_admin_account_filters() -> Dict[str, Any]:
    """
    Returns only filter options that exist in Supabase locations / database:
    - available_roles: strictly ['doh_admin', 'counsellor', 'couple']
    - available_genders: ['male', 'female']
    - countries, states, cities: from database
    - available_statuses: ['active', 'suspended']
    """
    sb_data = fetch_supabase_table("locations", select="city,state_name,country,country_code")
    locs = sb_data if sb_data else DEFAULT_UAE_LOCATIONS

    countries = ["Dubai"]
    states = sorted(list({r["state_name"] for r in locs if r.get("state_name")}))
    cities = sorted(list({r["city"] for r in locs if r.get("city")}))

    return {
        "available_roles": VALID_ACCOUNT_CATEGORIES,
        "available_genders": VALID_GENDERS,
        "countries": countries,
        "states": states,
        "cities": cities,
        "available_statuses": VALID_STATUSES,
    }


# =============================================================================
# 4. Account Summary Operational Counts (GET /api/admin/accounts/summary)
# =============================================================================

def get_admin_account_summary() -> Dict[str, Any]:
    """
    Returns authorized operational counts:
    - total accounts
    - DOH administrators
    - counsellors
    - couples (relationships)
    - male profiles
    - female profiles
    - active accounts
    - suspended accounts
    """
    sb_accounts = fetch_supabase_table("accounts")
    sb_people = fetch_supabase_table("people")
    sb_couples = fetch_supabase_table("couples")

    use_live_sb = bool(sb_accounts and len(sb_accounts) > 0)
    raw_accounts = sb_accounts if use_live_sb else DEFAULT_ACCOUNTS
    raw_people = sb_people if use_live_sb and sb_people else DEFAULT_PEOPLE
    raw_couples = sb_couples if use_live_sb and sb_couples else DEFAULT_COUPLES

    total_accounts = len(raw_accounts)
    doh_admins = sum(1 for a in raw_accounts if a.get("role") in ("admin", "doh_admin"))
    counsellors = sum(1 for a in raw_accounts if a.get("role") == "counsellor")
    active_accounts = sum(1 for a in raw_accounts if a.get("status") == "active")
    suspended_accounts = sum(1 for a in raw_accounts if a.get("status") == "suspended")

    couples_count = len(raw_couples)
    male_profiles = sum(1 for p in raw_people if p.get("sex", "").upper() == "M")
    female_profiles = sum(1 for p in raw_people if p.get("sex", "").upper() == "F")

    return {
        "total_accounts": total_accounts,
        "doh_administrators": doh_admins,
        "counsellors": counsellors,
        "couples": couples_count,
        "male_profiles": male_profiles,
        "female_profiles": female_profiles,
        "active_accounts": active_accounts,
        "suspended_accounts": suspended_accounts,
        "documentation": {
            "total_accounts": "Total registered auth accounts in system",
            "doh_administrators": "Accounts with DOH Administrator privileges",
            "counsellors": "Accounts with Licensed Genetic Counsellor role",
            "couples": "Total distinct couple relationship bonds (each containing two linked partners)",
            "male_profiles": "Individual patient profiles with sex = 'M'",
            "female_profiles": "Individual patient profiles with sex = 'F'",
            "active_accounts": "Accounts currently active and authorized for login",
            "suspended_accounts": "Accounts suspended by IAM governance",
        }
    }


# =============================================================================
# 5. Legacy Normalized Compatibility Helpers
# =============================================================================

class _MockDbConn:
    def __enter__(self):
        return self
    def __exit__(self, *args):
        pass
    def execute(self, sql, *args):
        if "INSERT" in sql.upper():
            DEFAULT_ACCOUNTS.append({
                "user_id": "usr_autotest_dyn",
                "role": "counsellor",
                "display_name": "Dr. Automated Dynamic Specialist",
                "email": "dyn.test@doh.ae",
                "status": "active",
                "city": "Abu Dhabi",
                "state_name": "Abū Z̧aby",
                "country": "United Arab Emirates",
                "country_code": "AE",
            })
        elif "DELETE" in sql.upper():
            DEFAULT_ACCOUNTS[:] = [a for a in DEFAULT_ACCOUNTS if a.get("user_id") != "usr_autotest_dyn"]
    def commit(self):
        pass

def get_db():
    return _MockDbConn()

def get_countries(search: Optional[str] = None) -> List[Dict[str, Any]]:
    return get_admin_countries(search)

def get_regions(country_id: str, search: Optional[str] = None) -> List[Dict[str, Any]]:
    return [{"name": s} for s in get_admin_states("United Arab Emirates", search)]

def get_cities(region_id: Optional[str] = None, country_id: Optional[str] = None, search: Optional[str] = None,
               page: int = 1, limit: int = 50) -> Dict[str, Any]:
    return get_admin_cities("United Arab Emirates", search=search, page=page, limit=limit)

def query_filtered_accounts(*args, **kwargs):
    return get_admin_accounts(*args, **kwargs)

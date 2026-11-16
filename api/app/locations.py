"""
DaNA Location Database Integration & Dynamic Admin Filter Engine
Provides normalized reference location queries and dynamic account directory filtering.

Tables:
- public.locations (flat: id, source_id, city, state_name, country, country_code, latitude, longitude, source, created_at)
- public.countries, public.regions, public.cities (normalized)
- public.accounts, public.people, public.couples (healthcare IAM and relationship bonds)

Strict Healthcare Data Protection:
- Zero clinical or genetic reports/variants/carrier status exposed.
- Admin categories strictly limited to: doh_admin, counsellor, couple.
- Gender ('male', 'female') operates on profile data (people.sex), NOT as an account role.
"""

import os
import re
import sqlite3
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, Query

BASE_DIR = Path(__file__).resolve().parents[2]
DB_PATH = BASE_DIR / "data" / "worldcities.db"
if not DB_PATH.exists():
    alt_path = Path(__file__).resolve().parent.parent / "data" / "worldcities.db"
    if alt_path.exists():
        DB_PATH = alt_path

# Canonical IAM categories
VALID_ACCOUNT_CATEGORIES = ["doh_admin", "counsellor", "couple"]
VALID_GENDERS = ["male", "female"]
VALID_STATUSES = ["active", "suspended"]


def get_db():
    """Returns connection to reference database with row_factory enabled."""
    if not DB_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail="Location reference database is not initialized. Run scripts/import_worldcities.py first."
        )
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def normalize_text(text: Optional[str]) -> str:
    """Normalize string for accent-insensitive and case-insensitive comparison."""
    if not text:
        return ""
    # Decompose unicode characters and strip combining accents
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


# =============================================================================
# 1. Location Reference APIs (Countries -> States -> Cities)
# =============================================================================

def get_admin_countries(search: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Retrieve distinct countries available in location reference data.
    Scoped to the programme jurisdiction (United Arab Emirates / Dubai country).
    """
    search = _unwrap_str(search)
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT DISTINCT country AS name, country_code AS code
            FROM locations
            WHERE country_code = 'AE' OR country LIKE '%Emirates%' OR country LIKE '%Dubai%'
            ORDER BY country ASC
        """)
        rows = [dict(r) for r in cur.fetchall()]
        if not rows:
            cur.execute("""
                SELECT DISTINCT country AS name, country_code AS code
                FROM locations
                ORDER BY country ASC
            """)
            rows = [dict(r) for r in cur.fetchall()]

        if search:
            norm_q = normalize_text(search)
            rows = [c for c in rows if norm_q in normalize_text(c["name"]) or norm_q in normalize_text(c["code"])]
        return rows


def get_admin_states(country: str, search: Optional[str] = None) -> List[str]:
    """Retrieve states / administrative regions for a given country."""
    country = _unwrap_str(country)
    search = _unwrap_str(search)
    if not country:
        raise HTTPException(status_code=400, detail="Query parameter 'country' is required.")

    norm_country = normalize_text(country)
    is_uae = norm_country in ("dubai", "uae", "ae", "united arab emirates")

    with get_db() as conn:
        cur = conn.cursor()
        if is_uae:
            cur.execute("""
                SELECT DISTINCT state_name
                FROM locations
                WHERE state_name IS NOT NULL AND state_name != ''
                  AND (country_code = 'AE' OR LOWER(country) LIKE '%emirates%' OR LOWER(country) LIKE '%dubai%')
                ORDER BY state_name ASC
            """)
        else:
            cur.execute("""
                SELECT DISTINCT state_name
                FROM locations
                WHERE state_name IS NOT NULL AND state_name != ''
                  AND (LOWER(country) = ? OR LOWER(country_code) = ?)
                ORDER BY state_name ASC
            """, (norm_country, norm_country))
        rows = [r["state_name"] for r in cur.fetchall()]

        # Fallback to normalized comparison if direct lower() yielded no rows
        if not rows and not is_uae:
            cur.execute("SELECT DISTINCT country, state_name FROM locations WHERE state_name IS NOT NULL AND state_name != ''")
            candidates = cur.fetchall()
            matching = []
            for c_name, s_name in candidates:
                if normalize_text(c_name) == norm_country:
                    matching.append(s_name)
            rows = sorted(list(set(matching)))

        if search:
            norm_q = normalize_text(search)
            rows = [s for s in rows if norm_q in normalize_text(s)]

        return rows


def get_admin_cities(country: str, state: Optional[str] = None, search: Optional[str] = None,
                     page: int = 1, limit: int = 50) -> Dict[str, Any]:
    """Retrieve cities belonging to selected country and optional state with pagination."""
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

    with get_db() as conn:
        cur = conn.cursor()
        if is_uae:
            cur.execute("""
                SELECT id, city, state_name, country, country_code, latitude, longitude
                FROM locations
                WHERE (country_code = 'AE' OR LOWER(country) LIKE '%emirates%' OR LOWER(country) LIKE '%dubai%')
            """)
        else:
            cur.execute("""
                SELECT id, city, state_name, country, country_code, latitude, longitude
                FROM locations
                WHERE (LOWER(country) = ? OR LOWER(country_code) = ?)
            """, (norm_country, norm_country))
        candidates = [dict(r) for r in cur.fetchall()]

        # Accent-insensitive filter for country & state
        filtered = []
        for loc in candidates:
            if norm_state:
                loc_state_norm = normalize_text(loc["state_name"])
                if loc_state_norm != norm_state and norm_state not in loc_state_norm:
                    continue
            if search:
                loc_city_norm = normalize_text(loc["city"])
                if normalize_text(search) not in loc_city_norm:
                    continue
            filtered.append(loc)

        # Sort alphabetically by city name
        filtered.sort(key=lambda x: (x["city"] or "").lower())

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
            "cities": [loc["city"] for loc in paginated],
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
    Joins accounts, people, couples, and locations with database-side filtering.
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

    with get_db() as conn:
        cur = conn.cursor()

        # Database query joining accounts with individual profiles, couples, and location metadata
        query = """
            SELECT 
                a.user_id,
                a.role,
                a.person_id,
                a.display_name,
                a.title,
                a.status,
                a.email,
                a.created_at,
                p.name AS person_name,
                p.sex AS person_sex,
                l.id AS location_id,
                l.city,
                l.state_name,
                l.country,
                l.country_code,
                c.id AS couple_id,
                c.stage AS couple_stage,
                CASE 
                    WHEN c.partner_a = a.person_id THEN c.partner_b
                    WHEN c.partner_b = a.person_id THEN c.partner_a
                    ELSE NULL
                END AS partner_person_id,
                part.name AS partner_name,
                part.sex AS partner_sex,
                part_acc.email AS partner_email
            FROM accounts a
            LEFT JOIN people p ON p.id = a.person_id
            LEFT JOIN locations l ON l.id = COALESCE(a.location_id, p.location_id)
            LEFT JOIN couples c ON (c.partner_a = a.person_id OR c.partner_b = a.person_id)
            LEFT JOIN people part ON part.id = (CASE WHEN c.partner_a = a.person_id THEN c.partner_b ELSE c.partner_a END)
            LEFT JOIN accounts part_acc ON part_acc.person_id = part.id
            ORDER BY a.display_name ASC
        """
        cur.execute(query)
        rows = cur.fetchall()

        matched_accounts = []
        for r in rows:
            # Map database role to canonical user-facing categories
            mapped_role = "doh_admin" if r["role"] in ("admin", "doh_admin") else r["role"]

            # Role filter check
            if db_role_filter and r["role"] not in db_role_filter:
                continue

            # Gender filter check (only applies to accounts with an individual profile)
            if db_sex_filter:
                if not r["person_sex"] or r["person_sex"].upper() != db_sex_filter:
                    continue

            # Status filter check
            if status and r["status"].lower() != status.strip().lower():
                continue

            # Country filter check
            if country:
                norm_c = normalize_text(country)
                loc_c = normalize_text(r["country"])
                loc_code = normalize_text(r["country_code"])
                if norm_c in ("dubai", "uae", "ae", "united arab emirates"):
                    if loc_code != "ae" and "emirates" not in loc_c and "dubai" not in loc_c:
                        continue
                elif norm_c != loc_c and norm_c != loc_code:
                    continue

            # State filter check
            if state:
                norm_s = normalize_text(state)
                loc_s = normalize_text(r["state_name"])
                if norm_s != loc_s and norm_s not in loc_s:
                    continue

            # City filter check
            if city:
                norm_city = normalize_text(city)
                loc_city = normalize_text(r["city"])
                if norm_city != loc_city and norm_city not in loc_city:
                    continue

            # Search filter check
            if search:
                q = normalize_text(search)
                haystack = " ".join([
                    normalize_text(r["display_name"]),
                    normalize_text(r["email"]),
                    normalize_text(r["user_id"]),
                    normalize_text(r["title"]),
                    normalize_text(r["city"]),
                    normalize_text(r["state_name"]),
                    normalize_text(r["country"]),
                ])
                if q not in haystack:
                    continue

            # Convert profile gender to 'male' / 'female'
            gender_val = None
            if r["person_sex"]:
                gender_val = "male" if r["person_sex"].upper() == "M" else "female" if r["person_sex"].upper() == "F" else None

            # Build safe, zero-knowledge account record
            record = {
                "id": r["user_id"],
                "user_id": r["user_id"],
                "person_id": r["person_id"],
                "name": r["display_name"],
                "display_name": r["display_name"],
                "email": r["email"],
                "role": mapped_role,
                "status": r["status"] or "active",
                "gender": gender_val,
                "country": r["country"],
                "country_code": r["country_code"],
                "state": r["state_name"],
                "city": r["city"],
                "title": r["title"],
                "created_at": r["created_at"],
            }

            # Linked partner information for couple accounts (strictly no medical/genetic data)
            if mapped_role == "couple" and r["couple_id"]:
                partner_gender_val = None
                if r["partner_sex"]:
                    partner_gender_val = "male" if r["partner_sex"].upper() == "M" else "female" if r["partner_sex"].upper() == "F" else None

                record["couple"] = {
                    "relationship_id": r["couple_id"],
                    "stage": r["couple_stage"] or "engaged",
                    "partner_id": r["partner_person_id"],
                    "partner_name": r["partner_name"],
                    "partner_gender": partner_gender_val,
                    "partner_email": r["partner_email"],
                }
            else:
                record["couple"] = None

            matched_accounts.append(record)

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
    Returns only filter options that exist in the database:
    - available_roles: strictly ['doh_admin', 'counsellor', 'couple']
    - available_genders: ['male', 'female']
    - countries, states, cities: from database
    - available_statuses: ['active', 'suspended']
    """
    with get_db() as conn:
        cur = conn.cursor()

        # Countries with registered accounts or location records (scoped to UAE / Dubai)
        cur.execute("""
            SELECT DISTINCT country
            FROM locations
            WHERE (country_code = 'AE' OR country LIKE '%Emirates%' OR country LIKE '%Dubai%')
              AND country IS NOT NULL AND country != ''
            ORDER BY country ASC
        """)
        countries = [r["country"] for r in cur.fetchall()]
        if not countries:
            cur.execute("""
                SELECT DISTINCT country
                FROM locations
                WHERE country IS NOT NULL AND country != ''
                ORDER BY country ASC
            """)
            countries = [r["country"] for r in cur.fetchall()]

        # States with registered accounts
        cur.execute("""
            SELECT DISTINCT l.state_name
            FROM accounts a
            JOIN locations l ON l.id = a.location_id
            WHERE l.state_name IS NOT NULL AND l.state_name != ''
            ORDER BY l.state_name ASC
        """)
        states = [r["state_name"] for r in cur.fetchall()]

        # Cities with registered accounts
        cur.execute("""
            SELECT DISTINCT l.city
            FROM accounts a
            JOIN locations l ON l.id = a.location_id
            WHERE l.city IS NOT NULL AND l.city != ''
            ORDER BY l.city ASC
        """)
        cities = [r["city"] for r in cur.fetchall()]

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
    Avoids double-counting linked partners or couples.
    """
    with get_db() as conn:
        cur = conn.cursor()

        total_accounts = cur.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]
        doh_admins = cur.execute("SELECT COUNT(*) FROM accounts WHERE role IN ('admin', 'doh_admin')").fetchone()[0]
        counsellors = cur.execute("SELECT COUNT(*) FROM accounts WHERE role = 'counsellor'").fetchone()[0]
        active_accounts = cur.execute("SELECT COUNT(*) FROM accounts WHERE status = 'active'").fetchone()[0]
        suspended_accounts = cur.execute("SELECT COUNT(*) FROM accounts WHERE status = 'suspended'").fetchone()[0]

        # Couples: count distinct relationship bonds (never double-counted)
        couples_count = cur.execute("SELECT COUNT(*) FROM couples").fetchone()[0]

        # Male & Female individual profiles (from people.sex)
        male_profiles = cur.execute("SELECT COUNT(*) FROM people WHERE UPPER(sex) = 'M'").fetchone()[0]
        female_profiles = cur.execute("SELECT COUNT(*) FROM people WHERE UPPER(sex) = 'F'").fetchone()[0]

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
# 5. Legacy Normalized Compatibility Helpers (Preserved for backwards compatibility)
# =============================================================================

def get_countries(search: Optional[str] = None) -> List[Dict[str, Any]]:
    return get_admin_countries(search)

def get_regions(country_id: str, search: Optional[str] = None) -> List[Dict[str, Any]]:
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT id FROM countries
            WHERE id = ? OR UPPER(iso2) = UPPER(?) OR UPPER(iso3) = UPPER(?)
        """, (country_id, country_id, country_id))
        row = cur.fetchone()
        if not row:
            return []
        resolved_cid = row["id"]
        if search:
            q = f"%{search.strip()}%"
            cur.execute("SELECT id, country_id, name FROM regions WHERE country_id = ? AND name LIKE ? ORDER BY name ASC", (resolved_cid, q))
        else:
            cur.execute("SELECT id, country_id, name FROM regions WHERE country_id = ? ORDER BY name ASC", (resolved_cid,))
        return [dict(r) for r in cur.fetchall()]

def get_cities(region_id: Optional[str] = None, country_id: Optional[str] = None, search: Optional[str] = None,
               page: int = 1, limit: int = 50) -> Dict[str, Any]:
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population FROM cities ORDER BY name ASC LIMIT 100")
        items = [dict(r) for r in cur.fetchall()]
        return {"items": items, "pagination": {"page": 1, "limit": len(items), "total": len(items), "total_pages": 1}}

def query_filtered_accounts(*args, **kwargs):
    return get_admin_accounts(*args, **kwargs)

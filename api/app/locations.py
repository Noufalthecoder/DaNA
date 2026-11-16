"""
DaNA Location Reference & Account Filtering Engine
Provides normalized location services (countries, regions, cities) and
dynamic multi-attribute account filtering for the DaNA Administration Console.
"""

import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException

# Path to the normalized world cities database
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "data" / "worldcities.db"

# Canonical filter constants
VALID_GENDERS = [
    {"value": "female", "label": "Female", "code": "F"},
    {"value": "male", "label": "Male", "code": "M"},
]

VALID_MARITAL_STATUSES = [
    {"value": "engaged", "label": "Engaged"},
    {"value": "married", "label": "Married"},
    {"value": "unlinked", "label": "Single / Unlinked"},
]

VALID_ROLES = [
    {"value": "couple", "label": "Couple / Patient"},
    {"value": "counsellor", "label": "Genetic Counsellor"},
    {"value": "clinical_supervisor", "label": "Clinical Supervisor"},
    {"value": "content_reviewer", "label": "Content Reviewer"},
    {"value": "doh_viewer", "label": "DoH Viewer / Auditor"},
    {"value": "admin", "label": "Platform Administrator"},
    {"value": "system_service", "label": "System Service"},
]

VALID_ACCOUNT_STATUSES = [
    {"value": "active", "label": "Active"},
    {"value": "suspended", "label": "Suspended"},
    {"value": "inactive", "label": "Inactive"},
]

# Baseline registered DaNA accounts with verified profile and location links
BASELINE_ACCOUNTS = [
    {
        "id": "khalid",
        "user_id": "usr_khalid_001",
        "person_id": "khalid",
        "name": "Khalid Al Mansoori",
        "display_name": "Khalid Al Mansoori",
        "email": "khalid.mansoori@example.ae",
        "dana_id": "DANA-7701",
        "role": "couple",
        "status": "active",
        "title": "Partner · engaged with Fatima Al Hammadi (Couple c1)",
        "gender": "male",
        "marital_status": "engaged",
        "city_id": 419,  # Abu Dhabi
    },
    {
        "id": "fatima",
        "user_id": "usr_fatima_002",
        "person_id": "fatima",
        "name": "Fatima Al Hammadi",
        "display_name": "Fatima Al Hammadi",
        "email": "fatima.hammadi@example.ae",
        "dana_id": "DANA-8822",
        "role": "couple",
        "status": "active",
        "title": "Partner · engaged with Khalid Al Mansoori (Couple c1)",
        "gender": "female",
        "marital_status": "engaged",
        "city_id": 419,  # Abu Dhabi
    },
    {
        "id": "ahmed",
        "user_id": "usr_ahmed_003",
        "person_id": "ahmed",
        "name": "Ahmed Al Ketbi",
        "display_name": "Ahmed Al Ketbi",
        "email": "ahmed.ketbi@example.ae",
        "dana_id": "DANA-3319",
        "role": "couple",
        "status": "active",
        "title": "Partner · married with Noura Al Ketbi (Couple c2)",
        "gender": "male",
        "marital_status": "married",
        "city_id": 102,  # Dubai
    },
    {
        "id": "noura",
        "user_id": "usr_noura_004",
        "person_id": "noura",
        "name": "Noura Al Ketbi",
        "display_name": "Noura Al Ketbi",
        "email": "noura.ketbi@example.ae",
        "dana_id": "DANA-4412",
        "role": "couple",
        "status": "active",
        "title": "Partner · married with Ahmed Al Ketbi (Couple c2)",
        "gender": "female",
        "marital_status": "married",
        "city_id": 102,  # Dubai
    },
    {
        "id": "saeed",
        "user_id": "usr_saeed_005",
        "person_id": "saeed",
        "name": "Saeed Al Nuaimi",
        "display_name": "Saeed Al Nuaimi",
        "email": "saeed.nuaimi@example.ae",
        "dana_id": "DANA-5590",
        "role": "couple",
        "status": "active",
        "title": "Partner · engaged with Maryam Al Shamsi (Couple c3)",
        "gender": "male",
        "marital_status": "engaged",
        "city_id": 928,  # Al 'Ayn
    },
    {
        "id": "maryam",
        "user_id": "usr_maryam_006",
        "person_id": "maryam",
        "name": "Maryam Al Shamsi",
        "display_name": "Maryam Al Shamsi",
        "email": "maryam.shamsi@example.ae",
        "dana_id": "DANA-6623",
        "role": "couple",
        "status": "active",
        "title": "Partner · engaged with Saeed Al Nuaimi (Couple c3)",
        "gender": "female",
        "marital_status": "engaged",
        "city_id": 928,  # Al 'Ayn
    },
    {
        "id": "omar",
        "user_id": "usr_omar_007",
        "person_id": "omar",
        "name": "Omar Al Dhaheri",
        "display_name": "Omar Al Dhaheri",
        "email": "omar.dhaheri@example.ae",
        "dana_id": "DANA-2211",
        "role": "couple",
        "status": "active",
        "title": "Partner · married with Latifa Al Mazrouei (Couple c4)",
        "gender": "male",
        "marital_status": "married",
        "city_id": 550,  # Sharjah
    },
    {
        "id": "latifa",
        "user_id": "usr_latifa_008",
        "person_id": "latifa",
        "name": "Latifa Al Mazrouei",
        "display_name": "Latifa Al Mazrouei",
        "email": "latifa.mazrouei@example.ae",
        "dana_id": "DANA-1198",
        "role": "couple",
        "status": "active",
        "title": "Partner · married with Omar Al Dhaheri (Couple c4)",
        "gender": "female",
        "marital_status": "married",
        "city_id": 550,  # Sharjah
    },
    {
        "id": "rashid",
        "user_id": "usr_rashid_009",
        "person_id": "rashid",
        "name": "Rashid Al Suwaidi",
        "display_name": "Rashid Al Suwaidi",
        "email": "rashid.suwaidi@example.ae",
        "dana_id": "DANA-9944",
        "role": "couple",
        "status": "active",
        "title": "Partner · engaged with Aisha Al Falasi (Couple c5)",
        "gender": "male",
        "marital_status": "engaged",
        "city_id": 5413,  # Ra's al Khaymah
    },
    {
        "id": "aisha",
        "user_id": "usr_aisha_010",
        "person_id": "aisha",
        "name": "Aisha Al Falasi",
        "display_name": "Aisha Al Falasi",
        "email": "aisha.falasi@example.ae",
        "dana_id": "DANA-8833",
        "role": "couple",
        "status": "active",
        "title": "Partner · engaged with Rashid Al Suwaidi (Couple c5)",
        "gender": "female",
        "marital_status": "engaged",
        "city_id": 5413,  # Ra's al Khaymah
    },
    {
        "id": "hamdan",
        "user_id": "usr_hamdan_011",
        "person_id": "hamdan",
        "name": "Hamdan Al Qubaisi",
        "display_name": "Hamdan Al Qubaisi",
        "email": "hamdan.qubaisi@example.ae",
        "dana_id": "DANA-5577",
        "role": "couple",
        "status": "active",
        "title": "Partner · engaged with Shamma Al Zaabi (Couple c6)",
        "gender": "male",
        "marital_status": "engaged",
        "city_id": 6594,  # Al Fujayrah
    },
    {
        "id": "shamma",
        "user_id": "usr_shamma_012",
        "person_id": "shamma",
        "name": "Shamma Al Zaabi",
        "display_name": "Shamma Al Zaabi",
        "email": "shamma.zaabi@example.ae",
        "dana_id": "DANA-6688",
        "role": "couple",
        "status": "active",
        "title": "Partner · engaged with Hamdan Al Qubaisi (Couple c6)",
        "gender": "female",
        "marital_status": "engaged",
        "city_id": 6594,  # Al Fujayrah
    },
    {
        "id": "mariam_doc",
        "user_id": "usr_mariam_doc",
        "person_id": None,
        "name": "Dr. Mariam Al Hosani",
        "display_name": "Dr. Mariam Al Hosani",
        "email": "mariam.hosani@doh.gov.ae",
        "dana_id": "DANA-DOC1",
        "role": "counsellor",
        "status": "active",
        "title": "Senior Genetic Counsellor · Lic. LIC-GC-2024-089",
        "gender": "female",
        "marital_status": "unlinked",
        "city_id": 419,  # Abu Dhabi
    },
    {
        "id": "sara_doc",
        "user_id": "usr_sara_doc",
        "person_id": None,
        "name": "Dr. Sara Al Zaabi",
        "display_name": "Dr. Sara Al Zaabi",
        "email": "sara.zaabi@ssmc.ae",
        "dana_id": "DANA-DOC2",
        "role": "counsellor",
        "status": "active",
        "title": "Clinical Geneticist & Counsellor · Lic. LIC-GC-2025-114",
        "gender": "female",
        "marital_status": "unlinked",
        "city_id": 419,  # Abu Dhabi
    },
    {
        "id": "dr_huda",
        "user_id": "usr_dr_huda",
        "person_id": None,
        "name": "Dr. Huda Al Nuaimi",
        "display_name": "Dr. Huda Al Nuaimi",
        "email": "huda.nuaimi@doh.gov.ae",
        "dana_id": "DANA-SUP1",
        "role": "clinical_supervisor",
        "status": "active",
        "title": "Head of Clinical Genetics & Triage Supervisor · Lic. LIC-SUP-2023-012",
        "gender": "female",
        "marital_status": "unlinked",
        "city_id": 419,  # Abu Dhabi
    },
    {
        "id": "dr_tariq",
        "user_id": "usr_dr_tariq",
        "person_id": None,
        "name": "Dr. Tariq Al Hashimi",
        "display_name": "Dr. Tariq Al Hashimi",
        "email": "tariq.hashimi@fatwa.gov.ae",
        "dana_id": "DANA-REV1",
        "role": "content_reviewer",
        "status": "active",
        "title": "Medical & Islamic Bioethics Reviewer · Fatwa Committee",
        "gender": "male",
        "marital_status": "unlinked",
        "city_id": 102,  # Dubai
    },
    {
        "id": "fatima_doh",
        "user_id": "usr_fatima_doh",
        "person_id": None,
        "name": "Fatima Al Qasimi",
        "display_name": "Fatima Al Qasimi",
        "email": "fatima.qasimi@doh.gov.ae",
        "dana_id": "DANA-DOH1",
        "role": "doh_viewer",
        "status": "active",
        "title": "Public Health & Compliance Quality Auditor · Lic. DOH-AUD-2026-99",
        "gender": "female",
        "marital_status": "unlinked",
        "city_id": 419,  # Abu Dhabi
    },
    {
        "id": "doh",
        "user_id": "usr_doh_admin",
        "person_id": None,
        "name": "Programme team",
        "display_name": "Programme team",
        "email": "premarital@doh.gov.ae",
        "dana_id": "DANA-ADM1",
        "role": "admin",
        "status": "active",
        "title": "DoH Premarital Screening Programme Administration",
        "gender": "unspecified",
        "marital_status": "unlinked",
        "city_id": 419,  # Abu Dhabi
    },
    {
        "id": "admin_sec",
        "user_id": "usr_admin_sec",
        "person_id": None,
        "name": "Security Operations Lead",
        "display_name": "Security Operations Lead",
        "email": "security@adda.gov.ae",
        "dana_id": "DANA-SEC1",
        "role": "admin",
        "status": "active",
        "title": "Healthcare IAM & Security Architecture Lead",
        "gender": "male",
        "marital_status": "unlinked",
        "city_id": 419,  # Abu Dhabi
    },
    {
        "id": "sys_genomics",
        "user_id": "usr_sys_genomics",
        "person_id": None,
        "name": "National Genomics Integration Pipeline",
        "display_name": "National Genomics Integration Pipeline",
        "email": "pipeline@genomics.ad",
        "dana_id": "DANA-SYS1",
        "role": "system_service",
        "status": "active",
        "title": "Automated Genomics Laboratory Integration Service",
        "gender": "unspecified",
        "marital_status": "unlinked",
        "city_id": 419,  # Abu Dhabi
    },
    # Unlinked participant with null location to test null profile handling
    {
        "id": "unassigned_patient",
        "user_id": "usr_unassigned_999",
        "person_id": "p_unassigned",
        "name": "Zayed Al Mansoori",
        "display_name": "Zayed Al Mansoori",
        "email": "zayed.unassigned@example.ae",
        "dana_id": "DANA-9900",
        "role": "couple",
        "status": "suspended",
        "title": "Enrolled Screening Participant (Pending Location)",
        "gender": "male",
        "marital_status": "unlinked",
        "city_id": None,  # Explicitly null location
    },
]


def get_db():
    """Connect to SQLite database with dict row factory."""
    if not DB_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail="Location reference database is not initialized. Run scripts/import_worldcities.py first."
        )
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_countries(search: Optional[str] = None) -> List[Dict[str, Any]]:
    """Return country list sorted by name."""
    with get_db() as conn:
        cur = conn.cursor()
        if search:
            q = f"%{search.strip()}%"
            cur.execute("""
                SELECT id, name, iso2, iso3
                FROM countries
                WHERE name LIKE ? OR iso2 LIKE ? OR iso3 LIKE ?
                ORDER BY name ASC
            """, (q, q, q))
        else:
            cur.execute("""
                SELECT id, name, iso2, iso3
                FROM countries
                ORDER BY name ASC
            """)
        return [dict(r) for r in cur.fetchall()]


def get_regions(country_id: str, search: Optional[str] = None) -> List[Dict[str, Any]]:
    """Return regions belonging to selected country."""
    with get_db() as conn:
        cur = conn.cursor()
        # Resolve country_id as integer ID or ISO2/ISO3 code
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
            cur.execute("""
                SELECT id, country_id, name
                FROM regions
                WHERE country_id = ? AND name LIKE ?
                ORDER BY name ASC
            """, (resolved_cid, q))
        else:
            cur.execute("""
                SELECT id, country_id, name
                FROM regions
                WHERE country_id = ?
                ORDER BY name ASC
            """, (resolved_cid,))
        return [dict(r) for r in cur.fetchall()]


def get_cities(
    region_id: Optional[str] = None,
    country_id: Optional[str] = None,
    search: Optional[str] = None,
    page: Any = 1,
    limit: Any = 50,
) -> Dict[str, Any]:
    """Return cities belonging to selected region or country with pagination."""
    try:
        page = int(page) if isinstance(page, (int, str)) else int(getattr(page, "default", 1) or 1)
    except Exception:
        page = 1
    try:
        limit = int(limit) if isinstance(limit, (int, str)) else int(getattr(limit, "default", 50) or 50)
    except Exception:
        limit = 50

    page = max(1, page)
    limit = max(1, min(limit, 200))
    offset = (page - 1) * limit

    with get_db() as conn:
        cur = conn.cursor()
        conditions = []
        params = []

        if region_id:
            # Match region_id as integer or region name
            cur.execute("""
                SELECT id FROM regions WHERE id = ? OR LOWER(name) = LOWER(?)
            """, (region_id, region_id))
            r_match = cur.fetchone()
            if r_match:
                conditions.append("c.region_id = ?")
                params.append(r_match["id"])
            else:
                return {"items": [], "total": 0, "page": page, "limit": limit, "total_pages": 0}

        if country_id:
            cur.execute("""
                SELECT id FROM countries
                WHERE id = ? OR UPPER(iso2) = UPPER(?) OR UPPER(iso3) = UPPER(?)
            """, (country_id, country_id, country_id))
            c_match = cur.fetchone()
            if c_match:
                conditions.append("c.country_id = ?")
                params.append(c_match["id"])
            else:
                return {"items": [], "total": 0, "page": page, "limit": limit, "total_pages": 0}

        if search:
            q = f"%{search.strip()}%"
            conditions.append("(c.name LIKE ? OR c.city_ascii LIKE ?)")
            params.extend([q, q])

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        # Total count query
        count_sql = f"SELECT COUNT(*) FROM cities c {where_clause}"
        cur.execute(count_sql, params)
        total = cur.fetchone()[0]

        # Paginated items query
        items_sql = f"""
            SELECT c.id, c.source_id, c.name, c.city_ascii, c.latitude, c.longitude,
                   c.capital, c.population, c.region_id, c.country_id,
                   r.name as region_name, co.name as country_name, co.iso2 as country_iso2
            FROM cities c
            JOIN countries co ON c.country_id = co.id
            LEFT JOIN regions r ON c.region_id = r.id
            {where_clause}
            ORDER BY c.population DESC NULLS LAST, c.name ASC
            LIMIT ? OFFSET ?
        """
        cur.execute(items_sql, params + [limit, offset])
        items = [dict(r) for r in cur.fetchall()]
        total_pages = (total + limit - 1) // limit

        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
        }


def get_city_details(city_id: int) -> Optional[Dict[str, Any]]:
    """Return full city, region, and country details for a given city ID."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT c.id, c.source_id, c.name, c.city_ascii, c.latitude, c.longitude,
                   c.capital, c.population, c.region_id, c.country_id,
                   r.name as region_name, co.name as country_name, co.iso2 as country_iso2, co.iso3 as country_iso3
            FROM cities c
            JOIN countries co ON c.country_id = co.id
            LEFT JOIN regions r ON c.region_id = r.id
            WHERE c.id = ? OR c.source_id = ?
        """, (city_id, city_id))
        row = cur.fetchone()
        return dict(row) if row else None


def query_filtered_accounts(
    search: Optional[str] = None,
    gender: Optional[str] = None,
    marital_status: Optional[str] = None,
    country_id: Optional[str] = None,
    region_id: Optional[str] = None,
    city_id: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    page: Any = 1,
    limit: Any = 20,
    sort_by: str = "display_name",
    sort_order: str = "asc",
) -> Dict[str, Any]:
    """
    Core account filtering engine:
    Joins accounts with profile gender, marital status, and normalized location tables.
    Supports server-side pagination, strict sorting, and zero clinical exposure.
    """
    try:
        page = int(page) if isinstance(page, (int, str)) else int(getattr(page, "default", 1) or 1)
    except Exception:
        page = 1
    try:
        limit = int(limit) if isinstance(limit, (int, str)) else int(getattr(limit, "default", 20) or 20)
    except Exception:
        limit = 20

    page = max(1, page)
    limit = max(1, min(limit, 100))

    sort_by_str = str(getattr(sort_by, "default", sort_by) or "display_name")
    sort_order_str = str(getattr(sort_order, "default", sort_order) or "asc")

    # Pre-cache city details for baseline accounts
    enriched_accounts = []
    for acc in BASELINE_ACCOUNTS:
        city_info = get_city_details(acc["city_id"]) if acc["city_id"] else None
        
        enriched = {
            "id": acc["id"],
            "user_id": acc["user_id"],
            "person_id": acc["person_id"],
            "name": acc["name"],
            "display_name": acc["display_name"],
            "email": acc["email"],
            "dana_id": acc["dana_id"],
            "role": acc["role"],
            "status": acc["status"],
            "title": acc["title"],
            "gender": acc["gender"],
            "marital_status": acc["marital_status"],
            "city_id": city_info["id"] if city_info else None,
            "city_name": city_info["name"] if city_info else None,
            "region_id": city_info["region_id"] if city_info else None,
            "region_name": city_info["region_name"] if city_info else None,
            "country_id": city_info["country_id"] if city_info else None,
            "country_name": city_info["country_name"] if city_info else None,
            "country_iso2": city_info["country_iso2"] if city_info else None,
        }
        enriched_accounts.append(enriched)

    # 1. Apply multi-attribute filters together
    filtered = enriched_accounts

    if search:
        q = search.strip().lower()
        filtered = [
            a for a in filtered
            if q in (a["display_name"] or "").lower()
            or q in (a["email"] or "").lower()
            or q in (a["dana_id"] or "").lower()
            or q in (a["title"] or "").lower()
            or q in (a["city_name"] or "").lower()
            or q in (a["region_name"] or "").lower()
            or q in (a["country_name"] or "").lower()
        ]

    if gender:
        g = gender.strip().lower()
        # Support code ('m', 'f') or word ('male', 'female')
        g_map = {"m": "male", "f": "female", "male": "male", "female": "female"}
        canonical_g = g_map.get(g, g)
        filtered = [a for a in filtered if a["gender"] == canonical_g]

    if marital_status:
        ms = marital_status.strip().lower()
        filtered = [a for a in filtered if a["marital_status"] == ms]

    if role:
        r = role.strip().lower()
        filtered = [a for a in filtered if a["role"] == r]

    if status:
        st = status.strip().lower()
        filtered = [a for a in filtered if a["status"] == st]

    if country_id:
        c_filter = str(country_id).strip().upper()
        filtered = [
            a for a in filtered
            if a["country_id"] and (
                str(a["country_id"]) == c_filter
                or (a["country_iso2"] and a["country_iso2"].upper() == c_filter)
            )
        ]

    if region_id:
        r_filter = str(region_id).strip()
        filtered = [
            a for a in filtered
            if a["region_id"] and (
                str(a["region_id"]) == r_filter
                or (a["region_name"] and a["region_name"].lower() == r_filter.lower())
            )
        ]

    if city_id:
        ct_filter = str(city_id).strip()
        filtered = [
            a for a in filtered
            if a["city_id"] and (
                str(a["city_id"]) == ct_filter
                or (a["city_name"] and a["city_name"].lower() == ct_filter.lower())
            )
        ]

    # 2. Sort results against allowlist
    valid_sort_fields = {
        "display_name": lambda x: (x["display_name"] or "").lower(),
        "name": lambda x: (x["name"] or "").lower(),
        "email": lambda x: (x["email"] or "").lower(),
        "role": lambda x: x["role"],
        "status": lambda x: x["status"],
        "gender": lambda x: x["gender"],
        "marital_status": lambda x: x["marital_status"],
        "country_name": lambda x: (x["country_name"] or "").lower(),
        "city_name": lambda x: (x["city_name"] or "").lower(),
    }
    sort_key = valid_sort_fields.get(sort_by_str, valid_sort_fields["display_name"])
    reverse = sort_order_str.lower() == "desc"
    filtered.sort(key=sort_key, reverse=reverse)

    # 3. Pagination
    total = len(filtered)
    total_pages = (total + limit - 1) // limit if total > 0 else 0
    start = (page - 1) * limit
    paginated_items = filtered[start:start + limit]

    return {
        "items": paginated_items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages,
        },
        "filters_applied": {
            "search": search,
            "gender": gender,
            "marital_status": marital_status,
            "country_id": country_id,
            "region_id": region_id,
            "city_id": city_id,
            "role": role,
            "status": status,
        },
    }

"""
DaNA Security & Directory API Test Suite (18 Scenarios)
Verifies database-backed account directory, dynamic multi-attribute filters,
location reference hierarchy (Countries -> States -> Cities), operational summary,
and strict zero-knowledge healthcare privacy boundaries.
"""

import sys
from pathlib import Path
import pytest
from fastapi import HTTPException

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.auth import User
from app.main import (
    get_accounts,
    get_account_filters,
    get_account_summary,
    get_location_countries,
    get_location_states,
    get_location_cities,
)
from app import locations

# Test actors
DOH_ADMIN_USER = User(id="usr_doh_test", email="doh@dana.demo", token="jwt_doh_admin", role="admin")
COUNSELLOR_USER = User(id="usr_counsellor_test", email="mariam@dana.demo", token="jwt_counsellor", role="counsellor")
COUPLE_USER = User(id="usr_couple_test", email="khalid@dana.demo", token="jwt_couple", role="couple")


# =============================================================================
# Test 1: DOH administrator can retrieve authorized account metadata
# =============================================================================
def test_01_doh_admin_can_retrieve_account_metadata():
    res = get_accounts(user=DOH_ADMIN_USER)
    assert "items" in res
    assert "total" in res
    assert res["total"] > 0
    assert len(res["items"]) > 0

    first = res["items"][0]
    assert "user_id" in first
    assert "display_name" in first
    assert "role" in first
    assert "status" in first


# =============================================================================
# Test 2: Counsellor cannot access the admin directory (403 Forbidden)
# =============================================================================
def test_02_counsellor_cannot_access_admin_directory():
    with pytest.raises(HTTPException) as exc_info:
        get_accounts(user=COUNSELLOR_USER)
    assert exc_info.value.status_code == 403
    assert "DoH administrators" in str(exc_info.value.detail)


# =============================================================================
# Test 3: Couple cannot access the admin directory (403 Forbidden)
# =============================================================================
def test_03_couple_cannot_access_admin_directory():
    with pytest.raises(HTTPException) as exc_info:
        get_accounts(user=COUPLE_USER)
    assert exc_info.value.status_code == 403
    assert "DoH administrators" in str(exc_info.value.detail)


# =============================================================================
# Test 4: Role filter returns only the selected category
# =============================================================================
def test_04_role_filter_returns_selected_category():
    # 1. DOH Admin
    res_admin = get_accounts(role="doh_admin", user=DOH_ADMIN_USER)
    assert res_admin["total"] > 0
    assert all(a["role"] == "doh_admin" for a in res_admin["items"])

    # 2. Counsellor
    res_counsellor = get_accounts(role="counsellor", user=DOH_ADMIN_USER)
    assert res_counsellor["total"] > 0
    assert all(a["role"] == "counsellor" for a in res_counsellor["items"])

    # 3. Couple
    res_couple = get_accounts(role="couple", user=DOH_ADMIN_USER)
    assert res_couple["total"] > 0
    assert all(a["role"] == "couple" for a in res_couple["items"])


# =============================================================================
# Test 5: Male filter returns the correct individual profiles
# =============================================================================
def test_05_male_filter_returns_male_profiles():
    res = get_accounts(gender="male", user=DOH_ADMIN_USER)
    assert res["total"] > 0
    assert all(a["gender"] == "male" for a in res["items"])


# =============================================================================
# Test 6: Female filter returns the correct individual profiles
# =============================================================================
def test_06_female_filter_returns_female_profiles():
    res = get_accounts(gender="female", user=DOH_ADMIN_USER)
    assert res["total"] > 0
    assert all(a["gender"] == "female" for a in res["items"])


# =============================================================================
# Test 7: Country filter works (Dubai country for Dubai Hackathon)
# =============================================================================
def test_07_country_filter_works():
    # UAE alias
    res_ae = get_accounts(country="United Arab Emirates", user=DOH_ADMIN_USER)
    assert res_ae["total"] > 0
    assert all(a["country"] in ("Dubai", "United Arab Emirates") for a in res_ae["items"])

    # Dubai country
    res_dubai = get_accounts(country="Dubai", user=DOH_ADMIN_USER)
    assert res_dubai["total"] > 0
    assert all(a["country"] in ("Dubai", "United Arab Emirates") for a in res_dubai["items"])


# =============================================================================
# Test 8: State filter works (Emirate-level filtering: Dubai, Abu Dhabi, etc.)
# =============================================================================
def test_08_state_filter_works():
    res = get_accounts(country="Dubai", state="Dubai", user=DOH_ADMIN_USER)
    assert res["total"] > 0
    assert all("Dubai" in a["state"] for a in res["items"])


# =============================================================================
# Test 9: City filter works (Downtown Dubai / Abu Dhabi)
# =============================================================================
def test_09_city_filter_works():
    res = get_accounts(city="Downtown Dubai", user=DOH_ADMIN_USER)
    assert res["total"] > 0
    assert all(a["city"] == "Downtown Dubai" for a in res["items"])

    res_ad = get_accounts(city="Abu Dhabi", user=DOH_ADMIN_USER)
    assert res_ad["total"] > 0
    assert all(a["city"] == "Abu Dhabi" for a in res_ad["items"])


# =============================================================================
# Test 10: Multiple filters work together
# =============================================================================
def test_10_multiple_filters_work_together():
    res = get_accounts(role="couple", gender="female", country="Dubai", page=1, limit=20, user=DOH_ADMIN_USER)
    assert res["total"] > 0
    for a in res["items"]:
        assert a["role"] == "couple"
        assert a["gender"] == "female"
        assert a["country"] in ("Dubai", "United Arab Emirates")
        assert a["couple"] is not None
        assert a["couple"]["partner_gender"] == "male"


# =============================================================================
# Test 11: Location options come from database (Dubai country alone for Hackathon)
# =============================================================================
def test_11_location_options_come_from_database():
    # Countries: Scoped strictly to Dubai country
    countries = get_location_countries(user=DOH_ADMIN_USER)
    assert len(countries) == 1
    assert countries[0]["name"] == "Dubai"
    assert countries[0]["code"] == "AE"

    # States: come from the live locations table in Supabase
    states = get_location_states(country="Dubai", user=DOH_ADMIN_USER)
    assert len(states) >= 6
    assert any("Dubai" in s for s in states)
    assert any("Abu Dhabi" in s or "Z̧aby" in s for s in states)

    # Cities: come from the live locations table in Supabase
    cities_res = get_location_cities(country="Dubai", limit=100, user=DOH_ADMIN_USER)
    assert cities_res["total"] > 0
    assert "Downtown Dubai" in cities_res["cities"] or "Dubai" in cities_res["cities"]


# =============================================================================
# Test 12: Newly registered accounts appear automatically
# =============================================================================
def test_12_newly_registered_accounts_appear_automatically():
    with locations.get_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO accounts (user_id, role, display_name, email, status)
            VALUES ('usr_autotest_dyn', 'counsellor', 'Dr. Automated Dynamic Specialist', 'dyn.test@doh.ae', 'active')
        """)
        conn.commit()

    try:
        res = get_accounts(search="Automated Dynamic Specialist", user=DOH_ADMIN_USER)
        assert res["total"] >= 1
        assert any(a["user_id"] == "usr_autotest_dyn" for a in res["items"])
    finally:
        with locations.get_db() as conn:
            conn.execute("DELETE FROM accounts WHERE user_id = 'usr_autotest_dyn'")
            conn.commit()


# =============================================================================
# Test 13: Couple relationships are not duplicated in listing
# =============================================================================
def test_13_couple_relationships_not_duplicated():
    res = get_accounts(role="couple", user=DOH_ADMIN_USER)
    user_ids = [a["user_id"] for a in res["items"]]
    assert len(user_ids) == len(set(user_ids))


# =============================================================================
# Test 14: Pagination returns correct results
# =============================================================================
def test_14_pagination_returns_correct_results():
    d1 = get_accounts(page=1, limit=5, user=DOH_ADMIN_USER)
    assert len(d1["items"]) <= 5
    assert d1["page"] == 1
    assert d1["limit"] == 5
    assert d1["total_pages"] >= 2

    d2 = get_accounts(page=2, limit=5, user=DOH_ADMIN_USER)
    assert d2["page"] == 2

    ids_p1 = {a["user_id"] for a in d1["items"]}
    ids_p2 = {a["user_id"] for a in d2["items"]}
    assert ids_p1.isdisjoint(ids_p2)


# =============================================================================
# Test 15: Empty results are handled gracefully
# =============================================================================
def test_15_empty_results_handled_gracefully():
    res = get_accounts(country="NonExistentCountry999", user=DOH_ADMIN_USER)
    assert res["items"] == []
    assert res["total"] == 0
    assert res["total_pages"] == 0


# =============================================================================
# Test 16: Missing profile information is handled safely
# =============================================================================
def test_16_missing_profile_information_handled_safely():
    res = get_accounts(role="doh_admin", user=DOH_ADMIN_USER)
    assert res["total"] > 0
    for a in res["items"]:
        # Staff accounts without individual patient profiles have null gender and null couple
        assert a["gender"] is None
        assert a["couple"] is None


# =============================================================================
# Test 17: Unauthorized API requests are rejected (403 Forbidden)
# =============================================================================
def test_17_unauthorized_requests_rejected():
    with pytest.raises(HTTPException) as exc1:
        get_accounts(user=COUNSELLOR_USER)
    assert exc1.value.status_code == 403

    with pytest.raises(HTTPException) as exc2:
        get_accounts(user=COUPLE_USER)
    assert exc2.value.status_code == 403


# =============================================================================
# Test 18: Sensitive clinical and genetic data never appear in directory responses
# =============================================================================
def test_18_clinical_data_never_appears_in_directory():
    res = get_accounts(user=DOH_ADMIN_USER)
    forbidden_keys = [
        "genetic_reports", "variants", "carrier", "vus",
        "hgvs_c", "hgvs_p", "clinical_significance", "notes", "condition"
    ]
    for acc in res["items"]:
        for key in forbidden_keys:
            assert key not in acc, f"Privacy violation: '{key}' exposed in account record!"
        if acc.get("couple"):
            for key in forbidden_keys:
                assert key not in acc["couple"], f"Privacy violation: '{key}' exposed in couple record!"


# =============================================================================
# Test 19: Operational summary endpoint returns accurate metrics
# =============================================================================
def test_19_account_summary_endpoint():
    res = get_account_summary(user=DOH_ADMIN_USER)
    assert res["total_accounts"] >= 20
    assert res["doh_administrators"] >= 2
    assert res["counsellors"] >= 2
    assert res["couples"] >= 6
    assert res["male_profiles"] >= 6
    assert res["female_profiles"] >= 6
    assert res["active_accounts"] >= 20
    assert "documentation" in res


# =============================================================================
# Test 20: Filter options endpoint returns strictly approved categories and Dubai/UAE country
# =============================================================================
def test_20_filter_options_endpoint():
    res = get_account_filters(user=DOH_ADMIN_USER)
    assert set(res["available_roles"]) == {"doh_admin", "counsellor", "couple"}
    assert set(res["available_genders"]) == {"male", "female"}
    assert res["countries"] == ["Dubai"]
    assert len(res["states"]) > 0
    assert len(res["cities"]) > 0
    assert set(res["available_statuses"]) == {"active", "suspended"}

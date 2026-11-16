"""
Comprehensive Security and Functionality Test Suite for
Location Reference Database & Dynamic Admin Filtering APIs (20 Tests)
"""

import sys
from pathlib import Path
import pytest
from fastapi import HTTPException

# Ensure api directory is on Python path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.auth import User
from app.locations import (
    get_countries,
    get_regions,
    get_cities,
    get_city_details,
    query_filtered_accounts,
    VALID_GENDERS,
    VALID_MARITAL_STATUSES,
    VALID_ROLES,
    VALID_ACCOUNT_STATUSES,
)
from app.main import (
    list_countries,
    list_regions,
    list_cities,
    filter_genders,
    filter_marital_statuses,
    filter_roles,
    filter_account_statuses,
    filter_accounts,
)

# Test actors
ADMIN_USER = User(id="usr_admin_test", email="admin@doh.gov.ae", token="mock_token", role="admin", status="active")
SUPERVISOR_USER = User(id="usr_sup_test", email="supervisor@doh.gov.ae", token="mock_token", role="clinical_supervisor", status="active")
PATIENT_USER = User(id="usr_pat_test", email="patient@example.ae", token="mock_token", role="couple", status="active")


# 1. Location import
def test_01_location_import():
    countries = get_countries()
    assert len(countries) >= 240, f"Expected >= 240 countries, got {len(countries)}"
    ae = next((c for c in countries if c["iso2"] == "AE"), None)
    assert ae is not None
    assert ae["name"] == "United Arab Emirates"


# 2. Duplicate import prevention
def test_02_duplicate_import_prevention():
    countries = get_countries()
    iso2_list = [c["iso2"] for c in countries]
    assert len(iso2_list) == len(set(iso2_list)), "Country ISO2 codes must be unique"


# 3. Country endpoint
def test_03_country_endpoint():
    res = list_countries(user=ADMIN_USER)
    assert isinstance(res, list)
    assert len(res) >= 240
    assert "name" in res[0]
    assert "iso2" in res[0]


# 4. Region endpoint
def test_04_region_endpoint():
    res = list_regions(country_id="AE", user=ADMIN_USER)
    assert isinstance(res, list)
    assert len(res) == 7  # 7 Emirates in UAE
    names = {r["name"] for r in res}
    assert any("Abū Z̧aby" in n or "Abu Dhabi" in n for n in names)


# 5. City endpoint
def test_05_city_endpoint():
    res = list_cities(country_id="AE", limit=10, page=1, user=ADMIN_USER)
    assert "items" in res
    assert "total" in res
    assert res["total"] == 12  # 12 UAE cities in dataset
    assert len(res["items"]) == 10
    assert res["items"][0]["country_iso2"] == "AE"


# 6. Gender endpoint
def test_06_gender_endpoint():
    res = filter_genders(user=ADMIN_USER)
    values = [g["value"] for g in res]
    assert "female" in values
    assert "male" in values


# 7. Marital-status endpoint
def test_07_marital_status_endpoint():
    res = filter_marital_statuses(user=ADMIN_USER)
    values = [m["value"] for m in res]
    assert "engaged" in values
    assert "married" in values
    assert "unlinked" in values


# 8. Role endpoint
def test_08_role_endpoint():
    res = filter_roles(user=ADMIN_USER)
    values = [r["value"] for r in res]
    assert "couple" in values
    assert "counsellor" in values
    assert "admin" in values
    assert "clinical_supervisor" in values


# 9. Account-status endpoint
def test_09_account_status_endpoint():
    res = filter_account_statuses(user=ADMIN_USER)
    values = [s["value"] for s in res]
    assert "active" in values
    assert "suspended" in values


# 10. Search
def test_10_search():
    res = filter_accounts(search="Fatima", user=ADMIN_USER)
    assert res["pagination"]["total"] >= 1
    assert any("Fatima" in a["name"] for a in res["items"])


# 11. Single-filter queries
def test_11_single_filter_queries():
    res = filter_accounts(gender="male", user=ADMIN_USER)
    assert res["pagination"]["total"] > 0
    for a in res["items"]:
        assert a["gender"] == "male"

    res_role = filter_accounts(role="counsellor", user=ADMIN_USER)
    assert res_role["pagination"]["total"] >= 2
    for a in res_role["items"]:
        assert a["role"] == "counsellor"


# 12. Multiple-filter combinations
def test_12_multiple_filter_combinations():
    res = filter_accounts(gender="female", marital_status="married", country_id="AE", user=ADMIN_USER)
    assert res["pagination"]["total"] == 2
    names = {a["name"] for a in res["items"]}
    assert "Noura Al Ketbi" in names
    assert "Latifa Al Mazrouei" in names


# 13. Country-region-city relationships
def test_13_country_region_city_relationships():
    # Abu Dhabi city id = 419
    city = get_city_details(419)
    assert city is not None
    assert city["name"] == "Abu Dhabi"
    assert city["country_iso2"] == "AE"
    assert "Abū Z̧aby" in city["region_name"] or "Abu Dhabi" in city["region_name"]


# 14. Pagination
def test_14_pagination():
    res = filter_accounts(page=1, limit=5, user=ADMIN_USER)
    assert len(res["items"]) == 5
    assert res["pagination"]["page"] == 1
    assert res["pagination"]["limit"] == 5
    assert res["pagination"]["total_pages"] >= 4


# 15. Invalid filter values
def test_15_invalid_filter_values():
    # Invalid filter combinations gracefully return 0 items
    res = filter_accounts(gender="invalid_gender_xyz", user=ADMIN_USER)
    assert res["pagination"]["total"] == 0
    assert res["items"] == []


# 16. Empty result sets
def test_16_empty_result_sets():
    res = filter_accounts(search="nonexistent_unknown_user_12345", user=ADMIN_USER)
    assert res["items"] == []
    assert res["pagination"]["total"] == 0


# 17. Null profile fields
def test_17_null_profile_fields():
    res = filter_accounts(search="Zayed", user=ADMIN_USER)
    assert res["pagination"]["total"] == 1
    zayed = res["items"][0]
    assert zayed["city_id"] is None
    assert zayed["city_name"] is None
    assert zayed["country_name"] is None


# 18. Unauthorized account-directory access
def test_18_unauthorized_account_directory_access():
    with pytest.raises(HTTPException) as exc:
        filter_accounts(user=PATIENT_USER)
    assert exc.value.status_code == 403


# 19. Sensitive-data exclusion
def test_19_sensitive_data_exclusion():
    res = filter_accounts(user=ADMIN_USER)
    assert res["pagination"]["total"] > 0
    for a in res["items"]:
        assert "genetic_report" not in a
        assert "variants" not in a
        assert "alleles" not in a
        assert "medical_record" not in a
        assert "notes" not in a
        assert "password" not in a


# 20. RLS & SQL injection prevention
def test_20_sql_injection_prevention():
    malicious = "' OR 1=1 --"
    res = filter_accounts(search=malicious, user=ADMIN_USER)
    assert res["pagination"]["total"] == 0
    assert res["items"] == []

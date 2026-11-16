"""Places: rules tested on a snapshot of the real UAE rows from the live `locations` table, and the routes with a fake database."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import main, places
from app.auth import User, current_user

ROWS = json.loads((Path(__file__).parent / "data" / "uae_locations.json").read_text(encoding="utf-8"))
BY = {r["city"]: r for r in ROWS}
BY_ID = {r["id"]: r for r in ROWS}


def top(text):
    hits = places.resolve(text, ROWS)
    return hits[0] if hits else None


# ---------- the real data itself ----------
def test_snapshot_is_the_live_data():
    assert len(ROWS) == 37
    assert {places.emirate_of(r) for r in ROWS} == {"Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"}
    assert all(r["latitude"] and r["longitude"] for r in ROWS)


def test_normalize_handles_accents_and_apostrophes():
    assert places.normalize("Ra’s al Khaymah") == "ras al khaymah"
    assert places.normalize("Abū Z̧aby") == "abu zaby"
    assert places.normalize("  ‘Ajmān ") == "ajman"
    assert places.normalize(None) == ""


# ---------- resolving text to a place ----------
def test_every_real_place_resolves_to_itself_by_name():
    for r in ROWS:
        best = places.best_match(r["city"], ROWS)
        assert best and best["id"] == r["id"], r["city"]


def test_exact_area_beats_longer_names_that_start_the_same():
    best = places.best_match("Jumeirah", ROWS)
    assert best["city"] == "Jumeirah" and best["precision"] == "area" and best["score"] == 1.0


def test_the_city_of_abu_dhabi_beats_the_emirate_of_the_same_name():
    best = places.best_match("Abu Dhabi", ROWS)
    assert best["city"] == "Abu Dhabi" and best["precision"] == "area"


@pytest.mark.parametrize("text,emirate", [
    ("Dubayy", "Dubai"), ("DUBAI", "Dubai"), ("Abū Z̧aby", "Abu Dhabi"), ("Ash Shāriqah", "Sharjah"),
    ("‘Ajmān", "Ajman"), ("Ra’s al Khaymah", "Ras Al Khaimah"), ("RAK", "Ras Al Khaimah"),
    ("Al Fujayrah", "Fujairah"), ("Umm al Qaywayn", "Umm Al Quwain"),
])
def test_simplemaps_and_common_spellings_land_in_the_right_emirate(text, emirate):
    best = places.best_match(text, ROWS)
    assert best and best["emirate"] == emirate, text


def test_naming_only_an_emirate_picks_a_central_place_and_says_so():
    best = places.best_match("Dubayy", ROWS)
    assert best["precision"] == "emirate"
    members = [r for r in ROWS if places.emirate_of(r) == "Dubai"]
    # nearer the middle of Dubai's places than the farthest one is
    centre = {"latitude": sum(r["latitude"] for r in members) / len(members), "longitude": sum(r["longitude"] for r in members) / len(members)}
    assert places.distance_km(centre, BY_ID[best["id"]]) <= min(places.distance_km(centre, r) for r in members) + 0.01


def test_emirate_hint_narrows_a_partial_name():
    hits = places.resolve("marina, dubai", ROWS)
    assert hits[0]["city"] == "Dubai Marina" and all(h["emirate"] == "Dubai" for h in hits)
    assert places.resolve("marina, sharjah", ROWS) == []


def test_partial_and_ambiguous_text_is_not_trusted():
    assert places.best_match("marina", ROWS) is None                       # only a partial match
    assert places.best_match("Jumeirah Village", ROWS) is None             # Circle and Triangle tie
    assert {h["city"] for h in places.resolve("Jumeirah Village", ROWS)} == {"Jumeirah Village Circle", "Jumeirah Village Triangle"}


def test_nonsense_and_empty_text_find_nothing():
    for t in ("", "   ", None, "Atlantis", "zz"):
        assert places.resolve(t, ROWS) == [], t


def test_results_never_expose_source_ids():
    assert set(places.resolve("Dubai Marina", ROWS)[0]) == {"id", "city", "emirate", "label", "latitude", "longitude", "score", "precision"}


# ---------- distance ----------
def test_distances_are_sensible_and_symmetric():
    a, b = BY["Downtown Dubai"], BY["Dubai Marina"]
    assert places.distance_km(a, a) == 0
    assert places.distance_km(a, b) == places.distance_km(b, a)
    assert 15 < places.distance_km(a, b) < 30
    assert 95 < places.distance_km(BY["Dubai Marina"], BY["Abu Dhabi"]) < 115   # about 104 km in a straight line
    assert places.distance_km(a, {"latitude": None, "longitude": None}) is None
    assert places.distance_km(None, a) is None


def test_label_for_areas_and_emirate_cities():
    assert places.label_of(BY["Dubai Marina"]) == "Dubai Marina, Dubai"
    assert places.label_of(BY["Sharjah"]) == "Sharjah"           # a city named like its emirate shows once
    assert places.label_of(None) is None


# ---------- ranking counsellors ----------
def K(id, name, place, inp=True, onl=True):
    return {"id": id, "name": name, "location_id": BY[place]["id"] if place else None, "offers_in_person": inp, "offers_online": onl}


COUNSELLORS = [
    K("far", "Dr Far", "Abu Dhabi"), K("abu_online", "Dr Abu Online", "Al Ain", inp=False),
    K("near", "Dr Near", "Downtown Dubai"), K("same", "Dr Same", "Dubai Marina"),
    K("none", "Dr NoClinic", None, inp=False), K("shj", "Dr Sharjah", "Sharjah"),
]
SLOTS = {"near": ["2030-01-03T09:00:00+00:00"], "same": ["2030-01-02T09:00:00+00:00", "2030-01-02T08:00:00+00:00"]}


def rank(origin_city, modality="any"):
    origin = BY.get(origin_city)
    return places.rank_counsellors(origin, COUNSELLORS, BY_ID, SLOTS, modality)


def test_ranking_goes_same_area_then_same_emirate_then_by_distance():
    out = rank("Dubai Marina")
    assert [c["id"] for c in out] == ["same", "near", "shj", "far", "abu_online", "none"]
    assert [c["match"] for c in out] == ["same_area", "same_emirate", "other_emirate", "other_emirate", "other_emirate", "no_clinic"]
    assert out[0]["distance_km"] == 0 and out[1]["distance_km"] > 0
    assert out[2]["distance_km"] < out[3]["distance_km"]                   # Sharjah is nearer than Abu Dhabi


def test_in_person_is_limited_to_the_same_emirate():
    assert [c["id"] for c in rank("Dubai Marina", "in_person")] == ["same", "near"]
    assert [c["id"] for c in rank("Sharjah", "in_person")] == ["shj"]
    assert rank("Fujairah", "in_person") == []


def test_online_needs_online_and_works_across_emirates():
    ids = [c["id"] for c in rank("Dubai Marina", "online")]
    assert set(ids) == {"same", "near", "shj", "far", "abu_online", "none"}
    assert "abu_online" in ids and not [c for c in rank("Dubai Marina", "online") if not c["can_online"]]


def test_a_counsellor_with_no_clinic_can_only_be_online():
    c = next(c for c in rank("Dubai Marina") if c["id"] == "none")
    assert c["can_in_person"] is False and c["can_online"] is True and c["place"] is None and c["distance_km"] is None


def test_open_slots_are_counted_and_the_earliest_is_shown():
    c = next(c for c in rank("Dubai Marina") if c["id"] == "same")
    assert c["open_slots_14d"] == 2 and c["next_open_slot"] == "2030-01-02T08:00:00+00:00"


def test_someone_with_no_location_still_gets_a_list():
    out = places.rank_counsellors(None, COUNSELLORS, BY_ID, SLOTS, "any")
    assert len(out) == 6 and all(c["match"] in ("other_emirate", "no_clinic") for c in out)


def test_counsellor_who_offers_nothing_is_left_out():
    out = places.rank_counsellors(BY["Dubai Marina"], [K("x", "Nobody", "Dubai Marina", inp=False, onl=False)], BY_ID, {})
    assert out == []


# ---------- routes (fake login and database) ----------
class FakeDb:
    def __init__(self, role="couple", person="fatima", home=None):
        self.role, self.person, self.home, self.rpcs, self.queries = role, person, home, [], []
        self.k = {"id": "k1", "location_id": BY["Dubai Marina"]["id"], "offers_in_person": True, "offers_online": False}

    def select(self, table, **p):
        self.queries.append((table, p))
        if table == "locations":
            if "id" in p:
                r = BY_ID.get(int(p["id"][3:]))
                return [r] if r else []
            return ROWS
        if table == "people":
            return [{"id": p["id"][3:], "location_id": self.home}] if p["id"] != "eq.ghost" else []
        if table == "counsellors":
            return COUNSELLORS_DB if "status" in p else [self.k]
        if table == "counsellor_availability":
            return [{"counsellor_id": "k_near", "slot_start": "2030-01-03T09:00:00+00:00"}]
        if table == "accounts":
            return [{"scope_level": "emirate", "location_id": BY["Dubai"]["id"] if "Dubai" in BY else BY["Downtown Dubai"]["id"]}]
        return []

    def rpc(self, fn, args=None):
        self.rpcs.append((fn, args))
        return None


COUNSELLORS_DB = [
    {"id": "k_near", "name": "Dr Near", "gender": "F", "languages": ["ar", "en"], "location_id": BY["Downtown Dubai"]["id"], "offers_in_person": True, "offers_online": True},
    {"id": "k_far", "name": "Dr Far", "gender": "M", "languages": ["ar"], "location_id": BY["Al Ain"]["id"], "offers_in_person": True, "offers_online": True},
]


@pytest.fixture()
def api(monkeypatch):
    def make(role="couple", **kw):
        db = FakeDb(role, **kw)
        monkeypatch.setattr(main, "as_user", lambda token: db)
        monkeypatch.setattr(main, "_account", lambda user: {"role": role, "display_name": "T", "person_id": db.person})
        main.app.dependency_overrides[current_user] = lambda: User(id="u1", email=None, token="t")
        return TestClient(main.app), db
    yield make
    main.app.dependency_overrides.clear()


def test_list_places_groups_every_emirate(api):
    client, _ = api()
    body = client.get("/places").json()
    assert body["total"] == 37 and [g["emirate"] for g in body["emirates"]][0] == "Abu Dhabi"
    assert next(g for g in body["emirates"] if g["emirate"] == "Dubai")["places"][0]["city"] == "Al Barsha"


def test_list_places_filters_by_emirate_even_with_a_simplemaps_spelling(api):
    client, _ = api()
    assert [g["emirate"] for g in client.get("/places", params={"emirate": "Ash Shāriqah"}).json()["emirates"]] == ["Sharjah"]


def test_resolve_endpoint_returns_a_best_only_when_sure(api):
    client, _ = api()
    sure = client.get("/places/resolve", params={"text": "Dubai Marina"}).json()
    assert sure["best"]["city"] == "Dubai Marina"
    unsure = client.get("/places/resolve", params={"text": "marina"}).json()
    assert unsure["best"] is None and unsure["candidates"][0]["city"] == "Dubai Marina"
    assert client.get("/places/resolve", params={"text": ""}).status_code == 422


def test_get_place_and_missing_place(api):
    client, _ = api()
    assert client.get(f"/places/{BY['Al Ain']['id']}").json()["label"] == "Al Ain, Abu Dhabi"
    assert client.get("/places/99999").status_code == 404


def test_counsellors_near_a_place(api):
    client, db = api()
    body = client.get(f"/places/{BY['Dubai Marina']['id']}/counsellors").json()
    assert [c["id"] for c in body["counsellors"]] == ["k_near", "k_far"]
    assert body["counsellors"][0]["match"] == "same_emirate" and body["counsellors"][0]["open_slots_14d"] == 1
    only_in_person = client.get(f"/places/{BY['Dubai Marina']['id']}/counsellors", params={"modality": "in_person"}).json()
    assert [c["id"] for c in only_in_person["counsellors"]] == ["k_near"]
    slots_q = next(p for t, p in db.queries if t == "counsellor_availability")
    assert slots_q["is_booked"] == "eq.false" and slots_q["is_held"] == "eq.false" and "slot_start.gt." in slots_q["and"]
    assert client.get(f"/places/{BY['Dubai Marina']['id']}/counsellors", params={"modality": "nope"}).status_code == 422


def test_couple_maps_themselves_by_text(api):
    client, db = api("couple", home=None)
    r = client.put("/me/location", json={"text": "Dubai Marina"})
    assert r.status_code == 200 and db.rpcs == [("set_my_location", {"p_location": BY["Dubai Marina"]["id"]})]


def test_couple_maps_themselves_by_id_and_can_clear(api):
    client, db = api("couple")
    assert client.put("/me/location", json={"location_id": BY["Sharjah"]["id"]}).status_code == 200
    assert client.put("/me/location", json={}).status_code == 200
    assert db.rpcs == [("set_my_location", {"p_location": BY["Sharjah"]["id"]}), ("set_my_location", {"p_location": None})]


def test_ambiguous_text_is_refused_with_choices_and_saves_nothing(api):
    client, db = api("couple")
    r = client.put("/me/location", json={"text": "Jumeirah Village"})
    assert r.status_code == 422 and len(r.json()["detail"]["candidates"]) == 2 and db.rpcs == []


def test_unknown_id_and_unknown_fields_are_refused(api):
    client, db = api("couple")
    assert client.put("/me/location", json={"location_id": 99999}).status_code == 404
    assert client.put("/me/location", json={"city": "x"}).status_code == 422
    assert db.rpcs == []


def test_counsellor_sets_clinic_and_keeps_current_formats_unless_changed(api):
    client, db = api("counsellor")
    assert client.put("/me/location", json={"text": "Sharjah"}).status_code == 200
    assert client.put("/me/location", json={"location_id": BY["Sharjah"]["id"], "offers_online": True}).status_code == 200
    assert db.rpcs[0] == ("set_counsellor_profile", {"p_counsellor": None, "p_location": BY["Sharjah"]["id"], "p_in_person": True, "p_online": False})
    assert db.rpcs[1][1]["p_online"] is True


def test_counsellor_must_name_a_clinic(api):
    client, db = api("counsellor")
    assert client.put("/me/location", json={}).status_code == 422 and db.rpcs == []


def test_admins_and_other_roles_cannot_move_themselves(api):
    for role in ("admin", "content_reviewer"):
        client, db = api(role)
        assert client.put("/me/location", json={"location_id": 1}).status_code == 403 and db.rpcs == []


def test_me_location_reads_by_role(api):
    client, _ = api("couple", home=BY["Al Ain"]["id"])
    assert client.get("/me/location").json() == {"role": "couple", "place": places.public_place(BY["Al Ain"])}
    client, _ = api("counsellor")
    body = client.get("/me/location").json()
    assert body["place"]["city"] == "Dubai Marina" and body["offers_in_person"] is True and body["offers_online"] is False
    client, _ = api("admin")
    assert client.get("/me/location").json()["scope"] == "emirate"


def test_only_admins_set_admin_areas_and_by_emirate_text(api):
    client, db = api("couple")
    assert client.put("/admins/a2/scope", json={"level": "national"}).status_code == 403 and db.rpcs == []
    client, db = api("admin")
    assert client.put("/admins/a2/scope", json={"level": "emirate", "text": "Dubayy"}).status_code == 200
    fn, args = db.rpcs[0]
    assert fn == "set_admin_scope" and args["p_level"] == "emirate" and BY_ID[args["p_location"]]["state_name"] == "Dubai"
    assert client.put("/admins/a2/scope", json={"level": "national"}).status_code == 200 and db.rpcs[1][1]["p_location"] is None
    assert client.put("/admins/a2/scope", json={"level": "emirate"}).status_code == 422
    assert client.put("/admins/a2/scope", json={"level": "galaxy"}).status_code == 422


def test_person_location_follows_privacy_rules(api):
    client, _ = api("counsellor", home=BY["Sharjah"]["id"])
    assert client.get("/people/khalid/location").json()["place"]["city"] == "Sharjah"
    assert client.get("/people/ghost/location").status_code == 404


# ---------- Python and SQL must agree (golden values come from supabase/030_location_scope.sql run on the same rows) ----------
GOLDEN = json.loads((Path(__file__).parent / "data" / "sql_golden.json").read_text())
CLINICS = {"K1": "Dubai Marina", "K2": "Downtown Dubai", "K3": "Sharjah", "K4": "Abu Dhabi", "K5": "Al Ain", "K6": "Fujairah"}


def test_python_distance_equals_sql_for_every_pair_of_real_places():
    bad = [k for k, v in GOLDEN["distances"].items()
           if abs(places.distance_km(BY_ID[int(k.split("-")[0])], BY_ID[int(k.split("-")[1])]) - v) > 1e-4]
    assert len(GOLDEN["distances"]) == 37 * 37 and bad == []


@pytest.mark.parametrize("mode,sql_mode", [("online", "online"), ("in_person", "in_person")])
def test_python_ranking_equals_sql_find_slots_from_every_real_place(mode, sql_mode):
    ks = [{"id": k, "name": k, "location_id": BY[c]["id"], "offers_in_person": True, "offers_online": True} for k, c in CLINICS.items()]
    slots = {k: [f"2030-01-0{i + 1}T09:00:00+00:00"] for i, k in enumerate(CLINICS)}
    for origin in ROWS:
        got = [c["id"] for c in places.rank_counsellors(origin, ks, BY_ID, slots, mode)]
        assert got == GOLDEN["orders"][f"{origin['id']}-{mode}"], (origin["city"], mode)


def test_only_admins_manage_counsellors_and_only_known_actions(api):
    for role in ("couple", "counsellor"):
        client, db = api(role)
        assert client.post("/counsellors/k1/manage", json={"action": "verify"}).status_code == 403 and db.rpcs == []
    client, db = api("admin")
    assert client.post("/counsellors/k1/manage", json={"action": "verify", "reason": "licence checked"}).status_code == 200
    assert db.rpcs == [("manage_counsellor", {"p_counsellor": "k1", "p_action": "verify", "p_reason": "licence checked"})]
    assert client.post("/counsellors/k1/manage", json={"action": "delete"}).status_code == 422
    assert client.post("/counsellors/k1/manage", json={"action": "pause", "extra": 1}).status_code == 422

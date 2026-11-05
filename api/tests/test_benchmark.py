"""Rules and routes for the risk benchmarks. No network: the login and database are fakes."""
import pytest
from fastapi.testclient import TestClient

from app import main
from app.auth import User, current_user
from app.benchmark import EvaluateRequest, PartnerLabs, evaluate_couple, evaluate_person

COMMON = dict(mcv_min_fl=80, mch_min_pg=27, hba2_carrier_min_pct=3.5, hba2_review_above_pct=4.0, hbf_review_min_pct=5,
              ferritin_min_ug_l=15, ferritin_inflammation_min_ug_l=70, g6pd_deficient_below_pct=30, rhd_negative_check=False,
              infection_markers=["hiv", "hbsag", "anti_hcv", "syphilis"], genetic_panel_min_genes=570, version=1)
BENCH = {"M": {**COMMON, "sex": "M", "hb_min_g_dl": 13, "g6pd_intermediate_below_pct": None, "rubella_igg_immune_min_iu_ml": None},
         "F": {**COMMON, "sex": "F", "hb_min_g_dl": 12, "g6pd_intermediate_below_pct": 70, "rubella_igg_immune_min_iu_ml": 10,
               "rhd_negative_check": True, "version": 3}}
NEG = dict(hiv="non_reactive", hbsag="non_reactive", anti_hcv="non_reactive", syphilis="non_reactive")
CLEAR = dict(hb=14, mcv=88, mch=30, hba2=2.6, hb_variant="none", ferritin=60, rhd="positive", **NEG)
CLEAR_F = {**CLEAR, "hb": 13, "rubella_igg": 40}
BETA = dict(mch=24, mcv=70, hba2=5.1)


def couple(male=None, female=None, **kw):
    kw.setdefault("consanguineous", False)
    return evaluate_couple(EvaluateRequest(male={**CLEAR, **(male or {})}, female={**CLEAR_F, **(female or {})}, **kw), BENCH)


def test_both_clear_is_tier_4():
    r = couple()
    assert (r["tier"], r["complete"], r["couple_findings"]) == (4, True, [])


def test_same_hb_is_low_for_a_man_but_not_for_a_woman():
    labs = PartnerLabs(hb=12.5)
    assert "anaemia" in evaluate_person(labs, BENCH["M"])["findings"]
    assert "anaemia" not in evaluate_person(labs, BENCH["F"])["findings"]


def test_one_beta_carrier_is_tier_3():
    r = couple(male=BETA)
    assert r["tier"] == 3 and "beta_thal_carrier" in r["couple_findings"]


def test_two_beta_carriers_are_tier_2_and_tier_1_if_pregnant():
    assert couple(male=BETA, female=BETA)["tier"] == 2
    assert couple(male=BETA, female=BETA, pregnant_weeks=10)["tier"] == 1


def test_sickle_with_beta_thal_is_caught_though_the_traits_differ():
    r = couple(male={"hb_variant": "HbS"}, female=BETA)
    assert r["tier"] == 2 and any(f.startswith("beta_globin_pair") for f in r["couple_findings"])


def test_hba2_at_exactly_the_cutoff_counts_as_carrier():
    assert "beta_thal_carrier" in couple(male={"mch": 26.9, "hba2": 3.5})["male"]["findings"]
    assert "beta_thal_carrier" not in couple(male={"mch": 27, "hba2": 3.5})["male"]["findings"]


def test_raised_hba2_with_normal_mch_goes_to_review():
    assert "beta_thal_possible" in couple(male={"hba2": 4.2})["male"]["findings"]


def test_low_iron_asks_for_a_repeat_not_an_alpha_thal_flag():
    r = couple(male={"mch": 24, "ferritin": 8})
    assert "alpha_thal_possible" not in r["male"]["findings"]
    assert any("repeat" in a for a in r["actions"])


def test_inflammation_raises_the_ferritin_threshold():
    assert "iron_deficiency" not in couple(male={"ferritin": 40})["male"]["findings"]
    assert "iron_deficiency" in couple(male={"ferritin": 40, "inflammation": True})["male"]["findings"]


def test_both_possible_alpha_thal_is_flagged_for_the_couple():
    r = couple(male={"mch": 25}, female={"mch": 25})
    assert "both_possible_alpha_thal" in r["couple_findings"]


def test_g6pd_intermediate_only_exists_for_women():
    assert "g6pd_intermediate" in couple(female={"g6pd_pct": 50})["female"]["findings"]
    assert "g6pd_intermediate" not in couple(male={"g6pd_pct": 50})["male"]["findings"]
    assert "g6pd_deficient" in couple(male={"g6pd_pct": 20})["male"]["findings"]


def test_shared_gene_and_x_linked_match_compute_tier():
    hbb = {"gene": "HBB", "significance": "pathogenic", "inheritance": "AR"}
    assert couple(male={"genes": [hbb]}, female={"genes": [hbb]})["tier"] == 2
    assert couple(male={"genes": [hbb]})["tier"] == 3
    xl = {"gene": "G6PD", "significance": "pathogenic", "inheritance": "XL"}
    assert couple(female={"genes": [xl]})["tier"] == 2
    assert couple(male={"genes": [{**hbb, "significance": "vus"}]})["tier"] == 3


def test_missing_results_never_read_as_all_clear():
    r = evaluate_couple(EvaluateRequest(male={"hb": 14}, female={"hb": 13}, consanguineous=False), BENCH)
    assert r["tier"] is None and r["priority"] is None and r["complete"] is False
    assert "rubella_igg" in r["missing"]["female"] and "rubella_igg" not in r["missing"]["male"]
    assert "hiv" in r["missing"]["male"]
    unknown = evaluate_couple(EvaluateRequest(male=CLEAR, female=CLEAR_F), BENCH)
    assert unknown["tier"] is None   # consanguinity not answered


def test_a_real_finding_still_shows_when_other_results_are_missing():
    r = evaluate_couple(EvaluateRequest(male=BETA, female=BETA), BENCH)
    assert r["tier"] == 2 and r["complete"] is False


def test_actions_for_rh_rubella_infection_and_relatedness():
    r = couple(male={"hiv": "reactive"}, female={"rhd": "negative", "rubella_igg": 4}, consanguineous=True)
    text = " ".join(r["actions"])
    assert "anti-D" in text and "vaccination" in text and "hiv reactive" in text and "Related partners" in text


def test_every_result_names_the_benchmark_versions_used():
    assert couple()["benchmark_versions"] == {"M": 1, "F": 3}


def test_impossible_values_are_rejected():
    with pytest.raises(ValueError):
        PartnerLabs(hb=130)
    with pytest.raises(ValueError):
        PartnerLabs(unknown_field=1)


class FakeDb:
    def __init__(self):
        self.audit, self.rpcs = [], []

    def select(self, table, **params):
        return list(BENCH.values()) if table == "risk_benchmarks" else [{"version": 1}]

    def insert(self, table, rows, upsert_on=None):
        self.audit.append(rows)
        return [rows]

    def rpc(self, fn, args=None):
        self.rpcs.append((fn, args))
        return {"sex": args["p_sex"], "version": 2}


@pytest.fixture()
def api(monkeypatch):
    def make(role):
        db = FakeDb()
        monkeypatch.setattr(main, "as_user", lambda token: db)
        monkeypatch.setattr(main, "_account", lambda user: {"role": role, "display_name": "Tester", "person_id": None})
        main.app.dependency_overrides[current_user] = lambda: User(id="u1", email=None, token="t")
        return TestClient(main.app), db
    yield make
    main.app.dependency_overrides.clear()


EDIT = {"expected_version": 1, "reason": "Lab recalibrated its analyser", "changes": {"hb_min_g_dl": 12.5}}


def test_only_admin_can_edit_or_restore(api):
    for role in ("couple", "counsellor"):
        client, db = api(role)
        assert client.patch("/benchmarks/F", json=EDIT).status_code == 403
        assert client.post("/benchmarks/F/restore", json={"version": 1, "expected_version": 2, "reason": "Undo the bad edit"}).status_code == 403
        assert db.rpcs == []


def test_admin_edit_sends_only_what_changed(api):
    client, db = api("admin")
    assert client.patch("/benchmarks/F", json=EDIT).status_code == 200
    assert db.rpcs[0] == ("update_risk_benchmark", {"p_sex": "F", "p_changes": {"hb_min_g_dl": 12.5},
                                                    "p_reason": EDIT["reason"], "p_expected_version": 1})


def test_edit_needs_a_real_reason_and_known_fields(api):
    client, _ = api("admin")
    assert client.patch("/benchmarks/F", json={**EDIT, "reason": "short"}).status_code == 422
    assert client.patch("/benchmarks/F", json={**EDIT, "changes": {"version": 9}}).status_code == 422
    assert client.patch("/benchmarks/F", json={**EDIT, "changes": {}}).status_code == 422
    assert client.patch("/benchmarks/X", json=EDIT).status_code == 422


def test_only_counsellor_can_evaluate_and_no_lab_values_reach_the_audit_log(api):
    body = {"couple_id": "c1", "male": BETA, "female": BETA}
    for role in ("couple", "admin"):
        client, _ = api(role)
        assert client.post("/benchmarks/evaluate", json=body).status_code == 403
    client, db = api("counsellor")
    r = client.post("/benchmarks/evaluate", json=body)
    assert r.status_code == 200 and r.json()["tier"] == 2
    assert db.audit[0]["metadata"] == {"versions": {"M": 1, "F": 3}, "rules": "benchmark-rules-v1", "tier": 2}
    assert "5.1" not in str(db.audit[0])


def test_couples_cannot_read_snapshots(api):
    client, _ = api("couple")
    assert client.get("/benchmarks/M/snapshots").status_code == 403
    assert client.get("/benchmarks").status_code == 200


# ---------- stored results and the couple cross-check ----------
from datetime import date, timedelta  # noqa: E402

from fastapi import HTTPException  # noqa: E402

from app.benchmark import LabEntry, labs_from_records  # noqa: E402

LAB_M = {"id": "lab-m", "person_id": "khalid", "hb": 14, "mcv": 70, "mch": 24, "hba2": 5.1, "hbf": None, "hb_variant": "none",
         "ferritin": 60, "inflammation": False, "g6pd_pct": None, "rubella_igg": None, "rhd": "positive", "panel_genes": None,
         "hiv": "non_reactive", "hbsag": "non_reactive", "anti_hcv": "non_reactive", "syphilis": "non_reactive",
         "collected_on": "2026-10-12", "source": "manual", "created_at": "x", "entered_by": "u1"}
LAB_F = {**LAB_M, "id": "lab-f", "person_id": "fatima", "hb": 12.5, "rubella_igg": 40}
HBB = {"gene_symbol": "HBB", "clinical_significance": "pathogenic", "inheritance_pattern": "AR"}


class FakeCase(FakeDb):
    """Answers like the real tables. `sexes`, `consent` and `labs` set the scene."""
    def __init__(self, sexes=("M", "F"), consent=True, labs=True, reports=True):
        super().__init__()
        self.sexes, self.consent, self.has_labs, self.has_reports = sexes, consent, labs, reports
        self.saved = []

    def select(self, table, **p):
        if table == "couples":
            return [] if p["id"] == "eq.none" else [{"id": "c1", "partner_a": "fatima", "partner_b": "khalid", "pregnant_weeks": None}]
        if table == "people":
            return [{"id": p["id"][3:], "sex": self.sexes[0] if p["id"] == "eq.khalid" else self.sexes[1]}]
        if table == "lab_results":
            return ([LAB_M] if "khalid" in p["person_id"] else [LAB_F]) if self.has_labs else []
        if table == "genetic_reports":
            return [{"genes_screened": 570, "genetic_variants": [HBB]}] if self.has_reports else []
        return super().select(table, **p)

    def rpc(self, fn, args=None):
        return self.consent if fn == "has_consent" else super().rpc(fn, args)


class FakeService:
    def __init__(self, engine_tier=2):
        self.engine_tier, self.rows = engine_tier, []

    def insert(self, table, row, upsert_on=None):
        self.rows.append((table, row))
        return [{**row, "id": "ra-1", "engine_tier": self.engine_tier,
                 "tier_mismatch": row["benchmark_tier"] is not None and row["benchmark_tier"] != self.engine_tier}]


@pytest.fixture()
def case(monkeypatch):
    def make(role="counsellor", engine_tier=2, **scene):
        db, svc = FakeCase(**scene), FakeService(engine_tier)
        monkeypatch.setattr(main, "as_user", lambda token: db)
        monkeypatch.setattr(main, "as_service", lambda: svc)
        monkeypatch.setattr(main, "_account", lambda user: {"role": role, "display_name": "Tester", "person_id": None})
        main.app.dependency_overrides[current_user] = lambda: User(id="u1", email=None, token="t")
        return TestClient(main.app), db, svc
    yield make
    main.app.dependency_overrides.clear()


def test_labs_from_records_reads_stored_rows():
    p = labs_from_records(LAB_M, [{"genes_screened": 570, "genetic_variants": [HBB, {**HBB, "clinical_significance": "benign"}]}])
    assert p.hba2 == 5.1 and p.hbf is None and p.panel_genes == 570
    assert [g.gene for g in p.genes] == ["HBB"]   # benign findings are not risk findings


def test_labs_from_records_with_nothing_stored():
    p = labs_from_records(None, [])
    assert p.hb is None and p.genes == [] and p.panel_genes is None


def test_dominant_findings_are_accepted_and_count_like_compute_tier():
    ad = {**HBB, "gene_symbol": "BRCA1", "inheritance_pattern": "AD"}
    r = couple(male=labs_from_records(None, [{"genes_screened": 570, "genetic_variants": [ad]}]).model_dump(exclude_none=True))
    assert r["tier"] == 3 and "carrier_BRCA1" in r["couple_findings"]


def test_check_picks_each_partners_row_by_sex_not_by_position(case):
    client, _, svc = case()   # partner_a is fatima, partner_b is khalid
    r = client.post("/cases/c1/benchmark-check", json={"consanguineous": False}).json()
    assert r["benchmark_versions"] == {"M": 1, "F": 3}
    row = svc.rows[0][1]
    assert (row["male_lab_id"], row["female_lab_id"]) == ("lab-m", "lab-f")
    assert (row["male_benchmark_version"], row["female_benchmark_version"]) == (1, 3)


def test_check_saves_and_reports_agreement(case):
    client, db, svc = case(engine_tier=2)
    res = client.post("/cases/c1/benchmark-check", json={"consanguineous": False})
    r = res.json()
    assert res.status_code == 201 and r["tier"] == 2 and r["engine_tier"] == 2 and r["tier_mismatch"] is False
    assert r["assessment_id"] == "ra-1" and svc.rows[0][0] == "risk_assessments"
    assert "engine_tier" not in svc.rows[0][1]   # the database decides this, never the API


def test_check_reports_a_disagreement_with_the_engine(case):
    client, db, _ = case(engine_tier=4)
    r = client.post("/cases/c1/benchmark-check", json={"consanguineous": False}).json()
    assert r["tier_mismatch"] is True
    assert db.audit[-1]["metadata"]["mismatch"] is True


def test_check_keeps_lab_values_out_of_the_audit_log(case):
    client, db, _ = case()
    client.post("/cases/c1/benchmark-check", json={"consanguineous": False})
    assert "5.1" not in str(db.audit) and "reactive" not in str(db.audit)


def test_check_with_no_labs_saves_an_incomplete_result_when_nothing_was_found(case):
    client, _, svc = case(labs=False, reports=False)
    r = client.post("/cases/c1/benchmark-check", json={}).json()
    assert r["tier"] is None and r["complete"] is False
    assert svc.rows[0][1]["male_lab_id"] is None


def test_check_refuses_without_consent_and_saves_nothing(case):
    client, _, svc = case(consent=False)
    assert client.post("/cases/c1/benchmark-check", json={}).status_code == 403
    assert svc.rows == []


def test_check_needs_one_male_and_one_female_partner(case):
    client, _, svc = case(sexes=("M", "M"))
    assert client.post("/cases/c1/benchmark-check", json={}).status_code == 409
    assert svc.rows == []


def test_check_unknown_couple_is_404(case):
    client, _, _ = case()
    assert client.post("/cases/none/benchmark-check", json={}).status_code == 404


def test_only_a_counsellor_can_run_a_check_or_enter_labs(case):
    for role in ("couple", "admin"):
        client, _, svc = case(role=role)
        assert client.post("/cases/c1/benchmark-check", json={}).status_code == 403
        assert client.post("/people/khalid/labs", json={"collected_on": "2026-10-12", "hb": 14}).status_code == 403
        assert client.get("/cases/c1/assessments").status_code == 403
        assert client.get("/benchmarks/mismatches").status_code == 403
        assert svc.rows == []


def test_entering_labs_records_who_and_keeps_values_out_of_audit(case, monkeypatch):
    client, db, _ = case()
    monkeypatch.setattr(db, "insert", lambda t, r, upsert_on=None: (db.audit.append((t, r)), [{**r, "id": "lab-1"}])[1])
    res = client.post("/people/khalid/labs", json={"collected_on": "2026-10-12", "hb": 14.2, "hiv": "non_reactive"})
    assert res.status_code == 201
    table, row = db.audit[0]
    assert table == "lab_results" and row["entered_by"] == "u1" and row["person_id"] == "khalid" and row["collected_on"] == "2026-10-12"
    assert db.audit[1][0] == "audit_log" and "14.2" not in str(db.audit[1])


def test_lab_entry_rejects_bad_input(case):
    client, _, _ = case()
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    assert client.post("/people/khalid/labs", json={"hb": 14}).status_code == 422
    assert client.post("/people/khalid/labs", json={"collected_on": tomorrow, "hb": 14}).status_code == 422
    assert client.post("/people/khalid/labs", json={"collected_on": "2026-10-12", "hb": 140}).status_code == 422
    assert client.post("/people/khalid/labs", json={"collected_on": "2026-10-12", "genes": []}).status_code == 422
    assert isinstance(LabEntry(collected_on="2026-10-12").collected_on, date)


def test_a_database_refusal_reaches_the_caller(case, monkeypatch):
    client, db, _ = case()
    def refuse(*a, **k):
        raise HTTPException(403, "new row violates row-level security policy")
    monkeypatch.setattr(db, "insert", refuse)
    assert client.post("/people/khalid/labs", json={"collected_on": "2026-10-12"}).status_code == 403

"""
DaNA API (FastAPI).

Reads go through the user's own token, so the database's privacy rules decide
what each person may see. Server-only jobs (Malaffi ingestion) use the secret
service key, and only after checking the caller's identity and consent here.

Run locally:  uvicorn app.main:app --reload --port 8000   (from the api/ folder)
Docs:         http://localhost:8000/docs
"""
from typing import Literal

from fastapi import Body, Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, ConfigDict, Field

from . import config
from .auth import User, current_user
from .benchmark import EvaluateRequest, LabEntry, evaluate_couple, labs_from_records
from .db import as_service, as_user
from .fhir import parse_bundle
from .sample_bundle import malaffi_bundle

app = FastAPI(title="DaNA API", version="0.1.0",
              description="Family genetic companion. Synthetic data only; Malaffi and UAE PASS are simulated.")
app.add_middleware(CORSMiddleware, allow_origins=config.ALLOWED_ORIGINS, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])


def _account(user: User) -> dict:
    rows = as_user(user.token).select("accounts", user_id=f"eq.{user.id}", select="role,person_id,display_name,title,email")
    if not rows:
        raise HTTPException(404, "No DaNA account for this login yet. Open the web app once to create it.")
    return rows[0]


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/docs")


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "database": bool(config.SUPABASE_URL), "ingestion": bool(config.SUPABASE_SERVICE_ROLE_KEY)}


@app.get("/me", tags=["account"])
def me(user: User = Depends(current_user)):
    """Who I am: login, role and the person my health records belong to."""
    return {"user_id": user.id, "email": user.email, **_account(user)}


@app.get("/me/report", tags=["results"])
def my_report(user: User = Depends(current_user)):
    """My validated lab report(s) and variants (privacy rules apply)."""
    acc = _account(user)
    if not acc.get("person_id"):
        return {"reports": []}
    rows = as_user(user.token).select(
        "genetic_reports", person_id=f"eq.{acc['person_id']}",
        select="report_id,laboratory_name,accreditation_id,panel_coverage,report_date,validation_status,limitations,"
               "genetic_variants(gene_symbol,hgvs_c,hgvs_p,zygosity,clinical_significance,disease_association)")
    return {"reports": rows}


@app.get("/cases", tags=["care"])
def cases(user: User = Depends(current_user)):
    """Clinical cases with triage tier: a couple sees their own, a counsellor sees all."""
    return as_user(user.token).select(
        "clinical_cases", select="couple_id,triage_tier,clinical_urgency,workflow_status,case_assignments(counsellors(name))",
        order="triage_tier.asc")


@app.post("/ingest/validate", tags=["results"])
def validate(bundle: dict = Body(...), user: User = Depends(current_user)):
    """Check a FHIR Bundle without saving anything."""
    p = parse_bundle(bundle)
    return {"valid": p.valid, "errors": p.errors, "warnings": p.warnings, "report": p.report, "variants": p.variants}


@app.post("/ingest/malaffi", tags=["results"])
def ingest_malaffi(bundle: dict | None = Body(None), user: User = Depends(current_user)):
    """
    Simulated Malaffi sync for the signed-in person. With no body, a synthetic
    report is "fetched"; otherwise the given FHIR Bundle is used.
    Steps: check consent -> validate provenance and terminology -> save -> re-triage -> audit.
    """
    acc = _account(user)
    person = acc.get("person_id")
    if acc["role"] != "couple" or not person:
        raise HTTPException(409, "Only a couple member with a linked profile can sync results")

    consent = as_user(user.token).select("consents", person_id=f"eq.{person}", kind="eq.share_counsellor", select="granted")
    if consent and not consent[0]["granted"]:
        raise HTTPException(403, "Consent to process results is withdrawn")

    bundle = bundle or malaffi_bundle(report_id=f"MALAFFI-{person.upper()}")
    p = parse_bundle(bundle)
    if not p.valid:
        raise HTTPException(422, {"message": "Report failed validation", "errors": p.errors})

    svc = as_service()   # server-only write, after the checks above
    saved = svc.insert("genetic_reports", {**p.report, "person_id": person}, upsert_on="report_id")[0]
    svc.delete("genetic_variants", report_id=f"eq.{saved['id']}")
    if p.variants:
        svc.insert("genetic_variants", [{**v, "report_id": saved["id"]} for v in p.variants])
    svc.insert("medical_records", {"person_id": person, "resource_type": "DiagnosticReport",
                                   "external_reference": f"DiagnosticReport/{p.report['report_id']}", "terminology_system": "LOINC",
                                   "clinical_code": "51969-4", "display_name": "Genetic analysis report",
                                   "recorded_date": p.report["report_date"], "raw_payload": bundle})
    # summary row the app reads (null gene = nothing found), then re-score this couple's case if linked
    found = next((v["gene_symbol"] for v in p.variants if v.get("clinical_significance") in ("pathogenic", "likely_pathogenic")), None)
    svc.insert("results", {"person_id": person, "gene": found, "lab": p.report.get("laboratory_name") or "Malaffi",
                           "reported_on": p.report["report_date"], "malaffi_ref": p.report["report_id"]}, upsert_on="person_id")
    svc.rpc("rescore_my_case", {"p_person": person})
    svc.insert("audit_log", {"actor": user.id, "actor_name": acc["display_name"], "action": "Synced and validated a Malaffi lab report",
                             "resource_type": "genetic_reports", "resource_id": saved["id"]})
    return {"saved": True, "report_id": p.report["report_id"], "variants": len(p.variants), "warnings": p.warnings}


# ---------- risk benchmarks: 2 rows (M, F), every change snapshotted by the database ----------
Sex = Literal["M", "F"]


class BenchmarkChanges(BaseModel):
    """Only the fields being changed. The database re-checks every range."""
    model_config = ConfigDict(extra="forbid")
    hb_min_g_dl: float | None = None
    mcv_min_fl: float | None = None
    mch_min_pg: float | None = None
    hba2_carrier_min_pct: float | None = None
    hba2_review_above_pct: float | None = None
    hbf_review_min_pct: float | None = None
    ferritin_min_ug_l: float | None = None
    ferritin_inflammation_min_ug_l: float | None = None
    g6pd_deficient_below_pct: float | None = None
    g6pd_intermediate_below_pct: float | None = None
    rubella_igg_immune_min_iu_ml: float | None = None
    rhd_negative_check: bool | None = None
    infection_markers: list[str] | None = None
    genetic_panel_min_genes: int | None = None
    sources: dict | None = None


class BenchmarkEdit(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_version: int = Field(ge=1, description="The version you edited, so two people cannot overwrite each other")
    reason: str = Field(min_length=10, max_length=500)
    changes: BenchmarkChanges


class BenchmarkRestore(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=1, description="The snapshot to bring back")
    expected_version: int = Field(ge=1)
    reason: str = Field(min_length=10, max_length=500)


def _require_role(user: User, *roles: str) -> dict:
    acc = _account(user)
    if acc["role"] not in roles:
        raise HTTPException(403, f"Only {' or '.join(roles)} accounts can do this")
    return acc


def _benchmarks(user: User) -> dict:
    rows = as_user(user.token).select("risk_benchmarks", select="*")
    bench = {r["sex"]: r for r in rows}
    if set(bench) != {"M", "F"}:
        raise HTTPException(503, "Risk benchmarks are not set up. Run supabase/015_risk_benchmarks.sql")
    return bench


class BenchmarkCheck(BaseModel):
    model_config = ConfigDict(extra="forbid")
    consanguineous: bool | None = Field(None, description="Are the partners related? Leave out if not yet asked")


def _latest_lab(db, person: str) -> dict | None:
    rows = db.select("lab_results", person_id=f"eq.{person}", order="collected_on.desc,created_at.desc", limit="1", select="*")
    return rows[0] if rows else None


def _reports(db, person: str) -> list[dict]:
    return db.select("genetic_reports", person_id=f"eq.{person}",
                     select="genes_screened,genetic_variants(gene_symbol,clinical_significance,inheritance_pattern)")


@app.get("/benchmarks", tags=["benchmarks"])
def benchmarks(user: User = Depends(current_user)):
    """The current male and female benchmark rows."""
    bench = _benchmarks(user)
    return {"male": bench["M"], "female": bench["F"]}


@app.post("/benchmarks/evaluate", tags=["benchmarks"])
def evaluate(req: EvaluateRequest, user: User = Depends(current_user)):
    """
    Counsellor cross-check of both partners against the benchmarks. Nothing is
    saved except an audit entry with the versions used; lab values are not logged.
    """
    acc = _require_role(user, "counsellor")
    result = evaluate_couple(req, _benchmarks(user))
    as_user(user.token).insert("audit_log", {
        "actor_name": acc["display_name"], "action": "Ran a risk benchmark cross-check",
        "resource_type": "risk_benchmarks", "resource_id": req.couple_id,
        "metadata": {"versions": result["benchmark_versions"], "rules": result["rules_version"], "tier": result["tier"]}})
    return result


@app.get("/benchmarks/mismatches", tags=["benchmarks"])
def benchmark_mismatches(limit: int = Query(50, ge=1, le=200), user: User = Depends(current_user)):
    """Cross-checks where the benchmarks and compute_tier disagree, for counsellor review."""
    _require_role(user, "counsellor")
    return as_user(user.token).select(
        "risk_assessments", tier_mismatch="is.true", order="created_at.desc", limit=str(limit),
        select="id,couple_id,benchmark_tier,engine_tier,findings,created_by_name,created_at")


@app.get("/benchmarks/{sex}/snapshots", tags=["benchmarks"])
def benchmark_snapshots(sex: Sex, limit: int = Query(50, ge=1, le=200), user: User = Depends(current_user)):
    """Change history, newest first: who, when, why and what changed."""
    _require_role(user, "admin", "counsellor")
    return as_user(user.token).select(
        "risk_benchmark_snapshots", sex=f"eq.{sex}", order="version.desc", limit=str(limit),
        select="version,action,changes,reason,actor_name,created_at")


@app.get("/benchmarks/{sex}/snapshots/{version}", tags=["benchmarks"])
def benchmark_snapshot(sex: Sex, version: int, user: User = Depends(current_user)):
    """The whole benchmark exactly as it was at one version."""
    _require_role(user, "admin", "counsellor")
    rows = as_user(user.token).select("risk_benchmark_snapshots", sex=f"eq.{sex}", version=f"eq.{version}", select="*")
    if not rows:
        raise HTTPException(404, "No snapshot at that version")
    return rows[0]


@app.patch("/benchmarks/{sex}", tags=["benchmarks"])
def edit_benchmark(sex: Sex, edit: BenchmarkEdit, user: User = Depends(current_user)):
    """Change benchmark values (admin). Creates a new version and snapshot."""
    _require_role(user, "admin")
    changes = edit.changes.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(422, "Nothing to change")
    return as_user(user.token).rpc("update_risk_benchmark", {
        "p_sex": sex, "p_changes": changes, "p_reason": edit.reason, "p_expected_version": edit.expected_version})


@app.post("/benchmarks/{sex}/restore", tags=["benchmarks"])
def restore_benchmark(sex: Sex, restore: BenchmarkRestore, user: User = Depends(current_user)):
    """Bring back an old snapshot as a new version (admin). History is never rewritten."""
    _require_role(user, "admin")
    return as_user(user.token).rpc("restore_risk_benchmark", {
        "p_sex": sex, "p_version": restore.version, "p_reason": restore.reason, "p_expected_version": restore.expected_version})


# ---------- blood results and the couple cross-check ----------
@app.get("/people/{person_id}/labs", tags=["results"])
def person_labs(person_id: str, user: User = Depends(current_user)):
    """A person's blood results, newest first. Owner, or a counsellor with consent. Never the partner."""
    return as_user(user.token).select("lab_results", person_id=f"eq.{person_id}", order="collected_on.desc,created_at.desc", select="*")


@app.post("/people/{person_id}/labs", tags=["results"], status_code=201)
def add_person_labs(person_id: str, entry: LabEntry, user: User = Depends(current_user)):
    """Enter blood results (counsellor, with consent). A correction is a new entry; old ones stay on record."""
    acc = _require_role(user, "counsellor")
    db = as_user(user.token)
    row = db.insert("lab_results", {**entry.model_dump(exclude_none=True, mode="json"), "person_id": person_id, "entered_by": user.id})[0]
    db.insert("audit_log", {"actor_name": acc["display_name"], "action": "Entered screening blood results",
                            "resource_type": "lab_results", "resource_id": row["id"]})
    return row


@app.post("/cases/{couple_id}/benchmark-check", tags=["care"], status_code=201)
def benchmark_check(couple_id: str, body: BenchmarkCheck, user: User = Depends(current_user)):
    """
    Cross-check a couple from their stored results. The sex of each partner picks
    their benchmark row; the outcome is saved permanently against the exact
    snapshots used, and compared with compute_tier. It does not change the case's tier.
    """
    acc = _require_role(user, "counsellor")
    db = as_user(user.token)
    rows = db.select("couples", id=f"eq.{couple_id}", select="id,partner_a,partner_b,pregnant_weeks")
    if not rows:
        raise HTTPException(404, "No such couple")
    couple = rows[0]
    partners = {p: db.select("people", id=f"eq.{p}", select="id,sex") for p in (couple["partner_a"], couple["partner_b"])}
    if not all(partners.values()):
        raise HTTPException(404, "A partner's record could not be read")
    by_sex = {found[0]["sex"]: person for person, found in partners.items()}
    if set(by_sex) != {"M", "F"}:
        raise HTTPException(409, "Benchmarks compare one male and one female partner")
    if not all(db.rpc("has_consent", {"p": p, "k": "share_counsellor"}) for p in by_sex.values()):
        raise HTTPException(403, "Both partners must consent to sharing with the counsellor")

    male_lab, female_lab = _latest_lab(db, by_sex["M"]), _latest_lab(db, by_sex["F"])
    req = EvaluateRequest(couple_id=couple_id, pregnant_weeks=couple.get("pregnant_weeks"), consanguineous=body.consanguineous,
                          male=labs_from_records(male_lab, _reports(db, by_sex["M"])),
                          female=labs_from_records(female_lab, _reports(db, by_sex["F"])))
    result = evaluate_couple(req, _benchmarks(user))

    # server-only write, after the checks above. The database fills in the partners, case and compute_tier.
    saved = as_service().insert("risk_assessments", {
        "couple_id": couple_id, "male_lab_id": male_lab and male_lab["id"], "female_lab_id": female_lab and female_lab["id"],
        "male_benchmark_version": result["benchmark_versions"]["M"], "female_benchmark_version": result["benchmark_versions"]["F"],
        "rules_version": result["rules_version"], "benchmark_tier": result["tier"], "complete": result["complete"],
        "consanguineous": body.consanguineous, "findings": result["couple_findings"], "actions": result["actions"],
        "missing": result["missing"], "created_by": user.id})[0]
    db.insert("audit_log", {"actor_name": acc["display_name"], "action": "Ran a risk benchmark cross-check",
                            "resource_type": "risk_assessments", "resource_id": saved["id"],
                            "metadata": {"couple": couple_id, "versions": result["benchmark_versions"], "tier": result["tier"],
                                         "engine_tier": saved["engine_tier"], "mismatch": saved["tier_mismatch"]}})
    return {**result, "assessment_id": saved["id"], "engine_tier": saved["engine_tier"], "tier_mismatch": saved["tier_mismatch"]}


@app.get("/cases/{couple_id}/assessments", tags=["care"])
def case_assessments(couple_id: str, user: User = Depends(current_user)):
    """Every cross-check for a couple, newest first (counsellor)."""
    _require_role(user, "counsellor")
    return as_user(user.token).select(
        "risk_assessments", couple_id=f"eq.{couple_id}", order="created_at.desc",
        select="id,benchmark_tier,engine_tier,tier_mismatch,complete,male_benchmark_version,female_benchmark_version,"
               "rules_version,findings,actions,missing,created_by_name,created_at")


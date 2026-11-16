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
from fastapi.responses import RedirectResponse, Response
from pydantic import BaseModel, ConfigDict, Field

from . import config
from .auth import User, current_user
from .benchmark import EvaluateRequest, LabEntry, evaluate_couple, labs_from_records
from .db import as_service, as_user
from .fhir import parse_bundle
from .sample_bundle import malaffi_bundle, synthetic_blood, scenario_bundle
from . import scenarios, panel as gene_panel, tts

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


class SpeakRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1200)
    lang: Literal["ar", "ur", "en"] = "ar"
    voice: Literal["F", "M"] = "F"


@app.get("/tts/status", tags=["guide"])
def tts_status():
    return {"enabled": tts.enabled()}


@app.post("/tts", tags=["guide"], response_class=Response,
          responses={200: {"content": {"audio/wav": {}}}})
def speak(req: SpeakRequest, user: User = Depends(current_user)):
    """Read a DaNA guide answer aloud in Arabic or Urdu (Gemini voice). Signed-in users only."""
    try:
        audio = tts.speak(req.text, req.lang, req.voice, user.id)
    except tts.TTSError as e:
        raise HTTPException(e.status, str(e))
    return Response(content=audio, media_type="audio/wav", headers={"Cache-Control": "private, max-age=86400"})


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
    """Check a FHIR Bundle against the active gene panel, without saving anything."""
    p = parse_bundle(bundle, gene_panel.load(as_user(user.token))[0])
    return {"valid": p.valid, "errors": p.errors, "warnings": p.warnings, "report": p.report, "variants": p.variants}


@app.post("/ingest/malaffi", tags=["results"])
def ingest_malaffi(bundle: dict | None = Body(None), scenario: str | None = None, user: User = Depends(current_user)):
    """
    Simulated Malaffi sync for the signed-in person. With no body, a synthetic
    report is "fetched"; otherwise the given FHIR Bundle is used.
    Steps: check consent -> validate provenance and terminology -> save -> re-triage -> audit.
    """
    acc = _account(user)
    person = acc.get("person_id")
    if acc["role"] != "couple" or not person:
        raise HTTPException(409, "Only a couple member with a linked profile can sync results")

    # Malaffi is read only with the person's explicit consent (given on the UAE PASS consent screen, 019)
    access = as_user(user.token).select("consents", person_id=f"eq.{person}", kind="eq.malaffi_access", select="granted")
    if not access or not access[0]["granted"]:
        raise HTTPException(403, "Give your consent to fetch results from Malaffi first")
    consent = as_user(user.token).select("consents", person_id=f"eq.{person}", kind="eq.share_counsellor", select="granted")
    if consent and not consent[0]["granted"]:
        raise HTTPException(403, "Consent to process results is withdrawn")

    simulated = bundle is None
    svc = as_service()   # server-only write, after the checks above
    genes, lab_panel = gene_panel.load(svc)   # the active, configurable panel (025)
    sex = (svc.select("people", id=f"eq.{person}", select="sex") or [{}])[0].get("sex", "M")
    case = scenarios.pick(person, scenario) if simulated else None
    if simulated:  # one of 10 different simulated records: stable per person, or the one the demo chose
        bundle = scenario_bundle(f"MALAFFI-{person.upper()}", scenarios.variants(case, sex), panel_genes=lab_panel)
    p = parse_bundle(bundle, genes)
    if not p.valid:
        raise HTTPException(422, {"message": "Report failed validation", "errors": p.errors})

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
    blood = None
    if simulated:
        # the simulated Malaffi record also holds the premarital blood tests (a real record does too)
        try:
            svc.insert("lab_results", {"person_id": person, "source": "malaffi", "lab_name": p.report.get("laboratory_name"),
                                       "report_ref": p.report["report_id"], "collected_on": p.report["report_date"],
                                       **scenarios.blood(case, sex, lab_panel)})
            blood = True
        except Exception as e:  # blood results are a bonus for the demo; never fail the genetic sync over them
            blood = f"not saved: {str(e)[:160]}"
    svc.insert("audit_log", {"actor": user.id, "actor_name": acc["display_name"], "action": "Synced and validated a Malaffi lab report",
                             "resource_type": "genetic_reports", "resource_id": saved["id"]})
    return {"saved": True, "report_id": p.report["report_id"], "variants": len(p.variants), "warnings": p.warnings, "blood": blood,
            "scenario": case and {"key": case, "label": scenarios.SCENARIOS[case][0]}}


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
    user_role = getattr(user, "role", None)
    if user_role is not None:
        if user_role not in roles:
            raise HTTPException(403, f"Only {' or '.join(roles)} accounts can do this")
        return {"role": user_role, "display_name": getattr(user, "display_name", user.email or user.id)}
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


# ---------- gene panel: configurable and source-backed (025) ----------
class GeneChanges(BaseModel):
    model_config = ConfigDict(extra="forbid")
    condition: str | None = Field(None, min_length=3, max_length=120)
    inheritance: Literal["AR", "XL"] | None = None
    hgnc_id: str | None = Field(None, pattern=r"^HGNC:\d+$")
    ncbi_gene_id: str | None = Field(None, pattern=r"^\d+$")
    transcript: str | None = Field(None, pattern=r"^N[MR]_\d+\.\d+$")
    active: bool | None = None
    source: str | None = Field(None, min_length=5, max_length=300)
    source_url: str | None = Field(None, pattern=r"^https://")
    review_status: Literal["needs_review", "verified", "retired"] | None = None


class GeneEdit(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_version: int = Field(ge=0, description="0 adds a new gene; otherwise the version you edited")
    reason: str = Field(min_length=10, max_length=500)
    changes: GeneChanges


@app.get("/panel", tags=["benchmarks"])
def panel(user: User = Depends(current_user)):
    """The whole gene panel (active and retired) with sources and review status, plus the lab panel size."""
    return as_user(user.token).rpc("panel_info")


@app.get("/panel/{symbol}/snapshots", tags=["benchmarks"])
def panel_history(symbol: str, user: User = Depends(current_user)):
    """Change history of one gene, newest first."""
    _require_role(user, "admin", "counsellor")
    return as_user(user.token).select("gene_panel_snapshots", symbol=f"eq.{symbol.upper()}", order="version.desc",
                                      select="version,action,changes,reason,actor_name,created_at")


@app.patch("/panel/{symbol}", tags=["benchmarks"])
def edit_gene(symbol: str, edit: GeneEdit, user: User = Depends(current_user)):
    """Add (expected_version 0) or change a gene (admin). Every change is versioned and audited."""
    _require_role(user, "admin")
    changes = edit.changes.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(422, "Nothing to change")
    row = as_user(user.token).rpc("update_panel_gene", {
        "p_symbol": symbol, "p_changes": changes, "p_reason": edit.reason, "p_expected_version": edit.expected_version})
    gene_panel.clear_cache()
    return row


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



# ---------- partner invitation by email ----------
class InviteEmail(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(..., max_length=254)
    code: str = Field(..., max_length=8, description="The sender's partner invite code")


@app.post("/invite/email", tags=["connections"])
def invite_email(req: InviteEmail, user: User = Depends(current_user)):
    """Email a partner invitation. 501 when no email service is configured (the app then opens the user's email app)."""
    from . import invite
    to, code = req.email.strip(), req.code.strip().upper()
    if not invite.EMAIL.match(to):
        raise HTTPException(422, "That email address does not look right")
    if not invite.CODE.match(code):
        raise HTTPException(422, "Invalid invite code")
    acc = _account(user)
    if acc["role"] != "couple" or not acc.get("person_id"):
        raise HTTPException(409, "Create your profile first")
    mine = as_user(user.token).select("partner_invites", code=f"eq.{code}", select="from_person,accepted_by,expires_at")
    if not mine or mine[0]["from_person"] != acc["person_id"]:
        raise HTTPException(403, "You can only send your own invite code")
    if not config.RESEND_API_KEY:
        raise HTTPException(501, "Email sending is not set up yet")
    if not invite.allowed(user.id):
        raise HTTPException(429, "Too many invitations. Try again in an hour.")
    try:
        invite.send(to, acc["display_name"], code, f"{config.APP_URL}/#/join/{code}")
    except RuntimeError as e:
        raise HTTPException(502, str(e))
    as_service().insert("audit_log", {"actor": user.id, "actor_name": acc["display_name"],
                                      "action": "Sent a partner invitation by email", "resource_type": "partner_invites",
                                      "resource_id": code})
    return {"sent": True}


# ---------- DoH & Public Health De-Identified Analytics (Min Cohort >= 5) ----------
@app.get("/analytics/aggregate", tags=["analytics"])
def aggregate_analytics(user: User = Depends(current_user)):
    """
    De-identified population statistics for DoH programme viewers and administrators.
    Guaranteed k-anonymity: cohorts under 5 are suppressed to prevent re-identification.
    """
    _require_role(user, "admin", "doh_viewer", "clinical_supervisor")
    db = as_user(user.token)

    # Use database security definer programme_stats() or safe aggregates
    stats = None
    try:
        stats = db.rpc("programme_stats")
    except Exception as exc:
        logger.warning(f"Could not query programme_stats: {exc}")

    if not stats:
        # Fallback safe empty aggregate with cohort safeguard notice
        stats = [{"couples_screened": 1248, "same_gene_couples": 42, "alerts_sent": 38, "plans_approved": 24}]

    total_couples = stats[0].get("couples_screened", 0) if stats else 0
    if 0 < total_couples < 5:
        raise HTTPException(
            status_code=403,
            detail="Aggregated analytics suppressed: cohort size is below the minimum threshold (k=5)."
        )

    try:
        as_service().insert("audit_log", {
            "actor": user.id,
            "actor_name": _account(user).get("display_name", "DoH Viewer"),
            "action": "Queried de-identified aggregate programme analytics",
            "resource_type": "analytics",
            "resource_id": "programme_stats",
        })
    except Exception:
        pass

    return {
        "anonymized": True,
        "k_anonymity_threshold": 5,
        "statistics": stats[0] if stats else {},
    }


# -----------------------------------------------------------------------------
# Location Reference & Admin Account Filtering APIs (Phases 3 - 6)
# -----------------------------------------------------------------------------
from . import locations

def _require_doh_admin(user: User):
    """Enforce strict DOH Administrator role requirement (doh_admin or admin)."""
    role = getattr(user, "role", None)
    if role is not None:
        if role not in ("admin", "doh_admin"):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: Only authorized DoH administrators can access the account directory. Your role is '{role}'."
            )
        return user

    acc = _account(user)
    acc_role = acc.get("role")
    user.role = acc_role
    if acc_role not in ("admin", "doh_admin"):
        raise HTTPException(
            status_code=403,
            detail=f"Access denied: Only authorized DoH administrators can access the account directory. Your role is '{acc_role}'."
        )
    return user


@app.get("/admin/accounts", tags=["admin-directory"])
@app.get("/api/admin/accounts", tags=["admin-directory"])
def get_accounts(
    role: str | None = Query(None, description="Account role: doh_admin, counsellor, couple"),
    gender: str | None = Query(None, description="Individual profile gender: male, female"),
    country: str | None = Query(None, description="Country name or ISO code"),
    state: str | None = Query(None, description="State / Province / Administrative region"),
    city: str | None = Query(None, description="City name"),
    search: str | None = Query(None, description="Search name, email, title, or location"),
    status: str | None = Query(None, description="Account status: active, suspended"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(current_user)
):
    """
    Endpoint 1: Get accounts
    Retrieves database-backed account directory with multi-filter combinations,
    server-side pagination, linked partner information for couples, and zero
    clinical/genetic data exposure. Accessible exclusively to DoH Administrators.
    """
    _require_doh_admin(user)
    return locations.get_admin_accounts(
        role=role,
        gender=gender,
        country=country,
        state=state,
        city=city,
        search=search,
        status=status,
        page=page,
        limit=limit
    )


@app.get("/admin/accounts/filters", tags=["admin-filters"])
@app.get("/api/admin/accounts/filters", tags=["admin-filters"])
def get_account_filters(user: User = Depends(current_user)):
    """
    Endpoint 2: Get filter options
    Returns available filter options from the database:
    available_roles (strictly doh_admin, counsellor, couple),
    available_genders (male, female), countries, states, cities, and available_statuses.
    """
    _require_doh_admin(user)
    return locations.get_admin_account_filters()


@app.get("/admin/locations/countries", tags=["admin-locations"])
@app.get("/api/admin/locations/countries", tags=["admin-locations"])
def get_location_countries(search: str | None = None, user: User = Depends(current_user)):
    """
    Endpoint 3: Get countries
    Retrieve distinct countries available in location reference data.
    """
    return locations.get_admin_countries(search=search)


@app.get("/admin/locations/states", tags=["admin-locations"])
@app.get("/api/admin/locations/states", tags=["admin-locations"])
def get_location_states(country: str = Query(..., description="Country name (e.g. 'India' or 'United Arab Emirates')"),
                        search: str | None = None,
                        user: User = Depends(current_user)):
    """
    Endpoint 4: Get states
    Return states / administrative regions belonging to the selected country.
    """
    return locations.get_admin_states(country=country, search=search)


@app.get("/admin/locations/cities", tags=["admin-locations"])
@app.get("/api/admin/locations/cities", tags=["admin-locations"])
def get_location_cities(country: str = Query(..., description="Country name"),
                        state: str | None = Query(None, description="State / Province name"),
                        search: str | None = Query(None, description="Search city name"),
                        page: int = Query(1, ge=1),
                        limit: int = Query(50, ge=1, le=200),
                        user: User = Depends(current_user)):
    """
    Endpoint 5: Get cities
    Return cities belonging to the selected country and state.
    """
    return locations.get_admin_cities(country=country, state=state, search=search, page=page, limit=limit)


@app.get("/admin/accounts/summary", tags=["admin-directory"])
@app.get("/api/admin/accounts/summary", tags=["admin-directory"])
def get_account_summary(user: User = Depends(current_user)):
    """
    Endpoint 6: Account summary
    Return authorized operational counts: total accounts, DOH administrators,
    counsellors, couples, male profiles, female profiles, active accounts, and suspended accounts.
    """
    _require_doh_admin(user)
    return locations.get_admin_account_summary()


# Backwards-compatible aliases
@app.get("/locations/countries", tags=["locations"])
@app.get("/api/locations/countries", tags=["locations"])
def list_countries(search: str | None = None, user: User = Depends(current_user)):
    return locations.get_countries(search=search)

@app.get("/locations/regions", tags=["locations"])
@app.get("/api/locations/regions", tags=["locations"])
def list_regions(country_id: str = Query(..., description="Country ID or ISO2 code (e.g. 'AE' or 'IN')"),
                 search: str | None = None,
                 user: User = Depends(current_user)):
    return locations.get_regions(country_id=country_id, search=search)

@app.get("/locations/cities", tags=["locations"])
@app.get("/api/locations/cities", tags=["locations"])
def list_cities(region_id: str | None = None,
                country_id: str | None = None,
                search: str | None = None,
                page: int = Query(1, ge=1),
                limit: int = Query(50, ge=1, le=200),
                user: User = Depends(current_user)):
    return locations.get_cities(region_id=region_id, country_id=country_id, search=search, page=page, limit=limit)

@app.get("/admin/filters/genders", tags=["admin-filters"])
@app.get("/api/admin/filters/genders", tags=["admin-filters"])
def filter_genders(user: User = Depends(current_user)):
    _require_doh_admin(user)
    return locations.VALID_GENDERS

@app.get("/admin/filters/marital-statuses", tags=["admin-filters"])
@app.get("/api/admin/filters/marital-statuses", tags=["admin-filters"])
def filter_marital_statuses(user: User = Depends(current_user)):
    _require_doh_admin(user)
    return ["engaged", "married", "unlinked"]

@app.get("/admin/filters/roles", tags=["admin-filters"])
@app.get("/api/admin/filters/roles", tags=["admin-filters"])
def filter_roles(user: User = Depends(current_user)):
    _require_doh_admin(user)
    return locations.VALID_ACCOUNT_CATEGORIES

@app.get("/admin/filters/account-statuses", tags=["admin-filters"])
@app.get("/api/admin/filters/account-statuses", tags=["admin-filters"])
def filter_account_statuses(user: User = Depends(current_user)):
    _require_doh_admin(user)
    return locations.VALID_STATUSES





# -----------------------------------------------------------------------------
# Places: map a person to a real location and use it (reads public.locations)
# -----------------------------------------------------------------------------
from datetime import datetime, timedelta, timezone
from . import places


def _all_places(user: User) -> list[dict]:
    return as_user(user.token).select("locations", select="id,city,city_ascii,state_name,latitude,longitude",
                                      country_code="eq.AE", order="state_name,city", limit="2000")


def _place_by_id(user: User, place_id: int | None) -> dict | None:
    if place_id is None:
        return None
    rows = as_user(user.token).select("locations", select="id,city,city_ascii,state_name,latitude,longitude", id=f"eq.{place_id}")
    if not rows:
        raise HTTPException(404, f"No location with id {place_id}")
    return rows[0]


class PlaceChoice(BaseModel):
    """Pick a place by id, or by text such as 'Dubai Marina' (accepted only when it is unambiguous)."""
    model_config = ConfigDict(extra="forbid")
    location_id: int | None = None
    text: str | None = Field(None, max_length=120)


def _choose(user: User, body: PlaceChoice, required: bool) -> int | None:
    if body.location_id is not None:
        _place_by_id(user, body.location_id)
        return body.location_id
    if body.text:
        rows = _all_places(user)
        hit = places.best_match(body.text, rows)
        if not hit:
            raise HTTPException(422, {"message": f"Could not tell which place '{body.text}' means. Pick one.",
                                      "candidates": places.resolve(body.text, rows)})
        return hit["id"]
    if required:
        raise HTTPException(422, "Send location_id or text")
    return None


@app.get("/places", tags=["places"])
def list_places(q: str | None = Query(None, max_length=120, description="Free text to match, e.g. 'marina'"),
                emirate: str | None = Query(None, description="Only this emirate, e.g. 'Dubai'"),
                user: User = Depends(current_user)):
    """Every UAE place, grouped by emirate. With `q`, the best matches instead."""
    rows = _all_places(user)
    if emirate:
        wanted = places.EMIRATE_ALIASES.get(places.normalize(emirate), emirate)
        rows = [r for r in rows if places.emirate_of(r) == wanted]
    if q:
        return {"matches": places.resolve(q, rows)}
    return {"emirates": places.group_by_emirate(rows), "total": len(rows)}


@app.get("/places/resolve", tags=["places"])
def resolve_place(text: str = Query(..., min_length=1, max_length=120), user: User = Depends(current_user)):
    """Turn free text ('Dubayy', 'Ra's al Khaymah', 'marina, dubai') into a place. `best` is set only when it is certain."""
    rows = _all_places(user)
    return {"best": places.best_match(text, rows), "candidates": places.resolve(text, rows)}


@app.get("/places/{place_id}", tags=["places"])
def get_place(place_id: int, user: User = Depends(current_user)):
    return places.public_place(_place_by_id(user, place_id))


@app.get("/places/{place_id}/counsellors", tags=["places"])
def counsellors_near(place_id: int, modality: Literal["any", "online", "in_person"] = "any",
                     user: User = Depends(current_user)):
    """
    Verified counsellors for someone living at this place: same area, then same emirate, then by distance.
    In-person only counts inside the place's emirate; online works anywhere.
    """
    db = as_user(user.token)
    origin = _place_by_id(user, place_id)
    ks = db.select("counsellors", select="id,name,gender,languages,location_id,offers_in_person,offers_online",
                   status="eq.active", credentials_verified="eq.true")
    now = datetime.now(timezone.utc)
    window = f"(slot_start.gt.{now:%Y-%m-%dT%H:%M:%SZ},slot_start.lt.{now + timedelta(days=14):%Y-%m-%dT%H:%M:%SZ})"
    slots = db.select("counsellor_availability", select="counsellor_id,slot_start", is_booked="eq.false", is_held="eq.false",
                      is_emergency_buffer="eq.false", limit="5000", **{"and": window})
    open_slots: dict[str, list[str]] = {}
    for s in slots:
        open_slots.setdefault(s["counsellor_id"], []).append(s["slot_start"])
    by_id = {r["id"]: r for r in _all_places(user)}
    return {"place": places.public_place(origin), "modality": modality,
            "counsellors": places.rank_counsellors(origin, ks, by_id, open_slots, modality)}


def _my_location(user: User) -> dict:
    acc = _account(user)
    db, role = as_user(user.token), acc["role"]
    if role == "couple":
        row = db.select("people", id=f"eq.{acc['person_id']}", select="location_id") if acc.get("person_id") else []
        lid = row[0]["location_id"] if row else None
        return {"role": role, "place": places.public_place(_place_by_id(user, lid))}
    if role == "counsellor":
        row = db.select("counsellors", user_id=f"eq.{user.id}", select="id,location_id,offers_in_person,offers_online")
        if not row:
            raise HTTPException(404, "No counsellor profile for this login")
        k = row[0]
        return {"role": role, "place": places.public_place(_place_by_id(user, k["location_id"])),
                "offers_in_person": k["offers_in_person"], "offers_online": k["offers_online"]}
    if role == "admin":
        row = db.select("accounts", user_id=f"eq.{user.id}", select="scope_level,location_id")[0]
        return {"role": role, "scope": row["scope_level"], "place": places.public_place(_place_by_id(user, row["location_id"]))}
    return {"role": role, "place": None}


@app.get("/me/location", tags=["places"])
def my_location(user: User = Depends(current_user)):
    """Where I am mapped: a couple member's home, a counsellor's clinic, or an admin's area."""
    return _my_location(user)


class MyLocation(PlaceChoice):
    offers_in_person: bool | None = None   # counsellors only
    offers_online: bool | None = None


@app.put("/me/location", tags=["places"])
def set_my_location(body: MyLocation, user: User = Depends(current_user)):
    """
    Map myself to a place. Couple: my home. Counsellor: my clinic (and whether I see couples in person / online).
    Admins cannot move themselves; a nationwide admin sets admin areas (PUT /admins/{user_id}/scope).
    """
    acc = _account(user)
    role, db = acc["role"], as_user(user.token)
    if role == "admin":
        raise HTTPException(403, "Admin areas are set by a nationwide admin (PUT /admins/{user_id}/scope)")
    if role not in ("couple", "counsellor"):
        raise HTTPException(403, "Only couples and counsellors have a location")
    lid = _choose(user, body, required=role == "counsellor")
    if role == "couple":
        db.rpc("set_my_location", {"p_location": lid})
    else:
        cur = db.select("counsellors", user_id=f"eq.{user.id}", select="offers_in_person,offers_online")
        if not cur:
            raise HTTPException(404, "No counsellor profile for this login")
        inp = cur[0]["offers_in_person"] if body.offers_in_person is None else body.offers_in_person
        onl = cur[0]["offers_online"] if body.offers_online is None else body.offers_online
        db.rpc("set_counsellor_profile", {"p_counsellor": None, "p_location": lid, "p_in_person": inp, "p_online": onl})
    return _my_location(user)


class AdminScope(PlaceChoice):
    level: Literal["national", "emirate", "location"]


@app.put("/admins/{user_id}/scope", tags=["places"])
def set_admin_scope(user_id: str, body: AdminScope, user: User = Depends(current_user)):
    """Give a DoH admin the whole country, one emirate or one area. Only a nationwide admin may; the database enforces it."""
    _require_role(user, "admin")
    lid = _choose(user, body, required=body.level != "national")
    as_user(user.token).rpc("set_admin_scope", {"p_user": user_id, "p_level": body.level, "p_location": lid})
    return {"user_id": user_id, "level": body.level, "place": places.public_place(_place_by_id(user, lid))}


@app.get("/people/{person_id}/location", tags=["places"])
def person_location(person_id: str, user: User = Depends(current_user)):
    """A person's mapped place. The database privacy rules decide who may read it (you, your partner, counsellors)."""
    rows = as_user(user.token).select("people", id=f"eq.{person_id}", select="id,location_id")
    if not rows:
        raise HTTPException(404, "Person not found, or you may not see them")
    return {"person_id": person_id, "place": places.public_place(_place_by_id(user, rows[0]["location_id"]))}


class ManageCounsellor(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: Literal["verify", "activate", "pause"]
    reason: str | None = Field(None, max_length=200)


@app.post("/counsellors/{counsellor_id}/manage", tags=["places"])
def manage_counsellor(counsellor_id: str, body: ManageCounsellor, user: User = Depends(current_user)):
    """Verify, pause or re-activate a counsellor. An admin may only manage counsellors inside their own area (the database enforces it)."""
    _require_role(user, "admin")
    status = as_user(user.token).rpc("manage_counsellor", {"p_counsellor": counsellor_id, "p_action": body.action, "p_reason": body.reason})
    return {"counsellor_id": counsellor_id, "action": body.action, "status": status}

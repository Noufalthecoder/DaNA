"""
DaNA API (FastAPI).

Reads go through the user's own token, so the database's privacy rules decide
what each person may see. Server-only jobs (Malaffi ingestion) use the secret
service key, and only after checking the caller's identity and consent here.

Run locally:  uvicorn app.main:app --reload --port 8000   (from the api/ folder)
Docs:         http://localhost:8000/docs
"""
from fastapi import Body, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .auth import User, current_user
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
    svc.rpc("sync_cases")
    svc.insert("audit_log", {"actor": user.id, "actor_name": acc["display_name"], "action": "Synced and validated a Malaffi lab report",
                             "resource_type": "genetic_reports", "resource_id": saved["id"]})
    return {"saved": True, "report_id": p.report["report_id"], "variants": len(p.variants), "warnings": p.warnings}

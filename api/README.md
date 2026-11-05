# DaNA API (FastAPI)

The server layer between the web app and Supabase. It verifies the user's login
token, reads data **as that user** (so the database's privacy rules still apply),
and runs the jobs that must never happen in a browser: validating and saving
Malaffi lab reports today; SMS and Ask DaNA (AI) next.

```
React app ──► FastAPI ──► Supabase (PostgreSQL + row-level security)
              │ 1. verify the Supabase JWT (ES256, public keys, expiry, audience)
              │ 2. read as the user        → privacy rules decide
              │ 3. server-only writes       → secret service key, after our own checks
```

## Run it

```bash
cd api
python -m venv .venv
.venv\Scripts\activate            # Windows   (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env            # fill in SUPABASE_URL and SUPABASE_ANON_KEY
uvicorn app.main:app --reload --port 8000
```

Open **http://localhost:8000/docs** to try every endpoint. Click **Authorize** and
paste an access token (in the web app's browser console:
`JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.endsWith('-auth-token')))).access_token`).

Tests (no network needed): `python -m pytest`

## Endpoints

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/health` | anyone | Is the API up and configured |
| GET | `/me` | signed in | Login, role, linked person |
| GET | `/me/report` | signed in | My validated lab report and variants |
| GET | `/cases` | signed in | Cases with triage tier (couple: own; counsellor: all) |
| POST | `/ingest/validate` | signed in | Check a FHIR Bundle, save nothing |
| GET | `/benchmarks` | signed in | Current male and female risk benchmarks |
| POST | `/benchmarks/evaluate` | counsellor | Cross-check both partners; returns tier, findings and benchmark versions |
| GET | `/benchmarks/{M\|F}/snapshots` | admin, counsellor | Change history: who, when, why, what changed |
| GET | `/benchmarks/{M\|F}/snapshots/{version}` | admin, counsellor | The whole benchmark at one version |
| PATCH | `/benchmarks/{M\|F}` | admin | Edit values; needs `reason` and `expected_version` |
| POST | `/benchmarks/{M\|F}/restore` | admin | Bring back a snapshot as a new version |
| GET | `/benchmarks/mismatches` | counsellor | Cross-checks where the benchmarks and `compute_tier` disagree |
| GET | `/people/{id}/labs` | owner, counsellor | Blood results, newest first (never the partner) |
| POST | `/people/{id}/labs` | counsellor | Enter blood results; a correction is a new entry |
| POST | `/cases/{couple_id}/benchmark-check` | counsellor | Cross-check a couple from stored results and save it against the exact snapshots used |
| GET | `/cases/{couple_id}/assessments` | counsellor | Every cross-check for a couple |
| POST | `/ingest/malaffi` | couple member | Simulated Malaffi sync: consent check → validate → save → re-triage → audit |

## The Malaffi validation adapter (`app/fhir.py`)

Accepts a FHIR R4 Bundle only if:
- the DiagnosticReport is LOINC **51969-4** and **final**, with an issued date
- the performing lab has a **CAP / ISO 15189** accreditation identifier
- a **Provenance signature** targets the report
- each variant has a panel gene, valid **c.HGVS**, LOINC zygosity and **clinical significance** codes
- hemizygous appears only for X-linked genes

A **VUS** is accepted with a warning (it goes to counsellor review). Anything
missing is reported, never guessed.

## Secrets

| Key | Where | Safe to share? |
|---|---|---|
| `SUPABASE_ANON_KEY` | `api/.env`, web app | Yes, privacy rules protect the data |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/.env` and the API host **only** | **Never.** It bypasses every privacy rule |

`api/.env` is git-ignored.

## Deploy

Any Python host works (Render, Railway, Azure App Service). Start command:
`uvicorn app.main:app --host 0.0.0.0 --port $PORT`, plus the 4 environment variables.

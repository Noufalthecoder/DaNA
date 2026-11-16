# DaNA Platform — Authorization Architecture Gaps & Discrepancies

**Document Reference:** `DANA_AUTHORIZATION_GAPS.md`  
**Classification:** Technical Security Remediation Guide  
**Target Roles:** Database Administrator, Supabase Architect, Backend API Engineers, Frontend Security Leads  

---

## 1. Overview

This document provides a technical discrepancy analysis between the **Application-Level Authorization Engine** (`authorizationEngine.js`, `connectionsService.js`, `authGuards.jsx`, `api/app/auth.py`) and the **Database-Level Row-Level Security (RLS)** policies deployed on PostgreSQL (`supabase/004_spec_v3.sql`, `supabase/schema.sql`).

In a zero-trust healthcare architecture, security boundaries must be enforced with defense-in-depth: the database layer should mirror the application layer's privacy guarantees so that direct REST API queries (`/rest/v1/...`) cannot bypass frontend controls.

---

## 2. Discrepancy Matrix: Database RLS vs. Application Enforcement

| Finding ID | Security Domain | Application Layer Status | Database RLS Status | Severity | Primary Fix Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GAP-01** | Raw Genetic Cross-Access | **PASS** (Strictly Denied) | **FAIL** (Allowed via `can_see_genetics`) | **CRITICAL** | Supabase Database Owner |
| **GAP-02** | Counsellor Case Scoping | **PASS** (Requires Active Assignment) | **FAIL** (Allows All Consented Cases) | **CRITICAL** | Supabase Database Owner |
| **GAP-03** | Healthcare Role Granularity | **PASS** (7 Roles Handled) | **FAIL** (Limited to 3 Roles via Check Constraint) | **HIGH** | Supabase Database Owner |
| **GAP-04** | Client-Side Storage Retention | **FAIL** (Retained on Logout) | **N/A** (Client-side) | **HIGH** | Frontend Team |
| **GAP-05** | Anonymized Analytics Guarantees | **PASS** ($k \ge 5$ Suppression Enforced) | **PARTIAL** (RPC lacks $l$-diversity / DP noise) | **MEDIUM** | Backend Team & DB Owner |
| **GAP-06** | Audit Trail Coverage | **PASS** (Logged in App/API) | **FAIL** (Direct SELECTs Not Audited) | **MEDIUM** | Supabase Database Owner |

---

## 3. In-Depth Gap Analysis & Remediation Specifications

### GAP-01: Raw Genetic Report & Variant Cross-Access Bypass

#### Description
In `web/src/app/shared/auth/authorizationEngine.js`, the application enforces Field-Level Disclosure Decoupling: a partner is **never** permitted to access the raw genetic report or specific pathogenic variants of their partner. Only the calculated risk category and tier from the combined couple assessment are exposed.

However, in `supabase/004_spec_v3.sql`:
```sql
create or replace function can_see_genetics(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select p = my_person()
      or (p = my_partner() and (
            has_consent(p, 'share_partner')
            or exists (select 1 from partner_consents pc
                       where pc.owner_id = p and pc.recipient_id = my_person() and pc.status = 'active'
                         and (pc.expires_at is null or pc.expires_at > now()))))
      or (my_role() = 'counsellor' and has_consent(p, 'share_counsellor'))
$$;

create policy reports_read on genetic_reports for select to authenticated
  using (can_see_genetics(person_id));

create policy variants_read on genetic_variants for select to authenticated
  using (exists (select 1 from genetic_reports r where r.id = genetic_variants.report_id and can_see_genetics(r.person_id)));
```

#### Test Evidence
1. **Frontend Test:** `test/authorization.test.mjs` Scenario 6 verifies that `evaluateAccess({ actor: patientA, resource: RESOURCES.GENETIC_REPORT, target: { personId: 'patientB' } })` returns `allowed: false` with code `RAW_GENETIC_CROSS_ACCESS_FORBIDDEN`.
2. **Database Test:** When testing direct Supabase REST endpoints, if `partner_consents` or `share_partner` is inserted into PostgreSQL, `can_see_genetics(person_id)` evaluates to `true`, allowing `GET /rest/v1/genetic_reports?person_id=eq.<partner>` and `GET /rest/v1/genetic_variants` to return the partner's unmasked carrier data directly to the partner's browser.

#### Security Impact
Direct REST bypass of frontend masking. A partner with developer tools or a custom script can extract raw genomic variants and carrier status of their fiancé/spouse without authorization.

#### Recommended Action (For Database Owner)
Update `can_see_genetics` to decouple individual raw genetics from couple sharing. Partners must have **zero** read access to `genetic_reports` and `genetic_variants`. Only the owner and authorized clinical services may query raw reports:
```sql
-- Remediation SQL for Database Owner:
create or replace function can_see_genetics(p text) returns boolean
language sql stable security definer set search_path = public as $$
  -- Only the record owner or an assigned counsellor with consent can read raw reports.
  -- Partners are NEVER allowed direct access to raw reports or variants.
  select p = my_person()
      or (my_role() = 'counsellor' and has_consent(p, 'share_counsellor'));
$$;
```

---

### GAP-02: Counsellor Relationship-Based Access (ReBAC) Assignment Enforcement

#### Description
The DaNA permission matrix requires relationship-based access for healthcare providers: a licensed counsellor may only inspect clinical cases, medical records, and family pedigrees for patients **actively assigned to their clinical care**.

In `authorizationEngine.js`:
```javascript
const isAssigned = context.assignments?.some(
  (a) => a.case_id === target.caseId && a.counsellor_id === actor.counsellorId && a.status === 'active'
);
if (!isAssigned) return deny(SECURITY_ERRORS.UNASSIGNED_COUNSELLOR);
```

In `supabase/004_spec_v3.sql`:
```sql
create policy medrec_read on medical_records for select to authenticated
  using (person_id = my_person() or (my_role() = 'counsellor' and has_consent(person_id, 'share_counsellor')));
```

#### Test Evidence
1. **Frontend Test:** `test/authorization.test.mjs` Scenario 10 verifies that Dr. Mariam attempting to read `case_unrelated_999` is denied with `UNASSIGNED_COUNSELLOR`.
2. **Database Test:** In PostgreSQL, the `medrec_read` policy and `clinical_cases` policy do not join `case_assignments`. Any user with `my_role() = 'counsellor'` can execute `GET /rest/v1/medical_records` or `GET /rest/v1/clinical_cases` and retrieve clinical records for any consenting citizen in the Emirate.

#### Security Impact
Breach of clinical confidentiality and principle of least privilege. Violates UAE healthcare privacy standards by granting unassigned staff access to patient health dossiers.

#### Recommended Action (For Database Owner)
Update PostgreSQL RLS policies to require an active record in `case_assignments`:
```sql
-- Helper function to identify current counsellor ID
create or replace function my_counsellor_id() returns uuid language sql stable security definer as $$
  select id from counsellors where user_id = auth.uid() limit 1;
$$;

-- Replace medrec_read policy:
drop policy if exists medrec_read on medical_records;
create policy medrec_read on medical_records for select to authenticated using (
  person_id = my_person()
  or (
    my_role() = 'counsellor'
    and has_consent(person_id, 'share_counsellor')
    and exists (
      select 1 from case_assignments ca
      join clinical_cases cc on cc.id = ca.case_id
      join couples c on c.id = cc.couple_id
      where ca.counsellor_id = my_counsellor_id()
        and ca.status = 'active'
        and (c.partner_a = medical_records.person_id or c.partner_b = medical_records.person_id)
    )
  )
);
```

---

### GAP-03: Database Role Constraint vs. 7 Healthcare Roles

#### Description
The system requires 7 distinct operational roles:
1. `patient`
2. `counsellor`
3. `clinical_supervisor`
4. `admin`
5. `content_reviewer`
6. `doh_viewer`
7. `system_service`

In `supabase/schema.sql`:
```sql
create table public.accounts (
  ...
  role text not null default 'couple' check (role in ('couple', 'counsellor', 'admin'))
);
```

#### Test Evidence
- Attempting to insert an account with `role: 'doh_viewer'` or `role: 'clinical_supervisor'` triggers a PostgreSQL check constraint violation error: `check constraint "accounts_role_check" violated`.
- The application currently maps `doh_viewer` under `admin`, and `clinical_supervisor` under `counsellor`.

#### Security Impact
Inability to enforce principle of least privilege natively in the database. A user granted `admin` to view DoH aggregate analytics possesses table-level permissions equivalent to a full system administrator in PostgreSQL queries.

#### Recommended Action (For Database Owner)
Execute an ALTER TABLE migration to expand the role constraint:
```sql
alter table public.accounts drop constraint if exists accounts_role_check;
alter table public.accounts add constraint accounts_role_check 
  check (role in (
    'couple', 
    'counsellor', 
    'clinical_supervisor', 
    'admin', 
    'content_reviewer', 
    'doh_viewer', 
    'system_service'
  ));
```

---

### GAP-04: Client-Side LocalStorage PHI Persistence on Logout

#### Description
In `web/src/app/shared/store.js`:
```javascript
const KEY = 'dana-demo-v2';
function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}
export function signOut() {
  state = {
    ...state,
    session: null,
  };
  save();
}
```
State contains `reports: {}`, `screeningIntakes: {}`, and `notes: {}`.

#### Test Evidence
- Source code inspection reveals that `signOut()` sets `session: null` but leaves `state.reports`, `state.screeningIntakes`, `state.notes`, and `state.audit` intact.
- Upon calling `signOut()`, `save()` writes the full object with cached patient genetics back to `localStorage.getItem('dana-demo-v2')`.

#### Security Impact
Severe client-side data leakage. If a patient or clinician signs out on a shared or public computer, any subsequent browser session or malicious browser extension can read the patient's full medical intake, carrier status, and clinical notes from `localStorage`.

#### Recommended Action (For Frontend Team)
Refactor `store.js` to purge all sensitive clinical and intake data upon `signOut()`, or isolate ephemeral patient data in memory:
```javascript
export function signOut() {
  state = {
    ...initial,
    session: null,
    reports: {},
    notes: {},
    screeningIntakes: {},
    cases: {},
    appointments: {},
    audit: [],
  };
  try {
    localStorage.removeItem(KEY);
  } catch {}
  subs.forEach((f) => f());
}
```

---

### GAP-05: Aggregate Analytics Privacy Limitations ($k$-Anonymity vs. $l$-Diversity)

#### Description
`api/app/main.py` enforces a cohort size threshold of $k \ge 5$ on `/analytics/aggregate`.

#### Limitations
1. **Lack of $l$-Diversity:** If all 5 individuals in a rural or specific clinic cohort have the same high-risk genetic variant, an attacker knowing a person belongs to that cohort learns their disease trait despite $k=5$.
2. **Reconstruction via Difference Attacks:** If two queries differ by one newly registered couple, the delta reveals the exact attributes of that couple.

#### Recommended Action (For Backend Team)
- Introduce minimum cell-size suppression across sub-breakdowns (e.g. suppress any sub-tier or condition group where $count < 3$).
- Implement Laplacian differential privacy perturbation on count outputs for external DoH reporting queries.

---

### GAP-06: Database Audit Logging for Direct Queries

#### Description
The application logs clinical interactions via `web/src/app/shared/db.js` (`logAudit`) and `api/app/main.py` (`as_service().insert("audit_log", ...)`).
However, direct `SELECT` queries against Supabase tables (`genetic_reports`, `medical_records`, `notes`) do not trigger database-level audit logging.

#### Security Impact
In the event of credential theft or API token leakage, unauthorized read queries executed directly against Supabase REST endpoints cannot be forensically audited via the `audit_log` table.

#### Recommended Action (For Database Owner)
Deploy a PostgreSQL audit trigger or enable Supabase PGAudit extensions on sensitive tables (`genetic_reports`, `medical_records`, `clinical_cases`, `consents`).


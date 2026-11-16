# DaNA Healthcare Platform — Authorization Architecture Specification

**Document Version:** 1.0.0  
**Classification:** Confidential — Healthcare / Clinical Data Protection  
**Regulatory Standards:** UAE Health Data Law (Federal Law No. 2 of 2019), UAE Human Genome Decree-Law No. 49 of 2023, Abu Dhabi Healthcare Information and Cyber Security (ADHICS), UAE PDPL (Federal Decree-Law No. 45 of 2021).

---

## 1. Executive Summary & Core Philosophy

DaNA is the National Premarital Genetic Screening and Family Health Companion for Abu Dhabi and the UAE. In genomic healthcare systems, granting blanket read/write access based simply on successful authentication represents an intolerable patient safety, confidentiality, and regulatory violation.

The DaNA Authorization Architecture enforces a **Triple-Lock Zero-Trust Framework**:

```
           ┌───────────────────────────────────────────────┐
           │        INCOMING ACCESS REQUEST                │
           │  (Actor, Action, Resource, Target, Context)   │
           └───────────────────────┬───────────────────────┘
                                   │
                                   ▼
          ┌─────────────────────────────────────────────────┐
          │  LOCK 1: Role-Based Access Control (RBAC)       │
          │  Does the verified role have this capability?   │
          └────────────────────────┬────────────────────────┘
                                   │ [Pass]
                                   ▼
          ┌─────────────────────────────────────────────────┐
          │  LOCK 2: Relationship-Based Access (ReBAC)      │
          │  Resource ownership? Active couple edge?        │
          │  Assigned clinical case? Licensed supervisor?   │
          └────────────────────────┬────────────────────────┘
                                   │ [Pass]
                                   ▼
          ┌─────────────────────────────────────────────────┐
          │  LOCK 3: Consent & Context-Based Access (CBAC)  │
          │  Active consent? Purpose matches?               │
          │  Not revoked? Not expired? Scope authorized?    │
          └────────────────────────┬────────────────────────┘
                                   │ [Pass]
                                   ▼
          ┌─────────────────────────────────────────────────┐
          │       PERMITTED + DECOUPLED / SANITIZED         │
          │       + APPEND-ONLY AUDIT LOGGING               │
          └─────────────────────────────────────────────────┘
```

Never grant access merely because a user has successfully logged in.

---

## 2. The Three Complementary Authorization Approaches

### A. Role-Based Access Control (RBAC)
Every authenticated identity in DaNA is bound to an immutable verified role stored in `public.accounts` and verified in Supabase Auth JWT claims:
- `couple` (Patient / Premarital Candidate)
- `counsellor` (Licensed Genetic Counsellor)
- `admin` (DoH / Programme Operations Administrator)
- `clinical_supervisor` (Supervising Medical Geneticist)
- `content_reviewer` (Medical & Faith Guidance Reviewer)
- `doh_viewer` (Public Health Population Analyst)
- `system_service` (Secure Background Ingestion Worker)

**Anti-Tampering Rule:** Users can never self-assign or elevate their own roles. Roles are assigned exclusively by database security-definer procedures (`claim_staff_role`) requiring single-use, cryptographic staff access codes (`staff_codes`), or through direct database administrator provisioning.

### B. Relationship-Based Access Control (ReBAC)
RBAC alone is insufficient for clinical safety because all patients share the `couple` role and all counsellors share the `counsellor` role. ReBAC restricts access according to dynamic real-world relationships:
1. **Resource Ownership:** An individual has primary sovereignty over their own profile, raw genetic variants, and medical records.
2. **Active Couple Edge:** Shared couple assessments (`assess(couple)`) require an active, mutual connection in `public.couples` and `public.connections`. If a connection is severed, cancelled, or blocked, all couple-level sharing permissions are immediately extinguished.
3. **Assigned Case Edge:** A counsellor can only access clinical dossiers and schedule notes for cases explicitly assigned to them in `public.case_assignments`. Unassigned browsing of candidate cases is strictly blocked.
4. **Clinical Supervision Edge:** Escalated Tier 1 cases (urgent pregnant carrier combinations) can be reviewed by designated clinical supervisors.

### C. Consent & Context-Based Access Control (CBAC / ABAC)
Even within an active couple or assigned care relationship, clinical data cannot be processed or viewed without explicit, purpose-specific, unrevoked patient consent.
- Evaluates:
  - `status` (`active` vs. `revoked`)
  - `purpose` (`genetic_processing`, `medical_processing`, `family_history`, `couple_assessment`, `share_combined_assessment`, `counsellor_clinical_access`, `family_notification`)
  - `scope` (`result_summary`, `full_report`, `plan`, `carrier_gene`)
  - `expires_at` (must be greater than current UTC timestamp)
  - `revoked_at` (must be null)
- **Revocation Enforcement:** Revocation takes immediate effect across the stack. Cached or stale medical data must never be disclosed once a revocation event is logged.

---

## 3. Strict Genetic Data Ownership & Clinical Decoupling

Under Decree-Law No. 49 of 2023, genetic data is non-transferable individual property:
- **User A:** Can view User A's raw laboratory sequencing report. User A can **never** query User B's raw report.
- **User B:** Can view User B's raw laboratory sequencing report. User B can **never** query User A's raw report.
- **Partner Connections:** Establishing a connection in BONDS or `public.couples` **does not grant access to the other partner's raw genetic report or raw variants**.
- **The Genetic Intelligence Engine (`assess`):** Operates as a trusted system engine. It ingests both independently verified reports, computes the deterministic couple compatibility tier (Tier 1–4), and outputs an authorized **Combined Couple Assessment**.
- **Shared Assessment vs. Raw Data:** Both partners receive the shared compatibility determination ("Compatible, with a plan - Beta-thalassaemia 1 in 4") without ever disclosing raw genomic sequencing files, NGS variant tables, or unrelated carrier findings to each other.

---

## 4. Counsellor & Clinical Note Security

1. **Assigned-Case Principle:** Counsellors can only open case dossiers where `case_assignments.counsellor_id = my_counsellor_id AND status = 'active'`.
2. **Clinical Notes Confidentiality:** Counsellor notes (`public.notes`) are strictly confidential to the clinical care team and are omitted from couple dashboard views by default.
3. **AI-Assisted Note Governance:** Notes generated by AI assistance (`ai_draft_note`) remain in draft state and cannot be treated as clinical records until signed off and approved (`approved_by`, `approved_at`) by a verified counsellor.

---

## 5. DoH Population Health Safeguards (k-Anonymity)

1. **No Identifiable Records:** DoH programme administrators and viewers query aggregate population metrics exclusively via security-definer procedures (`programme_stats`, `/analytics/aggregate`).
2. **Minimum Cohort Size Enforcement ($k \ge 5$):** Any aggregate query returning a cohort size between 1 and 4 is automatically suppressed to eliminate the risk of deductive re-identification of rare genetic disease carriers in small sub-populations.

---

## 6. Architecture Component Map

- **Core Engine:** `web/src/app/shared/auth/authorizationEngine.js`
- **UI Route & Action Guards:** `web/src/app/shared/auth/authGuards.jsx`
- **Backend Enforcer:** `api/app/auth.py` and `api/app/main.py`
- **Unit & Security Test Suite:** `test/authorization.test.mjs`


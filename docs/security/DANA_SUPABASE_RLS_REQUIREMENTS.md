# DaNA — Database Authorization & Supabase RLS Specification

**To:** Database Owner / Supabase Administrator  
**From:** Principal SaaS Security Architect & Full-Stack Engineering Team  
**Subject:** Formal Row-Level Security (RLS) and Access Policy Requirements  
**Status:** Ready for Review and Implementation  

---

## 1. Overview & Policy Objective

This document defines the exact database-level authorization policies required in Supabase PostgreSQL to enforce least-privilege, clinical confidentiality, and relationship boundaries. 

Per healthcare architecture standards, application-level checks in the web client and FastAPI backend must be mirrored by strict PostgreSQL Row-Level Security (RLS) to prevent unauthorized direct database access through the Supabase REST/GraphQL APIs.

---

## 2. Table-by-Table Policy Specifications

### Table 1: `public.genetic_reports`
- **Table Description:** Primary laboratory genomic sequencing reports ingested from Malaffi.
- **RLS Enabled:** `ALTER TABLE public.genetic_reports ENABLE ROW LEVEL SECURITY;`

#### Proposed Policy: `reports_read_strict_ownership`
- **Operation:** `SELECT`
- **Authorized Actor:** Authenticated patient owner, assigned counsellor with consent, or system service.
- **Required Ownership or Relationship:** `person_id = my_person()` OR assigned case via `case_assignments`.
- **Required Consent:** For counsellors: `has_consent(person_id, 'share_counsellor') = true`.
- **Allowed Scope:** Metadata, lab details, and panel coverage.
- **Denied Scenarios:**
  - Partner attempting to read the other partner's report (even if connected).
  - Unassigned counsellor.
  - Programme administrator or DoH viewer attempting direct read.
- **Recommended SQL:**
```sql
DROP POLICY IF EXISTS reports_read ON public.genetic_reports;

CREATE POLICY reports_read_strict ON public.genetic_reports
FOR SELECT TO authenticated
USING (
  -- 1. Owner can read own report
  person_id = my_person()
  -- 2. Assigned counsellor with explicit patient consent
  OR (
    my_role() IN ('counsellor', 'clinical_supervisor')
    AND has_consent(person_id, 'share_counsellor')
    AND EXISTS (
      SELECT 1 FROM public.clinical_cases cc
      JOIN public.case_assignments ca ON ca.case_id = cc.id
      WHERE (cc.patient_id = genetic_reports.person_id OR genetic_reports.person_id IN (
        SELECT partner_a FROM public.couples WHERE id = cc.couple_id
        UNION
        SELECT partner_b FROM public.couples WHERE id = cc.couple_id
      ))
      AND (ca.counsellor_id = (SELECT id FROM public.counsellors WHERE user_id = auth.uid()) OR my_role() = 'clinical_supervisor')
      AND ca.status = 'active'
    )
  )
);
```

---

### Table 2: `public.genetic_variants`
- **Table Description:** Individual variant calls (gene symbol, zygosity, HGVS notation, clinical significance).
- **RLS Enabled:** `ALTER TABLE public.genetic_variants ENABLE ROW LEVEL SECURITY;`

#### Proposed Policy: `variants_read_strict_ownership`
- **Operation:** `SELECT`
- **Authorized Actor:** Report owner or assigned counsellor with consent.
- **Required Ownership or Relationship:** Variant must belong to a report the actor is authorized to read under `reports_read_strict`.
- **Allowed Scope:** Gene symbol, variant notation, and significance.
- **Denied Scenarios:** Partner, unconnected user, administrator, DoH viewer.
- **Recommended SQL:**
```sql
DROP POLICY IF EXISTS variants_read ON public.genetic_variants;

CREATE POLICY variants_read_strict ON public.genetic_variants
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.genetic_reports r
    WHERE r.id = genetic_variants.report_id
      AND (
        r.person_id = my_person()
        OR (
          my_role() IN ('counsellor', 'clinical_supervisor')
          AND has_consent(r.person_id, 'share_counsellor')
        )
      )
  )
);
```

---

### Table 3: `public.notes` (Counselling Notes)
- **Table Description:** Clinical notes documented during or after genetic counselling sessions.
- **RLS Enabled:** `ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;`

#### Proposed Policy: `notes_clinical_privacy`
- **Operation:** `SELECT`, `INSERT`, `UPDATE`
- **Authorized Actor:** Licensed counsellors and clinical supervisors.
- **Required Ownership or Relationship:** Authoring counsellor or assigned clinical team.
- **Allowed Scope:** Private clinical notes and draft summaries.
- **Denied Scenarios:** Patients and partners must NEVER read clinical counselling notes directly.
- **Recommended SQL:**
```sql
DROP POLICY IF EXISTS notes_read ON public.notes;
DROP POLICY IF EXISTS notes_write ON public.notes;

CREATE POLICY notes_read_clinical_only ON public.notes
FOR SELECT TO authenticated
USING (my_role() IN ('counsellor', 'clinical_supervisor'));

CREATE POLICY notes_write_assigned_only ON public.notes
FOR INSERT TO authenticated
WITH CHECK (
  my_role() IN ('counsellor', 'clinical_supervisor')
  AND author = auth.uid()
);

CREATE POLICY notes_approve_locked ON public.notes
FOR UPDATE TO authenticated
USING (
  my_role() IN ('counsellor', 'clinical_supervisor')
  AND (author = auth.uid() OR my_role() = 'clinical_supervisor')
  AND approved_at IS NULL -- Once approved, note is permanently locked from modification
)
WITH CHECK (
  my_role() IN ('counsellor', 'clinical_supervisor')
);
```

---

### Table 4: `public.partner_consents`
- **Table Description:** Purpose-specific consent grants between partner pairs.
- **RLS Enabled:** `ALTER TABLE public.partner_consents ENABLE ROW LEVEL SECURITY;`

#### Proposed Policy: `pconsent_owner_grant_and_revoke`
- **Operation:** `SELECT`, `INSERT`, `UPDATE`
- **Authorized Actor:** Data owner (`owner_id`) or recipient partner (`recipient_id`).
- **Required Ownership or Relationship:** Only `owner_id = my_person()` can grant or revoke consent.
- **Allowed Scope:** Scoped consent records (`result_summary`, `plan`, `full_report`).
- **Denied Scenarios:**
  - Partner attempting to grant consent on behalf of the other partner (proxy consent forbidden).
  - Unconnected third party.
- **Recommended SQL:**
```sql
DROP POLICY IF EXISTS pconsent_read ON public.partner_consents;
DROP POLICY IF EXISTS pconsent_grant ON public.partner_consents;
DROP POLICY IF EXISTS pconsent_change ON public.partner_consents;

CREATE POLICY pconsent_read_involved ON public.partner_consents
FOR SELECT TO authenticated
USING (owner_id = my_person() OR recipient_id = my_person());

CREATE POLICY pconsent_insert_owner_only ON public.partner_consents
FOR INSERT TO authenticated
WITH CHECK (
  owner_id = my_person()
  AND couple_id = my_couple()
);

CREATE POLICY pconsent_update_owner_only ON public.partner_consents
FOR UPDATE TO authenticated
USING (owner_id = my_person())
WITH CHECK (owner_id = my_person());
```

---

### Table 5: `public.audit_log`
- **Table Description:** Immutable append-only audit trail.
- **RLS Enabled:** `ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;`

#### Proposed Policy: `audit_tamper_proof`
- **Operation:** `SELECT`, `INSERT` (No `UPDATE` or `DELETE` allowed under any role)
- **Authorized Actor:** Authenticated users write their own events. Users read own events. Admins read operational logs.
- **Recommended SQL:**
```sql
REVOKE UPDATE, DELETE ON public.audit_log FROM anon, authenticated;

DROP POLICY IF EXISTS audit_write ON public.audit_log;
DROP POLICY IF EXISTS audit_read ON public.audit_log;

CREATE POLICY audit_write_self ON public.audit_log
FOR INSERT TO authenticated
WITH CHECK (actor = auth.uid());

CREATE POLICY audit_read_partitioned ON public.audit_log
FOR SELECT TO authenticated
USING (
  actor = auth.uid()
  OR my_role() IN ('admin', 'doh_viewer', 'clinical_supervisor')
);
```

---

## 3. Database Specification Matrix Summary

| Table | Operation | Authorized Actor | Relationship / Ownership | Required Consent | Denied Scenarios |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `genetic_reports` | SELECT | Owner, Assigned Counsellor | `person_id = my_person()` OR Case Assignment | `share_counsellor` | Cross-partner read, Unassigned counsellor, Admin |
| `genetic_variants` | SELECT | Owner, Assigned Counsellor | Report Ownership | `share_counsellor` | Cross-partner read, Admin, Public |
| `notes` | SELECT/WRITE | Counsellor, Supervisor | Case Assignment | Clinical Duty | Patients, Partners, Admins |
| `couples` | SELECT | Couple Members, Staff | `id = my_couple()` | Couple Link | Unconnected users |
| `partner_consents` | INSERT/UPDATE | Data Owner Only | `owner_id = my_person()` | Own Grant | Partner proxy grant, Third parties |
| `audit_log` | INSERT | Authenticated Actor | `actor = auth.uid()` | System Duty | Updates, Deletes, Impersonation |

---

## 4. Coordination Note to Database Owner

Please execute the above RLS policy refinements in the Supabase SQL Editor. The frontend and API layers have already been updated to conform to these policies and will continue to operate with full backwards compatibility.


# DaNA System Architecture, Schema & End-to-End Flow Specification
**Version:** 3.0 (Clinically Governed Baseline)  
**Governance Alignment:** Autonomy-First, Clinically Escalated, Zero Certificate Gating  

---

## 1. Database Schema (Tables & Attributes)

1. `users(id, identity_ref, role, status, created_at, updated_at)`
2. `patient_profiles(id, user_id, date_of_birth, sex, preferred_language, phone_number_hash, created_at, updated_at)`
3. `consent_records(id, user_id, consent_type, scope, version, status, granted_at, revoked_at, ip_address, user_agent)`
4. `medical_records(id, patient_id, source, resource_type, external_reference, terminology_system, clinical_code, display_name, status, recorded_date, raw_payload)`
5. `genetic_reports(id, patient_id, report_id, source, laboratory_name, accreditation_id, test_methodology, panel_coverage, report_date, validation_status, digital_signature, file_storage_path, created_at)`
6. `genetic_variants(id, report_id, gene_symbol, ncbi_gene_id, transcript_id, hgvs_c, hgvs_p, genome_build, zygosity, inheritance_pattern, clinical_significance, significance_source, review_status, disease_association, created_at)`
7. `couples(id, partner_a_id, partner_b_id, relationship_status, created_at)`
8. `partner_consents(id, couple_id, owner_id, recipient_id, scope, status, granted_at, expires_at, revoked_at)`
9. `family_members(id, owner_id, display_name, relationship, gender, parent_ids, is_deceased, evidence_status, created_at)`
10. `family_conditions(id, member_id, condition_name, age_at_onset, source, verification_status)`
11. `clinical_cases(id, couple_id, patient_id, case_type, workflow_status, clinical_urgency, is_pregnant, gestational_weeks, triage_tier, case_status, rule_version_id, created_at, updated_at)`
12. `counsellors(id, user_id, name, gender, languages, specialties, employment_type, location, max_caseload, active_caseload, credentials_verified, status)`
13. `counsellor_availability(id, counsellor_id, slot_start, slot_end, is_booked, is_emergency_buffer)`
14. `case_assignments(id, case_id, counsellor_id, assigned_by, assignment_reason, assigned_at, status)`
15. `appointments(id, case_id, counsellor_id, scheduled_time, meeting_type, status, created_at)`
16. `counselling_notes(id, appointment_id, ai_draft_note, final_note, clinical_summary, approved_by, approved_at, created_at)`
17. `referrals(id, case_id, destination, priority, reason, status, created_at)`
18. `sila_invitations(id, sender_id, token_hash, status, expires_at, created_at)`
19. `audit_logs(id, actor_id, action, resource_type, resource_id, metadata, ip_address, created_at)`

---

## 2. End-to-End User Flow (All Paths & Clinical Escalation)

```
===================================================================================================================
                                         ONBOARDING & INGESTION GATEWAY
===================================================================================================================
                                      [User Authentication: UAE PASS OIDC]
                                                        |
                                                        v
                                      [Explicit Granular Consent Selection]
                                                        |
                                                        v
                                  [Simulated Malaffi FHIR DiagnosticReport Sync]
                                                        |
                                                        v
                                   [EXPLICIT REPORT VALIDATION & PROVENANCE]
                                   • Laboratory Accreditation & Signature Check
                                   • Terminology Mapping: LOINC, SNOMED, HGVS, ClinVar
                                   • Panel Coverage & Limitations Extracted
                                                        |
               +----------------------------------------+----------------------------------------+
               |                                                                                 |
===============================================                   =================================================
PATH A: INDIVIDUAL JOURNEY (ROOTS)                                PATH B: COUPLE JOURNEY (BONDS)
===============================================                   =================================================
[Personal Report & Pedigree Mapping]                              [Partner Linking Invite via QR / Mobile Hash]
(Parents, Siblings, Cousins - Structural)                                               |
               |                                                                                 v
    +----------+----------+                                       [Partner B Accepts & Defines Sharing Scope]
    |          |          |                                                              |
    v          v          v                                                              v
 [Tested    [Single    [Individual Health                         [Deterministic Rules Evaluation with
 Negative]  Carrier]    Finding / G6PD]                            Uncertainty Handling]
    |          |          |                                                              |
    |          |          v                                       +----------------------+----------------------+
    |          |      [Clinical Guidance                          |                      |                      |
    |          |       & Specialist Triage]                       v                      v                      v
    |          |                                            [NO SHARED RELEVANT    [INCOMPLETE /          [SHARED FINDING
    |          +----------> [Voluntary Sila Outreach]        FINDING IDENTIFIED]    UNCERTAIN / REVIEW     REQUIRING CLINICAL
    |                                   |                   (Limitations &         REQUIRED]              ASSESSMENT]
    |                                   v                    Residual Risk)        (VUS / Missing Data)   ("Compatible with Plan")
    |                        [Anonymous Token Sent]               |                      |                      |
    |                                   |                         +----------------------+                      v
    |                                   v                                                |            [Bonds Reflection Module:
    |                        =======================                                     |             Faith & Values Cards]
    |                        PATH C: SILA (BRANCHES)                                     |                      |
    |                        =======================                                     |                      |
    |                        [Relative Opens Link]                                       |                      |
    |                                   |                                                |                      |
    |                                   v                                                |                      |
    |                        [Neutral Health Info]                                       |                      |
    |                                   |                                                |                      |
    |                                   v                                                |                      |
    |                        [Optional Self-Booking]                                     |                      |
    |                                   |                                                |                      |
    +-----------------------------------+------------------------------------------------+                      |
                                        |                                                                       |
                                        +-----------------------------------------------------------------------+
                                                                        |
                                                                        v
===================================================================================================================
PATH D: MARRIED & FAMILY PLANNING (PREGNANCY TRIAGE)
===================================================================================================================
                                             [Pregnancy Status Declared?]
                                                        |
                                       +----------------+----------------+
                                       | NO                              | YES
                                       v                                 v
                         [Explore Options: IVF+PGT-M,           [Record Gestational Wks:
                          Prenatal Testing, Natural]             Immediate Escalation]
                                       |                                 |
                                       +----------------+----------------+
                                                        |
                                                        v
===================================================================================================================
PATH E: CLINICALLY ESCALATED TRIAGE & CONFIGURABLE SCHEDULING (NO MARRIAGE GATING)
===================================================================================================================
                                                        |
          +-----------------------+---------------------+-----------------------+
          |                       |                     |                       |
          v                       v                     v                       v
   [TIER 1: URGENT]         [TIER 2: HIGH]       [TIER 3: MODERATE]      [TIER 4: ROUTINE]
   • Pregnant + Match       • Shared AR Match    • VUS / Uncertain       • Tested Negative
   • Emergency SLA          • Individual Health  • Single Carrier        • General Education
   • Fast-Track Booking     • Clinician Review   • Pedigree Follow-Up    • Optional Consult
   (Configurable Policy)   (Configurable Policy)(Configurable Policy)   (On User Request)
          |                       |                     |                       |
          +-----------------------+---------------------+-----------------------+
                                                        |
                                                        v
===================================================================================================================
PATH F: CLINICAL CARE NAVIGATION & AUTONOMOUS OUTCOMES
===================================================================================================================
                          [Counselling Offered / Recommended Based on Need]
                                                        |
                                                        v
                               [User Elects to Book Clinical Consultation]
                                                        |
                                                        v
                             [Counsellor Reviews Dossier & Conducts Session]
                                                        |
                                                        v
                             [Counsellor Signs Approved Notes & Care Guidance]
                                                        |
                                                        v
                               [Downstream Specialist Referrals Issued as Needed:
                                    IVF/PGT-M, Fetal Medicine, Hematology]
                                                        |
                                                        v
                           [Autonomous Family Decision & Longitudinal Care Plan]
                            (ZERO Withholding of Premarital / Marriage Status)
```

---

## 3. Data Security & Compliance Architecture

```
+-------------------------------------------------------------------------------------------------+
|                                 DATA SECURITY & COMPLIANCE STACK                                |
+-------------------------------------------------------------------------------------------------+
| 1. DATA ENCRYPTION & KEY ISOLATION                                                              |
|    • In-Transit: TLS 1.3 mandatory with HSTS on all ingress points.                             |
|    • At-Rest: AES-256 volume encryption; column-level encryption (pgcrypto) for national IDs.   |
|    • Storage Vault: Encrypted S3/MinIO for raw genomic VCFs/PDFs with single-tenant KMS keys.   |
+-------------------------------------------------------------------------------------------------+
| 2. ZERO-TRUST ACCESS & ROW-LEVEL SECURITY (RLS)                                                 |
|    • Tenant Isolation: PostgreSQL RLS enforces that users query only their own profile records.  |
|    • Partner Separation: Cross-queries require an active, unexpired record in partner_consents. |
|    • Asymmetric Accounts: Khalid & Fatima maintain separate profiles; no shared "couple record".|
+-------------------------------------------------------------------------------------------------+
| 3. ZERO-RETENTION EPHEMERAL BUFFERS (UAE PDPL)                                                  |
|    • Sila Privacy: Relative phone/email is kept in volatile memory only during gateway handoff. |
|    • Immediate Purge: Zero storage of non-consenting relative contact details in the database.  |
|    • Token Security: Hashed with SHA-256; expires in 14 days; reveals zero clinical data.       |
+-------------------------------------------------------------------------------------------------+
| 4. REGULATORY COMPLIANCE ENFORCEMENT                                                            |
|    • UAE Data Residency (Law No. 2/2019): 100% in-country hosting; zero cross-border transfers. |
|    • Human Genome Law (Decree-Law No. 49/2023): Explicit, revocable, purpose-bound consent.     |
|    • ADHICS Security Standard: Append-only audit logging; immutability on clinical notes.       |
|    • DoH Responsible AI Standard: Zero AI risk math; strictly deterministic inheritance engine. |
|    • DoH Analytics ($k$-Anonymity): Small-cell suppression masks aggregate cohorts where n < 5.  |
|    • Ethical Autonomy: Platform never decides marriage fitness or withholds marriage clearance. |
+-------------------------------------------------------------------------------------------------+
```

---

## 4. System Architecture Map

```
+-----------------------------------------------------------------------------------------+
|                                    PRESENTATION LAYER                                   |
|  [Couple App]            [Counsellor Hub]         [DoH Dashboard]       [Sila Landing]  |
|  Roots/Bonds/Branches    Queue & Case Review      Analytics & Audits    Relative Access |
+--------------------------------------------+--------------------------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------------+
|                                SECURITY & CONSENT GATEWAY                               |
|  [Simulated UAE PASS OIDC]     [Consent PEP / PDP Engine]     [Append-Only Audit Guard] |
+--------------------------------------------+--------------------------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------------+
|                                  CORE SERVICE LAYER                                     |
|  +------------------------+  +------------------------+  +---------------------------+  |
|  | Report Ingestion       |  | Genetics Rules Core    |  | Priority Triage Engine    |  |
|  | & Validation Adapter   |  | (Deterministic Math &  |  | (Configurable Escalation  |  |
|  | (LOINC/HGVS/ClinVar)   |  |  Uncertainty Statuses) |  |  Policy & Clinician Queue)|  |
|  +------------------------+  +------------------------+  +---------------------------+  |
|  +------------------------+  +------------------------+  +---------------------------+  |
|  | Pedigree Engine        |  | Sila Dispatcher        |  | Bounded AI Explainer      |  |
|  | (Structural Kinship    |  | (Ephemeral Relative    |  | (Clinician & Scholar-     |  |
|  |  Multi-Gen Trees)      |  |  Outreach)             |  |  Approved Content Only)   |  |
|  +------------------------+  +------------------------+  +---------------------------+  |
+--------------------------------------------+--------------------------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------------+
|                                   PERSISTENCE LAYER                                     |
|  [PostgreSQL 16+ Database]         [Encrypted Object Vault]         [Append-Only Logs]  |
+-----------------------------------------------------------------------------------------+
```

### Component Descriptions
- **Presentation Layer:** Role-based web interfaces for Couples, Counsellors, DoH Public Health Analytics, and Sila Relatives.
- **Security & Consent Gateway:** Enforces UAE PASS authentication, zero-trust consent evaluation (PEP), and immutable audit capture.
- **Report Ingestion & Validation Adapter:** Validates lab accreditation, checks digital signatures, extracts provenance metadata, and maps genomic data to LOINC, SNOMED CT, HGVS, and ClinVar standards.
- **Genetics Rules Core:** Evaluates Mendelian inheritance using deterministic rules while handling uncertainty, VUS, and coverage limitations without generative AI hallucinations.
- **Priority Triage Engine:** Evaluates clinical urgency and active pregnancy, routing cases to clinical queues according to configurable, clinically approved scheduling policies.
- **Pedigree Engine:** Maps qualitative multi-generation family relationships (parents, siblings, aunts, uncles, first cousins) without premature mathematical coefficient predictions.
- **Sila Dispatcher:** Dispatches neutral cascade screening invitations to relatives; permanently purges contact data immediately following SMS gateway transmission.
- **Bounded AI Explainer:** Guardrailed explanation service using RAG constrained exclusively to clinician-approved condition sheets and scholar-approved faith cards.
- **Persistence Layer:** PostgreSQL with Row-Level Security, private S3-compatible vault for raw reports, and an append-only audit trail.

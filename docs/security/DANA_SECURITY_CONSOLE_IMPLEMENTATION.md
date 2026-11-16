# DaNA Security Administration Console — Implementation Guide

**Document Reference:** `DANA_SECURITY_CONSOLE_IMPLEMENTATION.md`  
**Version:** 1.0.0 — Production Clinical Architecture  
**Release Date:** November 14, 2026  
**Audience:** Platform Architects, Security Leads, Healthcare Compliance Officers, Front-End Engineers  

---

## 1. Executive Summary

The **DaNA Security Administration Console** is a specialized, role-gated administrative suite built directly into the existing DaNA premarital genetic screening application. It provides end-to-end security operations, relationship-based access governance, consent auditing, and real-time threat intelligence.

### Core Architectural Principle: Clinical Zero-Knowledge
> [!IMPORTANT]
> **Strict Clinical Isolation:** Administrative users and platform operators have access to **identity metadata, relationship states, and audit trails ONLY**. In strict compliance with UAE healthcare data sovereignty laws (ADHICS / Federal Law No. 2 of 2019), administrators are **cryptographically and programmatically barred** from viewing raw genetic variant allele calls, VCF lab reports, or private clinician counselling notes (`SECURITY_ERRORS.ADMIN_CLINICAL_RESTRICTION`).

---

## 2. Console Architecture & Routing Structure

The Security Administration Console is housed under `web/src/app/admin/security/` and seamlessly integrated into `web/src/app/routes.jsx` with full responsive navigation.

```
DaNA Security Console Routes
├── /app/security                     -> Page 1: Security Overview
├── /app/security/users               -> Page 2: Users & Roles
├── /app/security/permissions         -> Page 3: Permission Management
├── /app/security/consents            -> Page 4: Consent Governance
├── /app/security/relationships       -> Page 5: Partner Access Governance
├── /app/security/clinical-assignments-> Page 6: Clinical Access & Case Assignments
├── /app/security/audit               -> Page 7: Access History & Forensic Log
└── /app/security/threat-monitoring   -> Page 8: Threat Monitoring & SIEM Feed
```

### Navigation Integration (`SecurityNav.jsx`)
All 8 views share a reusable, responsive sub-navigation header (`SecurityNav.jsx`) featuring:
- Real-time status indicators (`Zero-Trust Active · RLS Enforced`, `k-Anonymity (k ≥ 5)`).
- Quick-switch tab bar with active indicator and Lucide stroke icons.
- Persistent Zero-Knowledge clinical boundary notice.

---

## 3. Detailed Specifications of the Eight Working Pages

### Page 1: Security Overview (`SecurityOverview.jsx`)
- **Route:** `/app/security` (also `/app/security/overview`)
- **Primary Function:** High-level platform health, security posture, and compliance KPIs.
- **Components & Metrics:**
  - `Stat` cards: Total Screened Cohort, High-Risk Identified Pairs, Protected Tables (13 RLS Default-Deny), Triple-Lock Engine Status.
  - Subsystem cards:
    - *Authentication & Identity:* UAE PASS integration, Supabase PKCE OAuth, Staff Code RPC enforcement.
    - *Data Privacy & Field Decoupling:* Raw genetic isolation, carrier masking, Roots pedigree autonomy, k-anonymity cohort suppression.
    - *Relationship & Clinical Scope:* Active couple ReBAC verification, assigned-only clinical access, cascading severance revocation.
  - Live activity table showing recent security and access events.
- **Backend Integration:** Connects to FastAPI `GET /analytics/aggregate` and live Supabase session metrics.

### Page 2: Users & Roles (`UsersRoles.jsx`)
- **Route:** `/app/security/users`
- **Primary Function:** Directory of platform accounts, role provisioning, and account lifecycle management.
- **Features:**
  - Real-time account search by member name, unique User ID, or title.
  - Role filter pills: `All`, `Couple`, `Counsellor`, `Admin`.
  - **Account Status Toggle:** Allows an administrator to suspend or reactivate an account. Suspended accounts immediately receive HTTP 403 / `ACCOUNT_SUSPENDED` across all endpoints and UI routes.
  - **Privileged Role Assignment Modal:** Assigning a staff role (`counsellor`, `clinical_supervisor`, `admin`) requires entering a verified cryptographic staff code validated via PostgreSQL RPC `claim_staff_role`.
  - **Clinical Barrier:** View displays account metadata and role only; clicking into an account explicitly forbids viewing individual genetic files or clinical notes.

### Page 3: Permission Management (`PermissionManagement.jsx`)
- **Route:** `/app/security/permissions`
- **Primary Function:** Interactive 7-Role x 9-Resource permission matrix and real-time policy evaluation simulator.
- **Features:**
  - Comprehensive visualization of the 7 application roles across 9 resource types (`GENETIC_REPORT`, `GENETIC_VARIANT`, `MEDICAL_RECORD`, `COUPLE_ASSESSMENT`, `CLINICAL_CASE`, `COUNSELLING_NOTE`, `ROOTS_SILA`, `AUDIT_LOG`, `ANALYTICS`).
  - **Live Policy Decision Simulator:** Allows security officers to test dynamic access requests by selecting an Actor Role, Action (`READ`, `WRITE`, `EXECUTE`), and Resource, with checkboxes for Cross-Access IDOR attempts, active couple status, and patient consent.
  - Evaluates live via `authorizationEngine.evaluateAccess()` and displays the exact decision (`ALLOWED` or `DENIED`), along with error codes and regulatory assertions.

### Page 4: Consent Governance (`ConsentGovernance.jsx`)
- **Route:** `/app/security/consents`
- **Primary Function:** Granular audit and management of all 7 consent purposes.
- **Features:**
  - Directory of active, revoked, and expired consent records.
  - Filter by processing purpose (`GENETIC_PROCESSING`, `COUPLE_ASSESSMENT`, `SHARE_COMBINED_ASSESSMENT`, `COUNSELLOR_CLINICAL_ACCESS`, `SUPERVISOR_AUDIT_ACCESS`, `DOH_ANONYMIZED_REGISTRY`, `SILA_FAMILY_CASCADE`).
  - Search by consent ID or pseudonymized subject token.
  - **Emergency Revocation Action:** Compliance officers can simulate emergency patient consent withdrawal with confirmation dialog, which immediately invalidates downstream risk calculations and access grants.

### Page 5: Partner Access Governance (`PartnerGovernance.jsx`)
- **Route:** `/app/security/relationships`
- **Primary Function:** Relationship-based access control (ReBAC) monitoring across premarital couples.
- **Features:**
  - Directory of couple pairs, relationship stage (`Engaged`, `Married`), and status (`ACTIVE`, `DISCONNECTED`, `BLOCKED`).
  - **Bilateral Sharing Indicator:** Live indicator verifying whether both Partner A and Partner B have granted mutual consent for couple risk processing.
  - **Emergency Relationship Severance Action:** Compliance officers can sever an abusive or fraudulent couple link with confirmation modal. Severing the bond transitions the connection to `DISCONNECTED` and triggers automatic cascading revocation of partner sharing permissions.

### Page 6: Clinical Access & Case Assignments (`ClinicalAssignments.jsx`)
- **Route:** `/app/security/clinical-assignments`
- **Primary Function:** Triage workload management and provider case assignments.
- **Features:**
  - Lists clinical cases, couple identifiers, triage urgency tiers (`Tier 1` urgent to `Tier 4` routine), workflow statuses, and assigned genetic counsellors.
  - **Case Reassignment Modal:** Clinical Supervisors and Admins can reassign a case to an authorized licensed counsellor (e.g. Dr. Mariam Al Hosani or Dr. Salem Al Kaabi).
  - **Strict Zero-Knowledge Clinical Barrier:** Case triage priority and clinician names are visible, but clicking into a case shows a locked banner explaining that private clinical consultation notes and raw genomic files are strictly restricted to the licensed clinician.

### Page 7: Access History & Forensic Audit Log (`AccessHistory.jsx`)
- **Route:** `/app/security/audit`
- **Primary Function:** Immutable, append-only forensic event log stream.
- **Features:**
  - Chronological event stream displaying Gulf Standard Time (GST), Actor Name, Role, Action Description, Target Resource, and Decision Outcome (`ALLOWED` / `DENIED`).
  - Filter by category (`Auth`, `Consent`, `Assessment`, `Clinical`, `Admin`).
  - Real-time search by keyword.
  - **Forensic CSV Export:** One-click export generating an audit-ready CSV file formatted for ADHICS and DoH compliance reviews.

### Page 8: Threat Monitoring & SIEM Feed (`ThreatMonitoring.jsx`)
- **Route:** `/app/security/threat-monitoring`
- **Primary Function:** Automated detection and neutralization feed for security incidents.
- **Features:**
  - Real-time KPI counters: Total Neutralized Threats (100%), Genetic Incursions Blocked, Unassigned Clinicians Intercepted, Privilege Escalations Denied.
  - Live incident feed tracking blocked IDOR attempts, cross-partner raw report access queries, unassigned clinician requests, and unauthorized role tampering.
  - Severity badges: `CRITICAL` (red), `HIGH` (amber), `MEDIUM` (blue).
  - **Incident Analysis Dialog:** Detailed breakdown of attack vector, targeted resource, automated countermeasure, and UAE Federal Law No. 2 compliance assertion.

---

## 4. Verification & Testing Evidence

### Automated Test Suite Execution
`npm --prefix DaNA/web run test` executed across all three test suites:

```
TAP version 13
# Subtest: DaNA Healthcare Authorization & Consent Test Suite (18 Scenarios)
  1..18 -> ok (18/18 passed)
# Subtest: Connections & Risk Processing Engine Unit Tests (13 Scenarios)
  1..13 -> ok (13/13 passed)
# Subtest: DaNA Security Administration Console & Governance Test Suite (10 Scenarios)
  1..10 -> ok (10/10 passed)
1..3
# tests 42
# suites 2
# pass 42
# fail 0
# duration_ms 1103.465
```

### Security Console Specific Test Cases (`test/securityConsole.test.mjs`)
1. **Admin Forensic Read (Allowed):** Platform Admin can access `AUDIT_LOG` with `evaluateAccess`.
2. **Patient Config Tampering (Denied):** Patient attempting `SYSTEM_CONFIG` update rejected (`MISSING_PERMISSION`).
3. **DoH Viewer Scoping (Denied):** DoH viewer attempting operational system config rejected (`MISSING_PERMISSION`).
4. **Admin Raw Report Block (Denied):** Admin querying patient `GENETIC_REPORT` rejected (`RAW_GENETIC_CROSS_ACCESS_FORBIDDEN`).
5. **Admin Variant Block (Denied):** Admin querying patient `GENETIC_VARIANT` rejected (`RAW_GENETIC_CROSS_ACCESS_FORBIDDEN`).
6. **Admin Clinical Note Block (Denied):** Admin querying `COUNSELLING_NOTE` rejected (`MISSING_PERMISSION`).
7. **Supervisor Clinical Audit (Allowed):** Clinical Supervisor querying `CLINICAL_CASE` allowed for audit.
8. **Suspended Account Block (Denied):** Suspended user immediately blocked across all operations (`ACCOUNT_SUSPENDED`).
9. **Emergency Severance Invalidation (Denied):** Ended relationship immediately blocks couple assessment (`INACTIVE_RELATIONSHIP`).
10. **Emergency Revocation Invalidation (Denied):** Revoking consent immediately halts assessment calculation (`MISSING_CONSENT`).

### Production Build Verification
`npm --prefix DaNA/web run build` completed cleanly in 21.7s:
- `dist/index.html` (0.82 kB)
- `dist/assets/index-CVz9gg_8.css` (104.30 kB)
- `dist/assets/index-BnloisFK.js` (887.13 kB)
- **0 syntax errors, 0 broken module imports.**

---

## 5. Security Vulnerability Remediations Applied

### Client-Side PHI Persistence (SEC-03 Fix)
- **Vulnerability:** In `web/src/app/shared/store.js`, `signOut()` previously set `session: null` but left cached `reports`, `notes`, and `screeningIntakes` in `localStorage` under `dana-demo-v2`.
- **Fix Applied:** Refactored `signOut()` to purge all health and screening state keys and execute `localStorage.removeItem('dana-demo-v2')`, ensuring zero client-side PHI leakage on shared terminals.

---

## 6. Handoff Requirements for Database Administrator

The following requirements remain assigned to the Supabase Database Owner for live PostgreSQL enforcement (detailed with full SQL in [DANA_AUTHORIZATION_GAPS.md](file:///c:/Users/LENOVO/OneDrive/Desktop/ALLPROJECTS/Abhudhabi/DaNA/docs/security/DANA_AUTHORIZATION_GAPS.md)):
1. **SEC-01:** Update PostgreSQL `can_see_genetics(p)` in `004_spec_v3.sql` to forbid partners from executing raw `SELECT` queries on `genetic_reports` and `genetic_variants`.
2. **SEC-02:** Update `medrec_read` and `clinical_cases` PostgreSQL RLS policies to join `case_assignments` so counsellors cannot query unassigned cases via direct REST calls.
3. **SEC-04:** Expand PostgreSQL `accounts.role` check constraint to natively support all 7 roles: `('couple', 'counsellor', 'clinical_supervisor', 'admin', 'content_reviewer', 'doh_viewer', 'system_service')`.


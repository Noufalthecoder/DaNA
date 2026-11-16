# DaNA — Complete Healthcare Permission Matrix

**Document Version:** 1.0.0  
**Classification:** Confidential — Technical Architecture  

This document details the exact access boundaries and operational permissions enforced across all user roles, relationships, and data classifications in DaNA.

---

## 1. Role Capabilities Matrix

| Resource / Action | Patient (`couple`) | Counsellor (`counsellor`) | Clinical Supervisor | Administrator (`admin`) | Content Reviewer | DoH Viewer (`doh_viewer`) | System Service |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Read Own Profile** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Update Own Profile** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✕ |
| **Manage Operational Accounts** | ✕ | ✕ | ✕ | ✓ | ✕ | ✕ | ✕ |
| **Self-Assign Elevated Role** | **✕ FORBIDDEN** | **✕ FORBIDDEN** | **✕ FORBIDDEN** | **✕ FORBIDDEN** | **✕ FORBIDDEN** | **✕ FORBIDDEN** | **✕ FORBIDDEN** |
| **Read Own Raw Genetic Report** | ✓ | ✕ (Unless assigned) | ✕ | **✕ FORBIDDEN** | ✕ | **✕ FORBIDDEN** | ✓ |
| **Read Partner's Raw Genetic Report**| **✕ STRICTLY BLOCKED** | ✕ | ✕ | **✕ FORBIDDEN** | ✕ | **✕ FORBIDDEN** | ✕ |
| **Read Patient Genetic Report** | ✕ | **With Assignment & Consent** | **Escalated Cases Only** | **✕ STRICTLY BLOCKED** | ✕ | **✕ STRICTLY BLOCKED** | ✓ |
| **Read Own Medical Records** | ✓ | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ |
| **Read Partner's Medical Records** | **✕ STRICTLY BLOCKED** | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| **Read Patient Medical Records** | ✕ | **With Assignment & Consent** | **Escalated Cases Only** | ✕ | ✕ | ✕ | ✓ |
| **Manage Own Consents** | ✓ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| **View Own Screening Status** | ✓ | ✕ | ✕ | ✕ | ✕ | ✕ | ✓ |
| **Send Connection Request** | ✓ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| **Accept / Reject Connection Request**| **Designated Receiver Only** | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| **Cancel Pending Connection Request**| **Designated Sender Only** | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| **View Combined Couple Assessment** | **Active Couple Only** | **Assigned Cases** | **Supervised Cases** | ✕ | ✕ | ✕ | ✓ |
| **Execute Genetic Intelligence Engine**| ✕ (Backend Triggered) | ✓ | ✓ | ✕ | ✕ | ✕ | ✓ |
| **View Assigned Clinical Cases** | ✕ | **Assigned Cases Only** | **All Supervised Cases** | Operational Metadata Only | ✕ | ✕ | ✓ |
| **View Unassigned Clinical Cases** | ✕ | **Triage Queue (Minimal)**| ✓ | Operational Metadata Only | ✕ | ✕ | ✕ |
| **Create Counselling Note Draft** | ✕ | ✓ | ✓ | ✕ | ✕ | ✕ | ✕ |
| **Approve Counselling Notes** | ✕ | **Author / Sign-off** | ✓ | ✕ | ✕ | ✕ | ✕ |
| **View Private Counselling Notes** | **✕ STRICTLY BLOCKED** | **Assigned Counsellor** | ✓ | ✕ | ✕ | ✕ | ✕ |
| **Manage Appointments** | **Own Couple Appts** | **Assigned Slots** | **Supervised Slots** | ✕ | ✕ | ✕ | ✕ |
| **Review Educational Content Cards** | Read Approved | Read Approved | Read Approved | Manage & Review | **Approve / Review** | Read Approved | ✕ |
| **View Global Audit Log** | Own Events Only | Case Events Only | Supervised Events | **Full Audit Log** | ✕ | De-identified Events | Write Only |
| **Access De-Identified Analytics** | ✕ | ✕ | ✕ | ✓ ($k \ge 5$) | ✕ | **✓ ($k \ge 5$)** | ✕ |

---

## 2. Field-Level Data Disclosure Matrix

Identity and clinical data are evaluated under separate authorization rules.

| Field Name | Public Directory / Search | Connected Partner (No Sharing Consent) | Connected Partner (Active Sharing Consent) | Assigned Counsellor | DoH Admin / Viewer |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `id` / `short_name` | ✓ (Exact match only) | ✓ | ✓ | ✓ | De-identified Hash |
| `display_name` | ✓ (Exact match only) | ✓ | ✓ | ✓ | Masked / Omitted |
| `avatar` | ✓ | ✓ | ✓ | ✓ | Omitted |
| `sex` | ✓ | ✓ | ✓ | ✓ | Demographic Aggregate |
| `dana_id` | ✓ (Exact match only) | ✓ | ✓ | ✓ | Omitted |
| `carrier_gene` | **✕ OMITTED** | **✕ NULL (consentRequired: true)** | **✓ DISCLOSED** | **✓ DISCLOSED (With Consent)**| **✕ STRICTLY OMITTED** |
| `condition_name` | **✕ OMITTED** | **✕ NULL** | **✓ DISCLOSED** | **✓ DISCLOSED** | Aggregate Only |
| `couple_assessment.tier` | **✕ OMITTED** | **✕ OMITTED** | **✓ DISCLOSED** | **✓ DISCLOSED** | Aggregate Only |
| `raw_hgvs_variant` | **✕ OMITTED** | **✕ OMITTED** | **✕ OMITTED (Decoupled)** | **✓ DISCLOSED (Lab View)** | **✕ STRICTLY OMITTED** |
| `clinical_notes` | **✕ OMITTED** | **✕ STRICTLY OMITTED** | **✕ STRICTLY OMITTED** | **✓ DISCLOSED (Internal)** | **✕ STRICTLY OMITTED** |
| `malaffi_record_id` | **✕ OMITTED** | **✕ STRICTLY OMITTED** | **✕ STRICTLY OMITTED** | **✕ System Adapter Only** | **✕ STRICTLY OMITTED** |
| `audit_log.metadata` | **✕ OMITTED** | **✕ OMITTED** | **✕ OMITTED** | **✕ OMITTED** | **✓ Non-PHI Metadata** |

---

## 3. IDOR (Insecure Direct Object Reference) Prevention

The following rules guarantee that manipulating identifiers in client requests or URLs returns an immediate authorization rejection:

1. **Invitation & Connection Requests:**
   - Attempting to accept or reject a request where `receiver_id != current_user` $\to$ `403 Forbidden` (`DANA_AUTH_403_IDOR_VIOLATION`).
   - Attempting to cancel a request where `sender_id != current_user` $\to$ `403 Forbidden` (`DANA_AUTH_403_IDOR_VIOLATION`).
2. **Consent Manipulation:**
   - Attempting to grant or revoke consent for a `granter_id` other than the authenticated user $\to$ `403 Forbidden` (`DANA_AUTH_403_NOT_OWNER`).
3. **Counsellor Case Switching:**
   - Passing an arbitrary `case_id` or `couple_id` in URL parameters without an active row in `case_assignments` $\to$ `403 Forbidden` (`DANA_AUTH_403_UNASSIGNED_CASE`).
4. **Session Actor Derivation:**
   - User identities and roles are never trusted from client payloads, query strings, or request bodies; they are derived exclusively from the verified session claims.


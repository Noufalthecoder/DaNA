# DaNA — Complete Production-Quality Connections Module Specification

## 1. Product Purpose & Architectural Principles

The **Connections** module is the foundational relationship engine for **BONDS**, bridging two registered individuals into an authorized premarital partnership and orchestrating a clinical combined risk assessment.

### Core Healthcare Product Decisions
1. **Self-Authorization for Processing:**
   - Partners do **not** need or receive permission to view each other's raw genetic reports or clinical documents.
   - Each individual independently authorizes DaNA's **Genetic Intelligence Engine** to process their sensitive screening data for joint couple assessment.
2. **Deterministic Combined Assessment:**
   - The Genetic Intelligence Engine independently evaluates both validated datasets, evaluates applicable Mendelian inheritance patterns (Autosomal Recessive, X-Linked), and generates an understandable, shared assessment for the couple.
3. **Strict Healthcare Privacy (Federal Decree-Law No. 49 of 2023):**
   - A connection confirms mutual relationship identity only. It **never** discloses confidential genetic variants, carrier statuses, or medical records to the other partner simply because a connection exists.
4. **Counsellor Guidance:**
   - Every assessed couple carrying a shared variant or X-linked trait is directed to licensed genetic counsellors (e.g. Dr. Mariam Al Hosani) with direct appointment scheduling and prioritized queue placement.

---

## 2. Route Architecture & Query Param Resolution

All routes support query parameters (e.g. `?tab=requests`, `?tab=connections`) and direct navigation without `404 Not Found` errors:

| Path | Purpose | Component |
| :--- | :--- | :--- |
| `/#/app/connections` | Main Connections Hub (Discover, Requests, Active, Consents, Blocked) | `Connections.jsx` |
| `/#/app/connections?tab=discover` | Partner Discovery & Search | `Connections.jsx` (Discover) |
| `/#/app/connections?tab=requests` | Incoming & Outgoing Request Management | `Connections.jsx` (Requests) |
| `/#/app/connections?tab=connections` | Active Couple Connection Card & Peer Management | `Connections.jsx` (Active) |
| `/#/app/bonds` | Combined Couple Assessment & Reproductive Options | `Bonds.jsx` |
| `/#/app/bonds/assessment` | Direct Joint Assessment View | `Bonds.jsx` |
| `/#/app/bonds/timeline` | Shared Couple Journey Tracker | `Bonds.jsx` (Timeline) |
| `/#/app/counsellor` | Counsellor Referral & Booking | `Counsellor.jsx` |
| `/#/app/roots` | Individual Genetic Screening Report (Malaffi HIE) | `Roots.jsx` |
| `/#/app/branches` | Pearl Family Tree & Anonymous Sila Alerts | `Branches.jsx` |

---

## 3. Database Ownership & Interfaces (Supabase Integration)

In accordance with our 4-developer division:
* **Database Management:** Managed by Database Engineer teammate.
* **Connections Module:** Integrates through clean service layer (`web/src/app/shared/connectionsService.js`).
* **Relational Schema:** Documented in `database/schema.sql` covering:
  - `users` & `user_medical_profiles`
  - `connection_requests` (unique partial index preventing duplicate pending requests)
  - `user_connections` (canonical ordering `user_a_id < user_b_id`)
  - `connection_consents` (granular purpose-specific scopes)
  - `notifications` & `connection_audit_logs`

---

## 4. End-to-End Test Scenarios Verified

1. **User A (Khalid) sends request to User B (Fatima):** Verified.
2. **User B (Fatima) logs in and sees incoming request with explicit privacy terms:** Verified.
3. **User B accepts request:** Relationship transitions to `ACTIVE`, connection card displays on both dashboards.
4. **Independent assessment authorization:** Each partner authorizes the engine independently.
5. **Combined Assessment:** Genetic rules engine computes 25% affected risk for *HBB* Beta-thalassaemia pair.
6. **Reproductive Options:** PGT-M, Prenatal diagnosis, and informed natural conception displayed side-by-side.
7. **Counsellor Referral:** Integrated slot booking with Dr. Mariam Al Hosani.
8. **Notification Routing:** Clicking notifications routes cleanly without "Not found" errors.


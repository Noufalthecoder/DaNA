# DaNA — Implementation Log: Multi-User Connections & Strict Profile Privacy

## 1. Overview & Architecture

This implementation delivers a production-quality multi-user connection, request management, and profile-sharing system for DaNA with **strict field-level health data privacy** complying with UAE Federal Decree-Law No. 49 of 2023 (Human Genome), ADHICS, and UAE PDPL.

### 4-Member Team Isolation & Merge-Conflict Prevention
According to `docs/TEAM.md`, the 4 teammates own:
1. **Couple App:** `web/src/app/couple/`
2. **Counsellor Portal:** `web/src/app/counsellor/`
3. **DoH Dashboard:** `web/src/app/admin/`
4. **Platform & Landing:** `web/src/app/shared/`

To prevent merge conflicts:
- **Dedicated Menu Item:** Added `{ to: '/app/connections', label: 'Connections', icon: '👥' }` inside the `couple` array in `routes.jsx` without touching any `counsellor` or `admin` menu items or page resolvers.
- **Dedicated View:** Encapsulated in `web/src/app/couple/Connections.jsx`.
- **Domain-Isolated Service:** Core engine and API client in `web/src/app/shared/connectionsService.js`.
- **Namespaced Endpoints:** All endpoints use `/api/v1/connections/*`, `/api/v1/consents/*`, `/api/v1/users/search`, avoiding route collisions with Counsellor or DoH features.

---

## 2. Strict Privacy Model: Non-Credible Identity vs. Protected Medical Data

> **Core Principle:** Accepting a connection **NEVER** automatically exposes genetic results, carrier status, or medical records.

1. **User Discovery (`searchUsers`):**
   - Returns **strictly non-credible/public markers**: full name, short name, sex, role title, connection status.
   - Clinical fields (`carrier`, `gene`, risk assessment, clinical notes) are stripped before returning.
2. **Profile Preview (`getProfile`):**
   - Non-connected users: View only non-sensitive identity markers.
   - Connected users: View non-sensitive identity + connection duration. Genetic screening findings remain locked (`carrierGene: null`, `consentRequired: true`).
   - Clinical Disclosure Gate: Genetic carrier findings are **only disclosed** if there is an explicit, active, purpose-specific consent record (`connection_consents`) granted by the profile owner to the viewer.
3. **Revocation:**
   - Either party can revoke consent at any time; future access is terminated immediately.
   - Removing a connection automatically revokes all associated consents.

---

## 3. Database Schema (`database/schema.sql`)

- `users`: User identity (id, full_name, short_name, sex, role, avatar_url, bio).
- `user_medical_profiles`: Separated protected table for carrier gene, screening dates, and Malaffi IDs.
- `connection_requests`: Sender, receiver, status (`PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`, `EXPIRED`), note, timestamps. Unique constraint prevents duplicate pending requests.
- `user_connections`: Canonical `user_a_id < user_b_id` pairing to prevent reciprocal duplicate edges; status (`ACTIVE`, `BLOCKED`, `REMOVED`).
- `connection_consents`: Granter, grantee, purpose, data_scope (`CARRIER_GENE`, `FULL_GENETIC_REPORT`), status (`ACTIVE`, `REVOKED`), timestamps.
- `notifications`: User-directed in-app notifications with read tracking.
- `connection_audit_logs`: Immutable audit trail for UAE ADHICS compliance.

---

## 4. API Endpoints Contract

```http
# User Discovery
GET    /api/v1/users/search?q={query}
GET    /api/v1/users/:id/preview

# Connection Requests
POST   /api/v1/connections/requests
GET    /api/v1/connections/requests/received
GET    /api/v1/connections/requests/sent
POST   /api/v1/connections/requests/:id/accept
POST   /api/v1/connections/requests/:id/reject
DELETE /api/v1/connections/requests/:id

# Connections
GET    /api/v1/connections
DELETE /api/v1/connections/:id
POST   /api/v1/connections/:id/block
DELETE /api/v1/connections/blocked/:userId

# Explicit Consents
GET    /api/v1/connections/:id/consents
POST   /api/v1/connections/:id/consents
POST   /api/v1/consents/:id/revoke

# Notifications
GET    /api/v1/notifications
PATCH  /api/v1/notifications/:id/read
POST   /api/v1/notifications/read-all
```

---

## 5. UI Features Implemented

Located at `/#/app/connections`:
1. **Discover & Search Tab:**
   - Search input filtering users in real time.
   - Public non-credible profile preview modal.
   - Send connection request with optional personal note.
2. **Requests Tab:**
   - Incoming requests with Accept and Decline actions.
   - Outgoing requests with Cancel action.
   - Request history table.
3. **My Connections Tab:**
   - Active connection cards with connection date and medical sharing status.
   - Profile Preview modal with clear privacy shield.
   - Manage/Grant Purpose-Specific Consent modal.
   - Remove Connection (with confirmation dialog).
   - Block user.
4. **Consent Management Tab:**
   - Complete audit table of all granted and received consents.
   - Immediate "Revoke Access" action.
5. **Blocked Users Tab:**
   - List of blocked users with Unblock action.
6. **Notification Bell:**
   - Header bell in `Shell.jsx` with unread badge counter.
   - Dropdown list of incoming alerts with click-to-navigate and "Mark all read".

---

## 6. Verification & Automated Test Results

- **Unit Tests:** `test/connectionsService.test.mjs`
  - 11/11 tests passing:
    1. Prevents self-requests.
    2. Prevents duplicate pending requests.
    3. Auto-resolves mutual requests.
    4. Prevents accepting rejected requests.
    5. Allows sender to cancel pending requests.
    6. Search & discovery never leaks medical data.
    7. Connection acceptance alone does NOT reveal genetic data.
    8. Purpose-specific consent grants and immediate revocation cuts off access.
    9. Connection removal auto-revokes consents.
    10. Blocking severs connections and enforces visibility boundaries.
    11. In-app notifications tracking and read state.
- **Build Verification:**
  - `npm run build` executed successfully via Vite:
    `✓ 419 modules transformed.`
    `✓ built in 7.87s`


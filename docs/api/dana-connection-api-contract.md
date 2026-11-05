# DaNA — Connection & Profile Sharing API Contract (v1)

## Base URL
`/api/v1`

---

## 1. User Discovery

### `GET /api/v1/users/search`
Searches for registered participants using display name, short name, or invitation code.

* **HTTP Method:** `GET`
* **Authentication:** Required (Valid UAE PASS Bearer token / active session)
* **Required Role:** `couple`, `counsellor`, `admin`
* **Permission Requirements:** `users:discover`
* **Query Parameters:**
  - `q` (string, optional): Search query (min 1 char, max 64 chars).
  - `page` (integer, optional, default: 1): Page number.
  - `limit` (integer, optional, default: 10, max: 50): Results per page.
* **Request Schema:** None (URL parameters).
* **Response Schema (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "fatima",
        "name": "Fatima Al Hammadi",
        "short": "Fatima",
        "sex": "F",
        "role": "Partner · engaged",
        "isConnected": false,
        "hasPendingOutgoing": false,
        "hasPendingIncoming": true
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 1
    }
  }
  ```
* **Clinical Safety Constraint:**
  Genetic carrier markers (`carrier`), genetic conditions, and screening records are **strictly excluded** from discovery payloads.
* **Error Codes:**
  - `401_UNAUTHORIZED`: Missing or expired session.
  - `429_TOO_MANY_REQUESTS`: Rate limit exceeded (prevents account enumeration).
* **Idempotency:** Read-only / Idempotent.
* **Audit Requirements:** None for search queries.

---

### `GET /api/v1/users/:id/preview`
Retrieves a privacy-filtered profile preview of a specific user.

* **HTTP Method:** `GET`
* **Authentication:** Required
* **Required Role:** `couple`, `counsellor`, `admin`
* **Permission Requirements:** `users:read_profile`
* **Response Schema (200 OK — Without Active Consent):**
  ```json
  {
    "success": true,
    "data": {
      "id": "ahmed",
      "name": "Ahmed Al Ketbi",
      "short": "Ahmed",
      "sex": "M",
      "role": "Partner · married",
      "isSelf": false,
      "isConnected": true,
      "connectedAt": "2026-11-01T10:00:00Z",
      "carrierGene": null,
      "condition": null,
      "consentRequired": true,
      "hasActiveMedicalConsent": false
    }
  }
  ```
* **Response Schema (200 OK — With Active Verified Consent):**
  ```json
  {
    "success": true,
    "data": {
      "id": "fatima",
      "name": "Fatima Al Hammadi",
      "short": "Fatima",
      "sex": "F",
      "role": "Partner · engaged",
      "isSelf": false,
      "isConnected": true,
      "connectedAt": "2026-10-12T09:00:00Z",
      "carrierGene": "HBB",
      "condition": "Beta-thalassaemia carrier",
      "consentRequired": false,
      "hasActiveMedicalConsent": true,
      "activeConsentDetails": {
        "id": "cst_demo_khalid_fatima",
        "purpose": "Premarital couple compatibility review",
        "dataScope": "CARRIER_GENE",
        "grantedAt": "2026-10-12T09:05:00Z"
      }
    }
  }
  ```
* **Error Codes:**
  - `404_USER_NOT_FOUND`: Specified user ID does not exist.
  - `403_USER_BLOCKED`: Profile unavailable due to active block.
* **Idempotency:** Read-only / Idempotent.

---

## 2. Connection Requests

### `POST /api/v1/connections/requests`
Sends a premarital connection request to another registered user.

* **HTTP Method:** `POST`
* **Authentication:** Required
* **Required Role:** `couple`
* **Permission Requirements:** `connections:request`
* **Request Schema:**
  ```json
  {
    "receiverId": "fatima",
    "note": "Salam Fatima, let's connect regarding our premarital screenings."
  }
  ```
* **Response Schema (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "req_k8s9f2",
      "senderId": "khalid",
      "receiverId": "fatima",
      "status": "PENDING",
      "note": "Salam Fatima, let's connect regarding our premarital screenings.",
      "createdAt": "2026-11-04T10:30:00Z"
    }
  }
  ```
* **Business Logic & Edge Cases:**
  - Prevents self-requests (`senderId === receiverId` -> `400 Bad Request`).
  - Prevents duplicate pending requests (`409 Conflict`).
  - Prevents requests to blocked users (`403 Forbidden`).
  - **Mutual Request Auto-Resolution:** If `receiverId` already sent a pending request to `senderId`, the request is automatically accepted and the active connection is returned.
* **Error Codes:**
  - `400_SELF_REQUEST`: Cannot connect with oneself.
  - `409_DUPLICATE_REQUEST`: A request is already pending.
  - `409_ALREADY_CONNECTED`: Users are already connected.
* **Idempotency:** Supported via client-provided `Idempotency-Key` header.
* **Audit Requirements:** Logged to audit trail: `CONNECTION_REQUEST_SENT`.

---

### `POST /api/v1/connections/requests/:id/accept`
Accepts an incoming pending connection request.

* **HTTP Method:** `POST`
* **Authentication:** Required
* **Required Role:** `couple`
* **Permission Requirements:** `connections:accept` (acting user must equal `receiverId`).
* **Response Schema (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "connectionId": "conn_m7x2",
      "status": "ACTIVE",
      "connectedAt": "2026-11-04T10:32:00Z",
      "peer": {
        "id": "khalid",
        "name": "Khalid Al Mansoori",
        "short": "Khalid"
      }
    }
  }
  ```
* **Error Codes:**
  - `403_UNAUTHORIZED_ACTION`: Acting user is not the designated recipient.
  - `409_INVALID_STATE`: Request is not in `PENDING` state (e.g. already rejected).
* **Idempotency:** Idempotent; accepting an already accepted request returns the existing connection.
* **Audit Requirements:** Logged to audit trail: `CONNECTION_ACCEPTED`.

---

### `POST /api/v1/connections/requests/:id/reject`
Rejects an incoming connection request.

* **HTTP Method:** `POST`
* **Authentication:** Required
* **Permission Requirements:** Acting user must equal `receiverId`.
* **Response Schema (200 OK):**
  ```json
  {
    "success": true,
    "data": { "requestId": "req_k8s9f2", "status": "REJECTED" }
  }
  ```
* **Audit Requirements:** Logged to audit trail: `CONNECTION_REJECTED`.

---

### `DELETE /api/v1/connections/requests/:id`
Cancels an outgoing pending connection request.

* **HTTP Method:** `DELETE`
* **Authentication:** Required
* **Permission Requirements:** Acting user must equal `senderId`.
* **Response Schema (200 OK):**
  ```json
  {
    "success": true,
    "data": { "requestId": "req_k8s9f2", "status": "CANCELLED" }
  }
  ```
* **Audit Requirements:** Logged to audit trail: `CONNECTION_REQUEST_CANCELLED`.

---

## 3. Active Connections & Access Revocation

### `GET /api/v1/connections`
Returns all active connections for the authenticated user.

* **HTTP Method:** `GET`
* **Authentication:** Required
* **Response Schema (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "connectionId": "conn_demo_khalid_fatima",
        "connectedAt": "2026-10-12T09:00:00Z",
        "userId": "fatima",
        "name": "Fatima Al Hammadi",
        "short": "Fatima",
        "role": "Partner · engaged",
        "consentGiven": true,
        "consentReceived": true
      }
    ]
  }
  ```

---

### `DELETE /api/v1/connections/:id`
Removes an active connection and severs relationship access.

* **HTTP Method:** `DELETE`
* **Authentication:** Required
* **Permission Requirements:** Acting user must be either `user_a` or `user_b` of the connection.
* **Cascade Behavior:**
  - Marks connection status as `REMOVED`.
  - Automatically revokes all active consents between the two users (`status: 'REVOKED'`).
  - Dispatches `CONNECTION_REMOVED` in-app notification to the peer.
* **Response Schema (200 OK):**
  ```json
  {
    "success": true,
    "data": { "connectionId": "conn_demo_khalid_fatima", "status": "REMOVED" }
  }
  ```
* **Audit Requirements:** Logged to audit trail: `CONNECTION_REMOVED`.

---

## 4. Purpose-Specific Consent Management

### `POST /api/v1/connections/:id/consents`
Explicitly authorizes a connected peer to access premarital genetic carrier findings.

* **HTTP Method:** `POST`
* **Authentication:** Required
* **Permission Requirements:** Acting user must be a participant in the connection.
* **Request Schema:**
  ```json
  {
    "purpose": "Premarital couple compatibility review",
    "dataScope": "CARRIER_GENE"
  }
  ```
  *(Supported `dataScope` values: `CARRIER_GENE`, `FULL_GENETIC_REPORT`)*
* **Response Schema (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "cst_98a2b",
      "connectionId": "conn_demo_khalid_fatima",
      "granterId": "khalid",
      "granteeId": "fatima",
      "purpose": "Premarital couple compatibility review",
      "dataScope": "CARRIER_GENE",
      "consentVersion": "1.0",
      "status": "ACTIVE",
      "grantedAt": "2026-11-04T10:35:00Z"
    }
  }
  ```
* **Error Codes:**
  - `400_INVALID_CONNECTION`: No active connection exists with the target user.
  - `400_SELF_CONSENT`: Cannot grant consent to oneself.
* **Audit Requirements:** Logged to audit trail: `CONSENT_GRANTED`.

---

### `POST /api/v1/consents/:id/revoke`
Immediately revokes an active medical consent.

* **HTTP Method:** `POST`
* **Authentication:** Required
* **Permission Requirements:** Acting user must be the `granter_id` of the consent record.
* **Behavior:**
  - Sets `status` to `REVOKED`.
  - Records `revoked_at` timestamp.
  - All future requests by `granteeId` to view `granterId`'s genetic data are terminated with immediate effect.
* **Response Schema (200 OK):**
  ```json
  {
    "success": true,
    "data": { "id": "cst_98a2b", "status": "REVOKED", "revokedAt": "2026-11-04T10:36:00Z" }
  }
  ```
* **Audit Requirements:** Logged to audit trail: `CONSENT_REVOKED`.

---

## 5. In-App Notifications

### `GET /api/v1/notifications`
* **Response Schema (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "notif_welcome",
        "userId": "khalid",
        "actorId": "ahmed",
        "type": "CONNECTION_REQUEST",
        "title": "New connection request",
        "body": "Ahmed Al Ketbi sent you a connection request.",
        "link": "/app/connections?tab=requests",
        "isRead": false,
        "createdAt": "2026-11-01T14:30:00Z"
      }
    ],
    "meta": { "unreadCount": 1 }
  }
  ```

### `PATCH /api/v1/notifications/:id/read`
* **Response Schema (200 OK):**
  ```json
  { "success": true, "data": { "id": "notif_welcome", "isRead": true } }
  ```


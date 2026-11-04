# DaNA — REST API Reference (v1)

## 1. Standard Response Envelope

All `/api/v1` endpoints return a consistent JSON response envelope:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "timestamp": "2026-11-04T10:00:00.000Z",
    "version": "1.0",
    "requestId": "req_xyz123"
  }
}
```

When an error occurs:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "CONSENT_REQUIRED",
    "message": "Explicit medical data consent is required to view genetic carrier status.",
    "details": { "targetUserId": "fatima", "requiredScope": "CARRIER_GENE" }
  },
  "meta": {
    "timestamp": "2026-11-04T10:00:00.000Z",
    "version": "1.0"
  }
}
```

---

## 2. Standard HTTP Status Codes

| Code | Meaning | Use Case |
| :--- | :--- | :--- |
| **200 OK** | Success | GET retrieval, updates, revocations. |
| **201 Created** | Resource Created | POST sending requests, establishing connections, creating consents. |
| **400 Bad Request** | Invalid Input | Malformed body, missing required fields. |
| **401 Unauthorized** | Missing / Invalid Session | User is not logged in with UAE PASS. |
| **403 Forbidden** | Authorization Violation | Attempting to access non-consented clinical data, IDOR violation. |
| **404 Not Found** | Resource Missing | Request ID, connection ID, or user ID not found. |
| **409 Conflict** | State Conflict | Duplicate pending request, self-request, duplicate active connection. |
| **422 Unprocessable**| Validation Failed | Self-connection, blocked user interaction. |

---

## 3. Endpoints Directory

### Group A: User Discovery
* **`GET /api/v1/users/search?q={query}&page=1&limit=10`**
  - **Auth:** Required (`couple`, `counsellor`, `admin`).
  - **Returns:** Non-credible identity markers only (`id`, `name`, `short`, `sex`, `role`, `isConnected`, `hasPendingRequest`).
  - **Security:** Genetic findings (`carrier`, `gene`) are strictly omitted.
* **`GET /api/v1/users/:id/preview`**
  - **Auth:** Required.
  - **Returns:** Safe profile preview. If connected and explicit consent is verified, includes authorized clinical scope. Otherwise, includes `consentRequired: true`.

### Group B: Connection Requests
* **`POST /api/v1/connections/requests`**
  - **Payload:** `{ "receiverId": "fatima", "note": "Salam Fatima..." }`
  - **Behavior:** Validates no self-request, no duplicate, no blocks. Auto-resolves mutual requests into an active connection.
  - **Audit:** Logs `CONNECTION_REQUEST_SENT`.
* **`GET /api/v1/connections/requests/received`**
  - **Returns:** List of incoming pending requests for the authenticated user.
* **`GET /api/v1/connections/requests/sent`**
  - **Returns:** List of outgoing pending requests sent by the authenticated user.
* **`POST /api/v1/connections/requests/:id/accept`**
  - **Auth:** Must be the designated `receiverId`.
  - **Behavior:** Sets request `ACCEPTED`, creates canonical `user_connections` record. Triggers notification to sender.
  - **Audit:** Logs `CONNECTION_ACCEPTED`.
* **`POST /api/v1/connections/requests/:id/reject`**
  - **Auth:** Must be the designated `receiverId`. Sets request `REJECTED`.
* **`DELETE /api/v1/connections/requests/:id`**
  - **Auth:** Must be the designated `senderId`. Cancels pending request.

### Group C: Connections & Relationship Management
* **`GET /api/v1/connections`**
  - **Returns:** Active connections for the authenticated user with connection timestamps and consent statuses.
* **`DELETE /api/v1/connections/:id`**
  - **Behavior:** Severs the connection and automatically revokes all associated medical consents.
  - **Audit:** Logs `CONNECTION_REMOVED`.
* **`POST /api/v1/connections/:id/block`**
  - **Behavior:** Severs active connections, cancels pending requests, revokes all consents, and adds target to block list.
* **`DELETE /api/v1/connections/blocked/:userId`**
  - **Behavior:** Removes user from block list.

### Group D: Purpose-Specific Consent Management
* **`GET /api/v1/connections/:id/consents`**
  - **Returns:** All active and historical consents associated with the connection.
* **`POST /api/v1/connections/:id/consents`**
  - **Payload:** `{ "purpose": "Premarital counseling", "dataScope": "CARRIER_GENE" }`
  - **Behavior:** Grants explicit, revocable authorization to the connected peer.
  - **Audit:** Logs `CONSENT_GRANTED`.
* **`POST /api/v1/consents/:id/revoke`**
  - **Auth:** Must be the granting user (`granter_id`).
  - **Behavior:** Marks consent `REVOKED` with timestamp. Future access to medical data is terminated immediately.
  - **Audit:** Logs `CONSENT_REVOKED`.

### Group E: In-App Notifications
* **`GET /api/v1/notifications`**
  - **Returns:** Notification list with unread counter.
* **`PATCH /api/v1/notifications/:id/read`**
  - **Behavior:** Marks single notification as read.
* **`POST /api/v1/notifications/read-all`**
  - **Behavior:** Marks all notifications as read for authenticated user.


# DaNA — Authorization & Security Verification Test Report

**Document Version:** 1.0.0  
**Test Suite File:** `test/authorization.test.mjs`  
**Execution Environment:** Node.js v22.17.1 Test Runner  
**Status:** PASSING (18 of 18 Scenarios Verified)  

---

## 1. Test Execution Summary

The DaNA Healthcare Authorization test suite validates all required access control boundaries using isolated authenticated identities, rigorous boundary testing, and direct assertion of security error definitions.

```
Total Test Suites: 2
Total Test Cases:  31 (18 Security/Authorization + 13 Connections/Risk Processing)
Passed:            31
Failed:            0
Skipped:           0
Duration:          1.23 seconds
```

---

## 2. Detailed 18-Scenario Verification Results

| # | Scenario Description | Expected Policy | Identity / Context | Actual Result | Status |
| :-: | :--- | :--- | :--- | :--- | :---: |
| **1** | **User A reads their own genetic report** | ALLOWED (Ownership) | User A (`khalid`) reading Report `REPORT-KHALID-01` | Allowed (`decision.allowed = true`) | **PASS** |
| **2** | **User A attempts to read User B's report** | DENIED (Confidentiality) | User A (`khalid`) attempting to read User B (`fatima`) report | Denied (`DANA_AUTH_403_GENETIC_CROSS_BOUNDARY`) | **PASS** |
| **3** | **User B attempts to read User A's report** | DENIED (Confidentiality) | User B (`fatima`) attempting to read User A (`khalid`) report | Denied (`DANA_AUTH_403_GENETIC_CROSS_BOUNDARY`) | **PASS** |
| **4** | **Unconnected user attempts couple assessment** | DENIED (Relationship) | User C (`omar`) attempting to read Khalid/Fatima couple assessment | Denied (`DANA_AUTH_403_INACTIVE_RELATIONSHIP`) | **PASS** |
| **5** | **Connected partner accesses combined assessment**| ALLOWED (Active ReBAC + Consent) | User A (`khalid`) accessing active couple assessment with bilateral consent | Allowed (`decision.allowed = true`) | **PASS** |
| **6** | **Partner attempts to access raw genetic report** | DENIED (Cross-Boundary) | User A connected to Fatima attempting to access Fatima's raw report | Denied (`DANA_AUTH_403_GENETIC_CROSS_BOUNDARY`) | **PASS** |
| **7** | **User attempts processing without required consent**| DENIED (CBAC Missing) | Engine execution triggered when User A lacks `couple_assessment` consent | Throws `AuthorizationError` (`DANA_AUTH_403_CONSENT_REQUIRED`) | **PASS** |
| **8** | **One partner's consent is revoked** | DENIED (CBAC Revoked) | Engine execution halted when User B sets consent to `status = 'revoked'` | Throws `AuthorizationError` (`DANA_AUTH_403_CONSENT_REQUIRED`) | **PASS** |
| **9** | **Counsellor opens assigned case** | ALLOWED (Assigned Duty) | Dr. Mariam opening assigned case `case_khalid_fatima` | Allowed (`decision.allowed = true`) | **PASS** |
| **10**| **Counsellor opens unassigned case** | DENIED (Boundary) | Dr. Yousef opening unassigned case `case_khalid_fatima` | Denied (`DANA_AUTH_403_UNASSIGNED_CASE`) | **PASS** |
| **11**| **Administrator attempts raw genetic access** | DENIED (Least Privilege) | Admin account attempting to read raw patient genetic report | Denied (`DANA_AUTH_403_GENETIC_CROSS_BOUNDARY`) | **PASS** |
| **12**| **DoH viewer attempts identifiable patient access**| DENIED (k-Anonymity) | DoH Viewer requesting identifiable profile or cohort $< 5$ | Denied (`DANA_AUTH_403_FORBIDDEN` & `MIN_COHORT`) | **PASS** |
| **13**| **Reviewer attempts clinical-record access** | DENIED (RBAC) | Content Reviewer attempting to access patient medical records | Denied (`DANA_AUTH_403_FORBIDDEN`) | **PASS** |
| **14**| **Ended relationship attempts couple resources** | DENIED (ReBAC Severed) | User A attempting to access couple assessment for ended relationship | Denied (`DANA_AUTH_403_INACTIVE_RELATIONSHIP`) | **PASS** |
| **15**| **Suspended account attempts protected access** | DENIED (Account Status)| Suspended user attempting profile or report read | Denied (`DANA_AUTH_403_ACCOUNT_SUSPENDED`) | **PASS** |
| **16**| **User attempts to change their own role** | DENIED (Anti-Tampering) | Patient attempting self-elevation to `counsellor` role | Denied (`DANA_AUTH_403_FORBIDDEN`) | **PASS** |
| **17**| **User manipulates a resource ID (IDOR)** | DENIED (Ownership) | User A attempting to revoke User B's consent record ID | Denied (`DANA_AUTH_403_NOT_OWNER`) | **PASS** |
| **18**| **Expired session attempts protected operation** | DENIED (Auth Expiry) | Unauthenticated/expired session executing protected read | Denied (`DANA_AUTH_403_UNAUTHENTICATED`) | **PASS** |

---

## 3. How to Run the Tests

To execute the test suite across both connections and security authorization:

```bash
# Run from repository root
npm --prefix web run test
```

Or run directly via Node.js test runner:

```bash
node --test test/connectionsService.test.mjs test/authorization.test.mjs
```


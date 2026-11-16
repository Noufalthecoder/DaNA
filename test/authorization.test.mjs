import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  ROLES,
  RESOURCES,
  ACTIONS,
  CONSENT_PURPOSES,
  CONSENT_SCOPES,
  CONSENT_STATUSES,
  SECURITY_ERRORS,
  AuthorizationError,
  hasRbacPermission,
  isResourceOwner,
  hasActiveCoupleRelationship,
  isAssignedCounsellorToCase,
  isConsentValid,
  hasActiveConsent,
  evaluateAccess,
  sanitizeResourceForViewer,
  authorizedEvaluateCoupleAssessment,
} from '../web/src/app/shared/auth/authorizationEngine.js';

import { assess } from '../web/src/app/shared/genetics.js';

describe('DaNA Healthcare Authorization & Consent Test Suite (18 Scenarios)', () => {
  // Test Identities
  const userA = { id: 'khalid', personId: 'khalid', userId: 'user_khalid_uuid', role: ROLES.PATIENT, status: 'active', name: 'Khalid Al Mansoori' };
  const userB = { id: 'fatima', personId: 'fatima', userId: 'user_fatima_uuid', role: ROLES.PATIENT, status: 'active', name: 'Fatima Al Hammadi' };
  const userC = { id: 'omar', personId: 'omar', userId: 'user_omar_uuid', role: ROLES.PATIENT, status: 'active', name: 'Omar Al Dhaheri' }; // Unconnected

  const counsellorAssigned = {
    id: 'mariam',
    userId: 'counsellor_mariam_uid',
    counsellorId: 'counsellor_mariam',
    role: ROLES.COUNSELLOR,
    status: 'active',
    credentialsVerified: true,
    name: 'Dr. Mariam Al Hosani',
  };

  const counsellorUnassigned = {
    id: 'yousef',
    userId: 'counsellor_yousef_uid',
    counsellorId: 'counsellor_yousef',
    role: ROLES.COUNSELLOR,
    status: 'active',
    credentialsVerified: true,
    name: 'Dr. Yousef Al Marzooqi',
  };

  const administrator = {
    id: 'admin_user',
    userId: 'admin_uuid',
    role: ROLES.ADMIN,
    status: 'active',
    name: 'Programme Administrator',
  };

  const dohViewer = {
    id: 'doh_viewer_user',
    userId: 'doh_uuid',
    role: ROLES.DOH_VIEWER,
    status: 'active',
    name: 'DoH Population Health Analyst',
  };

  const contentReviewer = {
    id: 'content_reviewer_user',
    userId: 'reviewer_uuid',
    role: ROLES.CONTENT_REVIEWER,
    status: 'active',
    name: 'Medical & Faith Content Reviewer',
  };

  const suspendedUser = {
    id: 'suspended_patient',
    personId: 'suspended_patient',
    userId: 'suspended_uuid',
    role: ROLES.PATIENT,
    status: 'suspended',
    name: 'Suspended Account User',
  };

  // Shared test context
  const activeCouple = {
    id: 'couple_khalid_fatima',
    partner_a: 'khalid',
    partner_b: 'fatima',
    stage: 'engaged',
    status: 'active',
  };

  const endedCouple = {
    id: 'couple_khalid_ended',
    partner_a: 'khalid',
    partner_b: 'noura',
    stage: 'engaged',
    status: 'ended',
  };

  const caseAssignments = [
    { case_id: 'case_khalid_fatima', counsellor_id: 'counsellor_mariam', status: 'active' },
  ];

  const standardConsents = [
    {
      id: 'cst_khalid_proc',
      person_id: 'khalid',
      purpose: CONSENT_PURPOSES.GENETIC_PROCESSING,
      status: 'active',
    },
    {
      id: 'cst_khalid_couple',
      person_id: 'khalid',
      purpose: CONSENT_PURPOSES.COUPLE_ASSESSMENT,
      status: 'active',
    },
    {
      id: 'cst_khalid_counsellor',
      person_id: 'khalid',
      purpose: CONSENT_PURPOSES.COUNSELLOR_CLINICAL_ACCESS,
      status: 'active',
    },
    {
      id: 'cst_fatima_proc',
      person_id: 'fatima',
      purpose: CONSENT_PURPOSES.GENETIC_PROCESSING,
      status: 'active',
    },
    {
      id: 'cst_fatima_couple',
      person_id: 'fatima',
      purpose: CONSENT_PURPOSES.COUPLE_ASSESSMENT,
      status: 'active',
    },
    {
      id: 'cst_fatima_share',
      person_id: 'fatima',
      purpose: CONSENT_PURPOSES.SHARE_COMBINED_ASSESSMENT,
      status: 'active',
    },
    {
      id: 'cst_fatima_counsellor',
      person_id: 'fatima',
      purpose: CONSENT_PURPOSES.COUNSELLOR_CLINICAL_ACCESS,
      status: 'active',
    },
  ];

  // ---------------------------------------------------------------------------
  // 1. User A reads their own genetic report (ALLOWED)
  // ---------------------------------------------------------------------------
  it('1. User A reads their own genetic report (Allowed)', () => {
    const reportTarget = { personId: 'khalid', reportId: 'REPORT-KHALID-01' };
    const decision = evaluateAccess({
      actor: userA,
      resource: RESOURCES.GENETIC_REPORT,
      action: ACTIONS.READ,
      target: reportTarget,
    });

    assert.equal(decision.allowed, true, 'User A must be allowed to read their own report');
    assert.equal(decision.error, undefined);
  });

  // ---------------------------------------------------------------------------
  // 2. User A attempts to read User B's report (DENIED)
  // ---------------------------------------------------------------------------
  it("2. User A attempts to read User B's report (Denied)", () => {
    const reportTarget = { personId: 'fatima', reportId: 'REPORT-FATIMA-01' };
    const decision = evaluateAccess({
      actor: userA,
      resource: RESOURCES.GENETIC_REPORT,
      action: ACTIONS.READ,
      target: reportTarget,
    });

    assert.equal(decision.allowed, false, 'User A must NOT read User B raw report');
    assert.equal(decision.error.code, SECURITY_ERRORS.RAW_GENETIC_CROSS_ACCESS_FORBIDDEN.code);
  });

  // ---------------------------------------------------------------------------
  // 3. User B attempts to read User A's report (DENIED)
  // ---------------------------------------------------------------------------
  it("3. User B attempts to read User A's report (Denied)", () => {
    const reportTarget = { personId: 'khalid', reportId: 'REPORT-KHALID-01' };
    const decision = evaluateAccess({
      actor: userB,
      resource: RESOURCES.GENETIC_REPORT,
      action: ACTIONS.READ,
      target: reportTarget,
    });

    assert.equal(decision.allowed, false, 'User B must NOT read User A raw report');
    assert.equal(decision.error.code, SECURITY_ERRORS.RAW_GENETIC_CROSS_ACCESS_FORBIDDEN.code);
  });

  // ---------------------------------------------------------------------------
  // 4. Unconnected user attempts to access a couple assessment (DENIED)
  // ---------------------------------------------------------------------------
  it('4. Unconnected user attempts to access a couple assessment (Denied)', () => {
    const assessmentTarget = { coupleId: 'couple_khalid_fatima', couple: activeCouple };
    const decision = evaluateAccess({
      actor: userC, // Omar is not a member of activeCouple
      resource: RESOURCES.COUPLE_ASSESSMENT,
      action: ACTIONS.READ,
      target: assessmentTarget,
      context: { couples: [activeCouple], consents: standardConsents },
    });

    assert.equal(decision.allowed, false, 'Unconnected user must be denied access to couple assessment');
    assert.equal(decision.error.code, SECURITY_ERRORS.INACTIVE_RELATIONSHIP.code);
  });

  // ---------------------------------------------------------------------------
  // 5. Connected partner accesses an authorized combined assessment (ALLOWED)
  // ---------------------------------------------------------------------------
  it('5. Connected partner accesses an authorized combined assessment (Allowed)', () => {
    // Both Khalid and Fatima have active consents for couple assessment and sharing
    const assessmentTarget = { coupleId: 'couple_khalid_fatima', couple: activeCouple };
    const consentsWithBoth = [
      ...standardConsents,
      {
        id: 'cst_khalid_share',
        person_id: 'khalid',
        purpose: CONSENT_PURPOSES.SHARE_COMBINED_ASSESSMENT,
        status: 'active',
      },
    ];

    const decision = evaluateAccess({
      actor: userA,
      resource: RESOURCES.COUPLE_ASSESSMENT,
      action: ACTIONS.READ,
      target: assessmentTarget,
      context: { couples: [activeCouple], consents: consentsWithBoth },
    });

    assert.equal(decision.allowed, true, 'Connected partner with active bilateral consent must be allowed access');
  });

  // ---------------------------------------------------------------------------
  // 6. Partner attempts to access a raw genetic report (DENIED)
  // ---------------------------------------------------------------------------
  it('6. Partner attempts to access a raw genetic report (Denied even if connected)', () => {
    // Connection must NEVER grant raw genetic report access across partners
    assert.ok(hasActiveCoupleRelationship(userA, 'fatima', [activeCouple]), 'Khalid and Fatima are connected');

    const rawReportTarget = { personId: 'fatima', reportId: 'MALAFFI-FATIMA-GENOMICS' };
    const decision = evaluateAccess({
      actor: userA,
      resource: RESOURCES.GENETIC_REPORT,
      action: ACTIONS.READ,
      target: rawReportTarget,
      context: { couples: [activeCouple], consents: standardConsents },
    });

    assert.equal(decision.allowed, false, 'Active connection must NOT grant access to partner raw report');
    assert.equal(decision.error.code, SECURITY_ERRORS.RAW_GENETIC_CROSS_ACCESS_FORBIDDEN.code);
  });

  // ---------------------------------------------------------------------------
  // 7. User attempts processing without their own required consent (DENIED)
  // ---------------------------------------------------------------------------
  it('7. User attempts processing without their own required consent (Denied)', () => {
    // Missing Khalid's COUPLE_ASSESSMENT consent
    const consentsWithoutKhalid = standardConsents.filter((c) => !(c.person_id === 'khalid' && c.purpose === CONSENT_PURPOSES.COUPLE_ASSESSMENT));

    assert.throws(
      () => {
        authorizedEvaluateCoupleAssessment({
          actor: userA,
          couple: activeCouple,
          partnerAReport: { validation_status: 'verified' },
          partnerBReport: { validation_status: 'verified' },
          consents: consentsWithoutKhalid,
          engineAssessFn: assess,
        });
      },
      (err) => {
        return err instanceof AuthorizationError && err.code === SECURITY_ERRORS.MISSING_CONSENT.code;
      },
      'Processing must fail when individual has not granted processing consent'
    );
  });

  // ---------------------------------------------------------------------------
  // 8. One partner's consent is revoked (DENIED)
  // ---------------------------------------------------------------------------
  it("8. One partner's consent is revoked (Denied)", () => {
    // Fatima explicitly revokes her consent
    const consentsWithRevoked = standardConsents.map((c) => {
      if (c.person_id === 'fatima' && c.purpose === CONSENT_PURPOSES.COUPLE_ASSESSMENT) {
        return { ...c, status: 'revoked', revoked_at: new Date().toISOString() };
      }
      return c;
    });

    assert.throws(
      () => {
        authorizedEvaluateCoupleAssessment({
          actor: userA,
          couple: activeCouple,
          partnerAReport: { validation_status: 'verified' },
          partnerBReport: { validation_status: 'verified' },
          consents: consentsWithRevoked,
          engineAssessFn: assess,
        });
      },
      (err) => {
        return err instanceof AuthorizationError && err.code === SECURITY_ERRORS.MISSING_CONSENT.code;
      },
      'Processing must halt immediately when one partner revokes consent'
    );
  });

  // ---------------------------------------------------------------------------
  // 9. A counsellor opens an assigned case (ALLOWED)
  // ---------------------------------------------------------------------------
  it('9. A counsellor opens an assigned case (Allowed)', () => {
    const caseTarget = { id: 'case_khalid_fatima', caseId: 'case_khalid_fatima', coupleId: 'couple_khalid_fatima' };
    const decision = evaluateAccess({
      actor: counsellorAssigned,
      resource: RESOURCES.CLINICAL_CASE,
      action: ACTIONS.READ,
      target: caseTarget,
      context: { assignments: caseAssignments },
    });

    assert.equal(decision.allowed, true, 'Assigned counsellor must be allowed to open the case');
  });

  // ---------------------------------------------------------------------------
  // 10. A counsellor opens an unassigned case (DENIED)
  // ---------------------------------------------------------------------------
  it('10. A counsellor opens an unassigned case (Denied)', () => {
    const caseTarget = { id: 'case_khalid_fatima', caseId: 'case_khalid_fatima', coupleId: 'couple_khalid_fatima' };
    const decision = evaluateAccess({
      actor: counsellorUnassigned, // Dr. Yousef is not assigned to this case
      resource: RESOURCES.CLINICAL_CASE,
      action: ACTIONS.READ,
      target: caseTarget,
      context: { assignments: caseAssignments },
    });

    assert.equal(decision.allowed, false, 'Unassigned counsellor must be denied case access');
    assert.equal(decision.error.code, SECURITY_ERRORS.UNASSIGNED_COUNSELLOR.code);
  });

  // ---------------------------------------------------------------------------
  // 11. An administrator attempts raw genetic access (DENIED)
  // ---------------------------------------------------------------------------
  it('11. An administrator attempts raw genetic access (Denied)', () => {
    const reportTarget = { personId: 'khalid', reportId: 'REPORT-KHALID-01' };
    const decision = evaluateAccess({
      actor: administrator,
      resource: RESOURCES.GENETIC_REPORT,
      action: ACTIONS.READ,
      target: reportTarget,
    });

    assert.equal(decision.allowed, false, 'Administrator must NEVER access raw patient genetic reports');
    assert.equal(decision.error.code, SECURITY_ERRORS.RAW_GENETIC_CROSS_ACCESS_FORBIDDEN.code);
  });

  // ---------------------------------------------------------------------------
  // 12. A DoH viewer attempts identifiable patient access (DENIED)
  // ---------------------------------------------------------------------------
  it('12. A DoH viewer attempts identifiable patient access (Denied)', () => {
    const profileTarget = { personId: 'khalid', id: 'khalid' };
    const decision = evaluateAccess({
      actor: dohViewer,
      resource: RESOURCES.PROFILE,
      action: ACTIONS.READ,
      target: profileTarget,
    });

    assert.equal(decision.allowed, false, 'DoH viewer must NOT access identifiable individual profiles');
    assert.equal(decision.error.code, SECURITY_ERRORS.MISSING_PERMISSION.code);

    // Also verify small cohort suppression (< 5)
    const cohortDecision = evaluateAccess({
      actor: dohViewer,
      resource: RESOURCES.ANALYTICS,
      action: ACTIONS.READ,
      target: { cohortSize: 3 },
    });
    assert.equal(cohortDecision.allowed, false, 'DoH viewer must be blocked from small cohorts (k < 5)');
    assert.equal(cohortDecision.error.code, SECURITY_ERRORS.COHORT_TOO_SMALL.code);
  });

  // ---------------------------------------------------------------------------
  // 13. A reviewer attempts clinical-record access (DENIED)
  // ---------------------------------------------------------------------------
  it('13. A reviewer attempts clinical-record access (Denied)', () => {
    const medRecTarget = { personId: 'khalid', id: 'medrec_001' };
    const decision = evaluateAccess({
      actor: contentReviewer,
      resource: RESOURCES.MEDICAL_RECORD,
      action: ACTIONS.READ,
      target: medRecTarget,
    });

    assert.equal(decision.allowed, false, 'Content reviewer has no permission to access clinical medical records');
    assert.equal(decision.error.code, SECURITY_ERRORS.MISSING_PERMISSION.code);
  });

  // ---------------------------------------------------------------------------
  // 14. An ended relationship attempts to access couple resources (DENIED)
  // ---------------------------------------------------------------------------
  it('14. An ended relationship attempts to access couple resources (Denied)', () => {
    const assessmentTarget = { coupleId: 'couple_khalid_ended', couple: endedCouple };
    const decision = evaluateAccess({
      actor: userA,
      resource: RESOURCES.COUPLE_ASSESSMENT,
      action: ACTIONS.READ,
      target: assessmentTarget,
      context: { couples: [endedCouple], consents: standardConsents },
    });

    assert.equal(decision.allowed, false, 'Ended relationship must not retain active couple permissions');
    assert.equal(decision.error.code, SECURITY_ERRORS.INACTIVE_RELATIONSHIP.code);
  });

  // ---------------------------------------------------------------------------
  // 15. A suspended account attempts protected access (DENIED)
  // ---------------------------------------------------------------------------
  it('15. A suspended account attempts protected access (Denied)', () => {
    const reportTarget = { personId: 'suspended_patient' };
    const decision = evaluateAccess({
      actor: suspendedUser, // Status: 'suspended'
      resource: RESOURCES.PROFILE,
      action: ACTIONS.READ,
      target: reportTarget,
    });

    assert.equal(decision.allowed, false, 'Suspended account must be denied all protected access');
    assert.equal(decision.error.code, SECURITY_ERRORS.ACCOUNT_SUSPENDED.code);
  });

  // ---------------------------------------------------------------------------
  // 16. A user attempts to change their own role (DENIED)
  // ---------------------------------------------------------------------------
  it('16. A user attempts to change their own role (Denied)', () => {
    // Only trusted database/backend can assign privileged roles
    const attemptedSelfElevation = hasRbacPermission(ROLES.PATIENT, RESOURCES.SYSTEM_CONFIG, ACTIONS.UPDATE);
    assert.equal(attemptedSelfElevation, false, 'Patient role has no permission to manage roles or config');

    // Attempting to grant oneself counsellor or admin role directly fails authorization
    const roleElevationCheck = evaluateAccess({
      actor: userA,
      resource: RESOURCES.SYSTEM_CONFIG,
      action: ACTIONS.UPDATE,
      target: { changeRoleTo: 'counsellor' },
    });
    assert.equal(roleElevationCheck.allowed, false, 'Self-role elevation must be strictly denied');
    assert.equal(roleElevationCheck.error.code, SECURITY_ERRORS.MISSING_PERMISSION.code);
  });

  // ---------------------------------------------------------------------------
  // 17. A user manipulates a resource ID / IDOR attempt (DENIED)
  // ---------------------------------------------------------------------------
  it('17. A user manipulates a resource ID / IDOR attempt (Denied)', () => {
    // Khalid attempts to manipulate consent belonging to Fatima
    const manipulatedConsentTarget = {
      id: 'cst_fatima_couple',
      granterId: 'fatima',
      owner_id: 'fatima',
    };

    const decision = evaluateAccess({
      actor: userA, // Khalid acting on Fatima's consent ID
      resource: RESOURCES.CONSENT,
      action: ACTIONS.REVOKE,
      target: manipulatedConsentTarget,
    });

    assert.equal(decision.allowed, false, 'User must NOT manipulate another users consent resource');
    assert.equal(decision.error.code, SECURITY_ERRORS.NOT_OWNER.code);
  });

  // ---------------------------------------------------------------------------
  // 18. An expired session attempts a protected operation (DENIED)
  // ---------------------------------------------------------------------------
  it('18. An expired session attempts a protected operation (Denied)', () => {
    // Empty/missing actor representing expired session
    const decision = evaluateAccess({
      actor: null,
      resource: RESOURCES.PROFILE,
      action: ACTIONS.READ,
      target: { personId: 'khalid' },
    });

    assert.equal(decision.allowed, false, 'Expired or missing session must be denied');
    assert.equal(decision.error.code, SECURITY_ERRORS.UNAUTHENTICATED.code);
  });
});


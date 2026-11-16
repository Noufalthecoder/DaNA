/**
 * DaNA Security Administration Console & Role Restrictions Test Suite
 * 
 * Verifies:
 * 1. Role-based access restrictions for Security Console routes
 * 2. Clinical Zero-Knowledge boundaries (Admins blocked from raw variants and clinical notes)
 * 3. Sensitive governance operations (Account suspension, consent revocation, severance)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ROLES,
  RESOURCES,
  ACTIONS,
  CONSENT_PURPOSES,
  hasRbacPermission,
  evaluateAccess,
  authorizedEvaluateCoupleAssessment,
  SECURITY_ERRORS
} from '../web/src/app/shared/auth/authorizationEngine.js';

import { assess } from '../web/src/app/shared/genetics.js';

test('DaNA Security Administration Console & Governance Test Suite', async (t) => {

  // Identities
  const adminActor = {
    id: 'admin_user_01',
    userId: 'admin_user_01',
    role: ROLES.ADMIN,
    name: 'DoH Platform Admin',
    status: 'active'
  };

  const supervisorActor = {
    id: 'supervisor_user_01',
    userId: 'supervisor_user_01',
    role: ROLES.CLINICAL_SUPERVISOR,
    name: 'Clinical Supervisor',
    status: 'active'
  };

  const patientActor = {
    id: 'khalid',
    userId: 'khalid_uid',
    personId: 'khalid',
    role: ROLES.PATIENT,
    name: 'Khalid Al Mansoori',
    status: 'active'
  };

  const counsellorActor = {
    id: 'mariam',
    userId: 'mariam_uid',
    counsellorId: 'counsellor_mariam',
    role: ROLES.COUNSELLOR,
    name: 'Dr. Mariam Al Hosani',
    status: 'active'
  };

  // Test 1: Administrator can access forensic audit logs
  await t.test('1. Platform Administrator can access forensic audit logs (Allowed)', () => {
    const res = evaluateAccess({
      actor: adminActor,
      resource: RESOURCES.AUDIT_LOG,
      action: ACTIONS.READ
    });
    assert.equal(res.allowed, true);
  });

  // Test 2: Patient cannot manage system config or assign roles
  await t.test('2. Patient has no permission to manage platform system configuration (Denied)', () => {
    const hasPerm = hasRbacPermission(patientActor.role, RESOURCES.SYSTEM_CONFIG, ACTIONS.UPDATE);
    assert.equal(hasPerm, false);
    const res = evaluateAccess({
      actor: patientActor,
      resource: RESOURCES.SYSTEM_CONFIG,
      action: ACTIONS.UPDATE
    });
    assert.equal(res.allowed, false);
    assert.equal(res.error.code, SECURITY_ERRORS.MISSING_PERMISSION.code);
  });

  // Test 3: DoH Viewer is restricted to de-identified analytics and cannot read full operational audit
  await t.test('3. DoH Viewer has no permission to read full system config (Denied)', () => {
    const hasPerm = hasRbacPermission(ROLES.DOH_VIEWER, RESOURCES.SYSTEM_CONFIG, ACTIONS.READ);
    assert.equal(hasPerm, false);
    const res = evaluateAccess({
      actor: { id: 'doh_user', role: ROLES.DOH_VIEWER, status: 'active' },
      resource: RESOURCES.SYSTEM_CONFIG,
      action: ACTIONS.READ
    });
    assert.equal(res.allowed, false);
    assert.equal(res.error.code, SECURITY_ERRORS.MISSING_PERMISSION.code);
  });

  // Test 4: Clinical Zero-Knowledge: Admin is strictly blocked from raw genetic reports
  await t.test('4. Clinical Zero-Knowledge: Administrator is blocked from raw genetic reports (Denied)', () => {
    const res = evaluateAccess({
      actor: adminActor,
      resource: RESOURCES.GENETIC_REPORT,
      action: ACTIONS.READ,
      target: { personId: 'khalid' }
    });
    assert.equal(res.allowed, false);
    assert.equal(res.error.code, SECURITY_ERRORS.RAW_GENETIC_CROSS_ACCESS_FORBIDDEN.code);
  });

  // Test 5: Clinical Zero-Knowledge: Admin is strictly blocked from genetic variants
  await t.test('5. Clinical Zero-Knowledge: Administrator is blocked from genetic variants (Denied)', () => {
    const res = evaluateAccess({
      actor: adminActor,
      resource: RESOURCES.GENETIC_VARIANT,
      action: ACTIONS.READ,
      target: { personId: 'khalid' }
    });
    assert.equal(res.allowed, false);
    assert.equal(res.error.code, SECURITY_ERRORS.RAW_GENETIC_CROSS_ACCESS_FORBIDDEN.code);
  });

  // Test 6: Clinical Zero-Knowledge: Admin is strictly blocked from clinical counselling notes
  await t.test('6. Clinical Zero-Knowledge: Administrator is blocked from clinical notes (Denied)', () => {
    const res = evaluateAccess({
      actor: adminActor,
      resource: RESOURCES.COUNSELLING_NOTE,
      action: ACTIONS.READ,
      target: { caseId: 'case_khalid_fatima' }
    });
    assert.equal(res.allowed, false);
    assert.equal(res.error.code, SECURITY_ERRORS.MISSING_PERMISSION.code);
  });

  // Test 7: Clinical Supervisor can review clinical cases and audits
  await t.test('7. Clinical Supervisor can access clinical cases for audit review (Allowed)', () => {
    const res = evaluateAccess({
      actor: supervisorActor,
      resource: RESOURCES.CLINICAL_CASE,
      action: ACTIONS.READ,
      target: { caseId: 'case_khalid_fatima' }
    });
    assert.equal(res.allowed, true);
  });

  // Test 8: Suspended account is denied access immediately
  await t.test('8. Suspended account is denied access across all resources (Denied)', () => {
    const suspendedAdmin = { ...adminActor, status: 'suspended' };
    const res = evaluateAccess({
      actor: suspendedAdmin,
      resource: RESOURCES.AUDIT_LOG,
      action: ACTIONS.READ
    });
    assert.equal(res.allowed, false);
    assert.equal(res.error.code, SECURITY_ERRORS.ACCOUNT_SUSPENDED.code);
  });

  // Test 9: Ended relationship immediately blocks couple assessment access
  await t.test('9. Emergency relationship severance immediately denies couple assessment (Denied)', () => {
    const coupleEnded = {
      id: 'c1',
      partner_a: 'khalid',
      partner_b: 'fatima',
      status: 'ended'
    };
    const validConsents = [
      { person_id: 'khalid', purpose: CONSENT_PURPOSES.COUPLE_ASSESSMENT, status: 'active' },
      { person_id: 'fatima', purpose: CONSENT_PURPOSES.SHARE_COMBINED_ASSESSMENT, status: 'active' }
    ];
    const res = evaluateAccess({
      actor: patientActor,
      resource: RESOURCES.COUPLE_ASSESSMENT,
      action: ACTIONS.READ,
      target: { coupleId: 'c1', couple: coupleEnded },
      context: { couples: [coupleEnded], consents: validConsents }
    });
    assert.equal(res.allowed, false);
    assert.equal(res.error.code, SECURITY_ERRORS.INACTIVE_RELATIONSHIP.code);
  });

  // Test 10: Revoked consent immediately blocks assessment generation
  await t.test('10. Emergency consent revocation immediately denies assessment generation (Denied)', () => {
    const activeCouple = {
      id: 'c1',
      partner_a: 'khalid',
      partner_b: 'fatima',
      status: 'active'
    };
    const revokedConsents = [
      { person_id: 'khalid', purpose: CONSENT_PURPOSES.COUPLE_ASSESSMENT, status: 'active' },
      { person_id: 'fatima', purpose: CONSENT_PURPOSES.COUPLE_ASSESSMENT, status: 'revoked' }
    ];

    assert.throws(
      () => {
        authorizedEvaluateCoupleAssessment({
          actor: patientActor,
          couple: activeCouple,
          partnerAReport: { validation_status: 'verified' },
          partnerBReport: { validation_status: 'verified' },
          consents: revokedConsents,
          engineAssessFn: assess,
        });
      },
      (err) => err.code === SECURITY_ERRORS.MISSING_CONSENT.code
    );
  });
});

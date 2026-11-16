/**
 * Live Authorization Verification Script
 * Validates real multi-user workflows across:
 * - Patient Account 1: Khalid Al Mansoori ('khalid')
 * - Patient Account 2: Fatima Al Hammadi ('fatima')
 * - Counsellor Account: Dr. Mariam Al Hosani ('mariam')
 */

import assert from 'node:assert/strict';
import {
  ROLES,
  RESOURCES,
  ACTIONS,
  CONSENT_PURPOSES,
  SECURITY_ERRORS,
  evaluateAccess,
  authorizedEvaluateCoupleAssessment,
  sanitizeResourceForViewer,
} from '../web/src/app/shared/auth/authorizationEngine.js';

import {
  initConnectionsStore,
  getProfile,
  grantConsent,
  revokeConsent,
  isUserConnected,
} from '../web/src/app/shared/connectionsService.js';

import { assess } from '../web/src/app/shared/genetics.js';
import { set } from '../web/src/app/shared/store.js';

console.log('================================================================');
console.log('DaNA Authorization Verification: 2 Patients + 1 Counsellor');
console.log('================================================================\n');

// 1. Setup Identities
const patientKhalid = {
  id: 'khalid',
  personId: 'khalid',
  userId: 'uid_khalid_001',
  role: ROLES.PATIENT,
  name: 'Khalid Al Mansoori',
  status: 'active',
};

const patientFatima = {
  id: 'fatima',
  personId: 'fatima',
  userId: 'uid_fatima_002',
  role: ROLES.PATIENT,
  name: 'Fatima Al Hammadi',
  status: 'active',
};

const counsellorMariam = {
  id: 'mariam',
  userId: 'uid_mariam_counsellor',
  counsellorId: 'counsellor_mariam',
  role: ROLES.COUNSELLOR,
  name: 'Dr. Mariam Al Hosani',
  status: 'active',
  credentialsVerified: true,
};

const activeCouple = {
  id: 'c_khalid_fatima',
  a: 'khalid',
  b: 'fatima',
  partner_a: 'khalid',
  partner_b: 'fatima',
  stage: 'engaged',
  status: 'active',
};

const caseAssignments = [
  { case_id: 'case_khalid_fatima', counsellor_id: 'counsellor_mariam', status: 'active' },
];

let liveConsents = [
  { id: 'cst_1', person_id: 'khalid', purpose: CONSENT_PURPOSES.GENETIC_PROCESSING, status: 'active' },
  { id: 'cst_2', person_id: 'khalid', purpose: CONSENT_PURPOSES.COUPLE_ASSESSMENT, status: 'active' },
  { id: 'cst_3', person_id: 'khalid', purpose: CONSENT_PURPOSES.SHARE_COMBINED_ASSESSMENT, status: 'active' },
  { id: 'cst_4', person_id: 'khalid', purpose: CONSENT_PURPOSES.COUNSELLOR_CLINICAL_ACCESS, status: 'active' },
  { id: 'cst_5', person_id: 'fatima', purpose: CONSENT_PURPOSES.GENETIC_PROCESSING, status: 'active' },
  { id: 'cst_6', person_id: 'fatima', purpose: CONSENT_PURPOSES.COUPLE_ASSESSMENT, status: 'active' },
  { id: 'cst_7', person_id: 'fatima', purpose: CONSENT_PURPOSES.SHARE_COMBINED_ASSESSMENT, status: 'active' },
  { id: 'cst_8', person_id: 'fatima', purpose: CONSENT_PURPOSES.COUNSELLOR_CLINICAL_ACCESS, status: 'active' },
];

// Step 1: Patient 1 reads their own genetic report
console.log('Test 1: Khalid reads Khalid\'s raw genetic report:');
const t1 = evaluateAccess({
  actor: patientKhalid,
  resource: RESOURCES.GENETIC_REPORT,
  action: ACTIONS.READ,
  target: { personId: 'khalid' },
});
console.log('Result:', t1.allowed ? '✓ ALLOWED (Ownership confirmed)' : '✗ FAILED');
assert.equal(t1.allowed, true);

// Step 2: Patient 1 attempts to query Patient 2's raw report
console.log('\nTest 2: Khalid attempts to read Fatima\'s raw genetic report:');
const t2 = evaluateAccess({
  actor: patientKhalid,
  resource: RESOURCES.GENETIC_REPORT,
  action: ACTIONS.READ,
  target: { personId: 'fatima' },
});
console.log('Result:', !t2.allowed ? `✓ DENIED (${t2.error.code}: ${t2.error.message})` : '✗ FAILED');
assert.equal(t2.allowed, false);
assert.equal(t2.error.code, SECURITY_ERRORS.RAW_GENETIC_CROSS_ACCESS_FORBIDDEN.code);

// Step 3: Patient 2 reads their own genetic report
console.log('\nTest 3: Fatima reads Fatima\'s raw genetic report:');
const t3 = evaluateAccess({
  actor: patientFatima,
  resource: RESOURCES.GENETIC_REPORT,
  action: ACTIONS.READ,
  target: { personId: 'fatima' },
});
console.log('Result:', t3.allowed ? '✓ ALLOWED (Ownership confirmed)' : '✗ FAILED');
assert.equal(t3.allowed, true);

// Step 4: Patient 2 attempts to query Patient 1's raw report
console.log('\nTest 4: Fatima attempts to read Khalid\'s raw genetic report:');
const t4 = evaluateAccess({
  actor: patientFatima,
  resource: RESOURCES.GENETIC_REPORT,
  action: ACTIONS.READ,
  target: { personId: 'khalid' },
});
console.log('Result:', !t4.allowed ? `✓ DENIED (${t4.error.code}: ${t4.error.message})` : '✗ FAILED');
assert.equal(t4.allowed, false);
assert.equal(t4.error.code, SECURITY_ERRORS.RAW_GENETIC_CROSS_ACCESS_FORBIDDEN.code);

// Step 5: Both partners view authorized combined couple assessment
console.log('\nTest 5: Khalid & Fatima access authorized combined couple assessment:');
const assessment = authorizedEvaluateCoupleAssessment({
  actor: patientKhalid,
  couple: activeCouple,
  partnerAReport: { validation_status: 'verified' },
  partnerBReport: { validation_status: 'verified' },
  consents: liveConsents,
  engineAssessFn: assess,
});
console.log('Combined Assessment Generated:', assessment.label, '| Risk:', assessment.risk, '| Tier:', assessment.tier);

const t5a = evaluateAccess({
  actor: patientKhalid,
  resource: RESOURCES.COUPLE_ASSESSMENT,
  action: ACTIONS.READ,
  target: { coupleId: activeCouple.id, couple: activeCouple },
  context: { couples: [activeCouple], consents: liveConsents },
});
const t5b = evaluateAccess({
  actor: patientFatima,
  resource: RESOURCES.COUPLE_ASSESSMENT,
  action: ACTIONS.READ,
  target: { coupleId: activeCouple.id, couple: activeCouple },
  context: { couples: [activeCouple], consents: liveConsents },
});
console.log('Khalid Access Result:', t5a.allowed ? '✓ ALLOWED' : '✗ FAILED');
console.log('Fatima Access Result:', t5b.allowed ? '✓ ALLOWED' : '✗ FAILED');
assert.equal(t5a.allowed, true);
assert.equal(t5b.allowed, true);

// Step 6: Assigned Counsellor access
console.log('\nTest 6: Dr. Mariam opens assigned case (case_khalid_fatima):');
const t6 = evaluateAccess({
  actor: counsellorMariam,
  resource: RESOURCES.CLINICAL_CASE,
  action: ACTIONS.READ,
  target: { id: 'case_khalid_fatima', caseId: 'case_khalid_fatima' },
  context: { assignments: caseAssignments },
});
console.log('Result:', t6.allowed ? '✓ ALLOWED (Assigned clinical care)' : '✗ FAILED');
assert.equal(t6.allowed, true);

// Step 7: Assigned Counsellor attempts unassigned case
console.log('\nTest 7: Dr. Mariam attempts unassigned case (case_unrelated_999):');
const t7 = evaluateAccess({
  actor: counsellorMariam,
  resource: RESOURCES.CLINICAL_CASE,
  action: ACTIONS.READ,
  target: { id: 'case_unrelated_999', caseId: 'case_unrelated_999' },
  context: { assignments: caseAssignments },
});
console.log('Result:', !t7.allowed ? `✓ DENIED (${t7.error.code}: ${t7.error.message})` : '✗ FAILED');
assert.equal(t7.allowed, false);
assert.equal(t7.error.code, SECURITY_ERRORS.UNASSIGNED_COUNSELLOR.code);

// Step 8: Fatima revokes her sharing consent
console.log('\nTest 8: Fatima revokes her consent -> Immediate access block:');
const revokedConsents = liveConsents.map((c) =>
  c.person_id === 'fatima' && c.purpose === CONSENT_PURPOSES.SHARE_COMBINED_ASSESSMENT
    ? { ...c, status: 'revoked', revoked_at: new Date().toISOString() }
    : c
);

const t8 = evaluateAccess({
  actor: patientKhalid,
  resource: RESOURCES.COUPLE_ASSESSMENT,
  action: ACTIONS.READ,
  target: { coupleId: activeCouple.id, couple: activeCouple },
  context: { couples: [activeCouple], consents: revokedConsents },
});
console.log('Result:', !t8.allowed ? `✓ DENIED (${t8.error.code}: ${t8.error.message})` : '✗ FAILED');
assert.equal(t8.allowed, false);
assert.equal(t8.error.code, SECURITY_ERRORS.REVOKED_CONSENT.code);

console.log('\n================================================================');
console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY (2 Patients + 1 Counsellor)');
console.log('================================================================');


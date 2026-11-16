import test from 'node:test';
import assert from 'node:assert/strict';
import { get, set, signOut } from '../web/src/app/shared/store.js';
import { confirmAppointment, book, declineAppointment, addReferral, approvePlan } from '../web/src/app/shared/db.js';
import { getCoupleCarePlan } from '../web/src/app/shared/carePlanService.js';

test('Consultation Flow: Couple booking, Counsellor confirmation, and Dashboard synchronization', async (t) => {
  await t.test('1. Initial pending appointment for c1 exists in store', () => {
    const s = get();
    const appts = s.scheduleAppointments || [];
    const c1Appt = appts.find((a) => a.cid === 'c1');
    assert.ok(c1Appt, 'c1 appointment exists');
  });

  await t.test('2. Counsellor accepts and confirms appointment', () => {
    confirmAppointment('appt_c1');
    const s = get();
    const confirmedAppt = (s.scheduleAppointments || []).find((a) => a.cid === 'c1');
    assert.ok(confirmedAppt, 'Confirmed appt found');
    assert.equal(confirmedAppt.confirmed, true, 'Confirmed flag must be true');
    assert.equal(confirmedAppt.status, 'confirmed', 'Status must be confirmed');
    assert.equal(confirmedAppt.priority, 'upcoming', 'Priority must be upcoming');
    assert.equal(confirmedAppt.tone, 'green', 'Tone must be green');
    assert.ok(s.appointments.c1, 'Appointment slot time is mapped');
  });

  await t.test('3. Switching account / signOut preserves confirmed appointment state', () => {
    // Simulate user signing out / switching accounts
    signOut();
    const s = get();
    assert.equal(s.session, null, 'Session is signed out');
    
    // Confirmed appointment must NOT be wiped out
    const c1Appt = (s.scheduleAppointments || []).find((a) => a.cid === 'c1');
    assert.ok(c1Appt, 'c1 appointment still exists after signOut');
    assert.equal(c1Appt.confirmed, true, 'c1 appointment remains confirmed after signOut');
    assert.equal(c1Appt.status, 'confirmed', 'c1 appointment status remains confirmed');
  });

  await t.test('4. Couple dashboard resolves confirmed appointment over pending placeholders', () => {
    const s = get();
    const coupleAppts = (s.scheduleAppointments || []).filter((a) => a.cid === 'c1');
    const activeAppt = coupleAppts.find((a) => a.confirmed === true || a.status === 'confirmed' || a.priority === 'upcoming') || coupleAppts[0];
    assert.ok(activeAppt, 'Active appointment resolved');
    assert.equal(activeAppt.confirmed, true, 'Couple dashboard displays confirmed appointment');
    assert.notEqual(activeAppt.priority, 'pending', 'Active appointment is not pending');
  });

  await t.test('5. Counsellor issues clinical referral and it synchronizes immediately with couple care plan tracker', () => {
    const reasonText = 'Beta-thalassaemia carrier pair. Recommending PGT-M embryo testing protocol.';
    addReferral('c1', 'IVF / PGT-M', 'high', reasonText);
    const s = get();

    // Verify referral record in store
    const c1Refs = s.referrals.c1 || [];
    assert.ok(c1Refs.length > 0, 'Referral is logged in s.referrals');
    const latestRef = c1Refs[0];
    assert.equal(latestRef.destination, 'IVF / PGT-M');
    assert.equal(latestRef.priority, 'high');
    assert.equal(latestRef.reason, reasonText);
    assert.equal(latestRef.facility, 'Cleveland Clinic Abu Dhabi · Fertility Center');
    assert.equal(latestRef.status, 'dispatched');
    assert.match(latestRef.id, /^REF-\d{4}-C1-\d+/);

    // Verify care plan synchronization
    const carePlan = s.carePlans?.c1 || getCoupleCarePlan('c1');
    assert.ok(carePlan, 'Care plan exists for c1');
    assert.ok(carePlan.referrals?.some((r) => r.id === latestRef.id), 'Care plan contains the newly created referral');
    assert.ok(carePlan.completedItems?.includes('follow_up_referrals'), 'Care plan marks follow_up_referrals completed');
    assert.equal(carePlan.counsellingCompleted, true, 'Care plan marks counsellingCompleted true');
    assert.ok((carePlan.activeStageId || 1) >= 4, 'Care plan advances to at least Stage 4 (Family Planning)');

    // Verify notification dispatched to couple
    const notifs = s.notifications || [];
    const refNotif = notifs.find((n) => n.type === 'REFERRAL_ISSUED' && (n.userId === 'fatima' || n.userId === 'khalid'));
    assert.ok(refNotif, 'Referral notification sent to couple');
    assert.equal(refNotif.link, '/app/plan');
  });

  await t.test('6. Counsellor approves care plan protocol in CaseView and advances Stage 3 sign-off', () => {
    approvePlan('c1');
    const s = get();
    assert.ok(s.approved.includes('c1'), 'c1 is marked approved by counsellor');

    const carePlan = s.carePlans?.c1 || getCoupleCarePlan('c1');
    assert.ok(carePlan.completedItems?.includes('approved_care_plan'), 'approved_care_plan milestone completed');
    assert.equal(carePlan.counsellingCompleted, true);
  });
});

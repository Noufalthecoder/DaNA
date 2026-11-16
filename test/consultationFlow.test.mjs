import test from 'node:test';
import assert from 'node:assert/strict';
import { get, set, signOut } from '../web/src/app/shared/store.js';
import { confirmAppointment, book, declineAppointment } from '../web/src/app/shared/db.js';

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
});

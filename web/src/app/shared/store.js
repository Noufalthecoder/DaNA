/*
  Tiny demo store, saved in the browser so the demo survives a refresh.
  Every action is written to the audit log the DoH team sees.
  Owner: Platform. Swap for a real API later without changing the pages.
*/
import { useSyncExternalStore, useRef, useCallback } from 'react';
import { getSyntheticIntake, INITIAL_SCHEDULE } from './data.js';
import { resetAllScreening } from './screeningPersistence.js';

export const EMPTY_OBJ = Object.freeze({});
export const EMPTY_ARR = Object.freeze([]);

const KEY = 'dana-demo-v2';
const initial = {
  session: null,
  alertsSent: [],
  consents: { sharePartner: true, shareCounsellor: true, faithCards: true },
  notes: {},
  approved: [],
  plans: {},          // couple id -> chosen plan
  appointments: {
    c1: 'Tue 10 Nov · 13:30',
    c2: 'Thu 5 Nov · 09:00',
    c3: 'Thu 5 Nov · 15:30',
    c4: 'Thu 5 Nov · 11:30',
    c5: 'Thu 5 Nov · 14:00',
    c6: 'Thu 12 Nov · 10:00',
  },   // couple id -> booked slot label
  scheduleAppointments: [
    {
      id: 'appt_c1',
      date: '2026-11-10',
      time: '13:30',
      endTime: '14:15',
      who: 'Khalid & Fatima',
      what: 'Pre-marital counselling',
      priority: 'pending',
      status: 'pending',
      confirmed: false,
      requestedAt: '2026-11-14T09:00:00Z',
      tone: 'amber',
      doctor: 'Dr. Mariam Al Hosani',
      mode: 'online',
      type: 'Video',
      provider: 'Google Meet',
      meetLink: 'https://meet.google.com/dan-c1-0224',
      language: 'Arabic',
      cid: 'c1',
      notes: 'Pre-marital carrier compatibility consultation booked via portal.'
    },
    ...INITIAL_SCHEDULE,
  ],
  faith: {},
  audit: [],
  family: {},          // person id -> their family_members rows
  screeningIntakes: {},
  partnerShares: null, // live mode: can I see my partner's result?
  stats: null,         // live mode: DoH totals from the database
  dbError: null,
  reports: {},        // person id -> validated report (live)
  cases: {},          // couple id -> { id, tier, counsellor } (live)
  referrals: {},      // couple id -> [referral]
  invites: [],
  slots: [],          // live: free slots of my counsellor [{ id, label, counsellor }]
  apptIds: {},        // couple id -> booked appointment id
  tiers: null,        // DoH: couples per tier (small groups hidden)
  breakdown: null,    // DoH: couples per condition (small groups hidden)
  connections: [
    {
      id: 'conn_demo_khalid_fatima',
      userA: 'fatima',
      userB: 'khalid',
      status: 'ACTIVE',
      connectedAt: '2026-10-12T09:00:00Z',
    },
  ],
  connectionRequests: [
    {
      id: 'req_demo_ahmed_khalid',
      senderId: 'ahmed',
      receiverId: 'khalid',
      status: 'PENDING',
      note: 'Salam Khalid, connecting regarding our premarital screenings.',
      createdAt: '2026-11-01T14:30:00Z',
    },
    {
      id: 'req_demo_khalid_saeed',
      senderId: 'khalid',
      receiverId: 'saeed',
      status: 'PENDING',
      note: 'Salam Saeed, let us connect on DaNA.',
      createdAt: '2026-11-02T10:15:00Z',
    },
  ],
  connectionConsents: [
    {
      id: 'cst_demo_khalid_fatima',
      connectionId: 'conn_demo_khalid_fatima',
      granterId: 'khalid',
      granteeId: 'fatima',
      purpose: 'Premarital couple compatibility review',
      dataScope: 'CARRIER_GENE',
      status: 'ACTIVE',
      grantedAt: '2026-10-12T09:05:00Z',
    },
  ],
  blockedUsers: [],
  notifications: [
    {
      id: 'notif_consult_appt_c1',
      requestId: 'appt_c1',
      userId: 'mariam',
      actorId: 'c1',
      type: 'CONSULTATION_REQUEST',
      title: 'New Consultation Request',
      body: 'Khalid & Fatima requested an Online Video consultation for 10 Nov at 13:30 GST.',
      link: '/app/schedule?review=appt_c1',
      isRead: false,
      createdAt: '2026-11-14T09:00:00Z',
    },
    {
      id: 'notif_consult_appt_4',
      requestId: 'appt_4',
      userId: 'mariam',
      actorId: 'c5',
      type: 'CONSULTATION_REQUEST',
      title: 'New Consultation Request',
      body: 'Rashid & Aisha requested an Online Video consultation for 5 Nov at 14:00 GST.',
      link: '/app/schedule?review=appt_4',
      isRead: false,
      createdAt: '2026-11-04T16:30:00Z',
    },
    {
      id: 'notif_welcome',
      userId: 'khalid',
      actorId: 'ahmed',
      type: 'CONNECTION_REQUEST',
      title: 'New connection request',
      body: 'Ahmed Al Ketbi sent you a connection request.',
      link: '/app/connections?tab=requests',
      isRead: false,
      createdAt: '2026-11-01T14:30:00Z',
    },
    {
      id: 'notif_fatima',
      userId: 'khalid',
      actorId: 'fatima',
      type: 'REQUEST_ACCEPTED',
      title: 'Connection established',
      body: 'You and Fatima Al Hammadi are now connected. Combined risk assessment is available.',
      link: '/app/bonds',
      isRead: true,
      createdAt: '2026-10-12T09:00:00Z',
    },
  ],
};

let state = load();
const subs = new Set();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (saved.appointments && (saved.appointments.c1 === 'Thu 5 Nov · 10:30' || saved.appointments.c1?.includes('5 Nov'))) {
      delete saved.appointments.c1;
    }
    if (saved.scheduleAppointments) {
      saved.scheduleAppointments = saved.scheduleAppointments.filter((a) => a.id !== 'appt_2' && !(a.cid === 'c1' && a.date === '2026-11-05'));
      if (!saved.c1Cancelled && !saved.scheduleAppointments.some((a) => a.id === 'appt_c1' || a.cid === 'c1')) {
        saved.scheduleAppointments.unshift({
          id: 'appt_c1',
          date: '2026-11-10',
          time: '13:30',
          endTime: '14:15',
          who: 'Khalid & Fatima',
          what: 'Pre-marital counselling',
          priority: 'pending',
          status: 'pending',
          confirmed: false,
          requestedAt: '2026-11-14T09:00:00Z',
          tone: 'amber',
          doctor: 'Dr. Mariam Al Hosani',
          mode: 'online',
          type: 'Video',
          provider: 'Google Meet',
          meetLink: 'https://meet.google.com/dan-c1-0224',
          language: 'Arabic',
          cid: 'c1',
          notes: 'Pre-marital carrier compatibility consultation booked via portal.'
        });
      }
    }
    if (!saved.c1Cancelled && saved.appointments && !saved.appointments.c1) {
      saved.appointments = { ...saved.appointments, c1: 'Tue 10 Nov · 13:30' };
    }
    if (!saved.c1Cancelled && saved.notifications && !saved.notifications.some((n) => n.id === 'notif_consult_appt_c1' || n.requestId === 'appt_c1')) {
      saved.notifications.unshift({
        id: 'notif_consult_appt_c1',
        requestId: 'appt_c1',
        userId: 'mariam',
        actorId: 'c1',
        type: 'CONSULTATION_REQUEST',
        title: 'New Consultation Request',
        body: 'Khalid & Fatima requested an Online Video consultation for 10 Nov at 13:30 GST.',
        link: '/app/schedule?review=appt_c1',
        isRead: false,
        createdAt: '2026-11-14T09:00:00Z',
      });
    }
    if (saved.notifications && !saved.notifications.some((n) => n.id === 'notif_consult_appt_4' || n.requestId === 'appt_4')) {
      saved.notifications.unshift({
        id: 'notif_consult_appt_4',
        requestId: 'appt_4',
        userId: 'mariam',
        actorId: 'c5',
        type: 'CONSULTATION_REQUEST',
        title: 'New Consultation Request',
        body: 'Rashid & Aisha requested an Online Video consultation for 5 Nov at 14:00 GST.',
        link: '/app/schedule?review=appt_4',
        isRead: false,
        createdAt: '2026-11-04T16:30:00Z',
      });
    }
    return {
      ...initial,
      ...saved,
      appointments: saved.appointments !== undefined ? saved.appointments : initial.appointments,
      scheduleAppointments: saved.scheduleAppointments !== undefined ? saved.scheduleAppointments : initial.scheduleAppointments,
    };
  } catch {
    return { ...initial };
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode: keep in memory */
  }
}

export function set(patch, auditText) {
  const next = typeof patch === 'function' ? patch(state) : patch;
  const actor = state.session || next.session;
  state = { ...state, ...next };
  if (auditText) {
    const who = actor ? actor.name : 'System';
    state.audit = [{ t: new Date().toISOString(), who, what: auditText }, ...state.audit].slice(0, 200);
  }
  save();
  subs.forEach((f) => f());
}

export function get() {
  return state;
}

export function signOut() {
  state = {
    ...state,
    session: null,
    dbError: null,
  };
  save();
  subs.forEach((f) => f());
}

/* keep or initialize session on login */
export function startFresh(session) {
  const isUae = session?.authMethod === 'uae_pass' || session?.via === 'uaepass' || session?.email?.endsWith('@dana.demo');
  const existing = state.screeningIntakes?.[session?.id];
  let intakes = state.screeningIntakes || {};

  // If this user has not completed screening yet, pre-feed UAE PASS data with completed: false
  if (!existing?.completed) {
    if (isUae && session?.role === 'couple') {
      const syn = getSyntheticIntake(session.id);
      const isMale = syn?.personal?.gender === 'Male';
      const needsMedRefresh = existing?.medical?.conditions === 'None reported' || !existing?.medical?.conditions;

      intakes = {
        ...intakes,
        [session.id]: (existing && !needsMedRefresh) ? {
          ...existing,
          personal: {
            ...existing.personal,
            pregnancyStatus: isMale ? 'no' : (existing.personal?.pregnancyStatus || ''),
          },
          compliance: {
            ...existing.compliance,
            isPregnant: isMale ? 'no' : (existing.compliance?.isPregnant || ''),
            gestationalWeeks: isMale ? '' : (existing.compliance?.gestationalWeeks || ''),
          },
        } : {
          ...(existing || {}),
          ...syn,
          completed: false,
          mode: 'uae_pass',
          personal: {
            ...syn.personal,
            partnerName: existing?.personal?.partnerName || syn.personal?.partnerName || '',
            maritalStatus: existing?.personal?.maritalStatus || syn.personal?.maritalStatus || 'Married',
            pregnancyStatus: isMale ? 'no' : (existing?.personal?.pregnancyStatus || ''),
          },
          medical: syn.medical,
          compliance: {
            ...syn.compliance,
            isPregnant: isMale ? 'no' : (existing?.compliance?.isPregnant || ''),
            gestationalWeeks: isMale ? '' : (existing?.compliance?.gestationalWeeks || ''),
          },
        },
      };
    }
  }

  state = { ...state, session, screeningIntakes: intakes };
  save();
  subs.forEach((f) => f());
}

/* Reset demo journey data so onboarding, feeding / manual entry and results can be replayed */
export function resetDemo() {
  resetAllScreening();
  const session = state.session;
  const freshIntakes = {};

  ['khalid', 'fatima', 'ahmed', 'noura', 'saeed', 'maryam', 'rashid', 'aisha'].forEach((id) => {
    const syn = getSyntheticIntake(id);
    if (syn) {
      const isMale = syn?.personal?.gender === 'Male';
      freshIntakes[id] = {
        ...syn,
        completed: false,
        mode: 'uae_pass',
        submittedAt: null,
        personal: {
          ...syn.personal,
          partnerName: syn.personal?.partnerName || '',
          maritalStatus: syn.personal?.maritalStatus || 'Married',
          pregnancyStatus: isMale ? 'no' : '',
        },
        compliance: {
          ...syn.compliance,
          isPregnant: isMale ? 'no' : '',
          gestationalWeeks: '',
        },
        consent: {
          malaffiSync: false,
          partnerShare: false,
          counsellorAccess: false,
          anonymizedResearch: false,
        },
      };
    }
  });

  // Also reset any existing user intakes in store to completed: false
  if (state.screeningIntakes) {
    Object.keys(state.screeningIntakes).forEach((key) => {
      freshIntakes[key] = {
        ...state.screeningIntakes[key],
        completed: false,
        submittedAt: null,
      };
    });
  }

  if (session?.id && !freshIntakes[session.id]) {
    freshIntakes[session.id] = {
      completed: false,
      mode: 'manual',
      personal: { fullName: session.name || '', email: session.email || '' },
      medical: {},
      family: [],
      compliance: {},
      consent: {},
    };
  }

  state = {
    ...initial,
    session: null,
    screeningIntakes: freshIntakes,
    alertsSent: [],
    plan: null,
    plans: {},
    booked: null,
    appointments: {},
    reports: {},
    carePlans: {
      c1: {
        activeStageId: 1,
        condition: 'Beta-thalassaemia (HBB)',
        tier: 2,
        counsellor: 'Dr. Mariam Al Hosani',
        completedItems: [],
        referrals: [],
        followUp: null,
        reproductivePathway: { selected: null, approvedByCounsellor: false },
        silaStats: { relativesEligible: 5, alertsDispatched: 0, screeningsBooked: 0 },
        pregnancy: { isPregnant: false, weeks: null, edd: null, deliveryHospital: 'Danat Al Emarat Hospital for Women & Children, Abu Dhabi' },
        childbirth: { delivered: false, babyName: '', birthDate: null, newbornScreenStatus: 'pending', geneticFollowUpNeeded: true },
        customNotes: '',
      },
    },
  };
  save();
  subs.forEach((f) => f());
}

function isShallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false;
    }
    return true;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const k = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(b, k) || !Object.is(a[k], b[k])) return false;
  }
  return true;
}

export function useStore(selector = (s) => s) {
  const prevRef = useRef({ hasValue: false, value: undefined });
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const getSnapshot = useCallback(() => {
    const nextValue = selectorRef.current(state);
    if (prevRef.current.hasValue) {
      if (isShallowEqual(prevRef.current.value, nextValue)) {
        return prevRef.current.value;
      }
    }
    prevRef.current = { hasValue: true, value: nextValue };
    return nextValue;
  }, []);

  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    getSnapshot
  );
}

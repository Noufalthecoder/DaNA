/*
  Tiny demo store, saved in the browser so the demo survives a refresh.
  Every action is written to the audit log the DoH team sees.
  Owner: Platform. Swap for a real API later without changing the pages.
*/
import { useSyncExternalStore, useRef, useCallback } from 'react';

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
  appointments: {},   // couple id -> booked slot label
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
    return { ...initial, ...saved };
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
    ...initial,
    session: null,
    screeningIntakes: {},
    alertsSent: [],
    plan: null,
    booked: null,
    plans: {},
    appointments: {},
    notes: {},
    approved: [],
    faith: {},
    consents: { sharePartner: true, shareCounsellor: true, faithCards: true },
    audit: state.audit || [],
  };
  save();
  subs.forEach((f) => f());
}

/* wipe saved demo data but keep (or replace) the session: used when a real login starts */
export function startFresh(session) {
  state = { ...initial, session, screeningIntakes: {} };
  save();
  subs.forEach((f) => f());
}

export function resetDemo() {
  const session = state.session;
  state = { ...initial, session, screeningIntakes: {} };
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

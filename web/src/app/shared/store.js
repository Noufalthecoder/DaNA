/*
  Tiny demo store, saved in the browser so the demo survives a refresh.
  Every action is written to the audit log the DoH team sees.
  Owner: Platform. Swap for a real API later without changing the pages.
*/
import { useSyncExternalStore } from 'react';
import { getSyntheticIntake } from './data.js';

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
  screeningIntakes: {},
  partnerShares: null, // live mode: can I see my partner's result?
  family: {},          // person id -> their family_members rows
  stats: null,         // live mode: DoH totals from the database
  dbError: null,
  reports: {},        // person id -> validated report (live)
  cases: {},          // couple id -> { id, tier, counsellor } (live)
  referrals: {},      // couple id -> [referral]
  invites: [],
  slots: [],          // live: free slots of my counsellor [{ id, label, counsellor }]
  apptIds: {},        // couple id -> booked appointment id        // Sila links created this session: [{ label, token }]
  tiers: null,        // DoH: couples per tier (small groups hidden)
  breakdown: null,    // DoH: couples per condition (small groups hidden)
};

let state = load();
const subs = new Set();

function load() {
  try { return { ...initial, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...initial }; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode: keep in memory */ }
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

export function get() { return state; }

export function signOut() {
  state = {
    ...state,
    session: null,
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
            maritalStatus: existing?.personal?.maritalStatus || syn.personal?.maritalStatus || '',
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
  const session = state.session;
  const isUae = session?.authMethod === 'uae_pass' || session?.via === 'uaepass' || session?.email?.endsWith('@dana.demo');
  const syn = session?.id ? getSyntheticIntake(session.id) : null;
  const isMale = syn?.personal?.gender === 'Male';

  const freshIntake = (isUae && session?.role === 'couple' && syn)
    ? {
        [session.id]: {
          ...syn,
          completed: false,
          mode: 'uae_pass',
          personal: {
            ...syn.personal,
            partnerName: syn.personal?.partnerName || '',
            maritalStatus: syn.personal?.maritalStatus || '',
            pregnancyStatus: isMale ? 'no' : '',
          },
          compliance: {
            ...syn.compliance,
            isPregnant: isMale ? 'no' : '',
            gestationalWeeks: '',
          },
        },
      }
    : (session?.id ? { [session.id]: { completed: false, mode: 'manual' } } : {});

  state = {
    ...initial,
    session: null,
    screeningIntakes: freshIntake,
    alertsSent: [],
    plan: null,
    plans: {},
    booked: null,
    appointments: {},
  };
  save();
  subs.forEach((f) => f());
}

export function useStore(selector = (s) => s) {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => selector(state));
}

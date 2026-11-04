/*
  Tiny demo store, saved in the browser so the demo survives a refresh.
  Every action is written to the audit log the DoH team sees.
  Owner: Platform. Swap for a real API later without changing the pages.
*/
import { useSyncExternalStore } from 'react';

const KEY = 'dana-demo-v1';
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
  stats: null,         // live mode: DoH totals from the database
  dbError: null,
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

/* wipe saved demo data but keep (or replace) the session: used when a real login starts */
export function startFresh(session) {
  state = { ...initial, session };
  save();
  subs.forEach((f) => f());
}

export function resetDemo() {
  const session = state.session;
  state = { ...initial, session };
  save();
  subs.forEach((f) => f());
}

export function useStore(selector = (s) => s) {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => selector(state));
}

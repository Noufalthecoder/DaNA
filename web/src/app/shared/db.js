/*
  Data layer. Owner: Platform.
  Every screen saves through these functions. When the user is signed in to
  Supabase, actions are written to the database (and its audit log) and shared
  with the other roles; otherwise they stay in this browser (offline demo).
*/
import { supabase } from './supabase.js';
import { get, set } from './store.js';
import { SLOTS, PEOPLE, COUPLES, relativesFor } from './data.js';
import { fromDb, toDb } from './family.js';

export const isLive = () => !!(supabase && get().session?.backend);

const CONSENT_KIND = { sharePartner: 'share_partner', shareCounsellor: 'share_counsellor', faithCards: 'faith_cards' };
const CONSENT_KEY = Object.fromEntries(Object.entries(CONSENT_KIND).map(([k, v]) => [v, k]));

export const slotLabel = (iso) => {
  const s = SLOTS.find((x) => Date.parse(x.iso) === Date.parse(iso));
  return s ? s.label : new Date(iso).toLocaleString();
};

/* write one audit entry to the database (live) */
export async function logAudit(action) {
  if (!isLive()) return;
  const { error } = await supabase.from('audit_log').insert({ actor_name: get().session.name, action });
  if (error) console.error('audit', error.message);
}

/* run an action: update the screen at once, then save it (live) or log it locally (demo) */
async function act(patch, text, remote) {
  if (!isLive()) { set(patch, text); return; }
  set(patch);
  try {
    const { error } = await remote();
    if (error) throw error;
    await logAudit(text);
  } catch (e) {
    console.error(e);
    set({ dbError: `Couldn’t save: ${e.message}` });
  }
  await loadAll();
}

/* ---------- actions (called by the screens) ---------- */

export function choosePlan(coupleId, choice) {
  const s = get();
  return act({ plans: { ...s.plans, [coupleId]: choice }, approved: s.approved.filter((c) => c !== coupleId) },
    `Couple chose a plan: ${choice}`,
    () => supabase.from('plans').upsert({ couple_id: coupleId, choice, chosen_by: s.session.id, chosen_at: new Date().toISOString(), approved_by: null, approved_at: null }));
}

export function sendAlerts(ids) {
  const s = get();
  const fresh = ids.filter((id) => !s.alertsSent.includes(id));
  if (!fresh.length) return Promise.resolve();
  const labels = relativesFor(s.session.id).filter((r) => fresh.includes(r.id)).map((r) => r.label);
  return act({ alertsSent: [...s.alertsSent, ...fresh] },
    `Sent ${fresh.length} anonymous Sila alert${fresh.length > 1 ? 's' : ''}`,
    () => supabase.from('sila_alerts').insert(labels.map((relationship) => ({ sender: s.session.id, relationship }))));
}

/* Family tree. Audit lines never include a relative's name: DoH can read them. */
const familyOf = (s, ownerId) => s.family?.[ownerId] || [];
const familyPatch = (s, ownerId, rows) => ({ family: { ...s.family, [ownerId]: rows } });

export function addRelative(ownerId, added, changed) {
  const s = get();
  const rows = [...changed, added];
  const ids = new Set(rows.map((r) => r.id));
  return act(familyPatch(s, ownerId, [...familyOf(s, ownerId).filter((r) => !ids.has(r.id)), ...rows]),
    'Added a relative to the family tree',
    () => supabase.from('family_members').upsert(rows.map((r) => toDb(r, ownerId))));
}

export function renameRelative(ownerId, id, name) {
  const s = get();
  return act(familyPatch(s, ownerId, familyOf(s, ownerId).map((r) => (r.id === id ? { ...r, name } : r))),
    'Edited a relative in the family tree',
    () => supabase.from('family_members').update({ display_name: name }).eq('id', id));
}

export function removeRelative(ownerId, id) {
  const s = get();
  const isChild = (r) => r.father_id === id || r.mother_id === id;
  const unlink = (r) => ({ ...r, father_id: r.father_id === id ? null : r.father_id, mother_id: r.mother_id === id ? null : r.mother_id });
  const rest = familyOf(s, ownerId).filter((r) => r.id !== id);
  const children = rest.filter(isChild).map(unlink);
  return act(familyPatch(s, ownerId, rest.map(unlink)), 'Removed a relative from the family tree',
    async () => {
      // parent_ids is an array, so the database can't clear these links for us
      if (children.length) {
        const { error } = await supabase.from('family_members').upsert(children.map((r) => toDb(r, ownerId)));
        if (error) return { error };
      }
      return supabase.from('family_members').delete().eq('id', id);
    });
}

export function setConsent(key, value) {
  const s = get();
  return act({ consents: { ...s.consents, [key]: value } },
    `Consent ${value ? 'given' : 'withdrawn'}: ${key}`,
    () => supabase.from('consents').upsert({ person_id: s.session.id, kind: CONSENT_KIND[key], granted: value, updated_at: new Date().toISOString() }));
}

export function book(coupleId, label) {
  const s = get();
  const slot = SLOTS.find((x) => x.label === label);
  return act({ appointments: { ...s.appointments, [coupleId]: label } },
    `Couple booked a counsellor session: ${label}`,
    () => supabase.from('appointments').insert({ couple_id: coupleId, starts_at: slot.iso }));
}

export function cancelBooking(coupleId) {
  const s = get();
  const rest = { ...s.appointments };
  delete rest[coupleId];
  return act({ appointments: rest }, 'Couple cancelled the counsellor session',
    () => supabase.from('appointments').update({ status: 'cancelled' }).eq('couple_id', coupleId).eq('status', 'booked'));
}

export function addNote(coupleId, text) {
  const s = get();
  const list = [{ t: new Date().toISOString(), text }, ...(s.notes[coupleId] || [])];
  return act({ notes: { ...s.notes, [coupleId]: list } }, `Counsellor added a note to ${coupleId.toUpperCase()}`,
    () => supabase.from('notes').insert({ couple_id: coupleId, body: text }));
}

export function approvePlan(coupleId) {
  const s = get();
  return act({ approved: [...s.approved, coupleId] }, `Counsellor approved the plan for ${coupleId.toUpperCase()}`,
    async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return supabase.from('plans').update({ approved_by: user.id, approved_at: new Date().toISOString() }).eq('couple_id', coupleId);
    });
}

export function decideCard(card, status) {
  const s = get();
  return act({ faith: { ...s.faith, [card.id]: status } }, `Faith card ${status}: “${card.title}”`,
    () => supabase.from('content_cards').update({ status, updated_at: new Date().toISOString() }).eq('id', card.id));
}

/* ---------- people and couples stored only in the database (e.g. sample journeys) ---------- */
export async function hydratePeople() {
  const [p, c, r] = await Promise.all([
    supabase.from('people').select('id, name, short_name, sex'),
    supabase.from('couples').select('*'),
    supabase.from('results').select('person_id, gene'),
  ]);
  const gene = Object.fromEntries((r.data || []).map((x) => [x.person_id, x.gene]));
  (p.data || []).forEach((x) => {
    if (!PEOPLE[x.id]) PEOPLE[x.id] = { name: x.name, short: x.short_name, sex: x.sex, carrier: gene[x.id] ?? null };
  });
  (c.data || []).forEach((x) => {
    if (!COUPLES.find((k) => k.id === x.id)) {
      COUPLES.push({ id: x.id, a: x.partner_a, b: x.partner_b, stage: x.stage === 'married' ? 'Married' : 'Engaged', pregnantWeeks: x.pregnant_weeks, screened: x.screened_on });
    }
  });
}

/* ---------- load everything this login may see (privacy rules decide) ---------- */

let loading = null;
export function loadAll() {
  if (!isLive()) return Promise.resolve();
  if (!loading) loading = doLoad().catch((e) => { console.error(e); set({ dbError: e.message }); }).finally(() => { loading = null; });
  return loading;
}

async function doLoad() {
  await hydratePeople();
  const s = get().session;
  const patch = { dbError: null };

  const [plans, appts, cards, audit] = await Promise.all([
    supabase.from('plans').select('couple_id, choice, approved_at'),
    supabase.from('appointments').select('couple_id, starts_at').eq('status', 'booked').order('starts_at'),
    supabase.from('content_cards').select('id, status'),
    supabase.from('audit_log').select('at, actor_name, action').order('at', { ascending: false }).limit(200),
  ]);
  patch.plans = Object.fromEntries((plans.data || []).map((p) => [p.couple_id, p.choice]));
  patch.approved = (plans.data || []).filter((p) => p.approved_at).map((p) => p.couple_id);
  patch.appointments = Object.fromEntries((appts.data || []).map((a) => [a.couple_id, slotLabel(a.starts_at)]));
  patch.faith = Object.fromEntries((cards.data || []).map((c) => [c.id, c.status]));
  patch.audit = (audit.data || []).map((a) => ({ t: a.at, who: a.actor_name, what: a.action }));

  if (s.role === 'couple' && s.couple) {
    const [alerts, cons, family] = await Promise.all([
      supabase.from('sila_alerts').select('relationship'),
      supabase.from('consents').select('kind, granted').eq('person_id', s.id),
      supabase.from('family_members')
        .select('id, display_name, relationship, gender, parent_ids, created_at')
        .eq('owner_id', s.id).order('created_at').order('id'), // rows saved together share a timestamp
    ]);
    const sent = new Set((alerts.data || []).map((a) => a.relationship));
    patch.alertsSent = relativesFor(s.id).filter((r) => sent.has(r.label)).map((r) => r.id);
    patch.consents = { ...get().consents };
    (cons.data || []).forEach((c) => { patch.consents[CONSENT_KEY[c.kind]] = c.granted; });
    patch.family = { [s.id]: fromDb(family.data || [], s.id) };
  }
  if (s.role === 'counsellor') {
    const { data } = await supabase.from('notes').select('couple_id, body, created_at').order('created_at', { ascending: false });
    patch.notes = {};
    (data || []).forEach((n) => { (patch.notes[n.couple_id] ||= []).push({ t: n.created_at, text: n.body }); });
  }
  if (s.role === 'admin') {
    const { data } = await supabase.rpc('programme_stats');
    patch.stats = data && data[0] ? data[0] : null;
  }
  set(patch);
}

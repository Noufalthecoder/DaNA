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
import { api } from './api.js';

export const isLive = () => !!(supabase && get().session?.backend);

const CONSENT_KIND = { sharePartner: 'share_partner', shareCounsellor: 'share_counsellor', faithCards: 'faith_cards' };
const CONSENT_KEY = Object.fromEntries(Object.entries(CONSENT_KIND).map(([k, v]) => [v, k]));

/* "Sun 9 Nov · 10:00" in Gulf time */
export const gulfLabel = (iso) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.weekday} ${p.day} ${p.month} · ${p.hour}:${p.minute}`;
};
export const slotLabel = (iso) => {
  const s = SLOTS.find((x) => Date.parse(x.iso) === Date.parse(iso));
  return s ? s.label : gulfLabel(iso);
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
  // live: each relative gets a one-time token; only its hash is stored, and it expires in 14 days
  return act({ alertsSent: [...s.alertsSent, ...fresh] },
    `Sent ${fresh.length} anonymous Sila alert${fresh.length > 1 ? 's' : ''}`,
    async () => {
      const links = [];
      for (const label of labels) {
        const { data, error } = await supabase.rpc('create_sila_invitation', { rel: label });
        if (error) return { error };
        links.push({ label, token: data });
      }
      set({ invites: [...get().invites, ...links] });
      return { error: null };
    });
}

export function approveNote(coupleId, noteId) {
  const s = get();
  const list = (s.notes[coupleId] || []).map((n) => (n.id === noteId ? { ...n, approved: true } : n));
  return act({ notes: { ...s.notes, [coupleId]: list } }, `Counsellor approved a note on ${coupleId.toUpperCase()}`,
    async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return supabase.from('notes').update({ approved_by: user.id, approved_at: new Date().toISOString() }).eq('id', noteId);
    });
}

export function addReferral(coupleId, destination, priority, reason) {
  const s = get();
  const item = { destination, priority, reason, status: 'sent', t: new Date().toISOString() };
  return act({ referrals: { ...s.referrals, [coupleId]: [item, ...(s.referrals[coupleId] || [])] } },
    `Counsellor referred ${coupleId.toUpperCase()} to ${destination}`,
    () => supabase.from('referrals').insert({ case_id: s.cases[coupleId]?.id, destination, priority, reason }));
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

/* slot = { id (live: counsellor_availability id), label } */
export function book(coupleId, slot) {
  const s = get();
  return act({ appointments: { ...s.appointments, [coupleId]: slot.label } },
    `Couple booked a counsellor session: ${slot.label}`,
    async () => {
      const { error } = await supabase.rpc('book_slot', { p_slot: slot.id });
      return { error };
    });
}

export function completeAppointment(coupleId) {
  const s = get();
  const rest = { ...s.appointments };
  delete rest[coupleId];
  return act({ appointments: rest }, `Counsellor completed the session with ${coupleId.toUpperCase()}`,
    () => supabase.rpc('complete_appointment', { p_appt: s.apptIds[coupleId] }));
}

export function cancelBooking(coupleId) {
  const s = get();
  const rest = { ...s.appointments };
  delete rest[coupleId];
  return act({ appointments: rest }, 'Couple cancelled the counsellor session',
    () => supabase.rpc('cancel_appointment', { p_appt: s.apptIds[coupleId] }));
}

export function addNote(coupleId, text) {
  const s = get();
  const list = [{ id: `local-${Date.now()}`, t: new Date().toISOString(), text, approved: false }, ...(s.notes[coupleId] || [])];
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
    else if (x.id in gene) PEOPLE[x.id].carrier = gene[x.id]; // a fresh Malaffi result replaces the old one
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

  const [plans, appts, cards, audit, reps, cases] = await Promise.all([
    supabase.from('plans').select('couple_id, choice, approved_at'),
    supabase.from('appointments').select('id, couple_id, starts_at').eq('status', 'booked').order('starts_at'),
    supabase.from('content_cards').select('id, status'),
    supabase.from('audit_log').select('at, actor_name, action').order('at', { ascending: false }).limit(200),
    supabase.from('genetic_reports').select('person_id, report_id, laboratory_name, accreditation_id, panel_coverage, limitations, report_date, validation_status, genetic_variants(gene_symbol, hgvs_c, hgvs_p, zygosity, clinical_significance, significance_source)'),
    supabase.from('clinical_cases').select('id, couple_id, triage_tier, case_assignments(counsellors(name))'),
  ]);
  patch.reports = Object.fromEntries((reps.data || []).map((r) => [r.person_id, {
    id: r.report_id, lab: r.laboratory_name, accreditation: r.accreditation_id, panel: r.panel_coverage, limitations: r.limitations,
    date: r.report_date, verified: r.validation_status === 'verified',
    variants: (r.genetic_variants || []).map((v) => ({ gene: v.gene_symbol, hgvs_c: v.hgvs_c, hgvs_p: v.hgvs_p, zygosity: v.zygosity, significance: v.clinical_significance, source: v.significance_source })),
  }]));
  patch.cases = Object.fromEntries((cases.data || []).map((c) => [c.couple_id, {
    id: c.id, tier: c.triage_tier, counsellor: c.case_assignments?.[0]?.counsellors?.name || null,
  }]));
  patch.plans = Object.fromEntries((plans.data || []).map((p) => [p.couple_id, p.choice]));
  patch.approved = (plans.data || []).filter((p) => p.approved_at).map((p) => p.couple_id);
  patch.appointments = Object.fromEntries((appts.data || []).map((a) => [a.couple_id, slotLabel(a.starts_at)]));
  patch.apptIds = Object.fromEntries((appts.data || []).map((a) => [a.couple_id, a.id]));
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
    // free slots of my assigned counsellor (emergency slots only for Tier 1)
    const mine = patch.cases[s.couple];
    const { data: free } = await supabase.from('counsellor_availability')
      .select('id, slot_start, is_emergency_buffer, counsellors(name)')
      .eq('is_booked', false).gt('slot_start', new Date().toISOString()).order('slot_start').limit(80);
    patch.slots = (free || [])
      .filter((x) => (!mine?.counsellor || x.counsellors?.name === mine.counsellor) && (!x.is_emergency_buffer || mine?.tier === 1))
      .slice(0, 6)
      .map((x) => ({ id: x.id, label: gulfLabel(x.slot_start), counsellor: x.counsellors?.name }));
  }
  if (s.role === 'counsellor') {
    const [{ data }, refs] = await Promise.all([
      supabase.from('notes').select('id, couple_id, body, created_at, approved_at').order('created_at', { ascending: false }),
      supabase.from('referrals').select('destination, priority, reason, status, created_at, clinical_cases(couple_id)').order('created_at', { ascending: false }),
    ]);
    patch.notes = {};
    (data || []).forEach((n) => { (patch.notes[n.couple_id] ||= []).push({ id: n.id, t: n.created_at, text: n.body, approved: !!n.approved_at }); });
    patch.referrals = {};
    (refs.data || []).forEach((r) => { const cid = r.clinical_cases?.couple_id; if (cid) (patch.referrals[cid] ||= []).push({ destination: r.destination, priority: r.priority, reason: r.reason, status: r.status, t: r.created_at }); });
  }
  if (s.role === 'admin') {
    const [st, tiers, br] = await Promise.all([supabase.rpc('programme_stats'), supabase.rpc('programme_tiers'), supabase.rpc('programme_breakdown')]);
    patch.stats = st.data && st.data[0] ? st.data[0] : null;
    patch.tiers = tiers.data || null;
    patch.breakdown = br.data || null;
  }
  set(patch);
}

/* Profile menu: change my display name (live: saved to my account). */
export async function setDisplayName(name) {
  const clean = (name || '').trim().slice(0, 80);
  if (clean.length < 2) throw new Error('Use at least 2 characters.');
  if (isLive()) {
    const { error } = await supabase.rpc('set_display_name', { new_name: clean });
    if (error) throw new Error(error.message);
  }
  set({ session: { ...get().session, name: clean } }, 'Changed display name');
  return clean;
}

/* Profile picture: an icon from AVATARS (null = initials). */
export async function setAvatar(icon) {
  if (isLive()) {
    const { error } = await supabase.rpc('set_avatar', { new_avatar: icon });
    if (error) throw new Error(error.message);
  }
  set({ session: { ...get().session, avatar: icon } }, 'Changed profile picture');
}

/* ---------- onboarding (009_onboarding.sql + the API) ---------- */
const rpc = async (fn, args) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
};

/* step 1: my own health profile (sex is needed to interpret X-linked results) */
export async function startMyProfile(sex) {
  const old = get().session?.id;
  const pid = await rpc('start_my_profile', { p_sex: sex });
  // the screening intake was saved under the login id before the profile existed: move it across
  const intakes = get().screeningIntakes || {};
  if (old && old !== pid && intakes[old]) set({ screeningIntakes: { ...intakes, [pid]: intakes[old] } });
  return pid;
}

/* step 3: fetch my lab report from Malaffi (validated and saved by the API) */
export async function fetchMalaffi() {
  const r = await api('/ingest/malaffi', { method: 'POST' });
  await loadAll();
  return r;
}

export const createPartnerInvite = () => rpc('create_partner_invite');
export const acceptPartnerInvite = (code) => rpc('accept_partner_invite', { p_code: code });
export const startSampleJourney = () => rpc('start_sample_journey');

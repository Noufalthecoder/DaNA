/*
  Location scope: clinics, slots, couple home area, admin areas.
  Everything goes through the 030_location_scope.sql functions, so the rules
  (who may change what, which slots a couple may see) are enforced in the
  database, not here.
*/
import { supabase } from './supabase.js';
import { isLive } from './db.js';
import { get } from './store.js';

/* offline demo only: the same emirates as the database, with a few areas each */
export const DEMO_LOCATIONS = [
  { id: 100, city: 'Abu Dhabi', state_name: 'Abu Dhabi' },
  { id: 101, city: 'Al Ain', state_name: 'Abu Dhabi' },
  { id: 1, city: 'Downtown Dubai', state_name: 'Dubai' },
  { id: 2, city: 'Dubai Marina', state_name: 'Dubai' },
  { id: 3, city: 'Jumeirah', state_name: 'Dubai' },
  { id: 102, city: 'Sharjah', state_name: 'Sharjah' },
  { id: 103, city: 'Ajman', state_name: 'Ajman' },
  { id: 104, city: 'Ras Al Khaimah', state_name: 'Ras Al Khaimah' },
  { id: 105, city: 'Fujairah', state_name: 'Fujairah' },
  { id: 106, city: 'Umm Al Quwain', state_name: 'Umm Al Quwain' },
];

let cache = null;

/* every UAE location, grouped by emirate: [{ emirate, items: [{id, city}] }] */
export async function loadLocations() {
  if (!cache) {
    let rows = DEMO_LOCATIONS;
    if (isLive()) {
      const { data, error } = await supabase.from('locations')
        .select('id, city, state_name').eq('country_code', 'AE').order('state_name').order('city').limit(2000);
      if (!error && data?.length) rows = data;
    }
    const by = new Map();
    for (const r of rows) {
      const key = r.state_name || r.city;
      if (!by.has(key)) by.set(key, []);
      by.get(key).push({ id: r.id, city: r.city });
    }
    cache = [...by.entries()].map(([emirate, items]) => ({ emirate, items })).sort((a, b) => a.emirate.localeCompare(b.emirate));
  }
  return cache;
}

export const resetLocationCache = () => { cache = null; };

export const locationName = (groups, id) => {
  for (const g of groups || []) {
    const hit = g.items.find((x) => x.id === id);
    if (hit) return hit.city === g.emirate ? hit.city : `${hit.city}, ${g.emirate}`;
  }
  return '';
};

async function call(fn, args) {
  if (!isLive()) throw new Error('Sign in with your email to save this. The demo does not store it.');
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

export const setMyLocation = (id) => call('set_my_location', { p_location: id });

export const setCounsellorProfile = ({ counsellor = null, location, inPerson, online }) =>
  call('set_counsellor_profile', { p_counsellor: counsellor, p_location: location, p_in_person: inPerson, p_online: online });

export const publishSlots = (f) => call('publish_slots', {
  p_from: f.from, p_to: f.to, p_weekdays: f.weekdays, p_start: f.start, p_end: f.end,
  p_minutes: f.minutes, p_gap: f.gap, p_modality: f.modality,
});

export const removeSlot = (id) => call('remove_slot', { p_slot: id });

export const findSlots = (modality, emirate = null) => call('find_slots', { p_modality: modality, p_emirate: emirate, p_limit: 60 });

export const requestConsultation = (slot, modality, notes = null) =>
  call('request_consultation', { p_slot: slot, p_modality: modality, p_topic: 'Pre-marital genetic counselling', p_notes: notes });

export const adminCounsellors = () => call('admin_counsellors', {});
export const adminCoverage = () => call('admin_coverage', {});
export const setAdminScope = (user, level, location) => call('set_admin_scope', { p_user: user, p_level: level, p_location: location });

/* the signed-in counsellor's own clinic settings and next open slots */
export async function myClinic() {
  if (!isLive()) return null;
  const { data: me } = await supabase.auth.getUser();
  const uid = me?.user?.id;
  if (!uid) return null;
  const { data: k } = await supabase.from('counsellors')
    .select('id, name, location_id, offers_in_person, offers_online').eq('user_id', uid).maybeSingle();
  if (!k) return null;
  const { data: slots } = await supabase.from('counsellor_availability')
    .select('id, slot_start, slot_end, modality, is_booked, is_held, location_id')
    .eq('counsellor_id', k.id).gt('slot_start', new Date().toISOString()).order('slot_start').limit(60);
  return { ...k, slots: slots || [] };
}

/* the signed-in couple member's saved home location id */
export async function myHomeLocation() {
  const pid = get().session?.id;
  if (!isLive() || !pid) return null;
  const { data } = await supabase.from('people').select('location_id').eq('id', pid).maybeSingle();
  return data?.location_id ?? null;
}

/* free text -> place, via the API (understands 'Dubayy', 'Ra’s al Khaymah', 'marina, dubai') */
export async function resolvePlace(text) {
  const { api } = await import('./api.js');
  return api(`/places/resolve?text=${encodeURIComponent(text)}`);
}

/* counsellors for someone at this place: same area, then same emirate, then nearest */
export async function counsellorsNear(placeId, modality = 'any') {
  const { api } = await import('./api.js');
  return api(`/places/${placeId}/counsellors?modality=${modality}`);
}

/* verify / pause / activate a counsellor in the admin's own area */
export const manageCounsellor = (id, action, reason = null) => call('manage_counsellor', { p_counsellor: id, p_action: action, p_reason: reason });

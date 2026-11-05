/*
  Supabase connection. Owner: Platform.
  Keys come from web/.env.local (see web/.env.example). Without them the app
  runs in demo mode: only the simulated UAE PASS login works.
*/
import { createClient } from '@supabase/supabase-js';
import { COUPLES, generateDanaId } from './data.js';
import { set, get, startFresh } from './store.js';
import { loadAll, logAudit, hydratePeople } from './db.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// PKCE puts the login result in ?code=, so it doesn't clash with our #/ routes
export const supabase = url && key ? createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: true } }) : null;
export const hasBackend = !!supabase;

/* turn a Supabase user into the app's session (role, name, couple) */
export async function loadSession(user) {
  let { data: acc } = await supabase.from('accounts').select('*').eq('user_id', user.id).maybeSingle();
  const metaName = user.user_metadata?.full_name || user.user_metadata?.name || null;
  const metaEmail = user.email || user.user_metadata?.email || '';
  const metaPhone = user.phone || user.user_metadata?.phone || '';

  if (!acc) {
    // first sign-in (new user or Google): create a couple account with nothing linked yet
    const name = metaName || (metaEmail ? metaEmail.split('@')[0] : '') || 'New member';
    const row = { user_id: user.id, role: 'couple', person_id: null, display_name: name, title: 'New member' };
    // two sign-in events can arrive at once: "do nothing if it already exists", then read whichever row won
    const { error } = await supabase.from('accounts').upsert(row, { onConflict: 'user_id', ignoreDuplicates: true });
    if (error && error.code !== '23505') throw error;
    const again = await supabase.from('accounts').select('*').eq('user_id', user.id).maybeSingle();
    acc = again.data || row;
  } else if (metaName && (!acc.display_name || acc.display_name === 'New member')) {
    acc.display_name = metaName;
    if (supabase) {
      supabase.from('accounts').update({ display_name: metaName }).eq('user_id', user.id).then();
    }
  }

  if (acc.role === 'couple' && !acc.person_id) {
    // temporary onboarding: give this account its own sample couple (see supabase/003_sample_journey.sql)
    const { data: pid, error } = await supabase.rpc('start_sample_journey');
    if (!error && pid) acc = { ...acc, person_id: pid, title: 'Partner · engaged (sample journey)' };
    else if (error) console.warn('Sample journey not available:', error.message);
  }
  await hydratePeople();
  const couple = acc.person_id ? COUPLES.find((c) => c.a === acc.person_id || c.b === acc.person_id) : null;
  const isUae = window.__danaVia === 'uaepass' || user.email?.endsWith('@dana.demo');
  const authMethod = isUae ? 'uae_pass' : 'manual';
  const via = isUae ? 'uaepass' : (user.app_metadata?.provider || 'email');
  const resolvedName = (acc.display_name && acc.display_name !== 'New member')
    ? acc.display_name
    : (metaName || (metaEmail ? metaEmail.split('@')[0] : 'Member'));

  const assignedDanaId = acc.dana_id || generateDanaId(user.id);
  if (!acc.dana_id && supabase) {
    supabase.from('accounts').update({ dana_id: assignedDanaId }).eq('user_id', user.id).then();
  }

  return {
    id: acc.person_id || user.id,
    userId: user.id,
    danaId: assignedDanaId,
    role: acc.role,
    name: resolvedName,
    title: acc.title || '',
    couple: couple ? couple.id : null,
    email: metaEmail,
    phone: metaPhone,
    userMetadata: user.user_metadata || {},
    via,
    authMethod, // UAE PASS auto-fills for demo; Google & email lead to manual entry
    backend: true,
  };
}

/* keep the app's session in step with Supabase (also handles the Google redirect) */
export function watchAuth(onReady) {
  if (!supabase) { onReady(); return () => {}; }
  let current = null; // getSession and SIGNED_IN can both fire for the same login
  const apply = async (s, event) => {
    if (s?.user && s.user.id !== current) {
      current = s.user.id;
      try {
        const session = await loadSession(s.user);
        startFresh(session);
        const viaDemo = !!window.__danaVia;
        if (viaDemo) { window.__danaVia = null; await logAudit(`Signed in with UAE PASS (demo) as ${session.role}`); }
        const fresh = event !== 'INITIAL' || window.location.search.includes('code='); // just logged in (incl. Google return)
        if (fresh && !viaDemo) await logAudit(`Signed in with ${session.via === 'google' ? 'Google' : 'email'}`);
        // open the app straight away; the rest of the data arrives in the background
        if (fresh && !window.location.hash.startsWith('#/app')) {
          if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
          const isScreened = !!get().screeningIntakes?.[session.id]?.completed;
          window.location.hash = (session.role === 'couple' && !isScreened) ? '/app/screening' : '/app';
        }
        loadAll();
      } catch (e) {
        console.error(e);
        set({ authError: e.message });
      }
    }
    onReady();
  };
  supabase.auth.getSession().then(({ data }) => apply(data.session, 'INITIAL'));
  const { data } = supabase.auth.onAuthStateChange((event, s) => {
    if (event === 'SIGNED_IN') apply(s, event);
    if (event === 'SIGNED_OUT') { current = null; set({ session: null }); }
  });
  return () => data.subscription.unsubscribe();
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

/*
  Supabase connection. Owner: Platform.
  Keys come from web/.env.local (see web/.env.example). Without them the app
  runs in demo mode: only the simulated UAE PASS login works.
*/
import { createClient } from '@supabase/supabase-js';
import { COUPLES } from './data.js';
import { set, startFresh } from './store.js';
import { loadAll, logAudit, hydratePeople } from './db.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// PKCE puts the login result in ?code=, so it doesn't clash with our #/ routes
export const supabase = url && key ? createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: true } }) : null;
export const hasBackend = !!supabase;

/* turn a Supabase user into the app's session (role, name, couple) */
export async function loadSession(user) {
  let { data: acc } = await supabase.from('accounts').select('*').eq('user_id', user.id).maybeSingle();
  if (!acc) {
    // first sign-in (new user or Google): create a couple account with nothing linked yet
    const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0];
    const row = { user_id: user.id, role: 'couple', person_id: null, display_name: name, title: 'New member' };
    const { error } = await supabase.from('accounts').insert(row);
    if (error) throw error;
    acc = row;
  }
  if (acc.role === 'couple' && !acc.person_id) {
    // temporary onboarding: give this account its own sample couple (see supabase/003_sample_journey.sql)
    const { data: pid, error } = await supabase.rpc('start_sample_journey');
    if (!error && pid) acc = { ...acc, person_id: pid, title: 'Partner · engaged (sample journey)' };
    else if (error) console.warn('Sample journey not available:', error.message);
  }
  await hydratePeople();
  const couple = acc.person_id ? COUPLES.find((c) => c.a === acc.person_id || c.b === acc.person_id) : null;
  const isUae = window.__danaVia === 'uaepass';
  const authMethod = isUae ? 'uae_pass' : 'manual';
  return {
    id: acc.person_id || user.id,
    role: acc.role,
    name: acc.display_name,
    title: acc.title || '',
    couple: couple ? couple.id : null,
    email: user.email,
    via: window.__danaVia || user.app_metadata?.provider || 'email',
    authMethod, // Google and email lead to manual by default
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
        await loadAll();
        if (fresh && !window.location.hash.startsWith('#/app')) {
          if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
          window.location.hash = session.role === 'couple' ? '/app/screening' : '/app';
        }
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

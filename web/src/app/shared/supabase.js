/*
  Supabase connection. Owner: Platform.
  Keys come from web/.env.local (see web/.env.example). Without them the app
  runs in demo mode: only the simulated UAE PASS login works.
*/
import { createClient } from '@supabase/supabase-js';
import { COUPLES } from './data.js';
import { set } from './store.js';

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
  const couple = acc.person_id ? COUPLES.find((c) => c.a === acc.person_id || c.b === acc.person_id) : null;
  return {
    id: acc.person_id || user.id,
    role: acc.role,
    name: acc.display_name,
    title: acc.title || '',
    couple: couple ? couple.id : null,
    email: user.email,
    via: user.app_metadata?.provider || 'email',
  };
}

/* keep the app's session in step with Supabase (also handles the Google redirect) */
export function watchAuth(onReady) {
  if (!supabase) { onReady(); return () => {}; }
  let current = null; // getSession and SIGNED_IN can both fire for the same login
  const apply = async (s) => {
    if (s?.user && s.user.id !== current) {
      current = s.user.id;
      try {
        const session = await loadSession(s.user);
        set({ session }, `Signed in with ${session.via === 'google' ? 'Google' : 'email'}`);
        if (!window.location.hash.startsWith('#/app')) window.location.hash = '/app';
      } catch (e) {
        console.error(e);
        set({ authError: e.message });
      }
    }
    onReady();
  };
  supabase.auth.getSession().then(({ data }) => apply(data.session));
  const { data } = supabase.auth.onAuthStateChange((event, s) => {
    if (event === 'SIGNED_IN') apply(s);
    if (event === 'SIGNED_OUT') { current = null; set({ session: null }); }
  });
  return () => data.subscription.unsubscribe();
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

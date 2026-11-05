/*
  Supabase connection. Owner: Platform.
  Keys come from web/.env.local (see web/.env.example). Without them the app
  runs in demo mode: only the simulated UAE PASS login works.
*/
import { createClient } from '@supabase/supabase-js';
import { COUPLES } from './data.js';
import { get, set, startFresh } from './store.js';
import { loadAll, logAudit, hydratePeople } from './db.js';

const getEnv = (key) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch {}
  return '';
};

const url = getEnv('VITE_SUPABASE_URL');
const key = getEnv('VITE_SUPABASE_ANON_KEY');

// PKCE puts the login result in ?code=, so it doesn't clash with our #/ routes
export const supabase = url && key ? createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: true } }) : null;
export const hasBackend = !!supabase;

/* turn a Supabase user into the app's session (role, name, couple) */
export async function loadSession(user) {
  let { data: acc } = await supabase.from('accounts').select('*').eq('user_id', user.id).maybeSingle();
  if (!acc) {
    // first sign-in (new user or Google): create a couple account with nothing linked yet
    const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    const row = { user_id: user.id, role: 'couple', person_id: null, display_name: name, title: 'New member' };
    const { error } = await supabase.from('accounts').upsert(row, { onConflict: 'user_id', ignoreDuplicates: true });
    if (error && error.code !== '23505') throw error;
    const again = await supabase.from('accounts').select('*').eq('user_id', user.id).maybeSingle();
    acc = again.data || row;
  }
  // staff role chosen at sign-up (016): the database checks the access code
  let claim = null;
  try { claim = JSON.parse(sessionStorage.getItem('dana.staffClaim') || 'null'); sessionStorage.removeItem('dana.staffClaim'); } catch {}
  if (claim && acc.role === 'couple' && !acc.person_id) {
    const { error } = await supabase.rpc('claim_staff_role', { p_role: claim.role, p_code: claim.code });
    if (error) set({ dbError: `${error.message}. You are signed in as a couple member for now.` });
    else {
      const again = await supabase.from('accounts').select('*').eq('user_id', user.id).maybeSingle();
      if (again.data) acc = again.data;
    }
  }
  // a new couple account has no health profile yet: the Welcome page walks them through it (009_onboarding.sql)
  await hydratePeople();
  // prefer a real couple over an old sample one (013 removes the sample couple when a real partner links)
  const mine = acc.person_id ? COUPLES.filter((c) => c.a === acc.person_id || c.b === acc.person_id) : [];
  const couple = mine.find((c) => ![c.a, c.b].some((x) => String(x).startsWith('p_'))) || mine[0] || null;
  const isUae = typeof window !== 'undefined' && window.__danaVia === 'uaepass';
  const authMethod = isUae ? 'uae_pass' : 'manual';
  return {
    id: acc.person_id || user.id,
    userId: user.id,
    personId: acc.person_id || null,
    role: acc.role,
    name: acc.display_name,
    avatar: acc.avatar || null,
    title: acc.title || '',
    couple: couple ? couple.id : null,
    // paired with a 'Sample partner' (p_...) before real onboarding: may still link a real partner (013)
    sampleCouple: !!couple && [couple.a, couple.b].some((x) => String(x).startsWith('p_')),
    email: user.email,
    via: (typeof window !== 'undefined' && window.__danaVia) || user.app_metadata?.provider || 'email',
    authMethod,
    needsProfile: acc.role === 'couple' && !acc.person_id,
    backend: true,
  };
}

/* re-read my account after onboarding steps (profile created, partner linked) */
export async function refreshSession() {
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return null;
  const prev = get().session || {};
  const next = await loadSession(data.user);
  set({ session: { ...next, avatar: next.avatar ?? prev.avatar } });
  return next;
}

/* keep the app's session in step with Supabase (also handles the Google redirect) */
export function watchAuth(onReady) {
  if (!supabase) { onReady(); return () => {}; }
  let current = null;
  let readyCalled = false;
  const notifyReady = () => {
    if (!readyCalled) {
      readyCalled = true;
      onReady();
    }
  };

  // 1-second fallback timeout: never block UI on white screen if network is slow/offline
  const timer = setTimeout(notifyReady, 1000);

  const apply = async (s, event) => {
    if (s?.user && s.user.id !== current) {
      current = s.user.id;
      try {
        const session = await loadSession(s.user);
        startFresh(session);
        const viaDemo = typeof window !== 'undefined' && !!window.__danaVia;
        if (viaDemo) { window.__danaVia = null; await logAudit(`Signed in with UAE PASS (demo) as ${session.role}`); }
        const fresh = event !== 'INITIAL' || (typeof window !== 'undefined' && window.location.search.includes('code='));
        if (fresh && !viaDemo) await logAudit(`Signed in with ${session.via === 'google' ? 'Google' : 'email'}`);
        if (fresh && typeof window !== 'undefined' && !window.location.hash.startsWith('#/app')) {
          if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
          window.location.hash = session.role === 'couple' ? '/app/screening' : '/app';
        }
        loadAll();
      } catch (e) {
        console.error(e);
        set({ authError: e.message });
      }
    }
    clearTimeout(timer);
    notifyReady();
  };

  try {
    supabase.auth.getSession()
      .then(({ data }) => apply(data?.session, 'INITIAL'))
      .catch((err) => {
        console.warn('Supabase auth getSession notice:', err?.message);
        clearTimeout(timer);
        notifyReady();
      });
  } catch {
    clearTimeout(timer);
    notifyReady();
  }

  try {
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN') apply(s, event);
      if (event === 'SIGNED_OUT') { current = null; set({ session: null }); }
    });
    return () => {
      clearTimeout(timer);
      if (data?.subscription?.unsubscribe) data.subscription.unsubscribe();
    };
  } catch {
    clearTimeout(timer);
    notifyReady();
    return () => {};
  }
}

export async function signOut() {
  if (supabase) {
    try { await supabase.auth.signOut(); } catch {}
  }
}

export default supabase;

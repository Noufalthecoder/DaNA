/*
  Sign in. Owner: Platform.
  - UAE PASS: simulated (demo accounts). A real pilot uses the official UAE PASS integration.
  - Google, email sign-in and new-user sign-up: real, through Supabase Auth.
*/
import { useState } from 'react';
import { ACCOUNTS } from './data.js';
import { set, useStore } from './store.js';
import { go } from './router.js';
import { Avatar } from './ui.jsx';
import { supabase, hasBackend } from './supabase.js';

const ROLE = { couple: 'Couple', counsellor: 'Counsellor', admin: 'DoH admin' };

/* plain-language versions of Supabase's sign-in and sign-up errors */
function friendly(msg = '') {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Wrong email or password.';
  if (m.includes('email not confirmed')) return 'Please open the confirmation email we sent you, then sign in.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'This email already has an account. Sign in instead.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Please wait a minute and try again.';
  if (m.includes('password should be') || m.includes('weak password')) return 'Choose a stronger password: at least 8 characters.';
  if (m.includes('invalid') && m.includes('email')) return 'Please enter a valid email address.';
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'New accounts are switched off right now.';
  if (m.includes('duplicate key') || m.includes('accounts_pkey')) return 'Your account is ready. Please sign in again.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Can’t reach DaNA right now. Check your internet and try again.';
  return msg;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function Login() {
  // start → uaepass (pick demo) → connecting | email | signup | check-email
  const [step, setStep] = useState('start');
  const [who, setWho] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [exists, setExists] = useState(false); // sign-up hit an email that already has an account
  const authError = useStore((s) => s.authError);
  const field = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });
  const clearAuthError = () => { if (authError) set({ authError: null }); };
  const to = (s) => { setError(''); setExists(false); clearAuthError(); setStep(s); };

  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD;
  const demoSignIn = async (acc) => {
    setWho(acc);
    setStep('connecting');
    if (hasBackend && demoPassword) {
      // live demo: sign in as the shared demo user, so every role sees the same data
      window.__danaVia = 'uaepass';
      const { error: err } = await supabase.auth.signInWithPassword({ email: `${acc.id}@dana.demo`, password: demoPassword });
      if (!err) return; // watchAuth finishes the sign-in and opens the app
      window.__danaVia = null;
      console.warn('Live demo sign-in failed, using the offline demo:', err.message);
    }
    setTimeout(() => {
      set({ session: { id: acc.id, role: acc.role, name: acc.name, title: acc.title, couple: acc.couple || null, via: 'uaepass' } }, `Signed in with UAE PASS (demo) as ${ROLE[acc.role]}`);
      go('/app');
    }, 900);
  };

  const google = async () => {
    setError(''); clearAuthError();
    const { error: e } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } });
    if (e) setError(friendly(e.message));
  };

  const emailSignIn = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); clearAuthError();
    const { error: err } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
    if (err) { setBusy(false); setError(friendly(err.message)); } // on success stay busy until the app opens
  };

  const signUp = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { setError('Use at least 8 characters for your password.'); return; }
    setBusy(true); setError(''); setExists(false); clearAuthError();
    const { data, error: err } = await supabase.auth.signUp({
      email: form.email.trim(), password: form.password,
      options: { data: { full_name: form.name.trim() }, emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (err || !data.session) setBusy(false); // on success stay busy until the app opens
    const taken = (err && /already (been )?registered/i.test(err.message))
      || (!err && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0);
    if (taken) setExists(true);
    else if (err) setError(friendly(err.message));
    else if (!data.session) setStep('check-email'); // email confirmation is on in Supabase
  };

  const notConnected = <p className="note">Google and email sign-in need the Supabase keys in <code>web/.env.local</code>. Until then, use UAE PASS (demo).</p>;

  return (
    <div className="login">
      <a className="login-back" href="#/">← Back to home</a>
      <div className="login-card">
        <div className="login-brand"><span className="dot" />DaNA <span className="ar">دانة</span></div>

        {step === 'start' && (<>
          <h1>Sign in</h1>
          <p className="muted">See your results and plan, privately.</p>
          <div className="methods">
            <button className="uaepass" onClick={() => to('uaepass')}>
              <span className="up-logo" aria-hidden="true">UAE<br />PASS</span>Sign in with UAE PASS <em>demo</em>
            </button>
            <button className="method" onClick={google} disabled={!hasBackend}><GoogleIcon />Continue with Google</button>
            <button className="method" onClick={() => to('email')} disabled={!hasBackend}><span className="mi" aria-hidden="true">✉</span>Sign in with email</button>
          </div>
          {!hasBackend && notConnected}
          {(error || authError) && <p className="err">{error || friendly(authError)}</p>}
          <div className="or"><span>New to DaNA?</span></div>
          <button className="method outline" onClick={() => to('signup')} disabled={!hasBackend}>Create an account</button>
          <p className="fine">Prototype · synthetic data only. UAE PASS is simulated.</p>
        </>)}

        {step === 'uaepass' && (<>
          <h1>Choose a demo account</h1>
          <p className="muted">In a real pilot this screen is UAE PASS itself.</p>
          <div className="accounts">
            {ACCOUNTS.map((a) => (
              <button key={a.id} className="acc" onClick={() => demoSignIn(a)}>
                <Avatar name={a.name} />
                <span><b>{a.name}</b><small>{a.title}</small></span>
                <em className={`role r-${a.role}`}>{ROLE[a.role]}</em>
              </button>
            ))}
          </div>
          <button className="link" onClick={() => to('start')}>← Other ways to sign in</button>
        </>)}

        {step === 'connecting' && (
          <div className="connecting">
            <span className="spin" aria-hidden="true" />
            <h1>Connecting to UAE PASS…</h1>
            <p className="muted">Signing in as {who.name}</p>
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={emailSignIn} className="form">
            <h1>Sign in with email</h1>
            <label>Email<input type="email" required autoComplete="email" {...field('email')} /></label>
            <label>Password<input type="password" required autoComplete="current-password" {...field('password')} /></label>
            {error && <p className="err">{error}</p>}
            <button className="btn wide" disabled={busy}>{busy ? 'Signing you in…' : 'Sign in'}</button>
            <p className="swap">No account? <button type="button" className="link" onClick={() => to('signup')}>Create one</button></p>
            <button type="button" className="link" onClick={() => to('start')}>← Other ways to sign in</button>
          </form>
        )}

        {step === 'signup' && (
          <form onSubmit={signUp} className="form">
            <h1>Create your account</h1>
            <p className="muted">Free and private. Your screening results are linked after you sign in.</p>
            <label>Full name<input required autoComplete="name" {...field('name')} /></label>
            <label>Email<input type="email" required autoComplete="email" {...field('email')} /></label>
            <label>Password<input type="password" required minLength={8} autoComplete="new-password" {...field('password')} /><small>At least 8 characters</small></label>
            {exists && (
              <div className="exists">
                <p><b>{form.email}</b> already has a DaNA account.</p>
                <p className="muted">If you used Google before, continue with Google. Otherwise sign in with your password.</p>
                <div className="exists-a">
                  <button type="button" className="btn" onClick={() => to('email')}>Sign in</button>
                  <button type="button" className="method" onClick={google}><GoogleIcon />Continue with Google</button>
                </div>
              </div>
            )}
            {error && <p className="err">{error}</p>}
            <button className="btn wide" disabled={busy}>{busy ? 'Setting up your account…' : 'Create account'}</button>
            <button type="button" className="method google-inline" onClick={google}><GoogleIcon />Sign up with Google</button>
            <p className="swap">Already have an account? <button type="button" className="link" onClick={() => to('email')}>Sign in</button></p>
          </form>
        )}

        {step === 'check-email' && (<>
          <h1>Check your email</h1>
          <p className="muted">We sent a link to <b>{form.email}</b>. Open it to finish creating your account.</p>
          <button className="link" onClick={() => to('email')}>← Back to sign in</button>
        </>)}
      </div>
      <p className="login-foot">Relatives don’t need an account. They receive a private invite link. <a href="#/invite">See the invite</a></p>
    </div>
  );
}

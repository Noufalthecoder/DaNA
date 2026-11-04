/*
  Sign in. Owner: Platform.
  - UAE PASS: simulated (demo accounts). A real pilot uses the official UAE PASS integration.
  - Google, email sign-in and new-user sign-up: real, through Supabase Auth.
*/
import { useState, useEffect } from 'react';
import { ACCOUNTS } from './data.js';
import { set, useStore, signOut } from './store.js';
import { go } from './router.js';
import { Avatar } from './ui.jsx';
import { Brand } from './Logo.jsx';
import { supabase, hasBackend } from './supabase.js';

const ROLE = { couple: 'Couple', counsellor: 'Counsellor', admin: 'DoH admin' };

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
  const [authMethod, setAuthMethod] = useState('uae_pass');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const authError = useStore((s) => s.authError);
  const field = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });
  const to = (s) => { setError(''); setStep(s); };

  // Arriving at login resets any active session and restarts the journey flow
  useEffect(() => {
    signOut();
  }, []);

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
      // Flow restarts from the beginning: reset screening intakes and journey state
      set({
        session: { id: acc.id, role: acc.role, name: acc.name, title: acc.title, couple: acc.couple || null, authMethod, via: 'uaepass' },
        screeningIntakes: {},
        alertsSent: [],
        plan: null,
        booked: null,
      }, `Signed in via ${authMethod === 'uae_pass' ? 'UAE PASS' : 'Manual entry'} as ${ROLE[acc.role]}`);

      if (acc.role === 'couple') {
        go('/app/screening');
      } else {
        go('/app');
      }
    }, 900);
  };

  const google = async () => {
    setError('');
    const { error: e } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } });
    if (e) setError(e.message);
  };

  const emailSignIn = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
    setBusy(false);
    if (err) setError(err.message === 'Invalid login credentials' ? 'Wrong email or password.' : err.message);
  };

  const signUp = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { setError('Use at least 8 characters for your password.'); return; }
    setBusy(true); setError('');
    const { data, error: err } = await supabase.auth.signUp({
      email: form.email.trim(), password: form.password,
      options: { data: { full_name: form.name.trim() }, emailRedirectTo: window.location.origin + window.location.pathname },
    });
    setBusy(false);
    if (err) setError(err.message);
    else if (!data.session) setStep('check-email'); // email confirmation is on in Supabase
  };

  const notConnected = <p className="note">Google and email sign-in need the Supabase keys in <code>web/.env.local</code>. Until then, use UAE PASS (demo).</p>;

  return (
    <div className="login">
      <a className="login-back" href="#/">← Back to home</a>
      <div className="login-card">
        <div className="login-brand" style={{ marginBottom: 22 }}>
          <Brand size={36} withArabic={true} href="#/" />
        </div>

        {step === 'start' && (<>
          <h1>Sign in</h1>
          <p className="muted">Use your UAE PASS to automatically retrieve your results and records, or continue with manual entry.</p>
          <div className="methods">
            <button className="uaepass" onClick={() => { setAuthMethod('uae_pass'); to('uaepass'); }}>
              <span className="up-logo" aria-hidden="true">UAE<br />PASS</span>Sign in with UAE PASS <em>demo</em>
            </button>
            <button
              className="ghost"
              style={{ width: '100%', padding: '12px', borderRadius: 12, fontWeight: 600, textAlign: 'center' }}
              onClick={() => { setAuthMethod('manual'); to('uaepass'); }}
            >
              Manual intake (without UAE PASS)
            </button>
            <button className="method" onClick={google} disabled={!hasBackend}><GoogleIcon />Continue with Google</button>
            <button className="method" onClick={() => to('email')} disabled={!hasBackend}><span className="mi" aria-hidden="true">✉</span>Sign in with email</button>
          </div>
          {!hasBackend && notConnected}
          {(error || authError) && <p className="err">{error || authError}</p>}
          <div className="or"><span>New to DaNA?</span></div>
          <button className="method outline" onClick={() => to('signup')} disabled={!hasBackend}>Create an account</button>
          <p className="fine">Demo only: UAE PASS is simulated and all data is synthetic.</p>
        </>)}

        {step === 'uaepass' && (<>
          <h1>{authMethod === 'uae_pass' ? 'Sign in with UAE PASS' : 'Manual Intake Account'}</h1>
          <p className="muted">
            {authMethod === 'uae_pass'
              ? 'Select an account to auto-fill verified civil and Malaffi health data.'
              : 'Select an account to start with blank manual entry fields.'}
          </p>
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
            <h1>{authMethod === 'uae_pass' ? 'Connecting to UAE PASS…' : 'Preparing Manual Session…'}</h1>
            <p className="muted">Signing in as {who.name}</p>
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={emailSignIn} className="form">
            <h1>Sign in with email</h1>
            <label>Email<input type="email" required autoComplete="email" {...field('email')} /></label>
            <label>Password<input type="password" required autoComplete="current-password" {...field('password')} /></label>
            {error && <p className="err">{error}</p>}
            <button className="btn wide" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
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
            {error && <p className="err">{error}</p>}
            <button className="btn wide" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
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

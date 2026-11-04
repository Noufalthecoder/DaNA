/* Simulated UAE PASS login. Owner: Platform. A real pilot swaps this for UAE PASS OIDC. */
import { useState, useEffect } from 'react';
import { ACCOUNTS } from './data.js';
import { set, get, signOut } from './store.js';
import { go } from './router.js';
import { Avatar } from './ui.jsx';
import { Brand } from './Logo.jsx';

const ROLE = { couple: 'Couple', counsellor: 'Counsellor', admin: 'DoH admin' };

export default function Login() {
  const [step, setStep] = useState('start'); // start → pick → connecting
  const [who, setWho] = useState(null);
  const [authMethod, setAuthMethod] = useState('uae_pass');

  // Arriving at login resets any active session and restarts the journey flow
  useEffect(() => {
    signOut();
  }, []);

  const signIn = (acc) => {
    setWho(acc);
    setStep('connecting');
    setTimeout(() => {
      // Flow restarts from the beginning: reset screening intakes and journey state
      set({
        session: { id: acc.id, role: acc.role, name: acc.name, title: acc.title, couple: acc.couple || null, authMethod },
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
          <button className="uaepass" onClick={() => { setAuthMethod('uae_pass'); setStep('pick'); }}>
            <span className="up-logo" aria-hidden="true">UAE<br />PASS</span>Sign in with UAE PASS
          </button>
          <div style={{ marginTop: 12 }}>
            <button
              className="ghost"
              style={{ width: '100%', padding: '12px', borderRadius: 12, fontWeight: 600 }}
              onClick={() => { setAuthMethod('manual'); setStep('pick'); }}
            >
              Manual intake (without UAE PASS)
            </button>
          </div>
          <p className="fine">Demo only: UAE PASS is simulated and all data is synthetic.</p>
        </>)}

        {step === 'pick' && (<>
          <h1>{authMethod === 'uae_pass' ? 'Sign in with UAE PASS' : 'Manual Intake Account'}</h1>
          <p className="muted">
            {authMethod === 'uae_pass'
              ? 'Select an account to auto-fill verified civil and Malaffi health data.'
              : 'Select an account to start with blank manual entry fields.'}
          </p>
          <div className="accounts">
            {ACCOUNTS.map((a) => (
              <button key={a.id} className="acc" onClick={() => signIn(a)}>
                <Avatar name={a.name} />
                <span><b>{a.name}</b><small>{a.title}</small></span>
                <em className={`role r-${a.role}`}>{ROLE[a.role]}</em>
              </button>
            ))}
          </div>
          <button className="link" onClick={() => setStep('start')}>Cancel</button>
        </>)}

        {step === 'connecting' && (
          <div className="connecting">
            <span className="spin" aria-hidden="true" />
            <h1>{authMethod === 'uae_pass' ? 'Connecting to UAE PASS…' : 'Preparing Manual Session…'}</h1>
            <p className="muted">Signing in as {who.name}</p>
          </div>
        )}
      </div>
      <p className="login-foot">Relatives don’t need an account. They receive a private invite link. <a href="#/invite">See the invite</a></p>
    </div>
  );
}

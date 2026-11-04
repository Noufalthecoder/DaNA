/* Simulated UAE PASS login. Owner: Platform. A real pilot swaps this for UAE PASS OIDC. */
import { useState } from 'react';
import { ACCOUNTS } from './data.js';
import { set } from './store.js';
import { go } from './router.js';
import { Avatar } from './ui.jsx';

const ROLE = { couple: 'Couple', counsellor: 'Counsellor', admin: 'DoH admin' };

export default function Login() {
  const [step, setStep] = useState('start'); // start → pick → connecting
  const [who, setWho] = useState(null);

  const signIn = (acc) => {
    setWho(acc);
    setStep('connecting');
    setTimeout(() => {
      set({ session: { id: acc.id, role: acc.role, name: acc.name, title: acc.title, couple: acc.couple || null } }, `Signed in with UAE PASS (demo) as ${ROLE[acc.role]}`);
      go('/app');
    }, 900);
  };

  return (
    <div className="login">
      <a className="login-back" href="#/">← Back to home</a>
      <div className="login-card">
        <div className="login-brand"><span className="dot" />DaNA <span className="ar">دانة</span></div>

        {step === 'start' && (<>
          <h1>Sign in</h1>
          <p className="muted">Use your UAE PASS to see your results and plan, privately.</p>
          <button className="uaepass" onClick={() => setStep('pick')}>
            <span className="up-logo" aria-hidden="true">UAE<br />PASS</span>Sign in with UAE PASS
          </button>
          <p className="fine">Demo only: UAE PASS is simulated and all data is synthetic.</p>
        </>)}

        {step === 'pick' && (<>
          <h1>Choose a demo account</h1>
          <p className="muted">In a real pilot this screen is UAE PASS itself.</p>
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
            <h1>Connecting to UAE PASS…</h1>
            <p className="muted">Signing in as {who.name}</p>
          </div>
        )}
      </div>
      <p className="login-foot">Relatives don’t need an account. They receive a private invite link. <a href="#/invite">See the invite</a></p>
    </div>
  );
}

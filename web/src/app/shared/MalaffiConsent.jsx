/* Consent before Malaffi (019). Owner: Platform.
   Malaffi is reached through UAE PASS identity:
   - signed in with UAE PASS  -> consent, then fetch
   - signed in with Google or email -> link UAE PASS (simulated here), consent, then fetch
   Nothing is fetched until every box is ticked; the consent is stored with a time and version. */
import { useState } from 'react';
import { useStore } from './store.js';
import { refreshSession } from './supabase.js';
import { grantMalaffiConsent, fetchMalaffi } from './db.js';

const SHARED = [
  ['From UAE PASS', 'Your name, Emirates ID, date of birth, sex and nationality, to make sure the record is yours.'],
  ['From Malaffi', 'Your premarital screening results: the genetic carrier test and the blood tests done for marriage.'],
];

export default function MalaffiConsent({ onDone }) {
  const session = useStore((s) => s.session);
  const viaUaePass = session?.via === 'uaepass';
  const [linked, setLinked] = useState(viaUaePass || !!session?.uaepassLinked);
  const [linking, setLinking] = useState(false);
  const [boxes, setBoxes] = useState({ share: false, purpose: false, withdraw: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const all = boxes.share && boxes.purpose && boxes.withdraw;

  const linkUaePass = async () => {
    setLinking(true); setErr('');
    await new Promise((r) => setTimeout(r, 900)); // simulated UAE PASS approval
    setLinked(true); setLinking(false);
  };
  const go = async () => {
    setBusy(true); setErr('');
    try {
      await grantMalaffiConsent(viaUaePass);
      await fetchMalaffi();
      await refreshSession();
      onDone?.();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const tick = (k) => setBoxes({ ...boxes, [k]: !boxes[k] });

  return (
    <div className="mc">
      <div className={`mc-step ${linked ? 'done' : 'now'}`}>
        <span className="mc-n">{linked ? '✓' : 1}</span>
        <div>
          <b>{viaUaePass ? 'Signed in with UAE PASS' : linked ? 'UAE PASS linked' : 'Link your UAE PASS'}</b>
          <p>{viaUaePass || linked
            ? 'Your identity is verified, so Malaffi can find your record.'
            : 'You signed in with Google or email. Malaffi works through UAE PASS, so link it once to confirm the record is yours.'}</p>
          {!linked && (
            <button type="button" className="btn uaepass" onClick={linkUaePass} disabled={linking}>
              {linking ? 'Waiting for UAE PASS approval…' : 'Link UAE PASS'}
            </button>
          )}
          {!viaUaePass && !linked && <small className="muted">Demo: UAE PASS approval is simulated.</small>}
        </div>
      </div>

      <div className={`mc-step ${!linked ? 'off' : 'now'}`}>
        <span className="mc-n">2</span>
        <div>
          <b>Your consent</b>
          <ul className="mc-share">{SHARED.map(([h, t]) => <li key={h}><b>{h}:</b> {t}</li>)}</ul>
          <label className="mc-box"><input type="checkbox" checked={boxes.share} onChange={() => tick('share')} disabled={!linked} />
            I allow DaNA to read the information above from UAE PASS and Malaffi.</label>
          <label className="mc-box"><input type="checkbox" checked={boxes.purpose} onChange={() => tick('purpose')} disabled={!linked} />
            I understand it is used only to explain my premarital screening result and to support my care.</label>
          <label className="mc-box"><input type="checkbox" checked={boxes.withdraw} onChange={() => tick('withdraw')} disabled={!linked} />
            I know I can withdraw this consent any time on the Privacy page.</label>
          <button type="button" className="btn" onClick={go} disabled={!linked || !all || busy}>
            {busy ? 'Fetching your results… (up to a minute)' : 'I consent: fetch my results'}
          </button>
          <small className="muted">Demo: Malaffi is simulated with a synthetic report.</small>
        </div>
      </div>
      {err && <p className="err">{err}</p>}
    </div>
  );
}

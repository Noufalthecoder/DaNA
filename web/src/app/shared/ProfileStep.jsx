/* Journey step 1, done in place: create (or confirm) the profile by choosing female or male. */
import { useState } from 'react';
import { useStore } from './store.js';
import { refreshSession } from './supabase.js';
import { startMyProfile, setMySex, loadAll } from './db.js';

export default function ProfileStep() {
  const session = useStore((s) => s.session);
  const confirming = !session?.needsProfile; // an existing profile only confirms its sex
  const [sex, setSex] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => {
    if (!sex) { setErr('Choose female or male.'); return; }
    setBusy(true); setErr('');
    try {
      if (confirming) await setMySex(sex); else await startMyProfile(sex);
      await refreshSession();
      loadAll();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <div className="jr-act">
      <div className="seg" role="radiogroup" aria-label="I am">
        {[['F', 'Female'], ['M', 'Male']].map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={sex === v} className={sex === v ? 'on' : ''} onClick={() => setSex(v)}>{l}</button>
        ))}
      </div>
      <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : confirming ? 'Confirm' : 'Create my profile'}</button>
      {err && <p className="err" style={{ width: '100%' }}>{err}</p>}
    </div>
  );
}

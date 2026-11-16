/* Journey step 2, on one screen (029): UAE PASS details filled in and read-only, consent per group,
   only the extra details DaNA needs, then one submit that saves everything and fetches Malaffi.
   Works for UAE PASS sign-in and for email/Google accounts (they link UAE PASS once). */
import { useEffect, useState } from 'react';
import { useStore } from './store.js';
import { refreshSession } from './supabase.js';
import { linkUaePass, myIdentity, submitIntake, fetchMalaffi, loadAll } from './db.js';
import { PEOPLE } from './data.js';
import { SCENARIOS } from './scenarios.js';
import { go } from './router.js';

const FAMILY = [
  ['thalassaemia', 'Thalassaemia'], ['sickle_cell', 'Sickle cell disease'], ['g6pd', 'G6PD deficiency'],
  ['hearing_loss', 'Hearing loss from birth'], ['sma', 'Spinal muscular atrophy'], ['cystic_fibrosis', 'Cystic fibrosis'],
  ['other', 'Another inherited condition'],
];
const RELATED = [['no', 'No'], ['first_cousin', 'First cousins'], ['second_cousin', 'Second cousins'], ['other_relative', 'Other relatives'], ['not_sure', 'Not sure']];
const LANGS = [['en', 'English'], ['ar', 'العربية'], ['ur', 'اردو']];
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

function Seg({ value, options, onChange, label }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

function Field({ label, value }) {
  return <div className="ik-f"><small>{label}</small><b>{value || '—'}</b></div>;
}

export default function Intake() {
  const session = useStore((s) => s.session);
  const viaUaePass = session?.via === 'uaepass';
  const female = (PEOPLE[session?.id]?.sex) === 'F';
  const [id, setId] = useState(null);         // UAE PASS attributes once linked
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [scopes, setScopes] = useState({ identity: false, contact: false, results: false });
  const d0 = session?.details || {};
  const [f, setF] = useState({
    marital_status: d0.marital_status || '', wedding_date: d0.wedding_date || '', pregnant: !!d0.pregnant,
    pregnancy_weeks: d0.pregnancy_weeks || '', related_to_partner: d0.related_to_partner || 'no',
    family_history: d0.family_history || [], family_notes: d0.family_notes || '', affected_child: !!d0.affected_child,
    preferred_language: d0.preferred_language || 'en',
  });
  const [scenario, setScenario] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const up = (k, v) => setF({ ...f, [k]: v });
  const toggleFam = (k) => up('family_history', f.family_history.includes(k) ? f.family_history.filter((x) => x !== k) : [...f.family_history, k]);

  // UAE PASS sign-in: the attributes arrive with the sign-in, so they are shown straight away
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        let ident = await myIdentity();
        if (!ident && viaUaePass) ident = await linkUaePass(true);
        if (on) setId(ident);
      } catch (e) { if (on) setErr(e.message); }
      if (on) setLoading(false);
    })();
    return () => { on = false; };
  }, [viaUaePass]);

  const link = async () => {
    setLinking(true); setErr('');
    try {
      await new Promise((r) => setTimeout(r, 900)); // UAE PASS app approval (simulated)
      setId(await linkUaePass(false));
    } catch (e) { setErr(e.message); }
    setLinking(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!scopes.identity || !scopes.results) { setErr('Tick consent for your identity and your premarital results to continue.'); return; }
    if (!f.marital_status) { setErr('Choose your marital status.'); return; }
    if (f.pregnant && !(Number(f.pregnancy_weeks) >= 1 && Number(f.pregnancy_weeks) <= 42)) { setErr('Enter the pregnancy weeks (1 to 42).'); return; }
    setErr('');
    try {
      setBusy('Saving your consent and details…');
      await submitIntake(scopes, { ...f, pregnancy_weeks: f.pregnant ? Number(f.pregnancy_weeks) : null });
      setBusy('Fetching your premarital results from Malaffi… (up to a minute)');
      await fetchMalaffi(scenario || undefined);
      await refreshSession();
      await loadAll();
      go('/app/result');
    } catch (e2) { setErr(e2.message); setBusy(''); }
  };

  if (loading) return <div className="ik"><p className="muted">Loading your UAE PASS details…</p></div>;

  if (!id) {
    return (
      <div className="ik">
        <div className="ik-link">
          <div>
            <b>Link your UAE PASS</b>
            <p>You signed in with {session?.via === 'google' ? 'Google' : 'email'}. Malaffi works through UAE PASS, so link it once.
              Your details then fill in automatically; you only confirm them.</p>
          </div>
          <button type="button" className="btn uaepass" onClick={link} disabled={linking}>{linking ? 'Approve in the UAE PASS app…' : 'Link UAE PASS'}</button>
        </div>
        <small className="muted">Demo: UAE PASS approval is simulated.</small>
        {err && <p className="err">{err}</p>}
      </div>
    );
  }

  return (
    <form className="ik" onSubmit={submit}>
      <section className="ik-card">
        <div className="ik-h">
          <h3>From UAE PASS</h3>
          <span className="ik-verified">✓ Verified by UAE PASS{id.source === 'uaepass_simulated' ? ' (simulated)' : ''}</span>
        </div>
        <p className="muted">Filled in automatically. These cannot be edited here; to correct them, update UAE PASS.</p>
        <div className="ik-grid">
          <Field label="Full name" value={id.full_name_en} />
          {id.full_name_ar && <Field label="الاسم" value={id.full_name_ar} />}
          <Field label="Emirates ID" value={id.emirates_id} />
          <Field label="Date of birth" value={fmtDate(id.date_of_birth)} />
          <Field label="Sex" value={id.sex === 'F' ? 'Female' : id.sex === 'M' ? 'Male' : '—'} />
          <Field label="Nationality" value={id.nationality} />
          <Field label="Mobile" value={id.mobile} />
          <Field label="Email" value={id.email} />
        </div>
      </section>

      <section className="ik-card">
        <h3>Your consent</h3>
        <p className="muted">Choose what DaNA may use. You can withdraw any time on the Privacy page.</p>
        <label className="ik-c"><input type="checkbox" checked={scopes.identity} onChange={(e) => setScopes({ ...scopes, identity: e.target.checked })} />
          <span><b>My identity</b> <em>required</em><br />Name, Emirates ID, date of birth, sex and nationality, to match the record to me.</span></label>
        <label className="ik-c"><input type="checkbox" checked={scopes.results} onChange={(e) => setScopes({ ...scopes, results: e.target.checked })} />
          <span><b>My premarital results from Malaffi</b> <em>required</em><br />The genetic carrier test and blood tests, only to explain my result and support my care.</span></label>
        <label className="ik-c"><input type="checkbox" checked={scopes.contact} onChange={(e) => setScopes({ ...scopes, contact: e.target.checked })} />
          <span><b>My contact details</b> <em>optional</em><br />Mobile and email, so my counsellor can reach me about my result.</span></label>
      </section>

      <section className="ik-card">
        <h3>A few details UAE PASS and Malaffi do not hold</h3>
        <div className="dt-q"><span>Marital status</span>
          <Seg label="Marital status" value={f.marital_status} onChange={(v) => up('marital_status', v)} options={[['single', 'Single'], ['engaged', 'Engaged'], ['married', 'Married']]} />
        </div>
        {f.marital_status === 'engaged' && (
          <label className="dt-q"><span>Planned wedding date <i>(optional)</i></span>
            <input type="date" value={f.wedding_date} onChange={(e) => up('wedding_date', e.target.value)} /></label>
        )}
        <div className="dt-q"><span>Are you related to your partner (or future partner)?</span>
          <Seg label="Related to partner" value={f.related_to_partner} onChange={(v) => up('related_to_partner', v)} options={RELATED} />
        </div>
        {female && (
          <div className="dt-q"><span>Are you pregnant now?</span>
            <Seg label="Pregnant" value={f.pregnant ? 'yes' : 'no'} onChange={(v) => up('pregnant', v === 'yes')} options={[['no', 'No'], ['yes', 'Yes']]} />
            {f.pregnant && <input type="number" min="1" max="42" placeholder="Weeks" value={f.pregnancy_weeks} onChange={(e) => up('pregnancy_weeks', e.target.value)} style={{ maxWidth: 120, marginTop: 8 }} />}
          </div>
        )}
        <div className="dt-q"><span>Has anyone in your family had one of these? <i>(tick any)</i></span>
          <div className="chips">
            {FAMILY.map(([k, l]) => (
              <button key={k} type="button" className={f.family_history.includes(k) ? 'on' : ''} aria-pressed={f.family_history.includes(k)} onClick={() => toggleFam(k)}>{l}</button>
            ))}
          </div>
        </div>
        <div className="dt-q"><span>Do you have a child with an inherited condition?</span>
          <Seg label="Affected child" value={f.affected_child ? 'yes' : 'no'} onChange={(v) => up('affected_child', v === 'yes')} options={[['no', 'No'], ['yes', 'Yes']]} />
        </div>
        <div className="dt-q"><span>Preferred language for your report</span>
          <Seg label="Language" value={f.preferred_language} onChange={(v) => up('preferred_language', v)} options={LANGS} />
        </div>
      </section>

      <section className="ik-submit">
        <label className="mc-demo">
          <span>Demo: which simulated Malaffi record?</span>
          <select value={scenario} onChange={(e) => setScenario(e.target.value)}>
            <option value="">Automatic (each account gets a different one)</option>
            {Object.entries(SCENARIOS).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}
          </select>
        </label>
        <button type="submit" className="btn ik-go" disabled={!!busy || !scopes.identity || !scopes.results}>
          {busy || 'I consent: save and fetch my results'}
        </button>
        {err && <p className="err" role="alert">{err}</p>}
        <small className="muted">Malaffi is simulated with synthetic records, never real patient data.</small>
      </section>
    </form>
  );
}

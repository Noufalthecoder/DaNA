/* Onboarding, outside the app. A couple member enters DaNA only after finishing it:
   1 About you · 2 Verify identity (UAE PASS) · 3 Consent · 4 Marriage & pregnancy · 5 Family history · 6 Get your results.
   Root.jsx sends every /app page here until the person is verified (profile + identity + consent + details + results). */
import { useEffect, useState } from 'react';
import { useStore, signOut, set, get } from '../shared/store.js';
import { setUserScreened } from '../shared/screeningPersistence.js';
import MalaffiRecord from '../shared/MalaffiRecord.jsx';
import { refreshSession, signOut as supabaseSignOut } from '../shared/supabase.js';
import { startMyProfile, setMySex, linkUaePass, myIdentity, submitIntake, fetchMalaffi, loadAll } from '../shared/db.js';
import { PEOPLE } from '../shared/data.js';
import { SCENARIOS } from '../shared/scenarios.js';
import { Brand } from '../shared/Logo.jsx';
import { go } from '../shared/router.js';
import './onboarding.css';
import { LangSwitch } from '../shared/Translator.jsx';
import { getLang } from '../shared/i18n.js';

const STEPS = ['About you', 'Verify identity', 'Consent', 'Marriage & pregnancy', 'Family history', 'Get your results'];
const FAMILY = [
  ['thalassaemia', 'Thalassaemia'], ['sickle_cell', 'Sickle cell disease'], ['g6pd', 'G6PD deficiency'],
  ['hearing_loss', 'Hearing loss from birth'], ['sma', 'Spinal muscular atrophy'], ['cystic_fibrosis', 'Cystic fibrosis'],
  ['other', 'Another inherited condition'],
];
const RELATED = [['no', 'No'], ['first_cousin', 'First cousins'], ['second_cousin', 'Second cousins'], ['other_relative', 'Other relatives'], ['not_sure', 'Not sure']];
const LANGS = [['en', 'English'], ['ar', 'العربية'], ['ur', 'اردو']];
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

function Choice({ value, options, onChange, label, big }) {
  return (
    <div className={`ob-choice${big ? ' big' : ''}`} role="radiogroup" aria-label={label}>
      {options.map(([v, l, hint]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          <b>{l}</b>{hint && <small>{hint}</small>}
        </button>
      ))}
    </div>
  );
}

function Q({ label, hint, children }) {
  return <div className="ob-q"><label>{label}</label>{hint && <p className="ob-hint">{hint}</p>}{children}</div>;
}

export default function Onboarding() {
  const session = useStore((s) => s.session);
  const viaUaePass = session?.via === 'uaepass';
  const [step, setStep] = useState(session?.needsProfile ? 0 : 1);
  const [sex, setSex] = useState(session?.needsProfile ? '' : (PEOPLE[session?.id]?.sex || ''));
  const [id, setId] = useState(null);
  const [scopes, setScopes] = useState({ identity: false, results: false, contact: false });
  const d0 = session?.details || {};
  const [f, setF] = useState({
    marital_status: d0.marital_status || '', wedding_date: d0.wedding_date || '', pregnant: !!d0.pregnant,
    pregnancy_weeks: d0.pregnancy_weeks || '', related_to_partner: d0.related_to_partner || '',
    family_history: d0.family_history || [], family_notes: d0.family_notes || '', affected_child: d0.affected_child ?? null,
    preferred_language: d0.preferred_language || getLang(),
  });
  const [scenario, setScenario] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const up = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const female = sex === 'F';

  // the identity that came with a UAE PASS sign-in is ready at once; others link it on step 2
  useEffect(() => {
    myIdentity().then((i) => { if (i) setId(i); }).catch(() => {});
  }, []);

  const run = async (label, fn) => {
    setErr(''); setBusy(label);
    try { await fn(); } catch (e) { setErr(e.message); setBusy(''); return false; }
    setBusy(''); return true;
  };

  const next = async () => {
    if (step === 0) {
      if (!sex) return setErr('Choose female or male.');
      const ok = await run('Saving…', async () => {
        if (session?.needsProfile) await startMyProfile(sex); else await setMySex(sex);
        await refreshSession();
      });
      if (ok) setStep(1);
    } else if (step === 1) {
      if (!id) return setErr('Verify your identity with UAE PASS to continue.');
      setStep(2);
    } else if (step === 2) {
      if (!scopes.identity || !scopes.results) return setErr('Your identity and your premarital results are needed. Tick both to continue.');
      setErr(''); setStep(3);
    } else if (step === 3) {
      if (!f.marital_status) return setErr('Choose your marital status.');
      if (!f.related_to_partner) return setErr('Tell us if you are related to your partner (choose "Not sure" if you do not know).');
      if (female && f.pregnant && !(Number(f.pregnancy_weeks) >= 1 && Number(f.pregnancy_weeks) <= 42)) return setErr('Enter the pregnancy weeks (1 to 42).');
      setErr(''); setStep(4);
    } else if (step === 4) {
      if (f.affected_child === null) return setErr('Answer the question about an affected child.');
      setErr(''); setStep(5);
    }
  };

  const verify = () => run('Waiting for approval in the UAE PASS app…', async () => {
    await new Promise((r) => setTimeout(r, 900)); // UAE PASS app approval (simulated)
    setId(await linkUaePass(viaUaePass));
  });

  const finish = () => run('Saving your consent and details…', async () => {
    await submitIntake(scopes, { ...f, affected_child: !!f.affected_child, pregnant: female && f.pregnant, pregnancy_weeks: female && f.pregnant ? Number(f.pregnancy_weeks) : null });
    setBusy('Fetching your premarital results from Malaffi… (up to a minute)');
    set({ obReview: true }); // keep onboarding open to review the import (Root.jsx)
    await fetchMalaffi(scenario || undefined);
    await refreshSession();
    await loadAll();
    setStep(6);
  });
  const enter = () => {
    setUserScreened(session?.id, true, {
      completed: true,
      mode: 'uae_pass',
      submittedAt: new Date().toISOString(),
      personal: {
        fullName: session?.name,
        gender: female ? 'Female' : 'Male',
        partnerName: session?.id === 'khalid' ? 'Fatima Al Hammadi' : (session?.id === 'fatima' ? 'Khalid Al Mansoori' : ''),
        maritalStatus: f.marital_status || 'Married',
        pregnancyStatus: female && f.pregnant ? 'yes' : 'no',
      },
      compliance: {
        isPregnant: female && f.pregnant ? 'yes' : 'no',
        gestationalWeeks: female && f.pregnant ? f.pregnancy_weeks : '',
      },
    });
    set({
      obReview: false,
      session: {
        ...(get().session || session),
        fresh: false,
        needsProfile: false,
        sexConfirmed: true,
        uaepassLinked: true,
        malaffiConsent: true,
        intakeDone: true,
      },
    });
    go('/app');
  };

  const leave = async () => { signOut(); try { await supabaseSignOut(); } catch {} go('/login'); };

  return (
    <div className="ob">
      <header className="ob-top">
        <Brand size={30} href="#/" />
        <div className="ob-who"><LangSwitch /><span>{session?.name}</span><button className="ghost" onClick={leave}>Sign out</button></div>
      </header>

      <div className="ob-title">
        <h1>Set up your premarital screening</h1>
        <p>About 3 minutes. You enter DaNA once this is done.</p>
      </div>

      <ol className="ob-steps" aria-label="Progress">
        {STEPS.map((l, i) => (
          <li key={l} className={i < step || step === 6 ? 'done' : i === step ? 'now' : ''} aria-current={i === step ? 'step' : undefined}>
            <span>{l}</span><i>{i < step || step === 6 ? '✓' : i + 1}</i>
          </li>
        ))}
      </ol>

      {step === 6 ? (
        <main className="ob-main">
          <h2>Imported from Malaffi</h2>
          <p className="ob-lead">This is what DaNA received. Check it, then enter DaNA to see what it means for you.</p>
          <section className="ob-card"><MalaffiRecord personId={session.id} /></section>
          <div className="ob-nav"><span /><button type="button" className="btn ob-go" onClick={enter}>Enter DaNA: see my result →</button></div>
        </main>
      ) : (
      <main className="ob-main">
        <h2>{STEPS[step]}</h2>
        <section className="ob-card">
          {step === 0 && (
            <Q label="I am" hint="Screening links a woman and a man, and some results are read differently for each.">
              <Choice big label="I am" value={sex} onChange={setSex} options={[['F', 'Female'], ['M', 'Male']]} />
            </Q>
          )}

          {step === 1 && (!id ? (
            <div className="ob-verify">
              <p>{viaUaePass ? 'Confirm your UAE PASS details.' : `You signed in with ${session?.via === 'google' ? 'Google' : 'email'}. Verify once with UAE PASS so Malaffi can find your record.`}</p>
              <button type="button" className="btn uaepass" onClick={verify} disabled={!!busy}>{busy || (viaUaePass ? 'Get my UAE PASS details' : 'Verify with UAE PASS')}</button>
              <small className="ob-hint">Demo: UAE PASS approval is simulated.</small>
            </div>
          ) : (
            <>
              <div className="ob-verified">✓ Verified by UAE PASS{id.source === 'uaepass_simulated' ? ' (simulated)' : ''}</div>
              <div className="ob-grid">
                {[['Full name', id.full_name_en], ['Emirates ID', id.emirates_id], ['Date of birth', fmtDate(id.date_of_birth)],
                  ['Sex', id.sex === 'F' ? 'Female' : id.sex === 'M' ? 'Male' : '—'], ['Nationality', id.nationality], ['Mobile', id.mobile], ['Email', id.email]]
                  .map(([l, v]) => <div key={l} className="ob-f"><small>{l}</small><b>{v || '—'}</b></div>)}
              </div>
              <p className="ob-hint">Filled in from UAE PASS and cannot be edited here. To correct them, update UAE PASS.</p>
            </>
          ))}

          {step === 2 && (
            <>
              <p className="ob-lead">Choose what DaNA may use. You can withdraw any time on the Privacy page.</p>
              {[['identity', 'My identity', 'required', 'Name, Emirates ID, date of birth, sex and nationality, to match the record to me.'],
                ['results', 'My premarital results from Malaffi', 'required', 'The genetic carrier test and blood tests, only to explain my result and support my care.'],
                ['contact', 'My contact details', 'optional', 'Mobile and email, so my counsellor can reach me about my result.']].map(([k, t, r, d]) => (
                <label key={k} className="ob-consent"><input type="checkbox" checked={scopes[k]} onChange={(e) => setScopes({ ...scopes, [k]: e.target.checked })} />
                  <span><b>{t}</b> <em>{r}</em><br />{d}</span></label>
              ))}
            </>
          )}

          {step === 3 && (
            <>
              <Q label="Marital status"><Choice label="Marital status" value={f.marital_status} onChange={(v) => up('marital_status', v)} options={[['single', 'Single'], ['engaged', 'Engaged'], ['married', 'Married']]} /></Q>
              {f.marital_status === 'engaged' && <Q label="Planned wedding date (optional)"><input className="ob-in" type="date" value={f.wedding_date} onChange={(e) => up('wedding_date', e.target.value)} /></Q>}
              <Q label="Are you related to your partner (or future partner)?" hint="Many happy couples are related. It only changes which conditions we look at more closely.">
                <Choice label="Related to partner" value={f.related_to_partner} onChange={(v) => up('related_to_partner', v)} options={RELATED} />
              </Q>
              {female && (
                <Q label="Are you pregnant now?">
                  <Choice label="Pregnant" value={f.pregnant ? 'yes' : 'no'} onChange={(v) => up('pregnant', v === 'yes')} options={[['no', 'No'], ['yes', 'Yes']]} />
                  {f.pregnant && <input className="ob-in" type="number" min="1" max="42" placeholder="Weeks" value={f.pregnancy_weeks} onChange={(e) => up('pregnancy_weeks', e.target.value)} />}
                </Q>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <Q label="Has anyone in your family had one of these?" hint="Tick any that apply. Leave all empty if none or not sure.">
                <div className="ob-chips">
                  {FAMILY.map(([k, l]) => {
                    const on = f.family_history.includes(k);
                    return <button key={k} type="button" className={on ? 'on' : ''} aria-pressed={on} onClick={() => up('family_history', on ? f.family_history.filter((x) => x !== k) : [...f.family_history, k])}>{on ? '✓ ' : ''}{l}</button>;
                  })}
                </div>
              </Q>
              {f.family_history.length > 0 && (
                <Q label="Who in your family? (optional)"><input className="ob-in wide" maxLength={500} placeholder="e.g. my uncle (father's brother) has thalassaemia" value={f.family_notes} onChange={(e) => up('family_notes', e.target.value)} /></Q>
              )}
              <Q label="Do you have a child with an inherited condition?">
                <Choice label="Affected child" value={f.affected_child === null ? '' : f.affected_child ? 'yes' : 'no'} onChange={(v) => up('affected_child', v === 'yes')} options={[['no', 'No'], ['yes', 'Yes']]} />
              </Q>
            </>
          )}

          {step === 5 && (
            <>
              <div className="ob-summary">
                <div><small>Identity</small><b>{id?.full_name_en} · {id?.emirates_id}</b></div>
                <div><small>Sharing</small><b>Identity, Malaffi results{scopes.contact ? ', contact details' : ''}</b></div>
                <div><small>Marital status</small><b>{f.marital_status}</b></div>
                <div><small>Family history</small><b>{f.family_history.length ? `${f.family_history.length} condition(s)` : 'None given'}</b></div>
              </div>
              <Q label="Language for your report"><Choice label="Language" value={f.preferred_language} onChange={(v) => up('preferred_language', v)} options={LANGS} /></Q>
              <Q label="Demo: which simulated Malaffi record?" hint="Malaffi is simulated with synthetic records, never real patient data.">
                <select className="ob-in" value={scenario} onChange={(e) => setScenario(e.target.value)}>
                  <option value="">Automatic (each account gets a different one)</option>
                  {Object.entries(SCENARIOS).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}
                </select>
              </Q>
            </>
          )}
        </section>

        {err && <p className="ob-err" role="alert">{err}</p>}

        <div className="ob-nav">
          {step > 0 ? <button type="button" className="ob-back" onClick={() => { setErr(''); setStep(step - 1); }} disabled={!!busy}>← Back</button> : <span />}
          {step < 5
            ? <button type="button" className="btn" onClick={next} disabled={!!busy || (step === 1 && !id)}>{busy && step === 0 ? busy : 'Continue →'}</button>
            : <button type="button" className="btn ob-go" onClick={finish} disabled={!!busy}>{busy || 'I consent: get my results'}</button>}
        </div>
      </main>
      )}
    </div>
  );
}

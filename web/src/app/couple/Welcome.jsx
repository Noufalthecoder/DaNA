/* Onboarding for a brand-new couple account. Owner: Couple app + Platform.
   1 screening intake → 2 health profile → 3 results from Malaffi → 4 link your partner.
   When the partner link is made, the couple's real journey (Home) opens. */
import { useEffect, useState } from 'react';
import { Page, Card, Steps, Badge } from '../shared/ui.jsx';
import { useStore, EMPTY_OBJ } from '../shared/store.js';
import { refreshSession } from '../shared/supabase.js';
import { startMyProfile, fetchMalaffi, startSampleJourney, loadAll } from '../shared/db.js';
import { GENES } from '../shared/data.js';
import { go } from '../shared/router.js';


export default function Welcome() {
  const session = useStore((s) => s.session);
  const intakes = useStore((s) => s.screeningIntakes) || EMPTY_OBJ;
  const reports = useStore((s) => s.reports) || EMPTY_OBJ;
  const intake = intakes[session.id];
  const hasProfile = !session.needsProfile;
  const report = hasProfile ? reports[session.id] : null;

  const [sex, setSex] = useState(intake?.personal?.gender === 'Male' ? 'M' : intake?.personal?.gender === 'Female' ? 'F' : '');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({});

  const run = async (key, fn) => {
    setBusy(key); setMsg((m) => ({ ...m, [key]: null }));
    try { await fn(); } catch (e) { setMsg((m) => ({ ...m, [key]: { err: e.message } })); }
    setBusy('');
  };

  // the partner may enter my code on their phone: check now and then, then open our journey
  useEffect(() => {
    if (!hasProfile) return;
    const t = setInterval(async () => {
      const s = await refreshSession().catch(() => null);
      if (s?.couple) { clearInterval(t); await loadAll(); go('/app'); }
    }, 15000);
    return () => clearInterval(t);
  }, [hasProfile]);

  const step = !intake?.completed ? 0 : !hasProfile ? 1 : !report ? 2 : 3;

  const createProfile = () => run('profile', async () => {
    if (!sex) throw new Error('Choose male or female.');
    await startMyProfile(sex);
    await refreshSession();
    loadAll();
  });
  const getResults = () => run('malaffi', async () => {
    const r = await fetchMalaffi();
    setMsg((m) => ({ ...m, malaffi: { ok: `Report ${r.report_id} received and verified.` } }));
  });
  const sample = () => run('sample', async () => {
    await startSampleJourney();
    await refreshSession();
    await loadAll();
    go('/app');
  });

  const Err = ({ k }) => (msg[k]?.err ? <p className="err">{msg[k].err}</p> : msg[k]?.ok ? <p className="ok-msg">{msg[k].ok}</p> : null);
  const carrierGene = report?.variants?.find((v) => ['pathogenic', 'likely_pathogenic'].includes(v.significance))?.gene;

  return (
    <Page title={`Welcome, ${(session.name || '').split(' ')[0]}`} sub="Four short steps to start your premarital journey together.">
      <Card>
        <Steps items={['Screening intake', 'Your profile', 'Your results', 'Link your partner']} current={step} />
      </Card>

      <div className="onb">
        <Card title="1 · Screening intake">
          {intake?.completed
            ? <p><Badge tone="green">Done</Badge> <span className="muted">Submitted {new Date(intake.submittedAt).toLocaleDateString()}</span></p>
            : <p className="muted">Your medical background, family history and consents. About 5 minutes.</p>}
          <a className={intake?.completed ? 'btn secondary' : 'btn'} href="#/app/screening">{intake?.completed ? 'Review intake' : 'Start intake'}</a>
        </Card>

        <Card title="2 · Your health profile">
          {hasProfile ? <p><Badge tone="green">Done</Badge> <span className="muted">Profile created</span></p> : (<>
            <p className="muted">Some conditions pass differently to sons and daughters, so we need this to read your result correctly.</p>
            <div className="seg" role="radiogroup" aria-label="Sex">
              {[['F', 'Female'], ['M', 'Male']].map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={sex === v} className={sex === v ? 'on' : ''} onClick={() => setSex(v)}>{l}</button>
              ))}
            </div>
            <button className="btn" onClick={createProfile} disabled={busy === 'profile'}>{busy === 'profile' ? 'Creating…' : 'Create my profile'}</button>
            <Err k="profile" />
          </>)}
        </Card>

        <Card title="3 · Your results from Malaffi">
          {!hasProfile ? <p className="muted">Available after step 2, <b>Create my profile</b>.</p> : report ? (<>
            <p><Badge tone="green">Verified</Badge> <span className="muted">{report.lab || 'Accredited lab'} · {report.date}</span></p>
            <p>{carrierGene ? <>You carry a change in <b>{carrierGene}</b> ({GENES[carrierGene]?.condition || 'see your report'}). This is common and does not affect your own health. What matters is your partner's result.</> : 'No changes found in the genes we screen for.'}</p>
            <a href="#/app/report">View my medical report →</a>
          </>) : (<>
            <p className="muted">We fetch your premarital lab report from Malaffi, check it is signed by an accredited lab, and save it securely.</p>
            <button className="btn" onClick={getResults} disabled={busy === 'malaffi'}>{busy === 'malaffi' ? 'Fetching… (up to a minute)' : 'Fetch my results from Malaffi'}</button>
            <p className="fine">Demo: Malaffi is simulated with a synthetic report.</p>
          </>)}
          <Err k="malaffi" />
        </Card>

        <Card title="4 · Link your partner">
          {!hasProfile
            ? <p className="muted">Available after step 2, <b>Create my profile</b>.</p>
            : <p className="muted">Get your invite code, send it by WhatsApp, or enter your partner's code. Linking creates your couple journey.</p>}
          <a className={hasProfile ? 'btn' : 'btn secondary'} href="#/app/connections">Link your partner →</a>
        </Card>
      </div>

      <p className="fine onb-sample">
        Just exploring? <button className="link" onClick={sample} disabled={!!busy}>Try DaNA with a sample partner</button> (you can't undo this for this account).
      </p>
      <Err k="sample" />
    </Page>
  );
}

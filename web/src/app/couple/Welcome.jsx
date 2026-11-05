/* Home before a partner is linked. Owner: Couple app + Platform.
   One journey card with ONE next step; the step is done right here when it can be
   (create profile, fetch results). Once a partner is linked, Home.jsx takes over. */
import { useState } from 'react';
import { Page, Card, Badge } from '../shared/ui.jsx';
import { useStore, EMPTY_OBJ } from '../shared/store.js';
import { refreshSession } from '../shared/supabase.js';
import { startMyProfile, setMySex, loadAll } from '../shared/db.js';
import MalaffiConsent from '../shared/MalaffiConsent.jsx';
import { CONDITIONS } from '../shared/explain.js';
import { useJourney, isRealReport } from '../shared/journey.js';
import Journey from '../shared/Journey.jsx';

export default function Welcome() {
  const session = useStore((s) => s.session);
  const intakes = useStore((s) => s.screeningIntakes) || EMPTY_OBJ;
  const reports = useStore((s) => s.reports) || EMPTY_OBJ;
  const { steps, current } = useJourney();
  const step = steps[current]?.key;
  const intake = intakes[session.id];
  const report = isRealReport(reports[session.id]) ? reports[session.id] : null;

  const confirming = !session.needsProfile; // old profile made automatically: confirm sex once
  const [sex, setSex] = useState(confirming ? '' : intake?.personal?.gender === 'Male' ? 'M' : intake?.personal?.gender === 'Female' ? 'F' : '');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const run = async (key, fn) => {
    setBusy(key); setErr('');
    try { await fn(); } catch (e) { setErr(e.message); }
    setBusy('');
  };

  const createProfile = () => run('profile', async () => {
    if (!sex) throw new Error('Choose female or male.');
    if (confirming) await setMySex(sex); else await startMyProfile(sex);
    await refreshSession();
    loadAll();
  });

  // the next step, done in place where possible
  let action = null;
  if (step === 'profile') {
    action = (
      <div className="jr-act">
        <div className="seg" role="radiogroup" aria-label="I am">
          {[['F', 'Female'], ['M', 'Male']].map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={sex === v} className={sex === v ? 'on' : ''} onClick={() => setSex(v)}>{l}</button>
          ))}
        </div>
        <button className="btn" onClick={createProfile} disabled={busy === 'profile'}>{busy === 'profile' ? 'Saving…' : confirming ? 'Confirm' : 'Create my profile'}</button>
      </div>
    );
  } else if (step === 'malaffi') {
    action = <MalaffiConsent onDone={() => loadAll()} />;
  }

  const carrierGene = report?.variants?.find((v) => ['pathogenic', 'likely_pathogenic'].includes(v.significance))?.gene;
  const partnerIsNext = steps[current]?.key === 'partner';

  return (
    <Page title={`Welcome, ${(session.name || '').split(' ')[0]}`} sub="Your premarital screening, one step at a time.">
      <Journey action={action} />
      {err && <p className="err">{err}</p>}

      <div className="grid2">
        <Card title="Your result">
          {report ? (<>
            <p><Badge tone={carrierGene ? 'amber' : 'green'}>{carrierGene ? 'Healthy carrier' : 'No change found'}</Badge></p>
            <p>{carrierGene
              ? <>You carry a change linked to <b>{CONDITIONS[carrierGene]?.name || carrierGene}</b>. Carriers are healthy. What matters is your partner's result.</>
              : 'No change was found in the genes we checked.'}</p>
            <a href="#/app/result">What does this mean? →</a>
          </>) : <p className="muted">Not fetched yet. It appears here after you give consent and we fetch it from Malaffi.</p>}
        </Card>
        <Card title="Your partner">
          <p className="muted">Screening is done as a couple, because the chance for a child depends on both of you. Link with your partner to see your couple result.</p>
          <a className={partnerIsNext ? 'btn' : 'btn secondary'} href="#/app/connections">Link your partner</a>
        </Card>
      </div>

    </Page>
  );
}

/* Home before a partner is linked. Owner: Couple app + Platform.
   One journey card with ONE next step; the step is done right here when it can be
   (create profile, fetch results). Once a partner is linked, Home.jsx takes over. */
import { useState } from 'react';
import { Page, Card, Badge } from '../shared/ui.jsx';
import { useStore, EMPTY_OBJ } from '../shared/store.js';
import { refreshSession } from '../shared/supabase.js';
import { startMyProfile, fetchMalaffi, startSampleJourney, loadAll } from '../shared/db.js';
import { CONDITIONS } from '../shared/explain.js';
import { useJourney } from '../shared/journey.js';
import { go } from '../shared/router.js';
import Journey from '../shared/Journey.jsx';

export default function Welcome() {
  const session = useStore((s) => s.session);
  const intakes = useStore((s) => s.screeningIntakes) || EMPTY_OBJ;
  const reports = useStore((s) => s.reports) || EMPTY_OBJ;
  const { steps, current } = useJourney();
  const step = steps[current]?.key;
  const intake = intakes[session.id];
  const report = reports[session.id];

  const [sex, setSex] = useState(intake?.personal?.gender === 'Male' ? 'M' : intake?.personal?.gender === 'Female' ? 'F' : '');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const run = async (key, fn) => {
    setBusy(key); setErr('');
    try { await fn(); } catch (e) { setErr(e.message); }
    setBusy('');
  };

  const createProfile = () => run('profile', async () => {
    if (!sex) throw new Error('Choose female or male.');
    await startMyProfile(sex);
    await refreshSession();
    loadAll();
  });
  const getResults = () => run('malaffi', async () => { await fetchMalaffi(); });
  const sample = () => run('sample', async () => {
    await startSampleJourney(); await refreshSession(); await loadAll(); go('/app');
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
        <button className="btn" onClick={createProfile} disabled={busy === 'profile'}>{busy === 'profile' ? 'Creating…' : 'Create my profile'}</button>
      </div>
    );
  } else if (step === 'result') {
    action = (
      <div className="jr-act">
        <button className="btn" onClick={getResults} disabled={busy === 'malaffi'}>{busy === 'malaffi' ? 'Fetching… (up to a minute)' : 'Fetch my results from Malaffi'}</button>
        <small className="muted">Demo: Malaffi is simulated with a synthetic report.</small>
      </div>
    );
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
          </>) : <p className="muted">Not fetched yet. It appears here once your profile is ready and you fetch it from Malaffi.</p>}
        </Card>
        <Card title="Your partner">
          <p className="muted">Screening is done as a couple, because the chance for a child depends on both of you. Link with your partner to see your couple result.</p>
          <a className={partnerIsNext ? 'btn' : 'btn secondary'} href="#/app/connections">Link your partner</a>
        </Card>
      </div>

      <p className="fine onb-sample">
        Just exploring? <button className="link" onClick={sample} disabled={!!busy}>Try DaNA with a sample partner</button> (you can't undo this for this account).
      </p>
    </Page>
  );
}

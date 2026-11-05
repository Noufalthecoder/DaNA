import { Page, Card, Stat, Badge } from '../shared/ui.jsx';
import Journey from '../shared/Journey.jsx';
import { useStore, EMPTY_OBJ, EMPTY_ARR } from '../shared/store.js';
import { useState } from 'react';
import { useCouple } from './useCouple.js';
import { fetchMalaffi } from '../shared/db.js';

export default function Home() {
  const { me, partner, result, couple } = useCouple();
  const intakes = useStore((s) => s.screeningIntakes) || EMPTY_OBJ;
  const myIntake = intakes[me.id];
  const isScreened = !!myIntake?.completed;

  // live couples: the result is only meaningful once BOTH lab reports are in
  const live = useStore((s) => !!s.session?.backend);
  const reports = useStore((s) => s.reports) || EMPTY_OBJ;
  const mine = reports[me.id];
  const theirs = reports[partner.id];
  const waiting = live && (!mine || !theirs);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fetchMine = async () => {
    setBusy(true); setErr('');
    try { await fetchMalaffi(); } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const sent = useStore((s) => s.alertsSent) || EMPTY_ARR;
  const plan = useStore((s) => (couple?.id ? s.plans[couple.id] : null) || s.plan);
  const booked = useStore((s) => (couple?.id ? s.appointments[couple.id] : null) || s.booked);

  return (
    <Page
      title={`Welcome, ${me.short}`}
      sub={
        `You and ${partner.short} · ${waiting ? 'waiting for lab results' : 'premarital screening'}`
      }
    >
      <Journey />

      <div className="grid2">
        <Card title="Your couple result">
          <div className="result-mini">
            {waiting ? (
              <>
                <Badge tone="grey">Waiting for results</Badge>
                <p>
                  You: <b>{mine ? 'received ✓' : 'not fetched yet'}</b> · {partner.short}: <b>{theirs ? 'received ✓' : 'not fetched yet'}</b>
                </p>
                {!mine
                  ? <p className="muted">Give your consent in the journey box above to fetch your results.</p>
                  : <p className="muted">We'll show your couple result as soon as {partner.short}'s report arrives.</p>}
                {err && <p className="err">{err}</p>}
              </>
            ) : (
              <>
                <Badge tone={result.type === 'clear' ? 'green' : 'amber'}>{result.label}</Badge>
                <p><b>{result.condition || 'No shared finding'}</b> · {result.risk}</p>
                <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                  <a href="#/app/result">What does this mean? →</a>
                  <a href="#/app/report" style={{ color: 'var(--ink2)' }}>View medical report →</a>
                  <a href="#/app/profile" style={{ color: 'var(--ink2)' }}>Update profile data →</a>
                </div>
              </>
            )}
          </div>
        </Card>
        <Card title="Your counsellor">
          <p className="muted">A genetics counsellor can explain your result, answer questions and help you think through options. Free and confidential.</p>
          <p style={{ margin: '12px 0' }}>{booked ? <><Badge tone="green">Booked</Badge> {booked}</> : <Badge tone="grey">Not booked yet</Badge>}</p>
          <a className="btn secondary" href="#/app/counsellor">{booked ? 'View booking' : 'Book a conversation'}</a>
        </Card>
      </div>

      <div className="tiles">
        <a className="tile" href="#/app/bonds"><small>Your plan</small><b>{plan ? plan.split(':')[0] : 'Not chosen yet'}</b><span>{plan ? 'Change any time' : 'Take your time →'}</span></a>
        <a className="tile" href="#/app/roots"><small>Relatives invited</small><b>{sent.length}</b><span>Anonymous alerts →</span></a>
        <a className="tile" href="#/app/my-report"><small>Your report</small><b>Ready</b><span>English · العربية · اردو →</span></a>
      </div>
    </Page>
  );
}

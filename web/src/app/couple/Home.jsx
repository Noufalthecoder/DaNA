import { Page, Card, Steps, Stat, Badge } from '../shared/ui.jsx';
import { useStore } from '../shared/store.js';
import { useCouple } from './useCouple.js';

export default function Home() {
  const { me, partner, result, couple } = useCouple();
  const sent = useStore((s) => s.alertsSent);
  const plan = useStore((s) => s.plans[couple.id]);
  const booked = useStore((s) => s.appointments[couple.id]);
  const step = plan ? (sent.length ? 4 : 3) : 2;
  const next = !plan
    ? { to: '#/app/bonds', t: 'Choose your plan together', p: 'See every option side by side, then decide as a couple.' }
    : !sent.length
      ? { to: '#/app/branches', t: 'Protect your family', p: 'Send private Sila alerts so relatives can screen early.' }
      : { to: '#/app/counsellor', t: 'Talk to your counsellor', p: 'Ask anything, any time. Dr. Mariam is one tap away.' };

  return (
    <Page title={`Welcome, ${me.short}`} sub={`You and ${partner.short} · premarital screening complete`}>
      <Card title="Your journey">
        <Steps items={['Screened', 'Results explained', 'Plan together', 'Protect family']} current={step} />
      </Card>

      <div className="grid2">
        <a className="card next" href={next.to}>
          <span className="eyebrow">Next step</span>
          <h2>{next.t}</h2>
          <p>{next.p}</p>
          <span className="go">Continue →</span>
        </a>
        <Card title="Your couple result">
          <div className="result-mini">
            <Badge tone={result.type === 'clear' ? 'green' : 'amber'}>{result.label}</Badge>
            <p><b>{result.condition}</b> · {result.risk}</p>
            <a href="#/app/roots">What does this mean? →</a>
          </div>
        </Card>
      </div>

      <div className="stats">
        <Stat label="Your plan" value={plan ? plan.split(':')[0] : 'Not chosen'} />
        <Stat label="Relatives invited" value={sent.length} note="anonymously" />
        <Stat label="Counsellor" value={booked ? 'Booked' : 'Available'} note={booked || 'Dr. Mariam'} />
      </div>
    </Page>
  );
}

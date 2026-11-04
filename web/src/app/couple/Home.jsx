import { Page, Card, Steps, Stat, Badge } from '../shared/ui.jsx';
import { useStore, EMPTY_OBJ, EMPTY_ARR } from '../shared/store.js';
import { useCouple } from './useCouple.js';

export default function Home() {
  const { me, partner, result, couple } = useCouple();
  const intakes = useStore((s) => s.screeningIntakes) || EMPTY_OBJ;
  const myIntake = intakes[me.id];
  const isScreened = !!myIntake?.completed;

  const sent = useStore((s) => s.alertsSent) || EMPTY_ARR;
  const plan = useStore((s) => (couple?.id ? s.plans[couple.id] : null) || s.plan);
  const booked = useStore((s) => (couple?.id ? s.appointments[couple.id] : null) || s.booked);

  // Stepper: 0 = Screened, 1 = Results explained, 2 = Plan together, 3 = Protect family
  const step = !isScreened
    ? 0
    : plan
      ? (sent.length ? 3 : 2)
      : 2;

  const next = !isScreened
    ? {
        to: '#/app/screening',
        t: 'Complete your screening intake',
        p: 'Auto-fill with UAE PASS or enter medical, family pedigree & compliance details.',
      }
    : !plan
      ? {
          to: '#/app/bonds',
          t: 'Choose your plan together',
          p: 'See every option side by side, then decide as a couple.',
        }
      : !sent.length
        ? {
            to: '#/app/roots',
            t: 'Protect your family',
            p: 'Send private Sila alerts so relatives can screen early.',
          }
        : {
            to: '#/app/counsellor',
            t: 'Talk to your counsellor',
            p: 'Ask anything, any time. Dr. Mariam is one tap away.',
          };

  return (
    <Page
      title={`Welcome, ${me.short}`}
      sub={
        isScreened
          ? `You and ${partner.short} · premarital screening complete`
          : `You and ${partner.short} · screening intake pending`
      }
    >
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
            {isScreened ? (
              <>
                <Badge tone={result.type === 'clear' ? 'green' : 'amber'}>{result.label}</Badge>
                <p><b>{result.condition}</b> · {result.risk}</p>
                <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                  <a href={result.type === 'plan' ? '#/app/bonds' : '#/app/counsellor'}>What does this mean? →</a>
                  <a href="#/app/report" style={{ color: 'var(--ink2)' }}>View medical report →</a>
                  <a href="#/app/profile" style={{ color: 'var(--ink2)' }}>Update profile data →</a>
                </div>
              </>
            ) : (
              <>
                <Badge tone="amber">Intake Pending Verification</Badge>
                <p>Complete the screening intake to unlock full variant comparison & clinical options.</p>
                <a href="#/app/screening">Start screening intake →</a>
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="stats four">
        <Stat
          label="Health Profile"
          value={isScreened ? 'Verified' : 'Pending'}
          note={isScreened ? (myIntake?.mode === 'uae_pass' ? 'UAE PASS verified · Profile' : 'Manual entry · Profile') : 'Action required'}
        />
        <Stat label="Your plan" value={plan ? plan.split(':')[0] : 'Not chosen'} />
        <Stat label="Relatives invited" value={sent.length} note="anonymously" />
        <Stat label="Counsellor" value={booked ? 'Booked' : 'Available'} note={booked || 'Dr. Mariam'} />
      </div>
    </Page>
  );
}

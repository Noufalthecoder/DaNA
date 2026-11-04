import { Page, Card, Badge } from '../shared/ui.jsx';
import { useStore } from '../shared/store.js';
import { choosePlan } from '../shared/db.js';
import { useCouple } from './useCouple.js';

const OPTIONS = [
  { id: 'IVF with embryo testing', d: 'Embryos are tested before pregnancy so only unaffected ones are used.', tags: ['Before pregnancy', 'Counsellor-led'] },
  { id: 'Prenatal testing', d: 'Natural pregnancy, with a test early on to know the baby’s status.', tags: ['During pregnancy'] },
  { id: 'Proceed fully informed', d: 'Have children naturally, prepared and supported from day one.', tags: ['Your choice, respected'] },
];

/* Bonds: compatible, with a plan */
export default function Bonds() {
  const { result, partner, couple } = useCouple();
  const plan = useStore((s) => s.plans[couple.id]);
  const approved = useStore((s) => s.approved.includes(couple.id));
  const choose = (id) => { if (id !== plan) choosePlan(couple.id, id); };

  return (
    <Page title="Bonds" sub="Compatible, with a plan. You decide together.">
      <Card title="What your results mean together" aside={<Badge tone="amber">{result.label}</Badge>}>
        <p className="lead-in">You and {partner.short} both carry <b>{result.gene}</b>. In each pregnancy:</p>
        <div className="odds">
          {[['Unaffected', 'clear'], ['Carrier, healthy', 'carrier'], ['Carrier, healthy', 'carrier'], ['Affected', 'affected']].map(([t, c], i) => (
            <div key={i} className={`odd ${c}`}><span />{t}</div>
          ))}
        </div>
        <p className="muted">That’s a 1 in 4 chance each time, the same for every pregnancy. With a plan, families like yours have healthy children.</p>
      </Card>

      <h2 className="sec-h">Your options, side by side</h2>
      <div className="options">
        {OPTIONS.map((o) => (
          <button key={o.id} className={`option ${plan === o.id ? 'on' : ''}`} onClick={() => choose(o.id)}>
            <h3>{o.id}</h3>
            <p>{o.d}</p>
            <div>{o.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div>
            <span className="pick">{plan === o.id ? (approved ? '✓ Our plan · approved by your counsellor' : '✓ Our plan · waiting for your counsellor') : 'Choose this'}</span>
          </button>
        ))}
      </div>
      <p className="disclaimer">DaNA never tells you whom to marry. Every choice is respected, and you can change it any time with your counsellor.</p>
    </Page>
  );
}

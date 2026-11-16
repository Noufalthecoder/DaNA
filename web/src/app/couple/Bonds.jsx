/* Bonds: the couple's combined result and their options, side by side. Owner: Couple app.
   Everything follows the couple's actual result (genetics.js): the condition, the chances and
   which options make sense. Plan choices match the database values (plans_choice_check). */
import { Page, Badge } from '../shared/ui.jsx';
import { useStore, EMPTY_OBJ } from '../shared/store.js';
import { choosePlan } from '../shared/db.js';
import { CONDITIONS, guide } from '../shared/explain.js';
import { isRealReport } from '../shared/journey.js';
import { useCouple } from './useCouple.js';

const OPTIONS = {
  'IVF with embryo testing': {
    title: 'IVF with embryo testing (PGT-M)',
    when: 'Before pregnancy',
    text: 'Embryos are made by IVF and tested. Only embryos that will not have the condition are placed in the womb.',
    good: 'Starts every pregnancy knowing the result.',
    think: 'Takes time and several clinic visits; ask about coverage.',
  },
  'Prenatal testing': {
    title: 'Testing during pregnancy',
    when: 'Early pregnancy',
    text: 'You conceive naturally. Around weeks 11–16 a test (CVS or amniocentesis) shows whether the baby has the condition.',
    good: 'Natural conception, early answer.',
    think: 'Decisions come during the pregnancy; a counsellor supports you.',
  },
  'Proceed fully informed': {
    title: 'Go ahead, fully informed',
    when: 'Any time',
    text: 'You conceive naturally with no extra tests, and the care team is ready from day one.',
    good: 'No procedures; specialist care is planned in advance.',
    think: 'You learn the result at or after birth.',
  },
};

/* figures for one pregnancy, per result type */
const ODDS = {
  plan: [['clear', 'Does not carry it', '1 in 4'], ['carrier', 'Healthy carrier', '1 in 4'], ['carrier', 'Healthy carrier', '1 in 4'], ['affected', 'Has the condition', '1 in 4']],
  xlinked: [['clear', 'Son: does not have it', '1 in 2 sons'], ['affected', 'Son: has the condition', '1 in 2 sons'], ['clear', 'Daughter: does not carry it', '1 in 2 daughters'], ['carrier', 'Daughter: healthy carrier', '1 in 2 daughters']],
  carrier: [['clear', 'Does not carry it', '1 in 2'], ['carrier', 'Healthy carrier', '1 in 2']],
};

function Kid({ kind }) {
  const fill = kind === 'affected' ? 'var(--amber)' : kind === 'carrier' ? 'url(#bd-half)' : 'none';
  return (
    <svg viewBox="0 0 40 56" width="40" height="56" aria-hidden="true" className={`kid kid-${kind}`}>
      <defs><linearGradient id="bd-half" x1="0" x2="1"><stop offset="50%" stopColor="var(--green)" /><stop offset="50%" stopColor="transparent" /></linearGradient></defs>
      <circle cx="20" cy="12" r="9" fill={fill} stroke="currentColor" strokeWidth="2.5" />
      <path d="M6 54 Q6 26 20 26 Q34 26 34 54 Z" fill={fill} stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

export default function Bonds() {
  const { result, partner, me, couple, isConnected, session } = useCouple();
  const reports = useStore((s) => s.reports) || EMPTY_OBJ;
  const live = !!session?.backend;
  const coupleId = couple?.id;
  const plan = useStore((s) => (coupleId ? s.plans?.[coupleId] : null)) || null;
  const approved = useStore((s) => (coupleId && Array.isArray(s.approved) ? s.approved.includes(coupleId) : false));
  const counsellor = useStore((s) => (coupleId ? s.cases?.[coupleId]?.counsellor : null));
  const bothResults = !live || (isRealReport(reports[me.id]) && isRealReport(reports[partner.id]));

  if (!isConnected || !couple) {
    return (
      <Page title="Bonds" sub="Your combined result and your options, as a couple">
        <section className="rs-card bd-empty">
          <h3>Link your partner first</h3>
          <p>Your combined result needs both of you. Ask your partner for their DaNA ID and connect.</p>
          <a className="btn" href="#/app/connections">Go to Connections</a>
        </section>
      </Page>
    );
  }
  if (!bothResults) {
    return (
      <Page title="Bonds" sub={`${me.short} & ${partner.short}`}>
        <section className="rs-card bd-empty">
          <h3>Waiting for both results</h3>
          <p>{isRealReport(reports[me.id]) ? `${partner.short} has not fetched their result yet.` : 'Fetch your result from Malaffi on Home first.'} Your combined result appears here as soon as both are in.</p>
          <a className="btn" href="#/app">Go to Home</a>
        </section>
      </Page>
    );
  }

  const g = guide({ stage: 'couple', type: result.type, gene: result.gene, partnerName: partner.short, partnerIsCarrier: !!partner.carrier && !me.carrier });
  const cond = result.gene ? CONDITIONS[result.gene] : null;
  const odds = ODDS[result.type];
  const needsPlan = result.type === 'plan' || result.type === 'xlinked';

  const choose = (id) => { if (id !== plan) choosePlan(coupleId, id); };

  return (
    <Page
      title="Bonds"
      sub={`Your combined result · ${me.short} & ${partner.short}`}
      actions={
        <a
          href="#/app/plan"
          className="btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          View 7-Stage Care Plan →
        </a>
      }
    >
      <section className={`rs-hero rs-${g.tone}`}>
        <span className="rs-eyebrow">Your combined result</span>
        <h2>{g.title}</h2>
        <p>{g.line}</p>
        <div className="bd-tags">
          <Badge tone={result.type === 'clear' || result.type === 'carrier' ? 'green' : result.type === 'uncertain' ? 'grey' : 'amber'}>{result.label}</Badge>
          {cond && <Badge>{cond.name}</Badge>}
        </div>
      </section>

      {odds && (
        <section className="rs-card">
          <h3>{result.type === 'xlinked' ? 'For each pregnancy: sons and daughters differ' : 'For each pregnancy'}</h3>
          <div className={`bd-odds bd-odds-${odds.length}`}>
            {odds.map(([k, label, chance], i) => (
              <div key={i} className="bd-odd"><Kid kind={k} /><b>{chance}</b><span>{label}</span></div>
            ))}
          </div>
          <p className="muted">
            {result.type === 'plan' && '3 out of 4 children are healthy. Each pregnancy has the same chances, whatever happened before.'}
            {result.type === 'xlinked' && 'Daughters are usually healthy. Each pregnancy has the same chances.'}
            {result.type === 'carrier' && `A child cannot get ${cond?.name || 'the condition'} from you, because only one of you carries it.`}
          </p>
          {cond && <p className="bd-cond"><b>About {cond.name}:</b> {cond.what} {cond.care}</p>}
        </section>
      )}

      {needsPlan ? (
        <>
          <h2 className="sec-h">Your options, side by side</h2>
          <p className="muted bd-lead">All three are safe, accepted choices. There is no right answer, and no deadline. Choose together, then talk it through with your counsellor.</p>
          <div className="bd-options">
            {Object.entries(OPTIONS).map(([id, o]) => (
              <button key={id} type="button" className={`bd-opt ${plan === id ? 'on' : ''}`} onClick={() => choose(id)} aria-pressed={plan === id}>
                <span className="bd-when">{o.when}</span>
                <h3>{o.title}</h3>
                <p>{o.text}</p>
                <dl><dt>Good to know</dt><dd>{o.good}</dd><dt>Think about</dt><dd>{o.think}</dd></dl>
                <span className="bd-pick">{plan === id ? (approved ? '✓ Your plan · counsellor approved' : '✓ Your plan · counsellor will review') : 'Choose this'}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <section className="rs-next">
          <div>
            <span className="rs-eyebrow">What to do</span>
            <h3>{g.next.title}</h3>
            <p>{result.type === 'uncertain' ? g.next.text : 'No extra tests or plans are needed for your future children. You can still talk to a counsellor any time.'}</p>
          </div>
          <div className="rs-next-act">
            <a className="btn" href={result.type === 'uncertain' ? '#/app/counsellor' : '#/app/my-report'}>{result.type === 'uncertain' ? 'Talk to a counsellor' : 'Download my report'}</a>
          </div>
        </section>
      )}

      {needsPlan && (
        <section className="rs-next">
          <div>
            <span className="rs-eyebrow">Next</span>
            <h3>Talk it through with {counsellor || 'a counsellor'}</h3>
            <p>Free and private. Ask anything: how each option works, costs and coverage, what feels right for you.</p>
          </div>
          <div className="rs-next-act"><a className="btn" href="#/app/counsellor">Book a session</a></div>
        </section>
      )}

      <p className="rs-foot">Every choice is yours. DaNA explains; it never tells anyone whom to marry or what to decide.</p>
    </Page>
  );
}

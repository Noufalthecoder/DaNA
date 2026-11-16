/* Routes' entry for the combined report: the couple's own (Bonds) and the counsellor's (case). Owner: Platform. */
import { Page } from './ui.jsx';
import { useStore, EMPTY_OBJ } from './store.js';
import { COUPLES, PEOPLE, GENES } from './data.js';
import { assess, TIER_PRIORITY } from './genetics.js';
import { personalStatus, isRealReport } from './journey.js';
import { danaIdFor } from './connectionsService.js';
import { useCouple } from '../couple/useCouple.js';
import CoupleReport from './CoupleReport.jsx';

function partnerOf(id, reports) {
  const p = PEOPLE[id] || { name: 'Partner', short: 'Partner', sex: 'M' };
  return { id, name: p.name, short: p.short, sex: p.sex, danaId: danaIdFor(id), status: personalStatus(p.sex, p.carrier, GENES[p.carrier]?.inheritance), report: reports[id] || null };
}

/* the couple's own copy, opened from Bonds */
export function MyCoupleReport() {
  const { couple, me, partner, result, isConnected, session } = useCouple();
  const reports = useStore((s) => s.reports) || EMPTY_OBJ;
  const plan = useStore((s) => (couple ? s.plans?.[couple.id] : null)) || null;
  const approved = useStore((s) => (couple && Array.isArray(s.approved) ? s.approved.includes(couple.id) : false));
  const counsellor = useStore((s) => (couple ? s.cases?.[couple.id]?.counsellor : null));
  const live = !!session?.backend;
  const ready = isConnected && couple && (!live || (isRealReport(reports[me.id]) && isRealReport(reports[partner.id])));
  if (!ready) {
    return (
      <Page title="Couple report" sub="Your combined report">
        <section className="rs-card bd-empty">
          <h3>Your combined report needs both results</h3>
          <p>Link your partner and fetch both results first. The report appears here, ready to view or download.</p>
          <a className="btn" href="#/app/bonds">Back to Bonds</a>
        </section>
      </Page>
    );
  }
  return (
    <CoupleReport couple={couple} partners={[partnerOf(me.id, reports), partnerOf(partner.id, reports)]} result={result}
      plan={plan} approved={approved} counsellor={counsellor} backHref="#/app/bonds" live={live} audience="couple" />
  );
}

/* the same document for the assigned counsellor, opened from the case */
export function CaseCoupleReport({ id }) {
  const couple = COUPLES.find((c) => c.id === id);
  const reports = useStore((s) => s.reports) || EMPTY_OBJ;
  const plan = useStore((s) => s.plans?.[id]) || null;
  const approved = useStore((s) => Array.isArray(s.approved) && s.approved.includes(id));
  const liveCase = useStore((s) => s.cases?.[id]);
  const live = !!useStore((s) => s.session?.backend);
  if (!couple) return <Page title="Case not found"><a href="#/app">← Back to queue</a></Page>;
  const result = assess(couple);
  if (liveCase) { result.tier = liveCase.tier; result.priority = TIER_PRIORITY[result.tier]; }
  return (
    <CoupleReport couple={couple} partners={[partnerOf(couple.a, reports), partnerOf(couple.b, reports)]} result={result}
      plan={plan} approved={approved} counsellor={liveCase?.counsellor} backHref={`#/app/case/${id}`} live={live} audience="counsellor" />
  );
}

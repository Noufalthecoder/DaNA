/* "Your result, explained" (challenge requirement 1). Owner: Couple app.
   Numbers: genetics.js. Words: shared/explain.js (versioned, reviewable). Viewing is audited. */
import { useEffect, useRef } from 'react';
import { Page, Card, Badge } from '../shared/ui.jsx';
import { useStore, EMPTY_OBJ } from '../shared/store.js';
import { logAudit } from '../shared/db.js';
import { explain, explainIndividual, guide, CONDITIONS, EXPLAIN_VERSION, EXPLAIN_STATUS } from '../shared/explain.js';
import { GENES } from '../shared/data.js';
import { set } from '../shared/store.js';
import { useCouple } from './useCouple.js';
import Quiz from '../shared/Quiz.jsx';
import { EscalationNote } from '../shared/CarePath.jsx';
import { isLinked, isRealReport, personalStatus } from '../shared/journey.js';

/* one child figure: outline = does not carry, half = healthy carrier, full = has the condition */
function Child({ kind }) {
  const fill = kind === 'affected' ? 'var(--amber, #B45309)' : kind === 'carrier' ? 'url(#half)' : 'none';
  return (
    <svg viewBox="0 0 40 56" width="44" height="62" aria-hidden="true" className={`kid kid-${kind}`}>
      <defs>
        <linearGradient id="half" x1="0" x2="1" y1="0" y2="0">
          <stop offset="50%" stopColor="var(--green, #0a7a3e)" /><stop offset="50%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="12" r="9" fill={fill} stroke="currentColor" strokeWidth="2.5" />
      <path d="M6 54 Q6 26 20 26 Q34 26 34 54 Z" fill={fill} stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

function Chances({ o }) {
  return (
    <div className="xp-chances">
      <p className="xp-lead">{o.title}</p>
      <div className="xp-kids" role="list">
        {o.kids.map((k, i) => (
          <div key={i} className="xp-kid" role="listitem">
            <Child kind={k.kind} />
            <b>{k.chance}</b>
            <span>{k.label}</span>
          </div>
        ))}
      </div>
      <ul className="xp-sum">{o.summary.map(([n, t]) => <li key={t}><b>{n}</b> {t}</li>)}</ul>
      <p className="muted">{o.note}</p>
    </div>
  );
}


export default function Result() {
  const { me, partner, result, isConnected, couple } = useCouple();
  const live = useStore((s) => !!s.session?.backend);
  const reports = useStore((s) => s.reports) || EMPTY_OBJ;
  // individual first: before linking (Connections) only MY result is explained, never someone else's
  const session = useStore((s) => s.session);
  const fresh = !!session?.fresh;
  const linked = live ? (isConnected && isLinked(session)) : true;
  const mine = live || fresh ? isRealReport(reports[me.id]) : true;
  const theirs = live ? isRealReport(reports[partner.id]) : true;
  const stage = !mine ? 'no-result' : !linked ? 'individual' : !theirs ? 'partner-waiting' : 'couple';
  const waiting = stage !== 'couple';
  const status = personalStatus(me.sex, me.carrier, GENES[me.carrier]?.inheritance);
  useEffect(() => {
    if (stage === 'no-result') return;
    set((s) => (s.resultSeen?.[me.id] ? {} : { resultSeen: { ...(s.resultSeen || {}), [me.id]: true } }));
  }, [stage, me.id]);
  const x = explain(result, { meCarrier: !!me.carrier, partnerCarrier: !!partner.carrier, partnerName: partner.short });

  // audit: the person viewed their explanation (once per visit) - also feeds comprehension metrics later
  const logged = useRef(false);
  useEffect(() => {
    if (logged.current || waiting) return;
    logged.current = true;
    logAudit(`Viewed the couple result (${EXPLAIN_VERSION}, ${result.type})`, { resourceType: 'couples', resourceId: couple?.id }).catch(() => {});
  }, [waiting, result.type]);

  const loggedMine = useRef(false);
  useEffect(() => {
    if (loggedMine.current || (stage !== 'individual' && stage !== 'partner-waiting')) return;
    loggedMine.current = true;
    logAudit(`Viewed individual result explanation (${EXPLAIN_VERSION}, ${me.carrier ? 'carrier' : 'no change found'})`).catch(() => {});
  }, [stage, me.carrier]);

  if (stage === 'no-result') {
    return (
      <Page title="Your result, explained" sub="Plain-language explanation of your screening result">
        <Card>
          <p><Badge tone="grey">No result yet</Badge></p>
          <p>Fetch your premarital lab result from Malaffi first. Then this page explains what it means for you.</p>
          <div className="btn-row"><a className="btn" href="#/app">Go to Home</a></div>
        </Card>
      </Page>
    );
  }

  const g = guide({
    stage, status, type: result.type, gene: stage === 'couple' ? (result.gene || me.carrier) : me.carrier,
    partnerName: partner.short, partnerIsCarrier: !!partner.carrier && !me.carrier,
  }) || guide({ stage: 'individual', status, gene: me.carrier, partnerName: partner.short });
  const cond = x.condition || (me.carrier && CONDITIONS[me.carrier]);
  const limits = stage === 'couple' ? x.limits : explainIndividual({ gene: me.carrier }).limits;
  const next = g.next;

  return (
    <Page title="Your result" sub={stage === 'couple' ? `For ${me.short} and ${partner.short}` : `For ${me.short}`}>
      <section className={`rs-hero rs-${g.tone}`}>
        <span className="rs-eyebrow">{g.eyebrow}</span>
        <h2>{g.title}</h2>
        <p>{g.line}</p>
        <ul className="rs-facts">
          {g.facts.map((f) => <li key={f}><span aria-hidden="true">✓</span>{f}</li>)}
        </ul>
      </section>

      {stage === 'couple' && <EscalationNote result={result} couple={couple} />}

      {stage === 'couple' && status === 'xl_male' && (() => {
        const own = guide({ stage: 'individual', status, gene: me.carrier });
        return (
          <section className="rs-card rs-own">
            <span className="rs-eyebrow">About your own result</span>
            <h3>{own.title}</h3>
            <p>{own.line}</p>
            <div className="btn-row"><a className="btn" href="#/app/counsellor">{own.next.label}</a></div>
          </section>
        );
      })()}

      {stage === 'couple' && x.outcomes && (
        <section className="rs-card">
          <h3>What it means for a child</h3>
          <Chances o={x.outcomes} />
          <div className="xp-legend" aria-label="Key">
            <span><Child kind="clear" />Does not carry it</span>
            <span><Child kind="carrier" />Healthy carrier</span>
            <span><Child kind="affected" />Has the condition</span>
          </div>
        </section>
      )}

      <section className="rs-next">
        <div>
          <span className="rs-eyebrow">What to do</span>
          <h3>{next.title}</h3>
          <p>{next.text}</p>
        </div>
        <div className="rs-next-act">
          {next.href && <a className="btn" href={next.href}>{next.label}</a>}
          {next.href !== '#/app/my-report' && <a className="btn-soft rs-soft" href="#/app/my-report">Download my report</a>}
        </div>
      </section>

      <section className="rs-card">
        <h3>Questions people often ask</h3>
        <div className="rs-faq">
          {g.worries.map(([q, a], i) => (
            <details key={q} open={i === 0}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <Quiz stage={stage} status={status} type={stage === 'couple' ? result.type : null} />

      <details className="rs-more">
        <summary>More details about this test</summary>
        {cond && <div className="rs-cond"><b>About {cond.name}</b><p>{cond.what}</p><p>{cond.care}</p></div>}
        <ul>{limits.map((t) => <li key={t}>{t}</li>)}</ul>
      </details>

      <p className="rs-foot">Every choice is yours. DaNA explains; it never tells anyone whom to marry or what to decide.</p>
      <p className="fine">Education, not medical advice · Wording {EXPLAIN_VERSION} · {EXPLAIN_STATUS}{stage === 'couple' ? ` · rules ${result.version}` : ''}</p>
    </Page>
  );
}

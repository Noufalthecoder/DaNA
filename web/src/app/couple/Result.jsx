/* "Your result, explained" (challenge requirement 1). Owner: Couple app.
   Numbers: genetics.js. Words: shared/explain.js (versioned, reviewable). Viewing is audited. */
import { useEffect, useRef } from 'react';
import { Page, Card, Badge } from '../shared/ui.jsx';
import { useStore, EMPTY_OBJ } from '../shared/store.js';
import { logAudit } from '../shared/db.js';
import { explain, explainIndividual, EXPLAIN_VERSION, EXPLAIN_STATUS } from '../shared/explain.js';
import { useCouple } from './useCouple.js';
import { isLinked, isRealReport } from '../shared/journey.js';

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

const Section = ({ n, title, children }) => (
  <Card title={<span className="xp-h"><span className="xp-n">{n}</span>{title}</span>}>{children}</Card>
);

export default function Result() {
  const { me, partner, result, isConnected } = useCouple();
  const live = useStore((s) => !!s.session?.backend);
  const reports = useStore((s) => s.reports) || EMPTY_OBJ;
  // individual first: before linking (Connections) only MY result is explained, never someone else's
  const session = useStore((s) => s.session);
  const linked = live ? (isConnected && isLinked(session)) : true;
  const mine = live ? isRealReport(reports[me.id]) : true;
  const theirs = live ? isRealReport(reports[partner.id]) : true;
  const stage = !mine ? 'no-result' : !linked ? 'individual' : !theirs ? 'partner-waiting' : 'couple';
  const waiting = stage !== 'couple';
  const x = explain(result, { meCarrier: !!me.carrier, partnerCarrier: !!partner.carrier, partnerName: partner.short });

  // audit: the person viewed their explanation (once per visit) - also feeds comprehension metrics later
  const logged = useRef(false);
  useEffect(() => {
    if (logged.current || waiting) return;
    logged.current = true;
    logAudit(`Viewed result explanation (${EXPLAIN_VERSION}, ${result.type})`).catch(() => {});
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

  if (stage === 'individual' || stage === 'partner-waiting') {
    const xi = explainIndividual({ gene: me.carrier });
    let k = 0;
    return (
      <Page title="Your result, explained" sub={`For ${me.short} · your own screening result`}>
        <div className="xp-top">
          <Badge tone={me.carrier ? 'amber' : 'green'}>{me.carrier ? 'Healthy carrier' : 'No change found'}</Badge>
          <span className="xp-tag">Education · not medical advice</span>
        </div>
        <Section n={++k} title="About you">
          <h3 className="xp-t">{xi.you.title}</h3>
          {xi.you.body.map((t) => <p key={t}>{t}</p>)}
          {xi.condition && (
            <div className="xp-cond"><b>{xi.condition.name}</b><p>{xi.condition.what}</p><p>{xi.condition.care}</p></div>
          )}
        </Section>
        <Section n={++k} title={xi.partner.title}>
          {xi.partner.body.map((t) => <p key={t}>{t}</p>)}
          {stage === 'individual'
            ? <div className="btn-row"><a className="btn" href="#/app/connections">Link your partner</a></div>
            : <p><Badge tone="grey">Linked with {partner.short}</Badge> <span className="muted">Waiting for {partner.short}'s result. Your couple explanation appears here when it arrives.</span></p>}
        </Section>
        <Section n={++k} title={xi.notDiagnosis.title}>
          {xi.notDiagnosis.body.map((t) => <p key={t}>{t}</p>)}
        </Section>
        <Section n={++k} title="What this test can and cannot tell you">
          <ul className="xp-list">{xi.limits.map((t) => <li key={t}>{t}</li>)}</ul>
        </Section>
        <p className="fine">Wording {EXPLAIN_VERSION} · {EXPLAIN_STATUS}</p>
      </Page>
    );
  }

  let n = 0;
  return (
    <Page title="Your result, explained" sub={`For ${me.short} and ${partner.short} · ${result.condition || 'premarital screening'}`}>
      <div className="xp-top">
        <Badge tone={result.type === 'clear' ? 'green' : result.type === 'uncertain' ? 'grey' : 'amber'}>{result.label}</Badge>
        <span className="xp-tag">Education · not medical advice</span>
      </div>

      <Section n={++n} title="About you">
        <h3 className="xp-t">{x.you.title}</h3>
        {x.you.body.map((t) => <p key={t}>{t}</p>)}
      </Section>

      {x.couple && (
        <Section n={++n} title="About you as a couple">
          <h3 className="xp-t">{x.couple.title}</h3>
          {x.couple.body.map((t) => <p key={t}>{t}</p>)}
          {x.condition && (
            <div className="xp-cond">
              <b>{x.condition.name}</b>
              <p>{x.condition.what}</p>
              <p>{x.condition.care}</p>
            </div>
          )}
        </Section>
      )}

      {x.outcomes && (
        <Section n={++n} title="What it could mean for a child">
          <Chances o={x.outcomes} />
          <div className="xp-legend" aria-label="Key">
            <span><Child kind="clear" />Does not carry it</span>
            <span><Child kind="carrier" />Healthy carrier</span>
            <span><Child kind="affected" />Has the condition</span>
          </div>
        </Section>
      )}

      <Section n={++n} title={x.notDiagnosis.title}>
        {x.notDiagnosis.body.map((t) => <p key={t}>{t}</p>)}
      </Section>

      <Section n={++n} title="What this test can and cannot tell you">
        <ul className="xp-list">{x.limits.map((t) => <li key={t}>{t}</li>)}</ul>
      </Section>

      {x.options.length > 0 && (
        <Section n={++n} title="What you can do next">
          <ul className="xp-list">{x.options.map((t) => <li key={t}>{t}</li>)}</ul>
          <p className="xp-choice">Every choice is yours. DaNA explains; it never tells anyone whom to marry or what to decide.</p>
          <div className="btn-row">
            <a className="btn" href="#/app/counsellor">Talk to a counsellor</a>
            <a className="btn secondary" href="#/app/bonds">See the options side by side</a>
          </div>
        </Section>
      )}

      <p className="fine">Wording {EXPLAIN_VERSION} · {EXPLAIN_STATUS} · numbers from rules engine {result.version}</p>
    </Page>
  );
}

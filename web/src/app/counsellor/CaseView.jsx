import { useState, useEffect } from 'react';
import { supabase } from '../shared/supabase.js';
import { Page, Card, Priority, Badge } from '../shared/ui.jsx';
import { COUPLES, PEOPLE, GENES, REFERRAL_DESTINATIONS } from '../shared/data.js';
import { assess, TIER_PRIORITY } from '../shared/genetics.js';
import Report from '../shared/Report.jsx';
import { useStore } from '../shared/store.js';
import { addNote as saveNote, approvePlan, approveNote, addReferral, loadAll } from '../shared/db.js';
import { CarePathControls, escalation } from '../shared/CarePath.jsx';

export default function CaseView({ id }) {
  const couple = COUPLES.find((c) => c.id === id);
  const notes = useStore((s) => s.notes);
  const approved = useStore((s) => s.approved);
  const plans = useStore((s) => s.plans);
  const liveCase = useStore((s) => s.cases[id]);
  const refs = useStore((s) => s.referrals[id]) || [];
  const [draft, setDraft] = useState('');
  // the couple can see this visit on their Privacy page (027)
  useEffect(() => { if (couple && supabase) supabase.rpc('log_case_view', { p_couple: id }).then(() => {}, () => {}); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [ref, setRef] = useState({ destination: REFERRAL_DESTINATIONS[0], priority: 'routine', reason: '' });
  if (!couple) return <Page title="Case not found"><a href="#/app">← Back to queue</a></Page>;

  const r = assess(couple);
  if (liveCase) { r.tier = liveCase.tier; r.priority = TIER_PRIORITY[r.tier]; }
  const sendRef = () => { if (!ref.reason.trim()) return; addReferral(id, ref.destination, ref.priority, ref.reason.trim()); setRef({ ...ref, reason: '' }); };
  const done = approved.includes(id);
  const caseNotes = notes[id] || [];
  const addNote = () => {
    if (!draft.trim()) return;
    saveNote(id, draft.trim());
    setDraft('');
  };
  const approve = () => approvePlan(id);
  const chosen = plans[id];

  return (
    <Page title={`${PEOPLE[couple.a].short} & ${PEOPLE[couple.b].short}`} sub={`Case ${id.toUpperCase()} · screened ${couple.screened}`}
      actions={<><a className="btn secondary" href={`#/app/case/${id}/report`}>Couple report</a> <a className="ghost" href="#/app">← Queue</a></>}>
      <div className="grid2">
        <Card title="Assessment" aside={<Priority p={r.priority} />}>
          <dl className="dl">
            <dt>Result</dt><dd>{r.label}</dd>
            <dt>Condition</dt><dd>{r.condition || '—'}</dd>
            <dt>Risk</dt><dd>{r.risk}</dd>
            <dt>Stage</dt><dd>{couple.pregnantWeeks ? `Pregnant · ${couple.pregnantWeeks} weeks` : couple.stage}</dd>
            <dt>Assigned to</dt><dd>{liveCase?.counsellor || 'Dr. Mariam Al Hosani'}</dd>
          </dl>
          <p className="fine">Triage from the rules engine, {r.version}. Not AI.</p>
        </Card>
        <Card title="Partners">
          {[couple.a, couple.b].map((p) => (
            <div key={p} className="partner">
              <b>{PEOPLE[p].name}</b>
              {PEOPLE[p].carrier
                ? <span>Carrier · {PEOPLE[p].carrier} <small>({GENES[PEOPLE[p].carrier].condition})</small></span>
                : <span className="muted">Nothing found</span>}
            </div>
          ))}
        </Card>
      </div>

      <Card title={`${PEOPLE[couple.a].short}’s lab report`}><Report personId={couple.a} compact /></Card>
      <Card title={`${PEOPLE[couple.b].short}’s lab report`}><Report personId={couple.b} compact /></Card>

      <Card title="Couple’s plan" aside={done ? <Badge tone="green">✓ Approved</Badge> : null}>
        <p>{chosen ? <>The couple chose: <b>{chosen}</b>.</> : <span className="muted">The couple hasn’t chosen a plan yet.</span>}</p>
        {!done && chosen && <button className="btn" onClick={approve}>Approve plan</button>}
      </Card>


      <Card title="Personalised Care Plan (7 Stages)" aside={<a className="open" href="#/app/plan">Full Tracker →</a>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Active Milestone: <b>Stage 3 — Genetic Counselling & Protocol Sign-off</b></span>
            <Badge tone={done ? 'green' : 'amber'}>{done ? '✓ Care Protocol Approved' : 'Review Required'}</Badge>
          </div>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Continuous care roadmap: 1. Screening & discovery ➔ 2. Couple assessment ➔ 3. Genetic counselling ➔ 4. Family planning ➔ 5. Pregnancy ➔ 6. Birth preparation ➔ 7. Childbirth & newborn care.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            {!done && chosen && (
              <button className="btn" onClick={approve}>Approve Protocol & Unlock Stage 4 (Family Planning)</button>
            )}
            <a className="btn-clean-sm" href="#/app/plan" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              Inspect Couple's 7-Stage Care Roadmap →
            </a>
          </div>
        </div>
      </Card>

      <Card title="Referrals">

      <Card title="Care path & referrals" aside={escalation({ type: r.type }, couple) ? <Badge tone="amber">Needs counselling</Badge> : null}>
        <p className="muted" style={{ marginTop: 0 }}>The couple sees this path on their home page. Each change is recorded in the audit log.</p>
        <CarePathControls coupleId={id} refs={refs} onChanged={loadAll} />
      </Card>
        <div className="ref-form">
          <select value={ref.destination} onChange={(e) => setRef({ ...ref, destination: e.target.value })}>{REFERRAL_DESTINATIONS.map((d) => <option key={d}>{d}</option>)}</select>
          <select value={ref.priority} onChange={(e) => setRef({ ...ref, priority: e.target.value })}>{['urgent', 'high', 'routine'].map((p) => <option key={p}>{p}</option>)}</select>
          <input value={ref.reason} onChange={(e) => setRef({ ...ref, reason: e.target.value })} placeholder="Reason for referral" />
          <button className="btn" onClick={sendRef}>Refer</button>
        </div>
        <ul className="log">{refs.map((x, i) => <li key={i}><time>{new Date(x.t).toLocaleString()} · {x.priority} · {x.status}</time>{x.destination}: {x.reason}</li>)}</ul>
      </Card>

      <Card title="Notes">
        <div className="note-in">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a private clinical note…" rows="3" />
          <button className="btn" onClick={addNote}>Save note</button>
        </div>
        <ul className="log">{caseNotes.map((n, i) => (
          <li key={n.id || i}><time>{new Date(n.t).toLocaleString()} · {n.approved ? '✓ approved, locked' : 'draft'}</time>{n.text}
            {!n.approved && n.id && <button className="link" onClick={() => approveNote(id, n.id)}>Approve and lock</button>}</li>
        ))}</ul>
      </Card>
    </Page>
  );
}

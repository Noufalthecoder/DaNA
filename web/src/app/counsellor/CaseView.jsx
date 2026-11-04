import { useState } from 'react';
import { Page, Card, Priority, Badge } from '../shared/ui.jsx';
import { COUPLES, PEOPLE, GENES, REFERRAL_DESTINATIONS } from '../shared/data.js';
import { assess, TIER_PRIORITY } from '../shared/genetics.js';
import Report from '../shared/Report.jsx';
import { useStore } from '../shared/store.js';
import { addNote as saveNote, approvePlan, approveNote, addReferral } from '../shared/db.js';

export default function CaseView({ id }) {
  const couple = COUPLES.find((c) => c.id === id);
  const notes = useStore((s) => s.notes);
  const approved = useStore((s) => s.approved);
  const plans = useStore((s) => s.plans);
  const liveCase = useStore((s) => s.cases[id]);
  const refs = useStore((s) => s.referrals[id]) || [];
  const [draft, setDraft] = useState('');
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
      actions={<a className="ghost" href="#/app">← Queue</a>}>
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

      <Card title="Referrals">
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

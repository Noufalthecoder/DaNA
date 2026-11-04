import { useState } from 'react';
import { Page, Card, Priority, Badge } from '../shared/ui.jsx';
import { COUPLES, PEOPLE, GENES } from '../shared/data.js';
import { assess } from '../shared/genetics.js';
import { useStore } from '../shared/store.js';
import { addNote as saveNote, approvePlan } from '../shared/db.js';

export default function CaseView({ id }) {
  const couple = COUPLES.find((c) => c.id === id);
  const notes = useStore((s) => s.notes);
  const approved = useStore((s) => s.approved);
  const plans = useStore((s) => s.plans);
  const [draft, setDraft] = useState('');
  if (!couple) return <Page title="Case not found"><a href="#/app">← Back to queue</a></Page>;

  const r = assess(couple);
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
          </dl>
          <p className="fine">From the rules engine, version 0.1. Not AI.</p>
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

      <Card title="Couple’s plan" aside={done ? <Badge tone="green">✓ Approved</Badge> : null}>
        <p>{chosen ? <>The couple chose: <b>{chosen}</b>.</> : <span className="muted">The couple hasn’t chosen a plan yet.</span>}</p>
        {!done && chosen && <button className="btn" onClick={approve}>Approve plan</button>}
      </Card>

      <Card title="Notes">
        <div className="note-in">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a private clinical note…" rows="3" />
          <button className="btn" onClick={addNote}>Save note</button>
        </div>
        <ul className="log">{caseNotes.map((n, i) => <li key={i}><time>{new Date(n.t).toLocaleString()}</time>{n.text}</li>)}</ul>
      </Card>
    </Page>
  );
}

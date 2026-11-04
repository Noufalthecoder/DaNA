import { useState } from 'react';
import { Page, Card, Priority, Badge, Stat } from '../shared/ui.jsx';
import { COUPLES, PEOPLE } from '../shared/data.js';
import { assess, PRIORITY_ORDER } from '../shared/genetics.js';
import { useStore } from '../shared/store.js';

/* cases sorted by clinical priority: pregnant + same gene first */
export function cases() {
  return COUPLES.map((c) => ({ ...c, r: assess(c) })).sort((x, y) => PRIORITY_ORDER[x.r.priority] - PRIORITY_ORDER[y.r.priority]);
}

export default function Queue() {
  const approved = useStore((s) => s.approved);
  const [filter, setFilter] = useState('open');
  const all = cases();
  const list = all.filter((c) => (filter === 'open' ? !approved.includes(c.id) : filter === 'done' ? approved.includes(c.id) : true));

  return (
    <Page title="Case queue" sub="Sorted by priority. Urgent cases are contacted first.">
      <div className="stats">
        <Stat label="Urgent" value={all.filter((c) => c.r.priority === 'urgent').length} note="pregnant, same gene" />
        <Stat label="High" value={all.filter((c) => c.r.priority === 'high').length} />
        <Stat label="Plans approved" value={approved.length} />
      </div>
      <Card title="Couples" aside={
        <div className="seg">{[['open', 'Open'], ['done', 'Approved'], ['all', 'All']].map(([k, l]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>)}</div>
      }>
        <table className="table">
          <thead><tr><th>Couple</th><th>Result</th><th>Stage</th><th>Priority</th><th /></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="click" onClick={() => { window.location.hash = `/app/case/${c.id}`; }}>
                <td><b>{PEOPLE[c.a].short} & {PEOPLE[c.b].short}</b><small>{c.id.toUpperCase()}</small></td>
                <td>{c.r.label}{c.r.condition && <small>{c.r.condition}</small>}</td>
                <td>{c.pregnantWeeks ? <Badge tone="red">Pregnant · {c.pregnantWeeks} wks</Badge> : c.stage}</td>
                <td><Priority p={c.r.priority} /></td>
                <td className="right">{approved.includes(c.id) ? <Badge tone="green">✓ Approved</Badge> : <a className="open" href={`#/app/case/${c.id}`}>Open →</a>}</td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan="5" className="empty">Nothing here.</td></tr>}
          </tbody>
        </table>
      </Card>
    </Page>
  );
}

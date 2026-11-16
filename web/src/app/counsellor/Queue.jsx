import { useState } from 'react';
import { Search } from 'lucide-react';
import { Page, Card, Priority, Badge, Stat } from '../shared/ui.jsx';
import { COUPLES, PEOPLE } from '../shared/data.js';
import { assess, PRIORITY_ORDER, TIER_PRIORITY } from '../shared/genetics.js';
import { useStore } from '../shared/store.js';
import ClinicPrompt from './ClinicPrompt.jsx';

/* cases sorted by clinical priority: pregnant + same gene first */
export function cases(live = {}) {
  return COUPLES.map((c) => {
    const r = assess(c);
    // live: the database's triage engine is the source of truth
    if (live[c.id]) { r.tier = live[c.id].tier; r.priority = TIER_PRIORITY[r.tier]; }
    return { ...c, r, counsellor: live[c.id]?.counsellor };
  }).sort((x, y) => PRIORITY_ORDER[x.r.priority] - PRIORITY_ORDER[y.r.priority]);
}

export default function Queue() {
  const approved = useStore((s) => s.approved);
  const live = useStore((s) => s.cases);
  const [filter, setFilter] = useState('open');
  const all = cases(live);
  // open = still needs the counsellor: not approved and the case is not closed
  const byStatus = all.filter((c) => (filter === 'open' ? !approved.includes(c.id) && !live[c.id]?.closed : filter === 'done' ? approved.includes(c.id) : true));
  // search and priority filter, then pages of 15
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('');
  const [page, setPage] = useState(0);
  const needle = q.trim().toLowerCase();
  const list = byStatus.filter((c) => (!tier || c.r.priority === tier) && (!needle ||
    [PEOPLE[c.a]?.name, PEOPLE[c.b]?.name, c.id, c.r.label, c.r.condition].filter(Boolean).join(' ').toLowerCase().includes(needle)));
  const PAGE = 15;
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const at = Math.min(page, pages - 1);
  const shown = list.slice(at * PAGE, at * PAGE + PAGE);
  const reset = (fn) => (v) => { fn(v); setPage(0); };

  return (
    <Page title="Case queue" sub="Sorted by priority. Urgent cases are contacted first.">
      <ClinicPrompt />
      <div className="stats four">
        <Stat label="Tier 1 · Urgent" value={all.filter((c) => c.r.priority === 'urgent').length} note="pregnant, shared finding" />
        <Stat label="Tier 2 · High" value={all.filter((c) => c.r.priority === 'high').length} />
        <Stat label="Tier 3 · Moderate" value={all.filter((c) => c.r.priority === 'moderate').length} note="uncertain or single carrier" />
        <Stat label="Plans approved" value={approved.length} />
      </div>
      <Card title="Couples" aside={
        <div className="seg">{[['open', 'Open'], ['done', 'Approved'], ['all', 'All']].map(([k, l]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => reset(setFilter)(k)}>{l}</button>)}</div>
      }>
        <div className="tbl-tools">
          <label className="tbl-search">
            <Search size={16} aria-hidden="true" />
            <input type="search" placeholder="Search by name, case or condition" value={q} onChange={(e) => reset(setQ)(e.target.value)} aria-label="Search couples" />
          </label>
          <select value={tier} onChange={(e) => reset(setTier)(e.target.value)} aria-label="Priority">
            <option value="">All priorities</option>
            <option value="urgent">Tier 1 · Urgent</option>
            <option value="high">Tier 2 · High</option>
            <option value="moderate">Tier 3 · Moderate</option>
            <option value="routine">Tier 4 · Routine</option>
          </select>
          <span className="tbl-count">{list.length} {list.length === 1 ? 'couple' : 'couples'}</span>
        </div>
        <table className="table">
          <thead><tr><th>Couple</th><th>Result</th><th>Stage</th><th>Priority</th><th /></tr></thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id} className="click" onClick={() => { window.location.hash = `/app/case/${c.id}`; }}>
                <td><b>{PEOPLE[c.a].short} & {PEOPLE[c.b].short}</b><small>{c.id.toUpperCase()}</small></td>
                <td>{c.r.label}{c.r.condition && <small>{c.r.condition}</small>}</td>
                <td>{c.pregnantWeeks ? <Badge tone="red">Pregnant · {c.pregnantWeeks} wks</Badge> : c.stage}</td>
                <td><Priority p={c.r.priority} /></td>
                <td className="right">{approved.includes(c.id) ? <Badge tone="green">✓ Approved</Badge> : <a className="open" href={`#/app/case/${c.id}`}>Open →</a>}</td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan="5" className="empty">{needle || tier ? 'No couples match this search.' : 'Nothing here.'}</td></tr>}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="tbl-foot">
            <span>Showing {at * PAGE + 1}–{at * PAGE + shown.length} of {list.length}</span>
            <div className="tbl-pager">
              <button type="button" className="btn-line" disabled={at === 0} onClick={() => setPage(at - 1)}>← Previous</button>
              <span>Page {at + 1} of {pages}</span>
              <button type="button" className="btn-line" disabled={at >= pages - 1} onClick={() => setPage(at + 1)}>Next →</button>
            </div>
          </div>
        )}
      </Card>
    </Page>
  );
}

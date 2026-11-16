/* Profile: family pedigree and consanguinity from the real records, not the old intake form.
   - related to partner, conditions in the family, notes: the person's details (onboarding / Details page)
   - relatives: the Family Tree (family_members), with any conditions recorded for them (family_conditions)
   Read-only here; each part is edited in one place (Details, Family Tree). Owner: Couple app. */
import { useEffect, useState } from 'react';
import { Card } from './ui.jsx';
import { useStore, EMPTY_ARR } from './store.js';
import { supabase } from './supabase.js';
import { isLive } from './db.js';
import { relationLabel } from './family.js';
import './familyPedigree.css';

const RELATED = { no: 'Not related', first_cousin: 'First cousins', second_cousin: 'Second cousins', other_relative: 'Other relatives', not_sure: 'Not sure' };
const FAMILY = {
  thalassaemia: 'Thalassaemia', sickle_cell: 'Sickle cell disease', g6pd: 'G6PD deficiency', hearing_loss: 'Hearing loss from birth',
  sma: 'Spinal muscular atrophy', cystic_fibrosis: 'Cystic fibrosis', other: 'Another inherited condition',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GEN_ORDER = { '-2': 0, '-1': 1, 0: 2, 1: 3 };

export default function FamilyPedigree({ me, partnerName }) {
  const details = useStore((s) => s.session?.details) || {};
  const rows = useStore((s) => s.family?.[me.id]) || EMPTY_ARR;
  const relatives = rows.filter((r) => !r.person_id)
    .sort((a, b) => (GEN_ORDER[a.generation] ?? 9) - (GEN_ORDER[b.generation] ?? 9) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const [conditions, setConditions] = useState({});

  // conditions recorded against tree members (live only; ids must be real uuids)
  const ids = relatives.map((r) => r.id).filter((id) => UUID.test(String(id)));
  const key = ids.join(',');
  useEffect(() => {
    if (!isLive() || !supabase || !ids.length) { setConditions({}); return; }
    let off = false;
    supabase.from('family_conditions').select('member_id, condition_name, age_at_onset').in('member_id', ids)
      .then(({ data }) => {
        if (off) return;
        const by = {};
        for (const c of data || []) (by[c.member_id] ||= []).push(c.age_at_onset ? `${c.condition_name} (age ${c.age_at_onset})` : c.condition_name);
        setConditions(by);
      }, () => {});
    return () => { off = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const history = (details.family_history || []).map((k) => FAMILY[k] || k);
  const related = details.related_to_partner ? RELATED[details.related_to_partner] || details.related_to_partner : null;

  return (
    <Card title="Family Pedigree & Consanguinity">
      <div className="fp">
        <div className="fp-grid">
          <div>
            <span className="fp-label">Related to {partnerName || 'your partner'}</span>
            <b>{related || 'Not answered yet'}</b>
          </div>
          <div>
            <span className="fp-label">Conditions in the family</span>
            {history.length
              ? <div className="fp-chips">{history.map((h) => <span key={h} className="fp-chip">{h}</span>)}</div>
              : <b>{details.family_history ? 'None reported' : 'Not answered yet'}</b>}
          </div>
          <div>
            <span className="fp-label">A child already affected</span>
            <b>{details.affected_child == null ? 'Not answered yet' : details.affected_child ? 'Yes' : 'No'}</b>
          </div>
        </div>
        {details.family_notes && <p className="fp-notes"><span className="fp-label">Notes</span>{details.family_notes}</p>}
        <a className="fp-link" href="#/app/details">Edit these answers →</a>

        <div className="fp-tree">
          <div className="fp-tree-h">
            <span className="fp-label">Relatives in your Family Tree ({relatives.length})</span>
            <a className="fp-link" href="#/app/familytree">Open Family Tree →</a>
          </div>
          {relatives.length ? (
            <table className="fp-table">
              <thead><tr><th>Relationship</th><th>Name</th><th>Known condition</th></tr></thead>
              <tbody>
                {relatives.map((r) => (
                  <tr key={r.id}>
                    <td><b>{relationLabel(r)}</b></td>
                    <td>{r.name || '—'}</td>
                    <td>{conditions[r.id]?.join(', ') || r.condition || 'None recorded'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="fp-empty">No relatives added yet. Add them in the Family Tree and they appear here.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

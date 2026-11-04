import { useState } from 'react';
import { Dialog } from '../shared/ui.jsx';
import { RELATION_GROUPS, SIDES, isFull, parentChoices, problemWith, relationLabel, ruleFor } from '../shared/family.js';

/* Add a relative, or correct a name when `member` is given. */
export default function FamilyMemberForm({ rows, preset, member, onSave, onClose }) {
  const [form, setForm] = useState({ relation: '', side: 'paternal', parentId: '', name: member?.name ?? '', ...preset });
  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  const rule = ruleFor(form.relation);
  const parents = parentChoices(rows, form.relation).filter((r) => r.relation !== 'You');
  const parentId = parents.some((r) => r.id === form.parentId) ? form.parentId : parents[0]?.id ?? '';
  const problem = member ? null : problemWith(rows, form.relation, form.side);
  const ready = form.name.trim() && (member || (rule && !problem));

  const submit = (e) => {
    e.preventDefault();
    if (ready) onSave({ ...form, parentId });
  };

  return (
    <Dialog title={member ? `Edit ${relationLabel(member)}` : 'Add family member'} onSubmit={submit} onClose={onClose}
      footer={<>
        <button type="button" className="btn-line" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn" disabled={!ready}>{member ? 'Apply changes' : 'Add member'}</button>
      </>}>
      {!member && (
        <label className="dialog-field">Relation
          <select required {...field('relation')}>
            <option value="" disabled>Choose a relation</option>
            {RELATION_GROUPS.map((g) => (
              <optgroup key={g.title} label={g.title}>
                {g.items.map((r) => <option key={r.relation} value={r.relation} disabled={isFull(rows, r.relation)}>{r.relation}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
      )}
      {!member && rule?.side === 'ask' && (
        <label className="dialog-field">Side of the family
          <select {...field('side')}>
            {Object.entries(SIDES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
      )}
      {!member && parents.length > 0 && (
        <label className="dialog-field">Child of
          <select value={parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
            {parents.map((r) => <option key={r.id} value={r.id}>{r.name} ({relationLabel(r).toLowerCase()})</option>)}
          </select>
        </label>
      )}
      <label className="dialog-field">Name
        <input required autoFocus={!!(member || preset?.relation)} maxLength={80} autoComplete="off" placeholder="Their name" {...field('name')} />
      </label>
      {problem && <p className="dialog-note" role="alert">{problem}</p>}
    </Dialog>
  );
}

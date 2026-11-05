import { useCallback, useEffect, useState } from 'react';
import { History, Pencil, RotateCcw } from 'lucide-react';
import { Badge, Dialog } from '../shared/ui.jsx';
import { useStore } from '../shared/store.js';
import { isLive } from '../shared/db.js';
import { api } from '../shared/api.js';
import { FIELDS, GROUPS, MARKERS, crossFieldProblem, display, labelFor } from './benchmarkFields.js';

const SEXES = { M: 'Male', F: 'Female' };
const ACTIONS = { seed: 'Default', edit: 'Edited', restore: 'Restored', direct: 'Direct edit' };
const MIN_REASON = 10;

const when = (iso) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dubai' }).format(new Date(iso));

/* Edit one sex's row. Only what changed is sent, with a reason, against the version shown. */
function EditDialog({ sex, row, onSaved, onClose }) {
  const [values, setValues] = useState(() => Object.fromEntries(FIELDS.map((f) => [f.key, row[f.key]])));
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const editable = FIELDS.filter((f) => row[f.key] !== null);
  const changes = Object.fromEntries(editable.flatMap((f) => {
    const value = values[f.key];
    if (f.type === 'markers') return [...value].sort().join() === [...row[f.key]].sort().join() ? [] : [[f.key, value]];
    if (f.type === 'boolean') return value === row[f.key] ? [] : [[f.key, value]];
    return Number(value) === Number(row[f.key]) ? [] : [[f.key, Number(value)]];
  }));
  const outOfRange = editable.find((f) => f.min !== undefined && (values[f.key] === '' || Number(values[f.key]) < f.min || Number(values[f.key]) > f.max));
  const problem = outOfRange ? `${outOfRange.label} must be between ${outOfRange.min} and ${outOfRange.max}.` : crossFieldProblem(values);
  const count = Object.keys(changes).length;
  const ready = count > 0 && !problem && reason.trim().length >= MIN_REASON && !busy;

  const set = (key, value) => setValues({ ...values, [key]: value });
  const toggleMarker = (marker) => set('infection_markers', values.infection_markers.includes(marker)
    ? values.infection_markers.filter((m) => m !== marker)
    : [...values.infection_markers, marker]);

  const save = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError('');
    try {
      await api(`/benchmarks/${sex}`, { method: 'PATCH', body: { expected_version: row.version, reason: reason.trim(), changes } });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Edit ${SEXES[sex].toLowerCase()} benchmark`} onSubmit={save} onClose={onClose} wide
      footer={<>
        {(problem || error) && <p className="dialog-note" role="alert">{problem || error}</p>}
        <button type="button" className="btn-line" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn" disabled={!ready}>{busy ? 'Saving…' : 'Save new version'}</button>
      </>}>
      <p>Saving creates version {row.version + 1}. Version {row.version} stays in the history.</p>
      {GROUPS.map((group) => {
        const fields = group.fields.filter((f) => row[f.key] !== null);
        if (!fields.length) return null;
        return (
          <fieldset className="bench-fields" key={group.title}>
            <legend>{group.title}</legend>
            {fields.map((f) => {
              if (f.type === 'boolean') {
                return <label className="bench-check" key={f.key}><input type="checkbox" checked={values[f.key]} onChange={(e) => set(f.key, e.target.checked)} />{f.label}</label>;
              }
              if (f.type === 'markers') {
                return Object.entries(MARKERS).map(([marker, label]) => (
                  <label className="bench-check" key={marker}><input type="checkbox" checked={values.infection_markers.includes(marker)} onChange={() => toggleMarker(marker)} />{label}</label>
                ));
              }
              return (
                <label className="dialog-field" key={f.key}>{f.label}{f.unit ? ` (${f.unit})` : ''}
                  <input type="number" min={f.min} max={f.max} step={f.step} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} />
                </label>
              );
            })}
          </fieldset>
        );
      })}
      <label className="dialog-field">Reason for this change
        <textarea rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this value is changing, at least 10 characters" />
      </label>
    </Dialog>
  );
}

/* Bring back an old version. It becomes the newest version; nothing is erased. */
function RestoreDialog({ sex, snapshot, current, onSaved, onClose }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = reason.trim().length >= MIN_REASON && !busy;

  const restore = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError('');
    try {
      await api(`/benchmarks/${sex}/restore`, { method: 'POST', body: { version: snapshot.version, expected_version: current, reason: reason.trim() } });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Restore version ${snapshot.version}`} onSubmit={restore} onClose={onClose}
      footer={<>
        <button type="button" className="btn-line" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn" disabled={!ready}>{busy ? 'Restoring…' : 'Restore'}</button>
      </>}>
      <p>The {SEXES[sex].toLowerCase()} benchmark goes back to the values in version {snapshot.version}, saved as version {current + 1}. The full history stays.</p>
      <label className="dialog-field">Reason for restoring
        <textarea rows={2} maxLength={500} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="At least 10 characters" />
      </label>
      {error && <p className="dialog-note" role="alert">{error}</p>}
    </Dialog>
  );
}

function ChangeList({ changes }) {
  const keys = Object.keys(changes || {});
  if (!keys.length) return <span className="bench-muted">Starting values</span>;
  return (
    <ul className="bench-changes">
      {keys.map((key) => <li key={key}><b>{labelFor(key)}</b> {display(key, changes[key].from)} → {display(key, changes[key].to)}</li>)}
    </ul>
  );
}

function HistoryTable({ sex, snapshots, current, canEdit, onRestore }) {
  return (
    <div className="bench-scroll">
      <table className="table bench-history">
        <thead><tr><th>Version</th><th>Change</th><th>Reason</th><th>By</th><th>When</th>{canEdit && <th aria-label="Actions" />}</tr></thead>
        <tbody>
          {snapshots.map((s) => (
            <tr key={s.version}>
              <td><b>{s.version}</b><small>{ACTIONS[s.action] ?? s.action}</small></td>
              <td><ChangeList changes={s.changes} /></td>
              <td>{s.reason}</td>
              <td>{s.actor_name}</td>
              <td className="bench-nowrap">{when(s.created_at)}</td>
              {canEdit && (
                <td className="bench-actions">
                  {s.version === current
                    ? <Badge tone="green">Current</Badge>
                    : <button className="btn-line bench-icon-btn" aria-label={`Restore ${SEXES[sex].toLowerCase()} version ${s.version}`} onClick={() => onRestore(s)}><RotateCcw size={14} />Restore</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Benchmarks() {
  const role = useStore((s) => s.session?.role);
  const canEdit = role === 'admin';
  const live = isLive();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('F');
  const [editing, setEditing] = useState(null);     // 'M' or 'F'
  const [restoring, setRestoring] = useState(null); // a snapshot

  const load = useCallback(async () => {
    setError('');
    try {
      const [current, M, F] = await Promise.all([api('/benchmarks'), api('/benchmarks/M/snapshots'), api('/benchmarks/F/snapshots')]);
      setData({ M: current.male, F: current.female, history: { M, F } });
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { if (live) load(); }, [live, load]);

  const saved = () => { setEditing(null); setRestoring(null); load(); };

  if (!live) return <p className="bench-note">Benchmarks live in the database, so they need a real sign-in. Sign in with your programme account to see them.</p>;
  if (error && !data) return <div className="bench-note" role="alert"><p>{error}</p><button className="btn-line" onClick={load}>Try again</button></div>;
  if (!data) return <p className="bench-note">Loading benchmarks…</p>;

  return (
    <div className="bench">
      {error && <p className="dialog-note" role="alert">{error}</p>}
      <div className="bench-scroll">
        <table className="table bench-table">
          <thead>
            <tr>
              <th>Parameter</th>
              {Object.entries(SEXES).map(([sex, label]) => (
                <th key={sex}>
                  <span className="bench-col">
                    <span>{label}<small>Version {data[sex].version}</small></span>
                    {canEdit && <button className="btn-line bench-icon-btn" aria-label={`Edit ${label.toLowerCase()} benchmark`} onClick={() => setEditing(sex)}><Pencil size={14} />Edit</button>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          {GROUPS.map((group) => (
            <tbody key={group.title}>
              <tr className="bench-group"><th colSpan={3} scope="colgroup">{group.title}</th></tr>
              {group.fields.map((f) => (
                <tr key={f.key}>
                  <td><b>{f.label}</b>{(data.F.sources?.[f.key] || data.M.sources?.[f.key]) && <small>{data.F.sources?.[f.key] || data.M.sources?.[f.key]}</small>}</td>
                  {['M', 'F'].map((sex) => <td key={sex} className={data[sex][f.key] === null ? 'bench-muted' : 'bench-value'}>{display(f.key, data[sex][f.key])}</td>)}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      <div className="bench-history-h">
        <h3><History size={16} />Change history</h3>
        <div className="bench-switch" role="group" aria-label="Show history for">
          {Object.entries(SEXES).map(([sex, label]) => (
            <button key={sex} className={view === sex ? 'is-on' : ''} aria-pressed={view === sex} onClick={() => setView(sex)}>{label}</button>
          ))}
        </div>
      </div>
      <HistoryTable sex={view} snapshots={data.history[view]} current={data[view].version} canEdit={canEdit} onRestore={setRestoring} />
      {!canEdit && <p className="bench-muted">Only the programme admin can change benchmarks.</p>}

      {editing && <EditDialog sex={editing} row={data[editing]} onSaved={saved} onClose={() => setEditing(null)} />}
      {restoring && <RestoreDialog sex={view} snapshot={restoring} current={data[view].version} onSaved={saved} onClose={() => setRestoring(null)} />}
    </div>
  );
}

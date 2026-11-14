/* One threshold's source (026): citation, link, review status; admin can edit (versioned, audited). */
import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Badge, Dialog } from '../shared/ui.jsx';
import { supabase } from '../shared/supabase.js';

export const SOURCE_STATUS = {
  verified: ['green', 'Verified'],
  needs_review: ['amber', 'Needs expert review'],
  needs_local_confirmation: ['amber', 'Confirm for UAE'],
};

function SourceDialog({ src, onSaved, onClose }) {
  const [f, setF] = useState({ citation: src.citation || '', url: src.url || '', review_status: src.review_status, note: src.note || '' });
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const changes = Object.fromEntries(Object.entries(f).filter(([k, v]) => v !== (src[k] || '')).map(([k, v]) => [k, v === '' ? null : v]));
  const ready = !busy && reason.trim().length >= 10 && Object.keys(changes).length > 0 && f.citation.trim();
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true); setError('');
    const { error: err } = await supabase.rpc('update_benchmark_source', { p_key: src.key, p_changes: changes, p_reason: reason.trim(), p_expected_version: src.version });
    if (err) { setError(err.message); setBusy(false); return; }
    onSaved();
  };
  return (
    <Dialog title="Edit source" onSubmit={save} onClose={onClose} wide
      footer={<>
        {error && <p className="dialog-note" role="alert">{error}</p>}
        <button type="button" className="btn-line" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn" disabled={!ready}>{busy ? 'Saving…' : 'Save new version'}</button>
      </>}>
      <p>Saving creates version {src.version + 1}. The change is recorded in the audit log.</p>
      <div className="gp-form">
        <label className="gp-wide">Citation<input value={f.citation} onChange={up('citation')} /></label>
        <label className="gp-wide">Link (https)<input value={f.url} onChange={up('url')} placeholder="https://..." /></label>
        <label>Review status<select value={f.review_status} onChange={up('review_status')}>{Object.entries(SOURCE_STATUS).map(([k, [, l]]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label>Note<input value={f.note} onChange={up('note')} /></label>
        <label className="gp-wide">Reason for this change (required)<textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="At least 10 characters" /></label>
      </div>
    </Dialog>
  );
}

export default function SourceCell({ src, fallback, canEdit, onSaved }) {
  const [open, setOpen] = useState(false);
  if (!src) return fallback ? <small>{fallback}</small> : null;
  const [tone, label] = SOURCE_STATUS[src.review_status] || SOURCE_STATUS.needs_review;
  return (
    <span className="src-cell">
      <small>
        {src.url ? <a href={src.url} target="_blank" rel="noreferrer">{src.citation}</a> : src.citation}
        {src.note && <> · {src.note}</>}
      </small>
      <span className="src-meta">
        <Badge tone={tone}>{label}</Badge>
        {canEdit && <button type="button" className="link src-edit" onClick={() => setOpen(true)} aria-label="Edit source"><Pencil size={12} /> Edit source</button>}
      </span>
      {open && <SourceDialog src={src} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); onSaved(); }} />}
    </span>
  );
}

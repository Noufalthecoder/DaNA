/* Gene panel (025): which genes DaNA interprets, with identifiers, sources and review status.
   Admin adds, edits, retires; every change is a new version with a reason. Counsellors read only. */
import { useState } from 'react';
import { Dna, Pencil, Plus } from 'lucide-react';
import { Badge, Dialog } from '../shared/ui.jsx';
import { api } from '../shared/api.js';

const STATUS = { verified: ['green', 'Verified'], needs_review: ['amber', 'Needs expert review'], retired: ['grey', 'Retired'] };
const EMPTY = { symbol: '', condition: '', inheritance: 'AR', hgnc_id: '', ncbi_gene_id: '', transcript: '', source: '', source_url: '', review_status: 'needs_review', active: true };
const KEYS = ['condition', 'inheritance', 'hgnc_id', 'ncbi_gene_id', 'transcript', 'source', 'source_url', 'review_status', 'active'];

function GeneDialog({ gene, onSaved, onClose }) {
  const adding = !gene;
  const [f, setF] = useState(gene ? { ...EMPTY, ...Object.fromEntries(Object.entries(gene).map(([k, v]) => [k, v ?? ''])) } : EMPTY);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const changes = Object.fromEntries(KEYS
    .filter((k) => adding ? f[k] !== '' : f[k] !== (gene[k] ?? ''))
    .map((k) => [k, f[k] === '' ? null : f[k]]));
  const ready = !busy && reason.trim().length >= 10 && Object.keys(changes).length > 0 && (!adding || (f.symbol && f.condition && f.source));
  const up = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true); setError('');
    try {
      await api(`/panel/${encodeURIComponent((adding ? f.symbol : gene.symbol).trim().toUpperCase())}`, {
        method: 'PATCH', body: { expected_version: adding ? 0 : gene.version, reason: reason.trim(), changes },
      });
      onSaved();
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Dialog title={adding ? 'Add a gene to the panel' : `Edit ${gene.symbol}`} onSubmit={save} onClose={onClose} wide
      footer={<>
        {error && <p className="dialog-note" role="alert">{error}</p>}
        <button type="button" className="btn-line" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn" disabled={!ready}>{busy ? 'Saving…' : adding ? 'Add gene' : 'Save new version'}</button>
      </>}>
      <p>{adding ? 'New genes start as "Needs expert review".' : `Saving creates version ${gene.version + 1}. Version ${gene.version} stays in the history.`}</p>
      <div className="gp-form">
        {adding && <label>HGNC symbol<input value={f.symbol} onChange={up('symbol')} placeholder="e.g. HBA1" required /></label>}
        <label>Condition<input value={f.condition} onChange={up('condition')} placeholder="e.g. Alpha-thalassaemia" /></label>
        <label>Inheritance<select value={f.inheritance} onChange={up('inheritance')}><option value="AR">Autosomal recessive (AR)</option><option value="XL">X-linked (XL)</option></select></label>
        <label>HGNC ID<input value={f.hgnc_id} onChange={up('hgnc_id')} placeholder="HGNC:4823" /></label>
        <label>NCBI Gene ID<input value={f.ncbi_gene_id} onChange={up('ncbi_gene_id')} placeholder="3039" /></label>
        <label>Transcript<input value={f.transcript} onChange={up('transcript')} placeholder="NM_000558.5" /></label>
        <label>Review status<select value={f.review_status} onChange={up('review_status')}>{Object.entries(STATUS).map(([k, [, l]]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="gp-wide">Source (guideline or reference)<input value={f.source} onChange={up('source')} placeholder="e.g. GeneReviews: Alpha-Thalassemia (NBK1435)" /></label>
        <label className="gp-wide">Source link (https)<input value={f.source_url} onChange={up('source_url')} placeholder="https://www.ncbi.nlm.nih.gov/books/..." /></label>
        <label className="gp-check"><input type="checkbox" checked={!!f.active} onChange={up('active')} /> Active: results in this gene are interpreted</label>
        <label className="gp-wide">Reason for this change (required)<textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="At least 10 characters, e.g. Added per DoH panel update" /></label>
      </div>
    </Dialog>
  );
}

export default function GenePanel({ panel, canEdit, onSaved }) {
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = adding, gene = editing
  const genes = panel?.genes || [];
  const active = genes.filter((g) => g.active && g.review_status !== 'retired').length;
  return (
    <section className="gp">
      <div className="bench-history-h">
        <h3><Dna size={16} />Gene panel</h3>
        {canEdit && <button className="btn-line bench-icon-btn" onClick={() => setEditing(null)}><Plus size={14} />Add gene</button>}
      </div>
      <p className="bench-muted">
        DaNA interprets {active} active gene{active === 1 ? '' : 's'}. The lab panel covers {panel?.lab_panel_genes ?? '—'} genes
        (set in the benchmarks above). Sources are for expert sign-off; a gene stays "Needs expert review" until a genetics professional verifies it.
      </p>
      <div className="bench-scroll">
        <table className="table gp-table">
          <thead><tr><th>Gene</th><th>Condition</th><th>Inheritance</th><th>Identifiers</th><th>Source</th><th>Status</th>{canEdit && <th />}</tr></thead>
          <tbody>
            {genes.map((g) => {
              const [tone, label] = !g.active ? STATUS.retired : STATUS[g.review_status] || STATUS.needs_review;
              return (
                <tr key={g.symbol} className={g.active ? '' : 'bench-muted'}>
                  <td><b>{g.symbol}</b><small>v{g.version}</small></td>
                  <td>{g.condition}</td>
                  <td>{g.inheritance === 'XL' ? 'X-linked' : 'Autosomal recessive'}</td>
                  <td><small>{[g.hgnc_id, g.ncbi_gene_id && `NCBI ${g.ncbi_gene_id}`, g.transcript].filter(Boolean).join(' · ') || '—'}</small></td>
                  <td>{g.source_url ? <a href={g.source_url} target="_blank" rel="noreferrer">{g.source || 'Link'}</a> : (g.source || <span className="bench-muted">No source yet</span>)}</td>
                  <td><Badge tone={tone}>{label}</Badge></td>
                  {canEdit && <td><button className="btn-line bench-icon-btn" aria-label={`Edit ${g.symbol}`} onClick={() => setEditing(g)}><Pencil size={14} />Edit</button></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing !== undefined && <GeneDialog gene={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); onSaved(); }} />}
    </section>
  );
}

/* Journey step 3: the details Malaffi does not hold (019). Owner: Couple app.
   What UAE PASS and Malaffi already give us is shown, never asked again. */
import { useState } from 'react';
import { Page, Card, Badge } from '../shared/ui.jsx';
import { useStore, EMPTY_OBJ } from '../shared/store.js';
import { refreshSession } from '../shared/supabase.js';
import { saveMyDetails, loadAll } from '../shared/db.js';
import { PEOPLE } from '../shared/data.js';
import { danaIdFor } from '../shared/connectionsService.js';
import { go } from '../shared/router.js';

const FAMILY = [
  ['thalassaemia', 'Thalassaemia'], ['sickle_cell', 'Sickle cell disease'], ['g6pd', 'G6PD deficiency'],
  ['hearing_loss', 'Hearing loss from birth'], ['sma', 'Spinal muscular atrophy'], ['cystic_fibrosis', 'Cystic fibrosis'],
  ['other', 'Another inherited condition'],
];
const RELATED = [['no', 'No'], ['first_cousin', 'First cousins'], ['second_cousin', 'Second cousins'], ['other_relative', 'Other relatives'], ['not_sure', 'Not sure']];
const LANGS = [['en', 'English'], ['ar', 'العربية'], ['ur', 'اردو']];

function Seg({ value, options, onChange, label }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

export default function Details() {
  const session = useStore((s) => s.session);
  const reports = useStore((s) => s.reports) || EMPTY_OBJ;
  const me = PEOPLE[session.id] || {};
  const female = me.sex === 'F';
  const report = reports[session.id];
  const d0 = session.details || {};

  const [f, setF] = useState({
    marital_status: d0.marital_status || '',
    wedding_date: d0.wedding_date || '',
    pregnant: !!d0.pregnant,
    pregnancy_weeks: d0.pregnancy_weeks || '',
    related_to_partner: d0.related_to_partner || 'no',
    family_history: d0.family_history || [],
    family_notes: d0.family_notes || '',
    affected_child: !!d0.affected_child,
    preferred_language: d0.preferred_language || 'en',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF({ ...f, [k]: v });
  const toggleFam = (k) => set('family_history', f.family_history.includes(k) ? f.family_history.filter((x) => x !== k) : [...f.family_history, k]);

  const save = async (e) => {
    e.preventDefault();
    if (!f.marital_status) { setErr('Choose your marital status.'); return; }
    if (f.pregnant && !(Number(f.pregnancy_weeks) >= 1 && Number(f.pregnancy_weeks) <= 42)) { setErr('Enter the pregnancy weeks (1 to 42).'); return; }
    setBusy(true); setErr('');
    try {
      await saveMyDetails({ ...f, pregnancy_weeks: f.pregnant ? Number(f.pregnancy_weeks) : null });
      await refreshSession();
      loadAll();
      go('/app/result');
    } catch (e2) { setErr(e2.message); setBusy(false); }
  };

  return (
    <Page title="Your details" sub="Journey step 3 of 8 · only what Malaffi does not hold · about 2 minutes">
      <Card title="Already known (not asked again)">
        <div className="dt-known">
          <div><small>Name</small><b>{session.name}</b><em>UAE PASS</em></div>
          <div><small>Sex</small><b>{female ? 'Female' : me.sex === 'M' ? 'Male' : '—'}</b><em>Your profile</em></div>
          <div><small>DaNA ID</small><b>{danaIdFor(session.id)}</b><em>DaNA</em></div>
          <div><small>Premarital lab report</small><b>{report ? `${report.lab || 'Accredited lab'} · ${report.date}` : 'Not fetched yet'}</b><em>Malaffi</em></div>
        </div>
        <p className="fine">Emirates ID, date of birth and nationality come from UAE PASS; lab results from Malaffi.</p>
      </Card>

      <form onSubmit={save}>
        <Card title="1 · Marriage">
          <div className="dt-q"><span>Marital status</span>
            <Seg label="Marital status" value={f.marital_status} onChange={(v) => set('marital_status', v)}
              options={[['single', 'Single'], ['engaged', 'Engaged'], ['married', 'Married']]} />
          </div>
          {f.marital_status === 'engaged' && (
            <label className="dt-q"><span>Planned wedding date <i>(optional)</i></span>
              <input type="date" value={f.wedding_date} onChange={(e) => set('wedding_date', e.target.value)} />
            </label>
          )}
          <div className="dt-q"><span>Are you related to your partner (or future partner)?</span>
            <Seg label="Related to partner" value={f.related_to_partner} onChange={(v) => set('related_to_partner', v)} options={RELATED} />
            <small className="muted">Many happy couples are related. It only changes which conditions we look at more closely.</small>
          </div>
        </Card>

        {female && (
          <Card title="2 · Pregnancy">
            <div className="dt-q"><span>Are you pregnant now?</span>
              <Seg label="Pregnant" value={f.pregnant ? 'yes' : 'no'} onChange={(v) => set('pregnant', v === 'yes')} options={[['no', 'No'], ['yes', 'Yes']]} />
            </div>
            {f.pregnant && (
              <label className="dt-q"><span>How many weeks?</span>
                <input type="number" min="1" max="42" value={f.pregnancy_weeks} onChange={(e) => set('pregnancy_weeks', e.target.value)} style={{ maxWidth: 120 }} />
                <small className="muted">If you and your partner carry the same change, your counsellor contacts you first.</small>
              </label>
            )}
          </Card>
        )}

        <Card title={`${female ? 3 : 2} · Family history`}>
          <div className="dt-q"><span>Has anyone in your family had one of these? <i>(tick any)</i></span>
            <div className="chips">
              {FAMILY.map(([k, l]) => (
                <button key={k} type="button" className={f.family_history.includes(k) ? 'on' : ''} aria-pressed={f.family_history.includes(k)} onClick={() => toggleFam(k)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="dt-q"><span>Do you have a child with an inherited condition?</span>
            <Seg label="Affected child" value={f.affected_child ? 'yes' : 'no'} onChange={(v) => set('affected_child', v === 'yes')} options={[['no', 'No'], ['yes', 'Yes']]} />
          </div>
          <label className="dt-q"><span>Anything else your counsellor should know? <i>(optional)</i></span>
            <textarea rows="2" maxLength={500} value={f.family_notes} onChange={(e) => set('family_notes', e.target.value)} />
          </label>
        </Card>

        <Card title={`${female ? 4 : 3} · Language`}>
          <div className="dt-q"><span>Preferred language for your report</span>
            <Seg label="Language" value={f.preferred_language} onChange={(v) => set('preferred_language', v)} options={LANGS} />
          </div>
        </Card>

        {err && <p className="err">{err}</p>}
        <div className="dt-save">
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save and see my result'}</button>
          <span className="muted">Saved securely. Only you and, with your consent, your counsellor can see this.</span>
        </div>
      </form>
      {d0.marital_status && <p className="fine"><Badge tone="green">Saved</Badge> You can change these details any time.</p>}
    </Page>
  );
}

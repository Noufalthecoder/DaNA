/* What was imported from Malaffi, shown exactly as received: the checks it passed, the genetic
   carrier test and the premarital blood tests. Used at the end of onboarding and on /app/malaffi. */
import { useEffect, useState } from 'react';
import { useStore, EMPTY_OBJ } from './store.js';
import { supabase } from './supabase.js';
import { isLive, myIdentity } from './db.js';
import { PEOPLE, GENES, PANEL } from './data.js';

const SIG = { pathogenic: 'Disease-causing', likely_pathogenic: 'Likely disease-causing', vus: 'Uncertain significance' };
const ZYG = { heterozygous: 'One copy', homozygous: 'Two copies', hemizygous: 'One copy (X chromosome)' };
const day = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

/* [label, value, unit, reference, status] for each premarital blood test */
function bloodRows(lab, female) {
  if (!lab) return [];
  const num = (k, label, unit, ref, bad) => lab[k] == null ? null : [label, lab[k], unit, ref, bad(lab[k]) ? 'attention' : 'normal'];
  const reac = (k, label) => lab[k] == null ? null : [label, lab[k] === 'reactive' ? 'Reactive' : 'Non-reactive', '', 'Non-reactive', lab[k] === 'reactive' ? 'attention' : 'normal'];
  return [
    num('hb', 'Haemoglobin', 'g/dL', female ? '≥ 12.0' : '≥ 13.0', (v) => v < (female ? 12 : 13)),
    num('mcv', 'Red cell size (MCV)', 'fL', '≥ 80', (v) => v < 80),
    num('mch', 'Red cell haemoglobin (MCH)', 'pg', '≥ 27', (v) => v < 27),
    num('hba2', 'Haemoglobin A2', '%', '< 3.5', (v) => v >= 3.5),
    num('hbf', 'Haemoglobin F', '%', '< 5', (v) => v >= 5),
    lab.hb_variant == null ? null : ['Haemoglobin variant', lab.hb_variant === 'none' ? 'None detected' : lab.hb_variant, '', 'None', lab.hb_variant === 'none' ? 'normal' : 'attention'],
    num('ferritin', 'Iron stores (ferritin)', 'µg/L', '≥ 15', (v) => v < 15),
    num('g6pd_pct', 'G6PD enzyme activity', '% of normal', '≥ 30', (v) => v < 30),
    reac('hiv', 'HIV'), reac('hbsag', 'Hepatitis B (HBsAg)'), reac('anti_hcv', 'Hepatitis C (anti-HCV)'), reac('syphilis', 'Syphilis'),
    ...(female ? [
      num('rubella_igg', 'Rubella immunity (IgG)', 'IU/mL', '≥ 10', (v) => v < 10),
      lab.rhd == null ? null : ['Blood group RhD', lab.rhd === 'negative' ? 'Negative' : 'Positive', '', '—', lab.rhd === 'negative' ? 'attention' : 'normal'],
    ] : []),
  ].filter(Boolean);
}

export default function MalaffiRecord({ personId, compact = false }) {
  const reports = useStore((s) => s.reports) || EMPTY_OBJ;
  const demoLab = useStore((s) => s.demoLab?.[personId]);
  const demoIdentity = useStore((s) => s.identity?.[personId]);
  const [liveIdentity, setLiveIdentity] = useState(null);
  const identity = isLive() ? liveIdentity : demoIdentity;
  useEffect(() => { if (isLive()) myIdentity().then(setLiveIdentity).catch(() => {}); }, [personId]);
  const rep = reports[personId];
  const [lab, setLab] = useState(null);
  const female = PEOPLE[personId]?.sex === 'F';

  useEffect(() => {
    if (!isLive()) { setLab(demoLab || null); return; }
    supabase.from('lab_results').select('*').eq('person_id', personId).order('collected_on', { ascending: false }).limit(1)
      .then(({ data }) => setLab(data?.[0] || null));
  }, [personId, demoLab, rep?.id]);

  if (!rep) return <p className="muted">Nothing has been imported from Malaffi yet.</p>;
  const findings = (rep.variants || []).filter((v) => SIG[v.significance]);
  const rows = bloodRows(lab, female);
  const flagged = rows.filter((r) => r[4] === 'attention').length;

  return (
    <div className={`mr${compact ? ' mr-compact' : ''}`}>
      <section className="mr-head">
        <div>
          <span className="mr-eyebrow">Imported from Malaffi{String(rep.id).includes('DEMO') || rep.lab?.includes('simulated') ? ' · simulated record' : ''}</span>
          <h3>Premarital screening record</h3>
          <dl>
            <div><dt>Report number</dt><dd>{rep.id}</dd></div>
            <div><dt>Laboratory</dt><dd>{rep.lab || '—'}</dd></div>
            <div><dt>Report date</dt><dd>{day(rep.date)}</dd></div>
            {identity?.emirates_id && <div><dt>Matched to</dt><dd>Emirates ID {identity.emirates_id}</dd></div>}
          </dl>
        </div>
        <ul className="mr-checks" aria-label="Checks passed">
          <li className={rep.verified ? 'ok' : 'bad'}>{rep.verified ? '✓' : '!'} Final, signed lab report</li>
          <li className={rep.accreditation ? 'ok' : 'bad'}>{rep.accreditation ? '✓' : '!'} Accredited lab {rep.accreditation ? `(${rep.accreditation})` : ''}</li>
          <li className="ok">✓ Genes on the DaNA panel</li>
          <li className="ok">✓ Read with your consent</li>
        </ul>
      </section>

      <section className="mr-sec">
        <h4>Genetic carrier test <small>{rep.panel || `${PANEL.labGenes} genes (Abu Dhabi premarital panel)`}</small></h4>
        {findings.length === 0 ? (
          <p className="mr-none">✓ No disease-causing change found in the genes checked.</p>
        ) : (
          <div className="mr-scroll">
            <table className="mr-table">
              <thead><tr><th>Gene</th><th>Condition</th><th>Change</th><th>Copies</th><th>Classification</th></tr></thead>
              <tbody>
                {findings.map((v, i) => (
                  <tr key={i}>
                    <td><b>{v.gene}</b></td>
                    <td>{v.hgvs_p === 'p.Glu7Val' ? 'Sickle cell trait' : GENES[v.gene]?.condition || '—'}</td>
                    <td><code>{v.hgvs_c}</code>{v.hgvs_p && <small> {v.hgvs_p}</small>}</td>
                    <td>{ZYG[v.zygosity] || v.zygosity || '—'}</td>
                    <td><span className={`mr-pill ${v.significance === 'vus' ? 'grey' : 'amber'}`}>{SIG[v.significance]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mr-sec">
        <h4>Premarital blood tests <small>{rows.length ? (flagged ? `${flagged} to discuss with your counsellor` : 'all within range') : ''}</small></h4>
        {rows.length === 0 ? <p className="muted">No blood test results were in the record.</p> : (
          <div className="mr-scroll">
            <table className="mr-table">
              <thead><tr><th>Test</th><th>Result</th><th>Reference</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map(([label, v, unit, ref, st]) => (
                  <tr key={label}>
                    <td>{label}</td><td><b>{v}</b>{unit && <small> {unit}</small>}</td><td className="muted">{ref}</td>
                    <td><span className={`mr-pill ${st === 'normal' ? 'green' : 'amber'}`}>{st === 'normal' ? 'Normal' : 'Discuss'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="mr-foot">Shown exactly as received from Malaffi. Your explanation is on the My result page; this is the source record.</p>
    </div>
  );
}

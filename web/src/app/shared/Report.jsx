/* A validated lab report: where it came from, what was tested, what was found. Owner: Platform. */
import { useStore } from './store.js';
import { DEMO_REPORTS, GENES } from './data.js';
import { Badge } from './ui.jsx';

const SIG = { pathogenic: 'Pathogenic', likely_pathogenic: 'Likely pathogenic', vus: 'Uncertain (VUS)', likely_benign: 'Likely benign', benign: 'Benign' };

export function useReport(personId) {
  return useStore((s) => s.reports[personId]) || DEMO_REPORTS[personId] || null;
}

export default function Report({ personId, compact = false }) {
  const r = useReport(personId);
  if (!r) return <p className="muted">No validated report linked yet.</p>;
  return (
    <div className="report">
      <div className="prov">
        <span>{r.verified ? <Badge tone="green">✓ Verified report</Badge> : <Badge tone="amber">Validation pending</Badge>}</span>
        <span><b>{r.lab}</b> · {r.accreditation}</span>
        <span>Report {r.id} · {r.date}</span>
        {!compact && <span>{r.panel}</span>}
      </div>
      {r.variants.length ? (
        <table className="variants">
          <thead><tr><th>Gene</th><th>Variant (HGVS)</th><th>Zygosity</th><th>Significance</th></tr></thead>
          <tbody>
            {r.variants.map((v, i) => (
              <tr key={i}>
                <td>{v.gene}</td>
                <td>{v.hgvs_c}{v.hgvs_p ? ` (${v.hgvs_p})` : ''}</td>
                <td className="sig">{v.zygosity}</td>
                <td className={`sig sig-${v.significance}`}>{SIG[v.significance]} <small className="muted">· {v.source}{GENES[v.gene] ? ` · ${GENES[v.gene].condition}` : ''}</small></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="muted">No disease-causing variant found in the {r.panel}.</p>}
      {!compact && <p className="limit">{r.limitations}</p>}
    </div>
  );
}

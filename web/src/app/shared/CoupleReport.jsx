/* The combined couple report, on screen and as a download (the browser's "Save as PDF"). Owner: Platform.
   The couple opens it from Bonds; the counsellor opens the very same document from the case. */
import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { logAudit } from './db.js';
import { Brand } from './Logo.jsx';
import { buildCoupleReport } from './coupleReport.js';
import './coupleReport.css';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-');
const STATUS_TEXT = { normal: 'Normal', carrier: 'Carrier', attention: 'Needs attention', affected: 'Needs confirmation' };

function useLabs(personIds, live) {
  const [labs, setLabs] = useState({});
  const key = personIds.join('|');
  useEffect(() => {
    if (!live || !supabase) return;
    let off = false;
    Promise.all(personIds.map((id) => supabase.from('lab_results').select('*').eq('person_id', id)
      .order('collected_on', { ascending: false }).limit(1).then(({ data }) => [id, data?.[0] || null], () => [id, null])))
      .then((rows) => { if (!off) setLabs(Object.fromEntries(rows)); });
    return () => { off = true; };
  }, [key, live]); // eslint-disable-line react-hooks/exhaustive-deps
  return labs;
}

/* props: couple, partners [{id,name,short,sex,danaId,status,report}], result, plan, approved, counsellor, backHref, live, audience */
export default function CoupleReport({ couple, partners, result, plan, approved, counsellor, backHref, live, audience }) {
  const labs = useLabs(partners.map((p) => p.id), live);
  const r = buildCoupleReport({ couple, partners: partners.map((p) => ({ ...p, lab: labs[p.id] ?? p.lab })), result, plan, approved, counsellor });
  useEffect(() => { logAudit(`Viewed combined couple report (${r.version}, ${audience})`).catch(() => {}); }, [r.version, audience]);

  return (
    <div className="rp-wrap cr-wrap">
      <div className="rp-bar no-print">
        <a className="btn secondary" href={backHref}>← Back</a>
        <span className="cr-aud">{audience === 'counsellor' ? 'Shared with you for this case' : 'The same report your counsellor sees'}</span>
        <button className="btn" onClick={() => window.print()}>Download PDF</button>
      </div>

      <article className="rp cr">
        <header className="rp-h">
          <Brand size={30} />
          <div className="rp-title"><h1>Couple Genetic Compatibility Report</h1><p>Combined result of both partners · carrier screening and blood tests</p></div>
        </header>
        <dl className="rp-meta">
          <div><dt>Report no.</dt><dd>{r.number}</dd></div>
          <div><dt>Issued</dt><dd>{fmtDate(r.issued)}</dd></div>
          <div><dt>Stage</dt><dd>{r.stage}</dd></div>
          <div><dt>Counsellor</dt><dd>{r.counsellor || 'Not assigned yet'}</dd></div>
        </dl>

        <section className={`cr-banner cr-${r.summary.tone}`}>
          <span className="cr-eyebrow">Combined result</span>
          <h2 className="cr-h2">{r.summary.title}</h2>
          <p>{r.summary.line}</p>
          <div className="cr-chips">
            <span className="cr-chip">{r.summary.label}</span>
            {r.summary.condition && <span className="cr-chip">{r.summary.condition}</span>}
            <span className={`cr-chip cr-p${r.summary.tier}`}>Priority: {r.summary.priority}</span>
          </div>
        </section>

        <section>
          <h2>A. The couple</h2>
          <table className="rp-kv"><tbody>
            {r.partners.map((p) => (
              <tr key={p.id}><th>{p.sex}</th><td><b>{p.name}</b><br /><small>{p.danaId}</small></td><th>Individual result</th><td><span className={`rp-pill rp-pill-${p.statusKey === 'clear' ? 'normal' : 'carrier'}`}>{p.status}</span></td></tr>
            ))}
          </tbody></table>
        </section>

        <section>
          <h2>B. What it means for children</h2>
          <p><b>{r.summary.risk}</b></p>
          {r.odds && (
            <div className={`cr-odds cr-odds-${r.odds.length}`}>
              {r.odds.map(([k, label, chance], i) => (
                <div key={i} className={`cr-odd cr-odd-${k}`}><b>{chance}</b><span>{label}</span></div>
              ))}
            </div>
          )}
          <p className="cr-note">{r.oddsNote}</p>
          {r.conditionInfo && <p><b>About {r.conditionInfo.name}:</b> {r.conditionInfo.what} {r.conditionInfo.care}</p>}
        </section>

        <section>
          <h2>C. Each partner's findings</h2>
          <div className="cr-two">
            {r.partners.map((p) => (
              <div key={p.id} className="cr-col">
                <h3>{p.name}</h3>
                <p className="cr-src">{p.lab ? `${p.lab}${p.reportDate ? ` · ${p.reportDate}` : ''}` : 'Genetic report not in the record'}</p>
                {p.findings == null ? <p className="muted">Not available.</p>
                  : p.findings.length === 0 ? <p>No disease-causing change found.</p>
                  : <ul>{p.findings.map((f, i) => <li key={i}><b>{f.gene}</b> {f.change} {f.zygosity && `· ${f.zygosity}`} · {f.significance}</li>)}</ul>}
                <h4>Blood tests</h4>
                {p.blood == null ? <p className="muted">Not in the record.</p> : (
                  <table className="cr-blood"><tbody>
                    {p.blood.map((b) => (
                      <tr key={b.test}><td>{b.test}</td><td>{b.value}</td><td><span className={`rp-pill rp-pill-${b.status}`}>{STATUS_TEXT[b.status]}</span></td></tr>
                    ))}
                  </tbody></table>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>D. Options and the couple's plan</h2>
          {r.needsPlan ? (
            <>
              <ul className="cr-opts">
                {r.options.map((o) => (
                  <li key={o.id} className={o.chosen ? 'on' : ''}><b>{o.title}</b> <small>({o.when})</small>{o.chosen && <span className="cr-pick"> Chosen by the couple</span>}<br />{o.text}</li>
                ))}
              </ul>
              <p>{r.plan ? <>Plan: <b>{r.plan.choice}</b>. {r.plan.approved ? 'Approved by the counsellor.' : 'Waiting for counsellor review.'}</> : 'The couple has not chosen a plan yet.'}</p>
            </>
          ) : <p>No plan is needed for this result. {r.next.text}</p>}
        </section>

        <section>
          <h2>E. Recommended next step</h2>
          <p><b>{r.next.title}</b></p>
          <p>{r.next.text}</p>
        </section>

        <section>
          <h2>F. Limitations of the test</h2>
          <ul>{r.limits.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>

        <footer className="rp-f">
          <p>{r.disclaimer}</p>
          <p className="rp-ver">{r.version} · rules {r.summary.rules} · {new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC</p>
        </footer>
      </article>
    </div>
  );
}

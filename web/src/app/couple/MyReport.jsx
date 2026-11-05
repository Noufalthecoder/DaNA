/* Standard individual premarital screening report: English, Arabic, Urdu. Owner: Couple app.
   Same sections and colour key for every user (DoH Premarital Screening & Counseling Report structure).
   Data: genetic report (Malaffi), latest blood results (lab_results), details (019). Nothing is invented:
   a test that is not in the record says so. Download = the browser's "Save as PDF". */
import { useEffect, useState } from 'react';
import { useStore, EMPTY_OBJ } from '../shared/store.js';
import { supabase } from '../shared/supabase.js';
import { logAudit } from '../shared/db.js';
import { PEOPLE, GENES } from '../shared/data.js';
import { danaIdFor } from '../shared/connectionsService.js';
import { personalStatus, isRealReport } from '../shared/journey.js';
import { T, LANGS, COND, headline, REPORT_VERSION } from '../shared/reportText.js';
import { Brand } from '../shared/Logo.jsx';

const fmt = (d, lang) => (d ? new Date(d).toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'ar' ? 'ar-AE' : 'ur-PK', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

export default function MyReport() {
  const session = useStore((s) => s.session);
  const reports = useStore((s) => s.reports) || EMPTY_OBJ;
  const [lang, setLang] = useState(session?.details?.preferred_language || 'en');
  const [lab, setLab] = useState(null);
  const t = T[lang];
  const me = PEOPLE[session.id] || {};
  const rep = isRealReport(reports[session.id]) ? reports[session.id] : null;
  const d = session.details || {};
  const status = personalStatus(me.sex, me.carrier, GENES[me.carrier]?.inheritance);
  const [hTitle, hText] = headline(lang, status, me.carrier);

  useEffect(() => {
    if (!session?.backend || !supabase) return;
    supabase.from('lab_results').select('*').eq('person_id', session.id)
      .order('collected_on', { ascending: false }).limit(1)
      .then(({ data }) => setLab(data?.[0] || null));
  }, [session?.backend, session?.id]);
  useEffect(() => { logAudit(`Viewed premarital report (${REPORT_VERSION}, ${lang})`).catch(() => {}); }, [lang]);

  const issued = new Date();
  const valid = new Date(issued); valid.setMonth(valid.getMonth() + 3);

  // ---- results table: [test, source, result, status] ----
  const src = rep ? `${rep.lab || 'Accredited lab'}${rep.accreditation ? ` · ${rep.accreditation}` : ''}` : 'Malaffi';
  const variants = rep?.variants || [];
  const relevant = variants.filter((v) => ['pathogenic', 'likely_pathogenic', 'vus'].includes(v.significance));
  const genStatus = !rep ? 'na' : relevant.some((v) => v.significance === 'vus') && status === 'clear' ? 'review'
    : status === 'clear' ? 'normal' : status === 'xl_male' ? 'affected' : 'carrier';
  const genResult = !rep ? t.notInRecord
    : relevant.length === 0 ? t.noVariant
    : relevant.map((v) => `${t.variantOf} ${v.gene} (${COND[v.gene]?.[lang] || v.gene}) · ${v.hgvs_c || ''}`).join('; ');

  const blood = (v, map) => (v == null ? [t.notInRecord, 'na'] : map(v));
  const reac = (v) => (v === 'reactive' ? [t.reactive, 'attention'] : [t.nonReactive, 'normal']);
  const female = me.sex === 'F';
  const rows = [
    [t.genetic, src, genResult, genStatus],
    [t.hb, 'Malaffi', ...blood(lab?.hb, (v) => [`${v} g/dL`, v < (female ? 12 : 13) ? 'attention' : 'normal'])],
    [t.hba2, 'Malaffi', ...blood(lab?.hba2, (v) => [`${v} %`, v >= 3.5 ? 'carrier' : 'normal'])],
    [t.hbVariant, 'Malaffi', ...blood(lab?.hb_variant, (v) => (v === 'none' ? [t.none, 'normal'] : [v, 'carrier']))],
    [t.hiv, 'Malaffi', ...blood(lab?.hiv, reac)],
    [t.hbsag, 'Malaffi', ...blood(lab?.hbsag, reac)],
    [t.hcv, 'Malaffi', ...blood(lab?.anti_hcv, reac)],
    [t.syphilis, 'Malaffi', ...blood(lab?.syphilis, reac)],
    ...(female ? [
      [t.rubella, 'Malaffi', ...blood(lab?.rubella_igg, (v) => [`${v} IU/mL`, v >= 10 ? 'normal' : 'attention'])],
      [t.rhd, 'Malaffi', ...blood(lab?.rhd, (v) => (v === 'negative' ? [t.negative, 'attention'] : [t.positive, 'normal']))],
    ] : []),
  ];

  const marital = d.marital_status ? t[d.marital_status] : t.notGiven;
  return (
    <div className="rp-wrap" dir={LANGS[lang].dir} lang={lang}>
      <div className="rp-bar no-print">
        <a className="btn secondary" href="#/app/result">← {t.back}</a>
        <div className="seg" role="radiogroup" aria-label="Language">
          {Object.entries(LANGS).map(([k, v]) => (
            <button key={k} type="button" role="radio" aria-checked={lang === k} className={lang === k ? 'on' : ''} onClick={() => setLang(k)}>{v.name}</button>
          ))}
        </div>
        <button className="btn" onClick={() => window.print()}>{t.print}</button>
      </div>

      <article className="rp">
        <header className="rp-h">
          <Brand size={30} />
          <div className="rp-title"><h1>{t.title}</h1><p>{t.subtitle}</p></div>
        </header>
        <dl className="rp-meta">
          <div><dt>{t.reportNo}</dt><dd>{danaIdFor(session.id)}-{rep?.id || '—'}</dd></div>
          <div><dt>{t.issued}</dt><dd>{fmt(issued, lang)}</dd></div>
          <div><dt>{t.validUntil}</dt><dd>{fmt(valid, lang)}</dd></div>
          <div><dt>{t.language}</dt><dd>{LANGS[lang].name}</dd></div>
        </dl>

        <section>
          <h2>{t.secPerson}</h2>
          <table className="rp-kv"><tbody>
            <tr><th>{t.name}</th><td>{session.name}</td><th>{t.danaId}</th><td>{danaIdFor(session.id)}</td></tr>
            <tr><th>{t.sex}</th><td>{female ? t.female : t.male}</td><th>{t.marital}</th><td>{marital}</td></tr>
            <tr>
              {female ? <><th>{t.pregnancy}</th><td>{d.pregnant ? `${d.pregnancy_weeks} ${t.weeks}` : t.notPregnant}</td></> : <><th /><td /></>}
              <th>{t.related}</th><td>{t.rel[d.related_to_partner || 'no']}</td>
            </tr>
          </tbody></table>
        </section>

        <section>
          <h2>{t.secResults}</h2>
          <table className="rp-res">
            <thead><tr><th>{t.test}</th><th>{t.source}</th><th>{t.result}</th><th>{t.status}</th></tr></thead>
            <tbody>
              {rows.map(([name, s, res, st]) => (
                <tr key={name} className={`rp-${st}`}>
                  <td>{name}</td><td>{s}</td><td>{res}</td>
                  <td><span className={`rp-pill rp-pill-${st}`}>{t.st[st]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="rp-legend">{t.legend}:{' '}
            {['normal', 'carrier', 'attention', 'affected', 'review', 'na'].map((k) => <span key={k} className={`rp-pill rp-pill-${k}`}>{t.st[k]}</span>)}
          </p>
        </section>

        <section className={`rp-explain rp-${genStatus}`}>
          <h2>{t.secExplain}</h2>
          <h3>{hTitle}</h3>
          <p>{hText}</p>
        </section>

        <section><h2>{t.secNext}</h2><ul>{t.next.map((x) => <li key={x}>{x}</li>)}</ul></section>
        <section><h2>{t.secLimits}</h2><ul>{t.limits.map((x) => <li key={x}>{x}</li>)}</ul></section>

        <footer className="rp-f">
          <p>{t.disclaimer}</p>
          {lang !== 'en' && <p>{t.translation}</p>}
          <p className="rp-ver">{REPORT_VERSION} · {new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC</p>
        </footer>
      </article>
    </div>
  );
}

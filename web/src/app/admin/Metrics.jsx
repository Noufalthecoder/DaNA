/* Outcome metrics (challenge point 6): understanding, counselling uptake, time to referral,
   fairness across languages and privacy. Totals only, groups under 5 hidden (031_metrics.sql). Owner: Platform. */
import { useEffect, useState } from 'react';
import { BookOpenCheck, CalendarCheck, Clock, Languages, ShieldCheck, UserX, Eye, Ban, CircleCheck, TriangleAlert, Send } from 'lucide-react';
import { Page, Card, Skeleton } from '../shared/ui.jsx';
import { isLive } from '../shared/db.js';
import { supabase } from '../shared/supabase.js';
import { quizText } from '../shared/explain.js';
import { C, LANG_COLOR, Gauge, Meter, BarChart, Funnel, LanguageColumns } from './metricsCharts.jsx';
import './metrics.css';

const LANG = { en: 'English', ar: 'العربية · Arabic', ur: 'اردو · Urdu' };
const LANG_SHORT = { en: 'English', ar: 'Arabic', ur: 'Urdu' };
const CONTEXT = {
  'individual:carrier': 'My result: carrier', 'individual:clear': 'My result: no change',
  'couple:plan': 'Couple: 1 in 4 chance', 'couple:xlinked': 'Couple: X-linked', 'couple:carrier': 'Couple: one carrier',
  'couple:clear': 'Couple: no shared change', 'couple:uncertain': 'Couple: uncertain finding',
};

/* offline demo only: illustrative figures, clearly labelled on the page */
const SAMPLE = {
  understanding: { people: 1240, attempts: 1240, all_correct_pct: 82, avg_score_pct: 91 },
  by_context: [
    { context: 'couple:plan', people: 214, all_correct_pct: 71 }, { context: 'couple:xlinked', people: 38, all_correct_pct: 63 },
    { context: 'couple:carrier', people: 302, all_correct_pct: 88 }, { context: 'individual:carrier', people: 410, all_correct_pct: 84 },
    { context: 'individual:clear', people: 276, all_correct_pct: 86 },
  ],
  most_missed: [
    { id: 'next', wrong: 61, asked: 214, wrong_pct: 29 }, { id: 'sameSex', wrong: 11, asked: 38, wrong_pct: 29 },
    { id: 'zero', wrong: 52, asked: 276, wrong_pct: 19 }, { id: 'alone', wrong: 49, asked: 410, wrong_pct: 12 },
  ],
  counselling: { couples_screened: 1180, needs_counselling: 252, booked: 219, uptake_pct: 87, median_days_to_booking: 2.4, within_7_days: 201 },
  referrals: { sent: 64, completed: 41 },
  by_language: [
    { lang: 'en', people: 402, all_correct_pct: 84, avg_score_pct: 92, at_risk: 71, uptake_pct: 89 },
    { lang: 'ar', people: 688, all_correct_pct: 82, avg_score_pct: 91, at_risk: 152, uptake_pct: 87 },
    { lang: 'ur', people: 150, all_correct_pct: 76, avg_score_pct: 88, at_risk: 29, uptake_pct: 79 },
  ],
  privacy: { consents_given: 1240, consents_withdrawn: 9, case_views_logged: 3310, blocks: 4, k_threshold: 5 },
};

const show = (v, suffix = '') => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString()}${suffix}`);
const pct = (a, b) => (a == null || !b ? null : Math.round((100 * a) / b));
const GAP_LIMIT = 10;      // points between languages before wording is reviewed
const DAYS_GOAL = 7;       // result to booking

/* a KPI tile: icon, headline figure, a gauge, and a status line that never relies on colour alone */
function Kpi({ icon, label, value, note, gauge, status }) {
  return (
    <div className="mt-kpi">
      <div className="mt-kpi-top">
        <span className="mt-kpi-ic" aria-hidden="true">{icon}</span>
        <span className="mt-kpi-l">{label}</span>
      </div>
      <div className="mt-kpi-mid">
        <strong>{value}</strong>
        {gauge}
      </div>
      {note && <small className="mt-kpi-n">{note}</small>}
      {status && (
        <span className={`mt-status ${status.ok ? 'ok' : 'warn'}`}>
          {status.ok ? <CircleCheck size={14} /> : <TriangleAlert size={14} />}{status.text}
        </span>
      )}
    </div>
  );
}

function Tile({ icon, value, label }) {
  return (
    <div className="mt-tile">
      <span className="mt-kpi-ic" aria-hidden="true">{icon}</span>
      <div><strong>{value}</strong><span>{label}</span></div>
    </div>
  );
}

export default function Metrics() {
  const live = isLive();
  const [m, setM] = useState(live ? null : SAMPLE);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [table, setTable] = useState(false);

  const load = async () => {
    setErr(''); setBusy(true);
    const { data, error } = await supabase.rpc('admin_metrics');
    setBusy(false);
    if (error) setErr(error.code === 'PGRST202' ? 'Run supabase/031_metrics.sql in Supabase to turn on these metrics.' : error.message);
    else setM(data);
  };
  useEffect(() => { if (live) load(); }, [live]);

  if (err) return <Page title="Outcome metrics"><Card><p>{err}</p><button className="btn" onClick={load}>Try again</button></Card></Page>;
  if (!m) return <Page title="Outcome metrics"><div className="mt-kpis">{[0, 1, 2, 3].map((i) => <div key={i} className="mt-kpi"><Skeleton lines={3} /></div>)}</div><Card><Skeleton lines={6} /></Card></Page>;

  const u = m.understanding || {}, c = m.counselling || {}, p = m.privacy || {}, r = m.referrals || {};
  const langs = m.by_language || [];
  const gap = (() => {
    const v = langs.map((l) => l.all_correct_pct).filter((x) => x !== null && x !== undefined);
    return v.length > 1 ? Math.max(...v) - Math.min(...v) : null;
  })();
  const days = c.median_days_to_booking;
  const updated = new Date(m.generated_at || Date.now()).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const contexts = (m.by_context || []).map((x) => ({
    key: x.context, label: CONTEXT[x.context] || x.context, value: x.all_correct_pct,
    note: x.people == null ? null : `all answers right · ${show(x.people)} people`,
  }));
  const missed = m.most_missed || [];
  const stages = [
    { label: 'Couples with a result', value: c.couples_screened, share: 'everyone screened' },
    { label: 'Need counselling', value: c.needs_counselling, share: c.needs_counselling == null ? null : `${pct(c.needs_counselling, c.couples_screened)}% · tier 1–2` },
    { label: 'Booked a counsellor', value: c.booked, share: c.booked == null ? null : `${pct(c.booked, c.needs_counselling)}% of those in need` },
    { label: 'Within 7 days', value: c.within_7_days, share: c.within_7_days == null ? null : `${pct(c.within_7_days, c.booked)}% of bookings` },
  ];
  const everConsented = (p.consents_given || 0) + (p.consents_withdrawn || 0);
  const kept = pct(p.consents_given, everConsented);
  const refDone = pct(r.completed, r.sent);

  return (
    <Page
      title="Outcome metrics"
      sub={live ? 'Live totals from DaNA · no names · any group under 5 people is hidden' : 'Sample figures for the offline demo · the live version reads the database'}
      actions={(
        <div className="mt-actions">
          <span className="mt-updated"><span className={`mt-dot${live ? ' live' : ''}`} aria-hidden="true" />{live ? 'Live' : 'Sample'} · updated {updated}</span>
          {live && <button className="btn-line" onClick={load} disabled={busy}>{busy ? 'Refreshing…' : 'Refresh'}</button>}
        </div>
      )}
    >
      <div className={`mt-page${busy ? ' busy' : ''}`}>
        <p className="mt-why">
          Success here means people <b>understand</b> their result, <b>reach a counsellor</b> quickly, and get the same quality of
          help <b>in every language</b>, with their data protected. A marriage going ahead or not is never counted as success or failure.
        </p>

        <div className="mt-kpis">
          <Kpi icon={<BookOpenCheck size={18} />} label="Understood their result" value={show(u.all_correct_pct, '%')}
            note={`all answers right · ${show(u.people)} ${u.people === 1 ? 'person' : 'people'}`}
            gauge={<Gauge value={u.all_correct_pct} />} />
          <Kpi icon={<CalendarCheck size={18} />} label="Counselling uptake" value={show(c.uptake_pct, '%')}
            note={`${show(c.booked)} of ${show(c.needs_counselling)} couples who need it`}
            gauge={<Gauge value={c.uptake_pct} />} />
          <Kpi icon={<Clock size={18} />} label="Median time to counsellor" value={days == null ? '—' : <>{days}<small className="mt-unit">days</small></>}
            note="from result to booking"
            gauge={<Gauge value={days} max={DAYS_GOAL * 2} target={DAYS_GOAL} color={days != null && days > DAYS_GOAL ? C.warning : C.green} />}
            status={days == null ? null : days <= DAYS_GOAL ? { ok: true, text: `Within the ${DAYS_GOAL}-day goal` } : { ok: false, text: `Over the ${DAYS_GOAL}-day goal` }} />
          <Kpi icon={<Languages size={18} />} label="Language gap" value={gap === null ? '—' : <>{gap}<small className="mt-unit">pts</small></>}
            note="best vs lowest language, understanding"
            gauge={<Gauge value={gap} max={GAP_LIMIT * 2} target={GAP_LIMIT} color={gap != null && gap > GAP_LIMIT ? C.warning : C.green} />}
            status={gap == null ? null : gap <= GAP_LIMIT ? { ok: true, text: `Inside the ${GAP_LIMIT}-point limit` } : { ok: false, text: 'Review the wording' }} />
        </div>

        <div className="mt-grid">
          <Card title="1 · Understanding by result type" aside={<small className="muted">all answers right, first try · average score {show(u.avg_score_pct, '%')}</small>}>
            {contexts.length
              ? <BarChart rows={contexts} refLine={{ value: u.all_correct_pct, label: 'All results' }} />
              : <p className="muted">No answers yet.</p>}
          </Card>

          <Card title="Most misunderstood" aside={<small className="muted">guides what we rewrite</small>}>
            {missed.length ? (
              <ol className="mt-missed">
                {missed.map((x, i) => (
                  <li key={x.id}>
                    <span className="mt-rank">{i + 1}</span>
                    <div>
                      <p>“{quizText(x.id)}”</p>
                      <div className="mt-missed-row">
                        <Meter value={x.wrong_pct} color={C.orange} track={C.orangeTrack} label={`${x.wrong_pct}% answered wrong, ${x.wrong} of ${x.asked}`} />
                        <b>{x.wrong_pct}% wrong</b>
                        <small>{x.wrong} of {x.asked}</small>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : <p className="muted">Nothing to show yet: a statement appears once 5 or more people have answered it.</p>}
          </Card>
        </div>

        <div className="mt-grid even">
          <Card title="2 · Access to counselling" aside={<small className="muted">result → booking</small>}>
            <Funnel stages={stages} />
            <div className="mt-sub">
              <span className="mt-kpi-ic" aria-hidden="true"><Send size={16} /></span>
              <div className="mt-sub-body">
                <div className="mt-sub-h"><span>Specialist referrals</span><b>{show(r.completed)} of {show(r.sent)} completed{refDone == null ? '' : ` · ${refDone}%`}</b></div>
                <Meter value={refDone} label={`${show(r.completed)} of ${show(r.sent)} referrals completed`} />
              </div>
            </div>
          </Card>

          <Card title="3 · Fairness across languages" aside={<button className="link" onClick={() => setTable(!table)}>{table ? 'Show chart' : 'Show table'}</button>}>
            {table ? (
              <table className="table">
                <thead><tr><th>Language</th><th className="right">People</th><th className="right">Average score</th><th className="right">All right</th><th className="right">Counselling uptake</th></tr></thead>
                <tbody>{langs.map((l) => (
                  <tr key={l.lang}><td>{LANG[l.lang]}</td><td className="right">{show(l.people)}</td><td className="right">{show(l.avg_score_pct, '%')}</td>
                    <td className="right">{show(l.all_correct_pct, '%')}</td><td className="right">{show(l.uptake_pct, '%')}</td></tr>
                ))}</tbody>
              </table>
            ) : (
              <>
                <ul className="mt-legend">
                  {langs.map((l) => (
                    <li key={l.lang}>
                      <svg width="12" height="12" aria-hidden="true"><rect width="12" height="12" rx="3" fill={LANG_COLOR[l.lang]} /></svg>
                      {LANG[l.lang]} <small>{l.people == null ? 'fewer than 5' : `${show(l.people)} people`}</small>
                    </li>
                  ))}
                </ul>
                <LanguageColumns
                  langs={langs} names={LANG_SHORT} limit={GAP_LIMIT}
                  groups={[{ key: 'all_correct_pct', label: 'Understood' }, { key: 'avg_score_pct', label: 'Average score', short: 'Avg score' }, { key: 'uptake_pct', label: 'Counselling uptake', short: 'Uptake' }]}
                />
              </>
            )}
            <p className="mt-foot">A gap of more than {GAP_LIMIT} points between languages is a signal to review that language's wording with native-speaking counsellors.</p>
          </Card>
        </div>

        <Card title="4 · Privacy protection" aside={<small className="muted">groups under {p.k_threshold || 5} are never shown</small>}>
          <div className="mt-tiles">
            <Tile icon={<ShieldCheck size={18} />} value={show(p.consents_given)} label="share their Malaffi record" />
            <Tile icon={<UserX size={18} />} value={show(p.consents_withdrawn)} label="withdrew consent" />
            <Tile icon={<Eye size={18} />} value={show(p.case_views_logged)} label="staff case views logged" />
            <Tile icon={<Ban size={18} />} value={show(p.blocks)} label="people blocked" />
          </div>
          {kept != null && (
            <div className="mt-sub">
              <div className="mt-sub-body">
                <div className="mt-sub-h"><span>Still sharing, of everyone who gave consent</span><b>{kept}%</b></div>
                <Meter value={kept} label={`${kept}% still share their record`} />
              </div>
            </div>
          )}
          <p className="mt-foot">Every view by staff is logged and visible to the person in “Who saw my data”.</p>
        </Card>
      </div>
    </Page>
  );
}

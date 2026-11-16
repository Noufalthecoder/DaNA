/* Outcome metrics (challenge point 6): understanding, counselling uptake, time to referral,
   fairness across languages and privacy. Totals only, groups under 5 hidden (031_metrics.sql). Owner: Platform. */
import { useEffect, useState } from 'react';
import { Page, Card, Stat } from '../shared/ui.jsx';
import { isLive } from '../shared/db.js';
import { supabase } from '../shared/supabase.js';
import { quizText } from '../shared/explain.js';
import './metrics.css';

const LANG = { en: 'English', ar: 'العربية · Arabic', ur: 'اردو · Urdu' };
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

function Bar({ label, value, note, max = 100, suffix = '%' }) {
  const hidden = value === null || value === undefined;
  return (
    <div className="mt-bar">
      <span className="mt-bar-l">{label}</span>
      <span className="mt-track" aria-hidden="true"><span style={{ width: hidden ? 0 : `${Math.min(100, (value / max) * 100)}%` }} /></span>
      <span className={`mt-bar-v${hidden ? ' muted' : ''}`}>{hidden ? 'fewer than 5' : `${value}${suffix}`}{note && <small> {note}</small>}</span>
    </div>
  );
}

export default function Metrics() {
  const live = isLive();
  const [m, setM] = useState(live ? null : SAMPLE);
  const [err, setErr] = useState('');
  const [table, setTable] = useState(false);

  const load = async () => {
    setErr('');
    const { data, error } = await supabase.rpc('admin_metrics');
    if (error) setErr(error.code === 'PGRST202' ? 'Run supabase/031_metrics.sql in Supabase to turn on these metrics.' : error.message);
    else setM(data);
  };
  useEffect(() => { if (live) load(); }, [live]);

  if (err) return <Page title="Outcome metrics"><Card><p>{err}</p><button className="btn" onClick={load}>Try again</button></Card></Page>;
  if (!m) return <Page title="Outcome metrics"><Card><p className="muted">Loading…</p></Card></Page>;

  const u = m.understanding || {}, c = m.counselling || {}, p = m.privacy || {}, r = m.referrals || {};
  const langs = m.by_language || [];
  const gap = (() => {
    const v = langs.map((l) => l.all_correct_pct).filter((x) => x !== null && x !== undefined);
    return v.length > 1 ? Math.max(...v) - Math.min(...v) : null;
  })();

  return (
    <Page
      title="Outcome metrics"
      sub={live ? 'Live totals from DaNA · no names · any group under 5 people is hidden' : 'Sample figures for the offline demo · the live version reads the database'}
      actions={live && <button className="btn-line" onClick={load}>Refresh</button>}
    >
      <p className="mt-why">
        Success here means people <b>understand</b> their result, <b>reach a counsellor</b> quickly, and get the same quality of
        help <b>in every language</b>, with their data protected. A marriage going ahead or not is never counted as success or failure.
      </p>

      <div className="stats four">
        <Stat label="Understood their result" value={show(u.all_correct_pct, '%')} note={`all answers right · ${show(u.people)} ${u.people === 1 ? 'person' : 'people'}`} />
        <Stat label="Counselling uptake" value={show(c.uptake_pct, '%')} note={`${show(c.booked)} of ${show(c.needs_counselling)} couples who need it`} />
        <Stat label="Median time to counsellor" value={c.median_days_to_booking == null ? '—' : `${c.median_days_to_booking} days`} note="from result to booking" />
        <Stat label="Language gap" value={gap === null ? '—' : `${gap} pts`} note="best vs lowest language, understanding" />
      </div>

      <div className="grid2">
        <Card title="1 · Understanding" aside={<small className="muted">first try, 3 questions</small>}>
          <Bar label="Average score" value={u.avg_score_pct} />
          <Bar label="All answers right" value={u.all_correct_pct} />
          <h3 className="mt-h">By result type</h3>
          {(m.by_context || []).map((x) => <Bar key={x.context} label={CONTEXT[x.context] || x.context} value={x.all_correct_pct} />)}
          {!(m.by_context || []).length && <p className="muted">No answers yet.</p>}
        </Card>

        <Card title="Most misunderstood" aside={<small className="muted">guides what we rewrite</small>}>
          {(m.most_missed || []).length ? (
            <ol className="mt-missed">
              {m.most_missed.map((x) => (
                <li key={x.id}><span>“{quizText(x.id)}”</span><b>{x.wrong_pct}% wrong</b><small>{x.wrong} of {x.asked}</small></li>
              ))}
            </ol>
          ) : <p className="muted">Nothing to show yet: a statement appears once 5 or more people have answered it.</p>}
        </Card>
      </div>

      <Card title="2 · Access to counselling">
          <div className="mt-funnel">
            <div><strong>{show(c.couples_screened)}</strong><span>couples with a result</span></div>
            <div><strong>{show(c.needs_counselling)}</strong><span>need counselling (tier 1–2)</span></div>
            <div><strong>{show(c.booked)}</strong><span>booked a counsellor</span></div>
            <div><strong>{show(c.within_7_days)}</strong><span>within 7 days</span></div>
          </div>
          <Bar label="Uptake" value={c.uptake_pct} />
          <p className="mt-foot">Specialist referrals: <b>{show(r.sent)}</b> sent, <b>{show(r.completed)}</b> completed.</p>
        </Card>

      <Card title="3 · Fairness across languages" aside={<button className="link" onClick={() => setTable(!table)}>{table ? 'Show bars' : 'Show table'}</button>}>
        {table ? (
          <table className="table">
            <thead><tr><th>Language</th><th className="right">People</th><th className="right">Average score</th><th className="right">All right</th><th className="right">Counselling uptake</th></tr></thead>
            <tbody>{langs.map((l) => (
              <tr key={l.lang}><td>{LANG[l.lang]}</td><td className="right">{show(l.people)}</td><td className="right">{show(l.avg_score_pct, '%')}</td>
                <td className="right">{show(l.all_correct_pct, '%')}</td><td className="right">{show(l.uptake_pct, '%')}</td></tr>
            ))}</tbody>
          </table>
        ) : (
          <div className="mt-langs">
            {langs.map((l) => (
              <div key={l.lang} className="mt-lang">
                <h3>{LANG[l.lang]} <small className="muted">{l.people == null ? 'fewer than 5 people' : `${show(l.people)} people`}</small></h3>
                <Bar label="Understood" value={l.all_correct_pct} />
                <Bar label="Counselling uptake" value={l.uptake_pct} />
              </div>
            ))}
          </div>
        )}
        <p className="mt-foot">A gap of more than 10 points between languages is a signal to review that language's wording with native-speaking counsellors.</p>
      </Card>
      <Card title="4 · Privacy protection">
          <div className="mt-funnel">
            <div><strong>{show(p.consents_given)}</strong><span>gave Malaffi consent</span></div>
            <div><strong>{show(p.consents_withdrawn)}</strong><span>withdrew consent</span></div>
            <div><strong>{show(p.case_views_logged)}</strong><span>case views logged</span></div>
            <div><strong>{show(p.blocks)}</strong><span>people blocked</span></div>
          </div>
          <p className="mt-foot">Every view by staff is logged and visible to the person in “Who saw my data”. Groups under {p.k_threshold || 5} are never shown.</p>
        </Card>
    </Page>
  );
}

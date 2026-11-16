/* Care path (challenge points 3 and 5): which findings go to a human, and a traceable path
   Result -> Counselling -> Confirmatory test -> Specialist referral, each with a status and a date (032). */
import { useEffect, useState } from 'react';
import { Card } from './ui.jsx';
import { useStore, EMPTY_ARR } from './store.js';
import { isLive } from './db.js';
import { supabase } from './supabase.js';
import './carepath.css';

/* findings that are complex, high-impact or uncertain always go to an accredited counsellor */
export function escalation(result, couple) {
  if (!result) return null;
  if (result.type === 'plan' && couple?.pregnantWeeks) return 'You are pregnant and you both carry a change in the same gene.';
  if (result.type === 'plan') return 'You both carry a change in the same gene.';
  if (result.type === 'xlinked') return 'A change on the X chromosome was found. It can affect sons differently from daughters.';
  if (result.type === 'uncertain') return 'An uncertain change was found. A specialist reviews it before any risk is given.';
  return null;
}

/* a short, calm note: DaNA explains, a counsellor advises */
export function EscalationNote({ result, couple, counsellor }) {
  const why = escalation(result, couple);
  if (!why) return null;
  return (
    <section className="cp-esc" role="note">
      <span className="cp-esc-ic" aria-hidden="true">👩‍⚕️</span>
      <div>
        <b>A genetic counsellor will contact you{counsellor ? `: ${counsellor}` : ''}.</b>
        <p>{why} Results like this are always reviewed by an accredited genetics professional. This is not a diagnosis, and every decision stays yours.</p>
        <p className="cp-esc-line">DaNA explains your result. Medical advice comes only from your counsellor.</p>
      </div>
    </section>
  );
}

const COUNSEL = { not_started: ['Not booked yet', 'grey'], requested: ['Requested', 'amber'], booked: ['Booked', 'amber'], done: ['Done', 'green'] };
const CONFIRM = { not_started: ['Only if your counsellor advises it', 'grey'], not_needed: ['Not needed', 'green'], needed: ['Advised: not booked yet', 'amber'], booked: ['Booked', 'amber'], done: ['Done', 'green'] };
const REF = { sent: ['Referral sent', 'amber'], accepted: ['Accepted by the clinic', 'amber'], completed: ['Completed', 'green'] };
const day = (t) => (t ? new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null);

export function useCarePath(coupleId) {
  const [path, setPath] = useState(null);
  const referrals = useStore((s) => (coupleId ? s.referrals[coupleId] : null)) || EMPTY_ARR;
  const approved = useStore((s) => s.approved) || EMPTY_ARR;
  useEffect(() => {
    if (!isLive() || !coupleId) return;
    let on = true;
    supabase.rpc('my_care_path').then(({ data }) => { if (on && data) setPath(data); }, () => {});
    return () => { on = false; };
  }, [coupleId]);
  if (path) return path;
  // offline demo: build the same shape from the local store
  return {
    counselling: approved.includes(coupleId) ? 'done' : 'not_started',
    confirm: 'not_started',
    referrals: referrals.map((r) => ({ destination: r.destination, status: r.status, created_at: r.t })),
  };
}

export default function CarePath({ result, couple }) {
  const path = useCarePath(couple?.id);
  const escalated = !!escalation(result, couple);
  const refs = path.referrals || [];
  const [cl, ct] = COUNSEL[path.counselling] || COUNSEL.not_started;
  const [fl, ft] = CONFIRM[path.confirm] || CONFIRM.not_started;
  const steps = [
    { t: 'Screening result', s: ['Ready', 'green'], d: day(path.result_at), hint: 'Your couple result is ready to read.' },
    { t: 'Genetic counselling', s: [cl, ct], d: day(path.counselling_at),
      hint: escalated ? 'Recommended for your result. Free and confidential.' : 'Optional. Talk to a counsellor any time.',
      act: path.counselling === 'not_started' ? ['Book a counsellor', '#/app/counsellor'] : null },
    { t: 'Confirmatory test', s: [fl, ft], d: day(path.confirm_at), hint: 'A second test that confirms a finding before any big decision.' },
    { t: 'Specialist services', s: refs.length ? (REF[refs[refs.length - 1].status] || REF.sent) : ['Only if you choose', 'grey'],
      d: refs.length ? day(refs[refs.length - 1].updated_at || refs[refs.length - 1].created_at) : null,
      hint: refs.length ? refs.map((r) => `${r.destination}: ${(REF[r.status] || REF.sent)[0].toLowerCase()}`).join(' · ')
        : 'For example IVF with embryo testing or fetal medicine, arranged by your counsellor.' },
  ];
  const doneN = steps.filter((x) => x.s[1] === 'green').length;

  return (
    <Card title="Your care path" aside={<small className="muted">{doneN} of {steps.length} done</small>}>
      <ol className="cp-steps">
        {steps.map((x) => (
          <li key={x.t} className={`cp-${x.s[1]}`}>
            <span className="cp-dot" aria-hidden="true">{x.s[1] === 'green' ? '✓' : ''}</span>
            <div className="cp-body">
              <div className="cp-row"><b>{x.t}</b><span className={`cp-st cp-st-${x.s[1]}`}>{x.s[0]}</span></div>
              <small>{x.hint}{x.d && <> · {x.d}</>}</small>
              {x.act && <a className="cp-act" href={x.act[1]}>{x.act[0]} →</a>}
            </div>
          </li>
        ))}
      </ol>
      <p className="cp-foot">Every step is your choice. Your counsellor updates this path, and each change is recorded.</p>
    </Card>
  );
}

/* counsellor side: move each step on; the couple sees the same path */
export function CarePathControls({ coupleId, refs, onChanged }) {
  const live = isLive();
  const [path, setPath] = useState(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const load = () => live && supabase.rpc('counsellor_care_path', { p_couple: coupleId }).then(({ data }) => setPath(data), () => {});
  useEffect(() => { load(); }, [coupleId]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (key, fn, args) => {
    setBusy(key); setErr('');
    if (live) {
      const { error } = await supabase.rpc(fn, args);
      if (error) setErr(error.message); else { await load(); onChanged?.(); }
    }
    setBusy('');
  };
  return (
    <div className="cp-ctl">
      <label>Counselling
        <select disabled={!!busy} value={path?.counselled ? 'done' : 'not_done'}
          onChange={(e) => run('c', 'update_care_step', { p_couple: coupleId, p_step: 'counselling', p_status: e.target.value })}>
          <option value="not_done">Not done yet</option><option value="done">Done</option>
        </select>
      </label>
      <label>Confirmatory test
        <select disabled={!!busy} value={path?.confirm || 'not_started'}
          onChange={(e) => run('f', 'update_care_step', { p_couple: coupleId, p_step: 'confirm', p_status: e.target.value })}>
          {Object.entries(CONFIRM).map(([k, [l]]) => <option key={k} value={k}>{k === 'not_started' ? 'Not decided' : l}</option>)}
        </select>
      </label>
      {refs.filter((r) => r.id).map((r) => (
        <label key={r.id}>{r.destination}
          <select disabled={!!busy} value={r.status} onChange={(e) => run(r.id, 'set_referral_status', { p_id: r.id, p_status: e.target.value })}>
            {Object.entries(REF).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
      ))}
      {err && <p className="err">{err}</p>}
    </div>
  );
}

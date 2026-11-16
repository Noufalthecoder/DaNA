/* DaNA guide: a floating helper inside the app (couple accounts). Free, offline, no API key.
   It answers from DaNA's own reviewed wording (explain.js), personalised to this person's result,
   and hands anything it cannot answer to a human counsellor. Nothing typed here leaves the browser. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, EMPTY_OBJ } from './store.js';
import { CONDITIONS, guide } from './explain.js';
import { isLinked, isRealReport, personalStatus } from './journey.js';
import { PEOPLE, GENES } from './data.js';
import { useCouple } from '../couple/useCouple.js';
import { logAudit } from './db.js';
import './assistant.css';

/* friendly counsellor illustrations: Emirati dress, no real person's likeness */
export function CounsellorFace({ sex, size = 56 }) {
  const female = sex === 'F';
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill="#E8F3EC" />
      {female ? (
        <>
          <path d="M14 64 Q14 42 32 40 Q50 42 50 64Z" fill="#1F2A24" />
          <path d="M17 34 Q16 12 32 11 Q48 12 47 34 Q47 46 32 47 Q17 46 17 34Z" fill="#2B3A32" />
          <ellipse cx="32" cy="31" rx="10.5" ry="12" fill="#D9A77F" />
          <path d="M21 27 Q22 17 32 17 Q42 17 43 27 Q38 21 32 21 Q26 21 21 27Z" fill="#2B3A32" />
        </>
      ) : (
        <>
          <path d="M14 64 Q14 43 32 41 Q50 43 50 64Z" fill="#FFFFFF" stroke="#DDE5E0" />
          <path d="M18 36 Q15 14 32 12 Q49 14 46 36 L44 50 Q32 44 20 50Z" fill="#FFFFFF" stroke="#DDE5E0" />
          <ellipse cx="32" cy="31" rx="10" ry="11.5" fill="#C99268" />
          <path d="M21 22 Q32 15 43 22 L43 25 Q32 19 21 25Z" fill="#1F2A24" />
          <path d="M25 37 Q32 43 39 37 Q38 41 32 42 Q26 41 25 37Z" fill="#3A2A20" />
        </>
      )}
      <circle cx="28" cy="30" r="1.4" fill="#2B2B2B" />
      <circle cx="36" cy="30" r="1.4" fill="#2B2B2B" />
      <path d="M28.5 35 Q32 37.5 35.5 35" stroke="#7A4A35" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* the answers: each topic has trigger words (English, Arabic, Urdu) and an answer built from the person's own data */
function useTopics() {
  const session = useStore((s) => s.session);
  const reports = useStore((s) => s.reports) || EMPTY_OBJ;
  const { me, partner, result } = useCouple();
  const linked = isLinked(session);
  const status = personalStatus(me.sex, me.carrier, GENES[me.carrier]?.inheritance);
  const cond = me.carrier ? CONDITIONS[me.carrier] : null;
  const theirs = linked && isRealReport(reports[partner.id]);
  const g = guide(linked && theirs
    ? { stage: 'couple', type: result.type, gene: result.gene, partnerName: partner.short, partnerIsCarrier: !!partner.carrier && !me.carrier }
    : { stage: linked ? 'partner-waiting' : 'individual', status, gene: me.carrier, partnerName: partner.short })
    || guide({ stage: 'individual', status, gene: me.carrier });

  return useMemo(() => [
    { id: 'result', label: 'What is my result?', words: ['my result', 'result', 'mean', 'explain', 'نتيجة', 'نتیجہ'],
      answer: () => ({ text: `${g.title}\n\n${g.line}`, link: ['#/app/result', 'Open my result'] }) },
    { id: 'carrier', label: 'What does carrier mean?', words: ['carrier', 'carry', 'حامل', 'کیریئر'],
      answer: () => ({ text: 'A carrier has one changed copy of a gene and one working copy. The working copy does the job, so carriers are healthy and need no treatment. Most people carry at least one change like this.' }) },
    { id: 'sick', label: 'Am I sick?', words: ['sick', 'ill', 'disease', 'healthy', 'مريض', 'بیمار'],
      answer: () => ({ text: status === 'xl_male'
        ? `Your result shows a change linked to ${cond?.name || 'a condition'}. Many men with it live full, healthy lives. A counsellor will confirm it with you and explain simply.`
        : 'No. A carrier is a healthy person. A carrier result is not a diagnosis.' }) },
    { id: 'marry', label: 'Can we still marry?', words: ['marry', 'married', 'marri', 'wedding', 'nikah', 'زواج', 'شادی'],
      answer: () => ({ text: 'Yes. This result never stops a marriage. It is information to help you plan, and every choice stays yours. DaNA never tells anyone whom to marry.' }) },
    { id: 'children', label: 'What about our children?', words: ['child', 'children', 'baby', 'pregnan', 'kids', 'أطفال', 'طفل', 'بچ'],
      answer: () => {
        if (!linked) return { text: 'The chance for a child depends on both of you. Link your partner and DaNA explains what your two results mean together.', link: ['#/app/connections', 'Link my partner'] };
        if (!theirs) return { text: `We are waiting for ${partner.short}'s result. Your couple answer appears as soon as it arrives.` };
        return { text: g.line, link: ['#/app/bonds', 'See our options'] };
      } },
    { id: 'options', label: 'What are our options?', words: ['option', 'ivf', 'pgt', 'prenatal', 'plan', 'خيار', 'آپشن'],
      answer: () => ({ text: 'If you both carry the same change there are three accepted paths: IVF with embryo testing, testing during pregnancy, or going ahead fully informed with care ready. There is no right answer and no deadline.', link: ['#/app/bonds', 'Compare options'] }) },
    { id: 'partner', label: 'How do I link my partner?', words: ['partner', 'link', 'connect', 'dana id', 'شريك', 'پارٹنر'],
      answer: () => ({ text: linked ? `You are already linked with ${partner.short}.` : 'Ask your partner for their DaNA ID (shown at the top of their Connections page), then search for it on Connections and send a request.', link: linked ? null : ['#/app/connections', 'Open Connections'] }) },
    { id: 'privacy', label: 'Who can see my data?', words: ['privacy', 'private', 'see my', 'share', 'consent', 'withdraw', 'خصوصية', 'پرائیویسی'],
      answer: () => ({ text: 'Only you, your linked partner once you both agree, and the counsellor you choose. You can see who opened your data and withdraw consent on the Privacy page.', link: ['#/app/privacy', 'Open Privacy'] }) },
    { id: 'report', label: 'How do I get my report?', words: ['report', 'pdf', 'download', 'print', 'تقرير', 'رپورٹ'],
      answer: () => ({ text: 'Your standard premarital report is ready in English, Arabic or Urdu. Open it and press Save as PDF.', link: ['#/app/my-report', 'Open my report'] }) },
    { id: 'malaffi', label: 'What did Malaffi send?', words: ['malaffi', 'blood', 'test', 'lab', 'ملفي', 'ملافی'],
      answer: () => ({ text: 'Your Malaffi record shows the genetic carrier test and the premarital blood tests exactly as received, with what is normal and what to discuss.', link: ['#/app/malaffi', 'Open Malaffi record'] }) },
    { id: 'counsellor', label: 'Talk to a person', words: ['counsel', 'doctor', 'human', 'talk', 'appointment', 'book', 'مستشار', 'ڈاکٹر'],
      answer: () => ({ text: 'A genetic counsellor can explain everything in a private session, free of charge. You can choose online or in person.', link: ['#/app/counsellor', 'Book a counsellor'] }) },
    { id: 'fault', label: 'Is it my fault?', words: ['fault', 'blame', 'why me', 'ذنب', 'قصور'],
      answer: () => ({ text: 'No. You were born with it. These changes pass quietly through families for generations. Nothing you did caused it.' }) },
  ], [g, status, cond, linked, theirs, partner.short]);
}

function match(topics, q) {
  const t = q.toLowerCase();
  let best = null; let score = 0;
  for (const tp of topics) {
    // English words match from the start of a word ("ill" never matches "still"); Arabic/Urdu match anywhere
    const hit = (w) => (/^[a-z ]+$/.test(w) ? new RegExp(`(^|[^a-z])${w}`).test(t) : t.includes(w));
    const s = tp.words.reduce((n, w) => n + (hit(w) ? w.length : 0), 0);
    if (s > score) { score = s; best = tp; }
  }
  return best;
}

export default function Assistant() {
  const session = useStore((s) => s.session);
  const topics = useTopics();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState('');
  const end = useRef(null);
  const sex = PEOPLE[session?.id]?.sex === 'F' ? 'F' : 'M';
  const first = (session?.name || '').split(' ')[0];

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, open]);

  const ask = (text, topic) => {
    const tp = topic || match(topics, text);
    const a = tp ? tp.answer() : {
      text: "I can only help with your screening, result, partner, report and privacy. For anything else, or if you'd like to talk it through, a counsellor is happy to help.",
      link: ['#/app/counsellor', 'Talk to a counsellor'],
    };
    setMsgs((m) => [...m, { from: 'me', text }, { from: 'dana', ...a }]);
    setQ('');
    logAudit(`Asked the DaNA guide (${tp ? tp.id : 'unmatched'})`).catch(() => {}); // the topic only, never the words typed
  };

  return (
    <>
      {open && (
        <section className="as-panel" role="dialog" aria-label="DaNA guide">
          <header className="as-head">
            <CounsellorFace sex={sex} size={44} />
            <div><b>DaNA guide</b><small>Answers from your own result · not medical advice</small></div>
            <button className="as-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </header>
          <div className="as-body">
            <div className="as-msg dana">Hello {first}. I can explain your result in simple words. What would you like to know?</div>
            {msgs.map((m, i) => (
              <div key={i} className={`as-msg ${m.from}`}>
                {m.text.split('\n').map((l, j) => (l ? <p key={j}>{l}</p> : null))}
                {m.link && <a className="as-link" href={m.link[0]} onClick={() => setOpen(false)}>{m.link[1]} →</a>}
              </div>
            ))}
            <div className="as-chips">
              {topics.filter((t) => !msgs.some((m) => m.text === t.label)).slice(0, 4).map((t) => (
                <button key={t.id} onClick={() => ask(t.label, t)}>{t.label}</button>
              ))}
            </div>
            <div ref={end} />
          </div>
          <form className="as-input" onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(q.trim()); }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about your result…" aria-label="Your question" maxLength={300} />
            <button className="btn" disabled={!q.trim()}>Ask</button>
          </form>
          <a className="as-human" href="#/app/counsellor" onClick={() => setOpen(false)}>Prefer a person? Talk to a counsellor</a>
        </section>
      )}
      <button className={`as-fab${open ? ' on' : ''}`} onClick={() => setOpen(!open)} aria-label={open ? 'Close DaNA guide' : 'Open DaNA guide'}>
        <CounsellorFace sex={sex} size={58} />
        {!open && <span className="as-dot" aria-hidden="true">?</span>}
      </button>
    </>
  );
}

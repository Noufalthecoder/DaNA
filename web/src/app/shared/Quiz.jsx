/* "Check your understanding": 3 true/false questions after the result. Optional; saved for comprehension metrics (028). */
import { useMemo, useState } from 'react';
import { quiz, QUIZ_VERSION } from './explain.js';
import { useStore, set } from './store.js';
import { isLive } from './db.js';
import { supabase } from './supabase.js';

export default function Quiz({ stage, status, type }) {
  const qs = useMemo(() => quiz({ stage, status, type }), [stage, status, type]);
  const key = `${stage}:${type || status}`;
  const saved = useStore((s) => s.quizDone?.[key]);
  const [ans, setAns] = useState({});
  const done = qs.every((q) => q.id in ans);
  const score = qs.filter((q) => ans[q.id] === q.answer).length;

  const pick = (q, v) => {
    if (q.id in ans) return;
    const next = { ...ans, [q.id]: v };
    setAns(next);
    if (qs.every((x) => x.id in next)) {
      const sc = qs.filter((x) => next[x.id] === x.answer).length;
      set((s) => ({ quizDone: { ...(s.quizDone || {}), [key]: sc } }), `Comprehension check: ${sc}/${qs.length} (${QUIZ_VERSION})`);
      if (isLive() && supabase) {
        supabase.rpc('save_comprehension', {
          p_version: QUIZ_VERSION, p_context: key, p_score: sc, p_total: qs.length,
          p_answers: qs.map((x) => ({ id: x.id, answer: next[x.id], correct: next[x.id] === x.answer })),
        }).then(() => {}, () => {});
      }
    }
  };

  if (saved != null && !Object.keys(ans).length) {
    return (
      <section className="rs-card qz">
        <h3>Check your understanding</h3>
        <p className="muted">You answered {saved} of {qs.length} correctly.{' '}
          <button className="link" onClick={() => set((s) => ({ quizDone: { ...(s.quizDone || {}), [key]: undefined } }))}>Try again</button>
        </p>
      </section>
    );
  }

  return (
    <section className="rs-card qz">
      <h3>Check your understanding <span className="qz-opt">optional · 30 seconds</span></h3>
      <p className="muted">True or false? This helps us explain results more clearly.</p>
      <ol className="qz-list">
        {qs.map((q) => {
          const a = ans[q.id];
          const answered = a !== undefined;
          const right = a === q.answer;
          return (
            <li key={q.id} className={answered ? (right ? 'qz-right' : 'qz-wrong') : ''}>
              <p>{q.text}</p>
              <div className="qz-btns" role="group" aria-label={q.text}>
                {[[true, 'True'], [false, 'False']].map(([v, l]) => (
                  <button key={l} type="button" className={`qz-b ${a === v ? 'on' : ''}`} onClick={() => pick(q, v)} disabled={answered} aria-pressed={a === v}>{l}</button>
                ))}
              </div>
              {answered && <p className="qz-why" role="status"><b>{right ? 'Correct.' : 'Not quite.'}</b> {q.why}</p>}
            </li>
          );
        })}
      </ol>
      {done && <p className="qz-score">{score === qs.length ? `All ${score} correct. You have understood your result.` : `${score} of ${qs.length} correct. The explanations above may help; you can also ask a counsellor.`}</p>}
    </section>
  );
}

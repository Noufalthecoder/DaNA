/* The journey card shown on Home: where you are, what is done, and ONE next step. Owner: Platform. */
import { useJourney } from './journey.js';

export default function Journey({ action }) {
  const { steps, current, next } = useJourney();
  return (
    <section className="jr card" aria-label="Your journey">
      <div className="jr-head">
        <h2>Your journey</h2>
        <span className="muted">Step {Math.min(current + 1, steps.length)} of {steps.length}</span>
      </div>
      <ol className="jr-steps">
        {steps.map((s, i) => (
          <li key={s.key} className={s.done ? 'done' : i === current ? 'now' : ''} aria-current={i === current ? 'step' : undefined}>
            <span className="jr-dot" aria-hidden="true">{s.done ? '✓' : i + 1}</span>
            <span className="jr-label">{s.label}</span>
          </li>
        ))}
      </ol>
      <div className="jr-next">
        <span className="eyebrow">Next step</span>
        <h3>{next.t}</h3>
        <p>{next.p}</p>
        {action || <a className="btn" href={next.to}>Continue →</a>}
      </div>
    </section>
  );
}

/* Shared building blocks. Owner: Platform. Use these so every module looks the same. */
import { useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';
export { Logo, Brand } from './Logo.jsx';
import { Chibi, isChibi } from './Chibi.jsx';

export function Page({ title, sub, actions, children }) {
  return (
    <div className="page">
      <header className="page-h">
        <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
        {actions && <div className="page-a">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export function Card({ title, aside, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || aside) && <div className="card-h"><h2>{title}</h2>{aside}</div>}
      {children}
    </section>
  );
}

export function Stat({ label, value, note }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>;
}

const PRI = { urgent: ['●', 'Urgent', 1], high: ['▲', 'High', 2], moderate: ['■', 'Moderate', 3], routine: ['○', 'Routine', 4] };
export function Priority({ p }) {
  const [icon, label, tier] = PRI[p] || PRI.routine;
  return <span className={`pri pri-${p}`}><i aria-hidden="true">{icon}</i>Tier {tier} · {label}</span>;
}

export function Badge({ children, tone = 'grey' }) {
  return <span className={`badge b-${tone}`}>{children}</span>;
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="toggle">
      <span><b>{label}</b>{hint && <small>{hint}</small>}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

export function Steps({ items, current }) {
  return (
    <ol className="steps">
      {items.map((s, i) => (
        <li key={s} className={i < current ? 'done' : i === current ? 'now' : ''}><span>{i < current ? '✓' : i + 1}</span>{s}</li>
      ))}
    </ol>
  );
}

export function Avatar({ name = '', size = 36, icon = null }) {
  if (isChibi(icon)) return <span className={`avatar avatar-${size} avatar-icon`} style={{ width: size, height: size }} title={name}><Chibi id={icon.slice(2)} size={size} title={name} /></span>;
  if (icon) return <span className={`avatar avatar-${size} avatar-icon`} style={{ width: size, height: size, fontSize: size * 0.6 }} role="img" aria-label={name}>{icon}</span>;
  const safeName = (name || '').trim() || '?';
  const initials =
    safeName.replace(/^Dr\.\s*/, '').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() ||
    safeName[0]?.toUpperCase() ||
    '?';
  return <span className={`avatar avatar-${size}`} style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials}</span>;
}

/* A modal built on the native dialog, so focus and the Escape key just work. */
export function Dialog({ title, icon, footer, onSubmit, onClose, wide = false, children }) {
  const box = useRef(null);
  useEffect(() => {
    const el = box.current;
    if (el && !el.open) {
      try {
        el.showModal();
      } catch {}
    }
  }, []);
  return (
    <dialog
      className={`dialog${wide ? ' is-wide' : ''}`}
      ref={box}
      onClose={onClose}
      onClick={(e) => { if (e.target === box.current) onClose?.(); }}
      aria-label={title}
    >
      <form onSubmit={onSubmit}>
        <div className="dialog-h">
          {icon}
          <h2>{title}</h2>
          <button type="button" className="dialog-x" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="dialog-b">{children}</div>
        <div className="dialog-f">{footer}</div>
      </form>
    </dialog>
  );
}

/* A collapsible section on the native details element, so keyboard and screen readers just work. */
export function Accordion({ title, hint, defaultOpen = false, children }) {
  return (
    <details className="accordion" open={defaultOpen}>
      <summary>
        <span className="accordion-t"><b>{title}</b>{hint && <small>{hint}</small>}</span>
        <ChevronDown size={18} className="accordion-chev" aria-hidden="true" />
      </summary>
      <div className="accordion-b">{children}</div>
    </details>
  );
}

/* ---------- richer building blocks (polish.css) ---------- */

/* A labelled read-only value. `source` says where it came from (e.g. "UAE PASS"). */
export function Field({ label, value, source, mono = false, dir }) {
  const empty = value == null || value === '';
  return (
    <div className="fld">
      <span className="fld-l">{label}{source && <em className="fld-src">{source}</em>}</span>
      <span className={`fld-v${mono ? ' is-mono' : ''}${empty ? ' is-empty' : ''}`} dir={dir}>{empty ? 'Not provided' : value}</span>
    </div>
  );
}

/* A grid of Fields. */
export function FieldGrid({ cols = 2, children }) {
  return <div className={`fld-grid cols-${cols}`}>{children}</div>;
}

/* A labelled form control: label, control, hint or error below. */
export function FormRow({ label, hint, error, children, full = false }) {
  return (
    <label className={`frow${full ? ' is-full' : ''}${error ? ' has-err' : ''}`}>
      <span className="frow-l">{label}</span>
      {children}
      {error ? <span className="frow-e">{error}</span> : hint ? <span className="frow-h">{hint}</span> : null}
    </label>
  );
}

/* A calm one-line message: tone = info | ok | warn | err */
export function Notice({ tone = 'info', title, children, action }) {
  return (
    <div className={`notice n-${tone}`} role={tone === 'err' ? 'alert' : 'status'}>
      <div>{title && <b>{title}</b>}{children && <span>{children}</span>}</div>
      {action}
    </div>
  );
}

/* Nothing to show yet, with the next step. */
export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-i" aria-hidden="true">{icon}</div>}
      <b>{title}</b>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

/* Placeholder lines while data loads. */
export function Skeleton({ lines = 3 }) {
  return <div className="skel" aria-busy="true" aria-label="Loading">{Array.from({ length: lines }, (_, i) => <span key={i} />)}</div>;
}

/* Shared building blocks. Owner: Platform. Use these so every module looks the same. */

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

const PRI = { urgent: ['●', 'Urgent'], high: ['▲', 'High'], low: ['■', 'Low'], routine: ['○', 'Routine'] };
export function Priority({ p }) {
  const [icon, label] = PRI[p];
  return <span className={`pri pri-${p}`}><i aria-hidden="true">{icon}</i>{label}</span>;
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

export function Avatar({ name = '', size = 36 }) {
  const safeName = (name || '').trim() || '?';
  const initials =
    safeName.replace(/^Dr\.\s*/, '').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() ||
    safeName[0]?.toUpperCase() ||
    '?';
  return <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials}</span>;
}

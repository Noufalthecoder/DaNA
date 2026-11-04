/* App frame: sidebar menu per role + top bar. Owner: Platform. */
import { useEffect, useState } from 'react';
import { set, useStore, resetDemo } from './store.js';
import { go } from './router.js';
import { Avatar } from './ui.jsx';
import NotificationBell from './NotificationBell.jsx';

export default function Shell({ menu, path, children }) {
  const session = useStore((s) => s.session);
  const [open, setOpen] = useState(false);
  useEffect(() => { document.documentElement.dir = 'ltr'; document.documentElement.lang = 'en'; }, []);
  useEffect(() => setOpen(false), [path]);

  const logout = () => { set({ session: null }, 'Signed out'); go('/login'); };
  const active = (to) => (to === '/app' ? path === '/app' : path.startsWith(to));

  return (
    <div className="shell">
      <aside className={`side ${open ? 'open' : ''}`}>
        <a className="side-brand" href="#/"><span className="dot" />DaNA</a>
        <div className="side-role">{menu.label}</div>
        <nav>
          {menu.items.map((m) => (
            <a key={m.to} href={`#${m.to}`} className={active(m.to) ? 'on' : ''}>
              <span className="ic" aria-hidden="true">{m.icon}</span>{m.label}
            </a>
          ))}
        </nav>
        <div className="side-foot">
          <button onClick={() => { resetDemo(); }}>Reset demo data</button>
          <span>Synthetic data · simulated UAE PASS</span>
        </div>
      </aside>

      <div className="main">
        <header className="top">
          <button className="burger" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
          <div className="top-who">
            <Avatar name={session.name} size={34} />
            <span><b>{session.name}</b><small>{session.title}</small></span>
          </div>
          <div className="top-r">
            <NotificationBell />
            <a className="ghost" href="#/login" onClick={(e) => { e.preventDefault(); set({ session: null }); go('/login'); }}>Switch account</a>
            <button className="ghost" onClick={logout}>Sign out</button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
    </div>
  );
}

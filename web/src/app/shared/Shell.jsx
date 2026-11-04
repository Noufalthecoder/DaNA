/* App frame: sidebar menu per role + top bar. Owner: Platform. */
import { useEffect, useState } from 'react';
import { set, useStore, resetDemo } from './store.js';
import { go } from './router.js';
import { Avatar } from './ui.jsx';
import { signOut } from './supabase.js';
import { loadAll, logAudit } from './db.js';

export default function Shell({ menu, path, children }) {
  const session = useStore((s) => s.session);
  const dbError = useStore((s) => s.dbError);
  const [open, setOpen] = useState(false);
  useEffect(() => { document.documentElement.dir = 'ltr'; document.documentElement.lang = 'en'; }, []);
  useEffect(() => setOpen(false), [path]);

  const logout = async () => {
    if (session.backend) await logAudit('Signed out');
    set({ session: null }, session.backend ? undefined : 'Signed out');
    await signOut();
    go('/login');
  };
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
          {session.backend
            ? <><button onClick={() => loadAll()}>Refresh data</button><span className="live"><i />Live · shared database</span></>
            : <><button onClick={() => { resetDemo(); }}>Reset demo data</button><span>Offline demo · this browser only</span></>}
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
            <a className="ghost" href="#/login" onClick={async (e) => { e.preventDefault(); await logout(); }}>Switch account</a>
            <button className="ghost" onClick={logout}>Sign out</button>
          </div>
        </header>
        {dbError && <div className="db-err">{dbError} <button className="link" onClick={() => { set({ dbError: null }); loadAll(); }}>Try again</button></div>}
        <main className="content">{children}</main>
      </div>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
    </div>
  );
}

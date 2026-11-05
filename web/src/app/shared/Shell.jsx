/* App frame: sidebar menu per role + top bar. Owner: Platform. */
import { useEffect, useState } from 'react';
import { set, useStore, resetDemo, signOut as localSignOut } from './store.js';
import { go } from './router.js';
import ProfileMenu from './ProfileMenu.jsx';
import { Brand } from './Logo.jsx';
import { signOut as supabaseSignOut } from './supabase.js';
import { loadAll, logAudit } from './db.js';
import NotificationBell from './NotificationBell.jsx';

export default function Shell({ menu, path, children }) {
  const session = useStore((s) => s.session);
  const dbError = useStore((s) => s.dbError);
  const [open, setOpen] = useState(false);
  useEffect(() => { document.documentElement.dir = 'ltr'; document.documentElement.lang = 'en'; }, []);
  useEffect(() => setOpen(false), [path]);

  const logout = async () => {
    if (session?.backend) await logAudit('Signed out');
    localSignOut();
    try { await supabaseSignOut(); } catch {}
    go('/login');
  };
  const switchAccount = async (e) => { e.preventDefault(); await logout(); };
  const active = (to) => (to === '/app' ? path === '/app' : path.startsWith(to));

  return (
    <div className="shell">
      <aside className={`side ${open ? 'open' : ''}`}>
        <Brand size={32} href="#/" style={{ padding: '4px 10px 18px' }} />
        <div className="side-role">{menu.label}</div>
        <nav>
          {menu.items.map((m) => (
            <a key={m.to} href={`#${m.to}`} className={active(m.to) ? 'on' : ''}>
              <span className="ic" aria-hidden="true">{m.icon}</span>{m.label}
            </a>
          ))}
        </nav>
        <div className="side-foot">
          {session?.backend
            ? <><button onClick={() => loadAll()}>Refresh data</button><span className="live"><i />Live · shared database</span></>
            : <><button onClick={() => { resetDemo(); if (session?.role === 'couple') go('/app/screening'); }}>Reset demo data</button><span>Offline demo · this browser only</span></>}
          <span>Synthetic data · simulated UAE PASS</span>
        </div>
      </aside>

      <div className="main">
        <header className="top">
          <button className="burger" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
          <div className="top-r">
            <NotificationBell />
            <ProfileMenu session={session} onSwitch={switchAccount} onSignOut={logout} />
          </div>
        </header>
        {dbError && <div className="db-err">{dbError} <button className="link" onClick={() => { set({ dbError: null }); loadAll(); }}>Try again</button></div>}
        <main className="content">{children}</main>
      </div>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
    </div>
  );
}

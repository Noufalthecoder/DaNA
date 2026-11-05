/* App frame: sidebar menu per role + top bar. Owner: Platform. */
import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { set, useStore, resetDemo, signOut as localSignOut } from './store.js';
import { go } from './router.js';
import { Avatar, Dialog } from './ui.jsx';
import ProfileMenu from './ProfileMenu.jsx';
import { Brand } from './Logo.jsx';
import { signOut as supabaseSignOut } from './supabase.js';
import { loadAll, logAudit } from './db.js';
import NotificationBell from './NotificationBell.jsx';
import { isLinked, NEEDS_PARTNER } from './journey.js';
import { syncRequestsFromSupabase } from './connectionsService.js';

export default function Shell({ menu, path, children }) {
  const session = useStore((s) => s.session);
  const dbError = useStore((s) => s.dbError);
  const [open, setOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  useEffect(() => { document.documentElement.dir = 'ltr'; document.documentElement.lang = 'en'; }, []);
  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    if (session?.id) {
      syncRequestsFromSupabase(session.id, session.email, session.userId);
      const timer = setInterval(() => {
        syncRequestsFromSupabase(session.id, session.email, session.userId);
      }, 10000);
      return () => clearInterval(timer);
    }
  }, [session?.id, session?.email, session?.userId]);

  const confirmResetDemo = async (e) => {
    e?.preventDefault();
    setResetting(true);
    try {
      if (session?.backend) await logAudit('Reset demo data & restarted onboarding');
      resetDemo();
      localSignOut();
      try { await supabaseSignOut(); } catch {}
      setShowResetConfirm(false);
      go('/login');
    } finally {
      setResetting(false);
    }
  };

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
          {menu.items.filter((m) => isLinked(session) || !NEEDS_PARTNER.includes(m.to)).map((m) => (
            <a key={m.to} href={`#${m.to}`} className={active(m.to) ? 'on' : ''}>
              <span className="ic" aria-hidden="true">{m.icon}</span>{m.label}
            </a>
          ))}
        </nav>
        <div className="side-foot">
          {session?.backend ? (
            <>
              <button onClick={() => loadAll()}>Refresh data</button>
              <button onClick={() => setShowResetConfirm(true)}>Reset demo data</button>
              <span className="live"><i />Live · shared database</span>
            </>
          ) : (
            <>
              <button onClick={() => setShowResetConfirm(true)}>Reset demo data</button>
              <span>Offline demo · this browser only</span>
            </>
          )}
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

      {showResetConfirm && (
        <Dialog
          title="Reset demo data?"
          icon={<AlertTriangle size={20} style={{ color: 'var(--red)', flexShrink: 0 }} />}
          onSubmit={confirmResetDemo}
          onClose={() => setShowResetConfirm(false)}
          footer={
            <>
              <button
                type="button"
                className="btn-line"
                onClick={() => setShowResetConfirm(false)}
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-danger"
                disabled={resetting}
              >
                {resetting ? 'Resetting...' : 'Reset & Restart'}
              </button>
            </>
          }
        >
          <p>
            Reset demo data and restart onboarding?
          </p>
          <p style={{ margin: 0, color: 'var(--ink3)', fontSize: '13px' }}>
            This will reset intake completion to false and sign you out to the login page so you can start over.
          </p>
        </Dialog>
      )}
    </div>
  );
}

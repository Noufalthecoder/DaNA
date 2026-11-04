/* Top-level router: landing page, login, the signed-in app and the relative's invite. */
import { useEffect } from 'react';
import Landing from './App.jsx';
import Login from './app/shared/Login.jsx';
import Shell from './app/shared/Shell.jsx';
import Invite from './app/Invite.jsx';
import Screening from './app/couple/Screening.jsx';
import { MENUS, page } from './app/routes.jsx';
import { useRoute, go } from './app/shared/router.js';
import { useStore, signOut } from './app/shared/store.js';
import { Brand } from './app/shared/Logo.jsx';
import './app/app.css';

export default function Root() {
  const path = useRoute();
  const session = useStore((s) => s.session);
  const intakes = useStore((s) => s.screeningIntakes || {});
  const inApp = path.startsWith('/app');

  const isCouple = session?.role === 'couple';
  const isScreened = session ? !!intakes[session.id]?.completed : false;

  useEffect(() => { if (inApp && !session) go('/login'); }, [inApp, session]);

  // If a couple user has not completed screening intake, direct them to screening first
  useEffect(() => {
    if (inApp && session && isCouple && !isScreened && path !== '/app/screening') {
      go('/app/screening');
    }
  }, [inApp, session, isCouple, isScreened, path]);

  useEffect(() => { document.body.classList.toggle('in-app', path !== '/'); }, [path]);

  if (path === '/login') return <Login />;
  if (path === '/invite') return <Invite />;
  if (inApp) {
    if (!session) return null;

    // Focused Workday layout for screening intake (no sidebar) until completed
    if (isCouple && (path === '/app/screening' || !isScreened)) {
      return (
        <div className="focused-intake-shell">
          <header className="focused-top">
            <div className="focused-brand">
              <Brand size={32} href="#/" />
            </div>
            <div className="top-r" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{session.name}</span>
              {isScreened && <a className="ghost" href="#/app">Exit to Dashboard</a>}
              <button className="ghost" onClick={() => { signOut(); go('/login'); }}>Sign out</button>
            </div>
          </header>
          <main className="focused-content">
            <Screening key={`${session?.id || 'anon'}-${session?.authMethod || 'def'}`} />
          </main>
        </div>
      );
    }

    const content = page(session.role, path) || (
      <div className="page"><h1>Not found</h1><p><a href="#/app">Back to home</a></p></div>
    );
    return <Shell menu={MENUS[session.role]} path={path}>{content}</Shell>;
  }
  return <Landing />;
}

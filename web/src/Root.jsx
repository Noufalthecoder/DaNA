/* Top-level router: landing page, login, the signed-in app and the relative's invite. */
import React, { useEffect, useState, Component } from 'react';
import Landing from './App.jsx';
import Login from './app/shared/Login.jsx';
import Shell from './app/shared/Shell.jsx';
import Invite from './app/Invite.jsx';
import Screening from './app/couple/Screening.jsx';
import MedicalReport from './app/couple/MedicalReport.jsx';
import { MENUS, page } from './app/routes.jsx';
import { useRoute, go } from './app/shared/router.js';
import { useStore, signOut, EMPTY_OBJ } from './app/shared/store.js';
import { Brand } from './app/shared/Logo.jsx';
import { watchAuth, signOut as supabaseSignOut } from './app/shared/supabase.js';
import { loadAll } from './app/shared/db.js';
import Welcome from './app/couple/Welcome.jsx';
import { isLinked, NEEDS_PARTNER } from './app/shared/journey.js';
import { PENDING_CODE_KEY } from './app/shared/PartnerCode.jsx';
import './app/app.css';

/* Catch-all error boundary to eliminate white screens */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.warn('DaNA Error caught gracefully by boundary:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F7F5', padding: 24 }}>
          <div style={{ maxWidth: 520, background: '#fff', border: '1px solid #E6EAE7', borderRadius: 18, padding: 32, textAlign: 'center', boxShadow: '0 20px 40px -20px rgba(0,0,0,0.1)' }}>
            <h2 style={{ color: '#17201B', fontSize: 20, marginBottom: 10 }}>DaNA Platform Notice</h2>
            <p style={{ color: '#56625B', fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
              {this.state.error?.message || 'A temporary display issue occurred while loading this view.'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn"
                style={{ background: '#00843D', color: '#fff', border: 0, padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.hash = '#/app/connections';
                }}
              >
                Go to Connections
              </button>
              <button
                style={{ background: '#E8F3EC', color: '#00843D', border: 0, padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}
                onClick={() => {
                  try { localStorage.removeItem('dana-demo-v2'); } catch {}
                  window.location.hash = '#/login';
                  window.location.reload();
                }}
              >
                Sign In / Switch User
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Root() {
  const path = useRoute();
  const session = useStore((s) => s.session);
  const intakes = useStore((s) => s.screeningIntakes) || EMPTY_OBJ;
  const inApp = path.startsWith('/app');
  const [ready, setReady] = useState(false);

  const isCouple = session?.role === 'couple';
  const isScreened = session ? !!intakes[session.id]?.completed : false;

  useEffect(() => {
    const unsub = watchAuth(() => setReady(true));
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  useEffect(() => {
    if (ready && inApp && !session) {
      go('/login');
    }
  }, [ready, inApp, session]);

  useEffect(() => {
    document.body.classList.toggle('in-app', path !== '/');
  }, [path]);

  // Live mode data synchronization
  useEffect(() => {
    if (session?.backend) loadAll();
  }, [path, session?.backend]);

  useEffect(() => {
    const onFocus = () => { if (session?.backend) loadAll(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [session?.backend]);

  // partner invite link: #/join/CODE → keep the code, then sign in / open onboarding
  useEffect(() => {
    if (!path.startsWith('/join/')) return;
    try { sessionStorage.setItem(PENDING_CODE_KEY, path.split('/')[2].toUpperCase()); } catch {}
    go(session ? '/app/connections' : '/login');
  }, [path, session]);

  // Route matching
  if (path === '/login') {
    return (
      <ErrorBoundary>
        <Login />
      </ErrorBoundary>
    );
  }

  if (path === '/invite' || path.startsWith('/invite/')) {
    return (
      <ErrorBoundary>
        <Invite token={path.split('/')[2]} />
      </ErrorBoundary>
    );
  }

  if (inApp) {
    // If not authenticated, show Login immediately rather than rendering blank
    if (!session) {
      return (
        <ErrorBoundary>
          <Login />
        </ErrorBoundary>
      );
    }

    // Full standalone layout for individual medical report
    if (isCouple && path === '/app/report') {
      return (
        <ErrorBoundary>
          <MedicalReport />
        </ErrorBoundary>
      );
    }

    // Dedicated focused Workday layout for screening intake
    if (isCouple && path === '/app/screening') {
      return (
        <ErrorBoundary>
          <div className="focused-intake-shell">
            <header className="focused-top">
              <div className="focused-brand">
                <Brand size={32} href="#/" />
              </div>
              <div className="top-r" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{session.name}</span>
                <a className="ghost" href="#/app">Exit to Dashboard</a>
                <button
                  className="ghost"
                  onClick={async () => {
                    signOut();
                    try { await supabaseSignOut(); } catch {}
                    go('/login');
                  }}
                >
                  Sign out
                </button>
              </div>
            </header>
            <main className="focused-content">
              <Screening key={`${session?.id || 'anon'}-${session?.authMethod || 'def'}`} />
            </main>
          </div>
        </ErrorBoundary>
      );
    }

    if (session.role === 'couple' && !session.couple && path === '/app') {
      const menu = MENUS[session.role] || MENUS.couple;
      return (
        <ErrorBoundary>
          <Shell menu={menu} path={path}>
            <Welcome />
          </Shell>
        </ErrorBoundary>
      );
    }

    // partner-only pages wait until two people are linked (never show a demo couple instead)
    const locked = session.role === 'couple' && !isLinked(session) && NEEDS_PARTNER.some((p) => path.startsWith(p));
    const content = locked ? (
      <div className="page">
        <h1>Link your partner first</h1>
        <p className="muted">This part of DaNA is about your couple result, so it opens once you and your partner are linked.</p>
        <p><a className="btn" href="#/app/connections">Link your partner</a> <a className="btn secondary" href="#/app">Back to Home</a></p>
      </div>
    ) : page(session.role, path) || (
      <div className="page">
        <h1>Not found</h1>
        <p><a href="#/app">Back to home</a></p>
      </div>
    );

    const menu = MENUS[session.role] || MENUS.couple;
    return (
      <ErrorBoundary>
        <Shell menu={menu} path={path}>
          {content}
        </Shell>
      </ErrorBoundary>
    );
  }

  // Landing page
  return (
    <ErrorBoundary>
      <Landing />
    </ErrorBoundary>
  );
}

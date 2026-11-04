/* Top-level router: landing page, login, the signed-in app and the relative's invite. */
import { useEffect } from 'react';
import Landing from './App.jsx';
import Login from './app/shared/Login.jsx';
import Shell from './app/shared/Shell.jsx';
import Invite from './app/Invite.jsx';
import { MENUS, page } from './app/routes.jsx';
import { useRoute, go } from './app/shared/router.js';
import { useStore } from './app/shared/store.js';
import './app/app.css';

export default function Root() {
  const path = useRoute();
  const session = useStore((s) => s.session);
  const inApp = path.startsWith('/app');

  useEffect(() => { if (inApp && !session) go('/login'); }, [inApp, session]);
  useEffect(() => { document.body.classList.toggle('in-app', path !== '/'); }, [path]);

  if (path === '/login') return <Login />;
  if (path === '/invite') return <Invite />;
  if (inApp) {
    if (!session) return null;
    const content = page(session.role, path) || (
      <div className="page"><h1>Not found</h1><p><a href="#/app">Back to home</a></p></div>
    );
    return <Shell menu={MENUS[session.role]} path={path}>{content}</Shell>;
  }
  return <Landing />;
}

/*
  One menu per login. To add a page: create it in your module folder,
  then add one line to your role's `items` and one case to `page()`.
*/
import Home from './couple/Home.jsx';
import Roots from './couple/Roots.jsx';
import Bonds from './couple/Bonds.jsx';
import Branches from './couple/Branches.jsx';
import Connections from './couple/Connections.jsx';
import CoupleCounsellor from './couple/Counsellor.jsx';
import Privacy from './couple/Privacy.jsx';
import Queue from './counsellor/Queue.jsx';
import CaseView from './counsellor/CaseView.jsx';
import Schedule from './counsellor/Schedule.jsx';
import Overview from './admin/Overview.jsx';
import Content from './admin/Content.jsx';
import Audit from './admin/Audit.jsx';

export const MENUS = {
  couple: {
    label: 'Couple',
    items: [
      { to: '/app', label: 'Home', icon: '⌂' },
      { to: '/app/roots', label: 'Roots', icon: '🌱' },
      { to: '/app/bonds', label: 'Bonds', icon: '🤝' },
      { to: '/app/branches', label: 'Branches', icon: '🌳' },
      { to: '/app/connections', label: 'Connections', icon: '👥' },
      { to: '/app/counsellor', label: 'Counsellor', icon: '💬' },
      { to: '/app/privacy', label: 'Privacy', icon: '🔒' },
    ],
  },
  counsellor: {
    label: 'Counsellor',
    items: [
      { to: '/app', label: 'Case queue', icon: '☰' },
      { to: '/app/schedule', label: 'Schedule', icon: '📅' },
    ],
  },
  admin: {
    label: 'DoH admin',
    items: [
      { to: '/app', label: 'Overview', icon: '▦' },
      { to: '/app/content', label: 'Content review', icon: '✎' },
      { to: '/app/audit', label: 'Audit log', icon: '🛡' },
    ],
  },
};

export function page(role, path) {
  // Strip query parameters (?tab=...) and trailing slashes for robust matching
  const clean = (path || '').split('?')[0].replace(/\/$/, '') || '/app';

  if (role === 'couple') {
    const coupleRoutes = {
      '/app': <Home />,
      '/app/roots': <Roots />,
      '/app/bonds': <Bonds />,
      '/app/bonds/assessment': <Bonds defaultTab="assessment" />,
      '/app/bonds/counselling': <CoupleCounsellor />,
      '/app/bonds/timeline': <Bonds defaultTab="timeline" />,
      '/app/branches': <Branches />,
      '/app/connections': <Connections />,
      '/app/connections/discover': <Connections defaultTab="discover" />,
      '/app/connections/requests': <Connections defaultTab="requests" />,
      '/app/connections/sent': <Connections defaultTab="requests" />,
      '/app/counsellor': <CoupleCounsellor />,
      '/app/privacy': <Privacy />,
    };
    return coupleRoutes[clean] || null;
  }
  if (role === 'counsellor') {
    if (clean.startsWith('/app/case/')) return <CaseView id={clean.split('/').pop()} />;
    return { '/app': <Queue />, '/app/schedule': <Schedule /> }[clean] || null;
  }
  if (role === 'admin') {
    return { '/app': <Overview />, '/app/content': <Content />, '/app/audit': <Audit /> }[clean] || null;
  }
  return null;
}

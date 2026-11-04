/*
  One menu per login. To add a page: create it in your module folder,
  then add one line to your role's `items` and one case to `page()`.
*/
import Home from './couple/Home.jsx';
import Screening from './couple/Screening.jsx';
import Roots from './couple/Roots.jsx';
import Bonds from './couple/Bonds.jsx';
import Branches from './couple/Branches.jsx';
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
      { to: '/app/screening', label: 'Screening', icon: '📋' },
      { to: '/app/roots', label: 'Roots', icon: '🌱' },
      { to: '/app/bonds', label: 'Bonds', icon: '🤝' },
      { to: '/app/branches', label: 'Branches', icon: '🌳' },
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
  const p = path.replace(/\/$/, '');
  if (role === 'couple') {
    return {
      '/app': <Home />,
      '/app/screening': <Screening />,
      '/app/roots': <Roots />,
      '/app/bonds': <Bonds />,
      '/app/branches': <Branches />,
      '/app/counsellor': <CoupleCounsellor />,
      '/app/privacy': <Privacy />
    }[p];
  }
  if (role === 'counsellor') {
    if (p.startsWith('/app/case/')) return <CaseView id={p.split('/').pop()} />;
    return { '/app': <Queue />, '/app/schedule': <Schedule /> }[p];
  }
  if (role === 'admin') return { '/app': <Overview />, '/app/content': <Content />, '/app/audit': <Audit /> }[p];
  return null;
}

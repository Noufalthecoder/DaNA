/*
  One menu per login. To add a page: create it in your module folder,
  then add one line to your role's `items` and one case to `page()`.
*/
import Home from './couple/Home.jsx';
import Result from './couple/Result.jsx';
import Details from './couple/Details.jsx';
import FamilyTree from './couple/FamilyTree.jsx';
import Screening from './couple/Screening.jsx';
import Profile from './couple/Profile.jsx';
import MedicalReport from './couple/MedicalReport.jsx';
import Bonds from './couple/Bonds.jsx';
import Connections from './couple/Connections.jsx';
import Roots from './couple/Roots.jsx';
import CoupleCounsellor from './couple/Counsellor.jsx';
import Privacy from './couple/Privacy.jsx';
import Queue from './counsellor/Queue.jsx';
import CaseView from './counsellor/CaseView.jsx';
import Schedule from './counsellor/Schedule.jsx';
import Overview from './admin/Overview.jsx';
import Content from './admin/Content.jsx';
import Audit from './admin/Audit.jsx';
import Settings from './settings/Settings.jsx';

import {
  HomeIcon,
  RootsIcon,
  BondsIcon,
  BranchesIcon,
  FamilyTreeIcon,
  CounsellorIcon,
  PrivacyIcon,
  ProfileIcon,
  QueueIcon,
  ScheduleIcon,
  OverviewIcon,
  ContentIcon,
  AuditIcon,
  ConnectionsIcon,
  SettingsIcon,
} from './shared/Icons.jsx';

export const MENUS = {
  couple: {
    label: 'Couple',
    items: [
      { to: '/app', label: 'Home', icon: <HomeIcon /> },
      { to: '/app/result', label: 'My result', icon: <ContentIcon /> },
      { to: '/app/familytree', label: 'Family Tree', icon: <BranchesIcon /> },
      { to: '/app/bonds', label: 'Bonds', icon: <BondsIcon /> },
      { to: '/app/roots', label: 'Roots', icon: <RootsIcon /> },
      { to: '/app/connections', label: 'Connections', icon: <ConnectionsIcon /> },
      { to: '/app/counsellor', label: 'Counsellor', icon: <CounsellorIcon /> },
      { to: '/app/privacy', label: 'Privacy', icon: <PrivacyIcon /> },
    ],
  },
  counsellor: {
    label: 'Counsellor',
    items: [
      { to: '/app', label: 'Case queue', icon: <QueueIcon /> },
      { to: '/app/schedule', label: 'Schedule', icon: <ScheduleIcon /> },
      { to: '/app/settings', label: 'Settings', icon: <SettingsIcon /> },
    ],
  },
  admin: {
    label: 'DoH admin',
    items: [
      { to: '/app', label: 'Overview', icon: <OverviewIcon /> },
      { to: '/app/content', label: 'Content review', icon: <ContentIcon /> },
      { to: '/app/audit', label: 'Audit log', icon: <AuditIcon /> },
      { to: '/app/settings', label: 'Settings', icon: <SettingsIcon /> },
    ],
  },
};

export function page(role, path) {
  // Strip query parameters (?tab=...) and trailing slashes for robust matching
  const clean = (path || '').split('?')[0].replace(/\/$/, '') || '/app';

  if (role === 'couple') {
    const coupleRoutes = {
      '/app': <Home />,
      '/app/result': <Result />,
      '/app/details': <Details />,
      '/app/profile': <Profile />,
      '/app/report': <MedicalReport />,
      '/app/screening': <Screening />,
      '/app/roots': <Roots />,
      '/app/bonds': <Bonds />,
      '/app/bonds/assessment': <Bonds defaultTab="assessment" />,
      '/app/bonds/counselling': <CoupleCounsellor />,
      '/app/bonds/timeline': <Bonds defaultTab="timeline" />,
      '/app/familytree': <FamilyTree />,
      '/app/branches': <FamilyTree />,
      '/app/connections': <Connections />,
      '/app/connections/discover': <Connections defaultTab="discover" />,
      '/app/connections/requests': <Connections defaultTab="requests" />,
      '/app/connections/sent': <Connections defaultTab="requests" />,
      '/app/connections/active': <Connections defaultTab="connections" />,
      '/app/counsellor': <CoupleCounsellor />,
      '/app/privacy': <Privacy />,
    };
    return coupleRoutes[clean] || null;
  }
  if (role === 'counsellor') {
    if (clean.startsWith('/app/case/')) return <CaseView id={clean.split('/').pop()} />;
    return { '/app': <Queue />, '/app/schedule': <Schedule />, '/app/settings': <Settings /> }[clean] || null;
  }
  if (role === 'admin') {
    return { '/app': <Overview />, '/app/content': <Content />, '/app/audit': <Audit />, '/app/settings': <Settings /> }[clean] || null;
  }
  return null;
}

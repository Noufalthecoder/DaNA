/*
  One menu per login. To add a page: create it in your module folder,
  then add one line to your role's `items` and one case to `page()`.
*/
import Home from './couple/Home.jsx';
import FamilyTree from './couple/FamilyTree.jsx';
import Screening from './couple/Screening.jsx';
import Profile from './couple/Profile.jsx';
import MedicalReport from './couple/MedicalReport.jsx';
import Bonds from './couple/Bonds.jsx';
import Roots from './couple/Roots.jsx';
import CoupleCounsellor from './couple/Counsellor.jsx';
import Privacy from './couple/Privacy.jsx';
import Queue from './counsellor/Queue.jsx';
import CaseView from './counsellor/CaseView.jsx';
import Schedule from './counsellor/Schedule.jsx';
import Overview from './admin/Overview.jsx';
import Content from './admin/Content.jsx';
import Audit from './admin/Audit.jsx';

import {
  HomeIcon,
  RootsIcon,
  BondsIcon,
  BranchesIcon,
  CounsellorIcon,
  PrivacyIcon,
  ProfileIcon,
  QueueIcon,
  ScheduleIcon,
  OverviewIcon,
  ContentIcon,
  AuditIcon,
} from './shared/Icons.jsx';

export const MENUS = {
  couple: {
    label: 'Couple',
    items: [
      { to: '/app', label: 'Home', icon: <HomeIcon /> },
      { to: '/app/familytree', label: 'Family Tree', icon: <BranchesIcon /> },
      { to: '/app/bonds', label: 'Bonds', icon: <BondsIcon /> },
      { to: '/app/roots', label: 'Roots', icon: <RootsIcon /> },
      { to: '/app/counsellor', label: 'Counsellor', icon: <CounsellorIcon /> },
      { to: '/app/privacy', label: 'Privacy', icon: <PrivacyIcon /> },
      { to: '/app/profile', label: 'Profile', icon: <ProfileIcon /> },
    ],
  },
  counsellor: {
    label: 'Counsellor',
    items: [
      { to: '/app', label: 'Case queue', icon: <QueueIcon /> },
      { to: '/app/schedule', label: 'Schedule', icon: <ScheduleIcon /> },
    ],
  },
  admin: {
    label: 'DoH admin',
    items: [
      { to: '/app', label: 'Overview', icon: <OverviewIcon /> },
      { to: '/app/content', label: 'Content review', icon: <ContentIcon /> },
      { to: '/app/audit', label: 'Audit log', icon: <AuditIcon /> },
    ],
  },
};

export function page(role, path) {
  const p = path.replace(/\/$/, '');
  if (role === 'couple') {
    return {
      '/app': <Home />,
      '/app/profile': <Profile />,
      '/app/report': <MedicalReport />,
      '/app/screening': <Screening />,
      '/app/roots': <Roots />,
      '/app/bonds': <Bonds />,
      '/app/familytree': <FamilyTree />,
      '/app/counsellor': <CoupleCounsellor />,
      '/app/privacy': <Privacy />,
    }[p];
  }
  if (role === 'counsellor') {
    if (p.startsWith('/app/case/')) return <CaseView id={p.split('/').pop()} />;
    return { '/app': <Queue />, '/app/schedule': <Schedule /> }[p];
  }
  if (role === 'admin') return { '/app': <Overview />, '/app/content': <Content />, '/app/audit': <Audit /> }[p];
  return null;
}

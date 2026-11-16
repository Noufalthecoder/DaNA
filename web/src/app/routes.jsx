import MalaffiRecord from './shared/MalaffiRecord.jsx';
import { Page, Card } from './shared/ui.jsx';
import { useStore } from './shared/store.js';
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
import Coverage from './admin/Coverage.jsx';
import Content from './admin/Content.jsx';
import Audit from './admin/Audit.jsx';
import Metrics from './admin/Metrics.jsx';
import Settings from './settings/Settings.jsx';
import SecurityOverview from './admin/security/SecurityOverview.jsx';
import UsersRoles from './admin/security/UsersRoles.jsx';
import PermissionManagement from './admin/security/PermissionManagement.jsx';
import ConsentGovernance from './admin/security/ConsentGovernance.jsx';
import PartnerGovernance from './admin/security/PartnerGovernance.jsx';
import ClinicalAssignments from './admin/security/ClinicalAssignments.jsx';
import AccessHistory from './admin/security/AccessHistory.jsx';
import ThreatMonitoring from './admin/security/ThreatMonitoring.jsx';

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
  MetricsIcon,
} from './shared/Icons.jsx';

function MalaffiPage() {
  const id = useStore((st) => st.session?.id);
  return <Page title="My Malaffi record" sub="Your premarital screening record, exactly as imported. Open it any time."><Card><MalaffiRecord personId={id} /></Card></Page>;
}

export const MENUS = {
  couple: {
    label: 'Couple',
    items: [
      { to: '/app', label: 'Home', icon: <HomeIcon /> },
      { to: '/app/result', label: 'My result', icon: <ContentIcon /> },
      { to: '/app/malaffi', label: 'Malaffi record', icon: <PrivacyIcon /> },
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
  clinical_supervisor: {
    label: 'Clinical Supervisor',
    items: [
      { to: '/app', label: 'Case Queue & Review', icon: <QueueIcon /> },
      { to: '/app/security', label: 'Clinical Governance', icon: <PrivacyIcon /> },
      { to: '/app/schedule', label: 'Clinical Schedule', icon: <ScheduleIcon /> },
      { to: '/app/settings', label: 'Quality & Benchmarks', icon: <SettingsIcon /> },
    ],
  },
  admin: {
    label: 'DoH admin',
    items: [
      { to: '/app', label: 'Overview', icon: <OverviewIcon /> },
      { to: '/app/metrics', label: 'Outcome metrics', icon: <MetricsIcon /> },
      { to: '/app/coverage', label: 'Counsellors & areas', icon: <CounsellorIcon /> },
      { to: '/app/security', label: 'Security Console', icon: <PrivacyIcon /> },
      { to: '/app/content', label: 'Content review', icon: <ContentIcon /> },
      { to: '/app/audit', label: 'Audit log', icon: <AuditIcon /> },
      { to: '/app/settings', label: 'Settings', icon: <SettingsIcon /> },
    ],
  },
  content_reviewer: {
    label: 'Content Reviewer',
    items: [
      { to: '/app', label: 'Content Review', icon: <ContentIcon /> },
      { to: '/app/settings', label: 'Preferences', icon: <SettingsIcon /> },
    ],
  },
  doh_viewer: {
    label: 'DoH Viewer',
    items: [
      { to: '/app', label: 'Programme Overview', icon: <OverviewIcon /> },
      { to: '/app/metrics', label: 'Outcome metrics', icon: <MetricsIcon /> },
      { to: '/app/audit', label: 'De-identified Audit', icon: <AuditIcon /> },
    ],
  },
};

export function page(role, path) {
  // Strip query parameters (?tab=...) and trailing slashes for robust matching
  const clean = (path || '').split('?')[0].replace(/\/$/, '') || '/app';

  const securityRoutes = {
    '/app/security': <SecurityOverview />,
    '/app/security/overview': <SecurityOverview />,
    '/app/security/users': <UsersRoles />,
    '/app/security/permissions': <PermissionManagement />,
    '/app/security/consents': <ConsentGovernance />,
    '/app/security/relationships': <PartnerGovernance />,
    '/app/security/clinical-assignments': <ClinicalAssignments />,
    '/app/security/audit': <AccessHistory />,
    '/app/security/threat-monitoring': <ThreatMonitoring />,
  };

  if (role === 'couple') {
    const coupleRoutes = {
      '/app': <Home />,
      '/app/result': <Result />,
      '/app/malaffi': <MalaffiPage />,
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
  if (role === 'clinical_supervisor') {
    if (securityRoutes[clean]) return securityRoutes[clean];
    if (clean.startsWith('/app/case/')) return <CaseView id={clean.split('/').pop()} />;
    return { '/app': <Queue />, '/app/schedule': <Schedule />, '/app/settings': <Settings /> }[clean] || null;
  }
  if (role === 'counsellor') {
    if (clean.startsWith('/app/case/')) return <CaseView id={clean.split('/').pop()} />;
    return { '/app': <Queue />, '/app/schedule': <Schedule />, '/app/settings': <Settings /> }[clean] || null;
  }
  if (role === 'admin') {
    return securityRoutes[clean] || { '/app': <Overview />, '/app/content': <Content />, '/app/audit': <Audit />, '/app/metrics': <Metrics />, '/app/coverage': <Coverage />, '/app/settings': <Settings /> }[clean] || null;
  }
  if (role === 'content_reviewer') {
    return { '/app': <Content />, '/app/settings': <Settings /> }[clean] || null;
  }
  if (role === 'doh_viewer') {
    if (clean === '/app/security' || clean === '/app/security/overview' || clean === '/app/security/audit') return securityRoutes[clean];
    return { '/app': <Overview />, '/app/audit': <Audit />, '/app/metrics': <Metrics /> }[clean] || null;
  }
  return null;
}

import React, { useState, useEffect, useMemo } from 'react';
import SecurityNav from './SecurityNav.jsx';
import { Page, Card, Badge, Dialog } from '../../shared/ui.jsx';
import { ACCOUNTS, PEOPLE, COUPLES } from '../../shared/data.js';
import { useStore } from '../../shared/store.js';
import { supabase } from '../../shared/supabase.js';
import { logAudit } from '../../shared/db.js';
import { ROLES, ALL_ROLES } from '../../shared/auth/authorizationEngine.js';
import { danaIdFor } from '../../shared/connectionsService.js';
import {
  Users,
  Search,
  Filter,
  ShieldAlert,
  UserX,
  UserCheck,
  KeyRound,
  EyeOff,
  AlertCircle,
  Shield,
  Stethoscope,
  CheckCircle2,
  Lock,
  Building2,
  Cpu,
  BookOpen
} from 'lucide-react';

/* Comprehensive Staff & Governance Registry representing canonical healthcare roles */
const SYSTEM_STAFF_ACCOUNTS = [
  {
    id: 'doh',
    userId: 'doh',
    name: 'Programme team',
    role: ROLES.ADMIN,
    danaId: 'DANA-ADM1',
    title: 'DoH Premarital Screening Programme Administration',
    department: 'Department of Health Abu Dhabi',
    status: 'active',
  },
  {
    id: 'admin_sec',
    userId: 'admin_sec',
    name: 'Security Operations Lead',
    role: ROLES.ADMIN,
    danaId: 'DANA-SEC1',
    title: 'Healthcare IAM & Security Architecture Lead',
    department: 'Abu Dhabi Digital Authority (ADDA)',
    status: 'active',
  },
  {
    id: 'mariam',
    userId: 'mariam',
    name: 'Dr. Mariam Al Hosani',
    role: ROLES.COUNSELLOR,
    danaId: 'DANA-DOC1',
    title: 'Senior Genetic Counsellor · Lic. LIC-GC-2024-089',
    department: 'Genetics Consultation Clinic, SEHA',
    status: 'active',
  },
  {
    id: 'sara',
    userId: 'sara',
    name: 'Dr. Sara Al Zaabi',
    role: ROLES.COUNSELLOR,
    danaId: 'DANA-DOC2',
    title: 'Clinical Geneticist & Counsellor · Lic. LIC-GC-2025-114',
    department: 'Sheikh Shakhbout Medical City (SSMC)',
    status: 'active',
  },
  {
    id: 'dr_huda',
    userId: 'dr_huda',
    name: 'Dr. Huda Al Nuaimi',
    role: ROLES.CLINICAL_SUPERVISOR,
    danaId: 'DANA-SUP1',
    title: 'Head of Clinical Genetics & Triage Supervisor · Lic. LIC-SUP-2023-012',
    department: 'Abu Dhabi Premarital Clinical Review Board',
    status: 'active',
  },
  {
    id: 'dr_tariq',
    userId: 'dr_tariq',
    name: 'Dr. Tariq Al Hashimi',
    role: ROLES.CONTENT_REVIEWER,
    danaId: 'DANA-REV1',
    title: 'Medical & Islamic Bioethics Reviewer · Fatwa Committee',
    department: 'National Bioethics & Health Content Board',
    status: 'active',
  },
  {
    id: 'fatima_doh',
    userId: 'fatima_doh',
    name: 'Fatima Al Qasimi',
    role: ROLES.DOH_VIEWER,
    danaId: 'DANA-DOH1',
    title: 'Public Health & Compliance Quality Auditor · Lic. DOH-AUD-2026-99',
    department: 'Healthcare Quality & Population Health Division',
    status: 'active',
  },
  {
    id: 'sys_genomics',
    userId: 'sys_genomics',
    name: 'National Genomics Integration Pipeline',
    role: ROLES.SYSTEM_SERVICE,
    danaId: 'DANA-SYS1',
    title: 'Automated Genomics Laboratory Integration Service',
    department: 'Abu Dhabi Genomics Laboratory Infrastructure',
    status: 'active',
  },
];

/**
 * Builds the complete directory of patient couples from PEOPLE and COUPLES
 */
function buildEnrolledPatientAccounts() {
  const coupleLookup = {};
  COUPLES.forEach((c) => {
    coupleLookup[c.a] = { coupleId: c.id, partnerId: c.b, stage: c.stage };
    coupleLookup[c.b] = { coupleId: c.id, partnerId: c.a, stage: c.stage };
  });

  return Object.entries(PEOPLE).map(([personId, p]) => {
    const coupleInfo = coupleLookup[personId];
    const partnerName = coupleInfo ? PEOPLE[coupleInfo.partnerId]?.name || coupleInfo.partnerId : null;
    const stageDesc = coupleInfo ? (coupleInfo.stage === 'Married' ? 'married' : 'engaged') : 'enrolled';
    const coupleTitle = partnerName
      ? `Partner · ${stageDesc} with ${partnerName} (Couple ${coupleInfo.coupleId})`
      : 'Enrolled Premarital Screening Participant';

    return {
      id: personId,
      userId: personId,
      personId: personId,
      name: p.name,
      short: p.short,
      role: ROLES.PATIENT,
      danaId: p.danaId || danaIdFor(personId),
      title: coupleTitle,
      sex: p.sex,
      status: 'active',
      carrier: p.carrier || null,
      vus: p.vus || null,
    };
  });
}

export default function UsersRoles() {
  const session = useStore((s) => s.session);
  const currentRole = session?.role || ROLES.ADMIN;
  const isSuperAdmin = currentRole === ROLES.ADMIN;
  const isClinicalSupervisor = currentRole === ROLES.CLINICAL_SUPERVISOR;

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(null); // 'suspend' | 'activate' | 'role'
  const [staffCode, setStaffCode] = useState('');
  const [newRole, setNewRole] = useState(ROLES.COUNSELLOR);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const loadAccounts = async () => {
    setLoading(true);
    try {
      // 1. Gather all local synthetic patient and staff records
      const patients = buildEnrolledPatientAccounts();
      const staff = SYSTEM_STAFF_ACCOUNTS;
      const combinedMaster = [...patients, ...staff];

      // 2. Fetch live accounts from Supabase if connected
      let liveAccounts = [];
      if (supabase && session?.backend) {
        try {
          const { data, error } = await supabase
            .from('accounts')
            .select('user_id, role, person_id, display_name, title, status, created_at')
            .order('display_name', { ascending: true });
          if (!error && Array.isArray(data)) {
            liveAccounts = data;
          }
        } catch (e) {
          console.warn('Supabase accounts fetch warning:', e.message);
        }
      }

      // 3. Merge Supabase accounts with master directory, preventing duplicates
      const mergedMap = new Map();

      // Put synthetic master directory first
      combinedMaster.forEach((acc) => {
        mergedMap.set(acc.userId, acc);
        if (acc.personId) mergedMap.set(acc.personId, acc);
      });

      // Overlay live Supabase accounts
      liveAccounts.forEach((a) => {
        const key = a.person_id || a.user_id;
        const existing = mergedMap.get(key) || mergedMap.get(a.user_id) || {};
        mergedMap.set(key, {
          ...existing,
          id: a.user_id,
          userId: a.user_id,
          personId: a.person_id || existing.personId,
          name: a.display_name || existing.name || 'Member',
          role: a.role || existing.role || ROLES.PATIENT,
          danaId: existing.danaId || danaIdFor(a.user_id),
          title: a.title || existing.title || 'Registered Platform Member',
          status: a.status || existing.status || 'active',
        });
      });

      // 4. Overlay user persistence overrides from localStorage (for interactive testing & demo)
      try {
        const storedOverrides = JSON.parse(localStorage.getItem('dana-account-overrides') || '{}');
        Object.entries(storedOverrides).forEach(([uid, override]) => {
          if (mergedMap.has(uid)) {
            mergedMap.set(uid, { ...mergedMap.get(uid), ...override });
          }
        });
      } catch {}

      // Convert Map back to array, deduplicated
      const uniqueList = Array.from(new Set(mergedMap.values()));

      // 5. Apply Role-Based Access Scoping:
      // - Admin: Sees ALL accounts across all roles (Patients, Counsellors, Supervisors, Reviewers, DoH Viewers, Admins, System Services)
      // - Clinical Supervisor: Sees Clinical Counsellors, Supervisors, and Patient/Couple accounts
      let scopedList = uniqueList;
      if (isClinicalSupervisor) {
        scopedList = uniqueList.filter((acc) =>
          [ROLES.PATIENT, ROLES.COUNSELLOR, ROLES.CLINICAL_SUPERVISOR].includes(acc.role)
        );
      }

      setAccounts(scopedList);
    } catch (e) {
      console.error('Account directory load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [session?.backend, session?.role]);

  // Compute metrics across accounts
  const stats = useMemo(() => {
    const total = accounts.length;
    const couples = accounts.filter((a) => a.role === ROLES.PATIENT).length;
    const clinical = accounts.filter((a) =>
      [ROLES.COUNSELLOR, ROLES.CLINICAL_SUPERVISOR].includes(a.role)
    ).length;
    const governance = accounts.filter((a) =>
      [ROLES.ADMIN, ROLES.DOH_VIEWER, ROLES.CONTENT_REVIEWER, ROLES.SYSTEM_SERVICE].includes(a.role)
    ).length;
    const suspended = accounts.filter((a) => a.status === 'suspended').length;
    return { total, couples, clinical, governance, suspended };
  }, [accounts]);

  // Dynamic filter buttons with live counts
  const roleTabCounts = useMemo(() => {
    const counts = {
      ALL: accounts.length,
      [ROLES.PATIENT]: 0,
      [ROLES.COUNSELLOR]: 0,
      [ROLES.CLINICAL_SUPERVISOR]: 0,
      [ROLES.CONTENT_REVIEWER]: 0,
      [ROLES.DOH_VIEWER]: 0,
      [ROLES.ADMIN]: 0,
      [ROLES.SYSTEM_SERVICE]: 0,
    };
    accounts.forEach((a) => {
      if (counts[a.role] !== undefined) counts[a.role]++;
    });
    return counts;
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((acc) => {
      const matchesSearch =
        !q ||
        (acc.name && acc.name.toLowerCase().includes(q)) ||
        (acc.userId && acc.userId.toLowerCase().includes(q)) ||
        (acc.danaId && acc.danaId.toLowerCase().includes(q)) ||
        (acc.role && acc.role.toLowerCase().includes(q)) ||
        (acc.title && acc.title.toLowerCase().includes(q)) ||
        (acc.carrier && acc.carrier.toLowerCase().includes(q));

      const matchesRole = roleFilter === 'ALL' || acc.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [accounts, search, roleFilter]);

  const handleStatusToggle = async () => {
    if (!selectedUser) return;
    const targetStatus = actionType === 'suspend' ? 'suspended' : 'active';
    try {
      if (supabase && session?.backend) {
        await supabase
          .from('accounts')
          .update({ status: targetStatus })
          .eq('user_id', selectedUser.userId);
      }

      setAccounts((prev) =>
        prev.map((a) => (a.userId === selectedUser.userId ? { ...a, status: targetStatus } : a))
      );

      // Persist in localStorage overrides
      try {
        const stored = JSON.parse(localStorage.getItem('dana-account-overrides') || '{}');
        stored[selectedUser.userId] = { ...(stored[selectedUser.userId] || {}), status: targetStatus };
        localStorage.setItem('dana-account-overrides', JSON.stringify(stored));
      } catch {}

      await logAudit(
        `Administrator ${actionType === 'suspend' ? 'suspended' : 'reactivated'} account for ${selectedUser.name} (${selectedUser.danaId || selectedUser.userId})`
      );
      setActionSuccess(`Account status updated to ${targetStatus} for ${selectedUser.name}.`);
      setSelectedUser(null);
      setActionType(null);
    } catch (err) {
      setActionError(`Failed to update account status: ${err.message}`);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser) return;
    if (!staffCode.trim()) {
      setActionError('Staff authorization code is required to alter privileged roles.');
      return;
    }

    const validCodes = ['DOH-STAFF-2026', 'DANA-SEC-ADMIN', 'GEN-CLINIC-ADM'];
    if (!validCodes.includes(staffCode.trim().toUpperCase())) {
      setActionError('Invalid staff authorization code. Contact DoH IAM Security.');
      return;
    }

    try {
      if (supabase && session?.backend) {
        const { error } = await supabase.rpc('claim_staff_role', {
          p_role: newRole,
          p_code: staffCode.trim(),
        });
        if (error) throw error;
      }

      setAccounts((prev) =>
        prev.map((a) => (a.userId === selectedUser.userId ? { ...a, role: newRole } : a))
      );

      // Persist in localStorage overrides
      try {
        const stored = JSON.parse(localStorage.getItem('dana-account-overrides') || '{}');
        stored[selectedUser.userId] = { ...(stored[selectedUser.userId] || {}), role: newRole };
        localStorage.setItem('dana-account-overrides', JSON.stringify(stored));
      } catch {}

      await logAudit(
        `Staff role updated to ${newRole} for ${selectedUser.name} with verified authorization code by ${session?.userId || 'Admin'}`
      );
      setActionSuccess(`Role successfully assigned: ${newRole} to ${selectedUser.name}.`);
      setSelectedUser(null);
      setActionType(null);
      setStaffCode('');
    } catch (err) {
      setActionError(`Authorization failed: ${err.message || 'Invalid staff code.'}`);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case ROLES.ADMIN:
        return { label: 'Platform Administrator', bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' };
      case ROLES.COUNSELLOR:
        return { label: 'Genetic Counsellor', bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' };
      case ROLES.CLINICAL_SUPERVISOR:
        return { label: 'Clinical Supervisor', bg: '#F3E8FF', color: '#6B21A8', border: '#D8B4FE' };
      case ROLES.CONTENT_REVIEWER:
        return { label: 'Content Reviewer', bg: '#CCFBF1', color: '#115E59', border: '#99F6E4' };
      case ROLES.DOH_VIEWER:
        return { label: 'DoH Viewer / Auditor', bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' };
      case ROLES.SYSTEM_SERVICE:
        return { label: 'System Service', bg: '#F1F5F9', color: '#334155', border: '#CBD5E1' };
      case ROLES.PATIENT:
      default:
        return { label: 'Couple / Patient', bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' };
    }
  };

  return (
    <Page title="" sub="">
      <SecurityNav currentTab="users" />

      {/* Role-Based Access Scope Banner */}
      <div
        style={{
          background: isSuperAdmin ? '#F8FAFC' : '#FAF6EE',
          border: `1px solid ${isSuperAdmin ? '#E2E8F0' : '#E8DECE'}`,
          borderRadius: 12,
          padding: '12px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={20} color={isSuperAdmin ? '#0F766E' : '#B57C1E'} />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: isSuperAdmin ? '#0F172A' : '#82560E' }}>
              {isSuperAdmin
                ? 'Role-Based Access Governance: Platform Administrator View'
                : 'Role-Based Access Governance: Clinical Supervisor View'}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink3)' }}>
              {isSuperAdmin
                ? 'Full cross-role directory access: You can inspect, filter, suspend, and reassign roles across all platform members.'
                : 'Supervisory scope: Viewing clinical personnel and enrolled patient cases. Administrator roles are read-only.'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <EyeOff size={16} color="#B57C1E" />
          <span style={{ fontSize: 12, color: '#82560E', fontWeight: 500 }}>
            Clinical Zero-Knowledge Barrier Enforced
          </span>
        </div>
      </div>

      {/* Executive KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              Total Accounts
            </span>
            <Users size={16} color="var(--primary)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>{stats.total}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 2 }}>Enrolled members & staff</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              Couples / Patients
            </span>
            <Users size={16} color="#059669" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>{stats.couples}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 2 }}>Premarital screening participants</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              Clinical Personnel
            </span>
            <Stethoscope size={16} color="#7C3AED" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#7C3AED' }}>{stats.clinical}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 2 }}>Licensed Counsellors & Supervisors</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              Governance & Admin
            </span>
            <Building2 size={16} color="#D97706" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#D97706' }}>{stats.governance}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 2 }}>Admins, Reviewers, DoH Viewers</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              Suspended Accounts
            </span>
            <UserX size={16} color={stats.suspended > 0 ? '#DC2626' : '#94A3B8'} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: stats.suspended > 0 ? '#DC2626' : 'var(--ink)' }}>
            {stats.suspended}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 2 }}>Access revoked</div>
        </div>
      </div>

      {actionSuccess && (
        <div
          style={{
            background: '#E8F3EC',
            border: '1px solid #C4E2CF',
            color: '#00843D',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 16,
            fontSize: 13.5,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle2 size={16} />
          {actionSuccess}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 280, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--ink3)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search all members by name, DaNA ID, user handle, or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: 10,
              border: '1px solid var(--line)',
              fontSize: 13.5,
            }}
          />
        </div>

        {/* Dynamic Role Filter Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `All (${roleTabCounts.ALL})` },
            { id: ROLES.PATIENT, label: `Couples (${roleTabCounts[ROLES.PATIENT]})` },
            { id: ROLES.COUNSELLOR, label: `Counsellors (${roleTabCounts[ROLES.COUNSELLOR]})` },
            { id: ROLES.CLINICAL_SUPERVISOR, label: `Supervisors (${roleTabCounts[ROLES.CLINICAL_SUPERVISOR]})` },
            { id: ROLES.CONTENT_REVIEWER, label: `Reviewers (${roleTabCounts[ROLES.CONTENT_REVIEWER]})` },
            { id: ROLES.DOH_VIEWER, label: `DoH (${roleTabCounts[ROLES.DOH_VIEWER]})` },
            { id: ROLES.ADMIN, label: `Admins (${roleTabCounts[ROLES.ADMIN]})` },
            { id: ROLES.SYSTEM_SERVICE, label: `Services (${roleTabCounts[ROLES.SYSTEM_SERVICE]})` },
          ].map((tab) => (
            <button
              key={tab.id}
              className={roleFilter === tab.id ? 'btn btn-sm' : 'ghost btn-sm'}
              onClick={() => setRoleFilter(tab.id)}
              style={{
                fontSize: 12.5,
                fontWeight: roleFilter === tab.id ? 600 : 500,
                borderRadius: 8,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Account Directory Table */}
      <Card title={`Directory of Accounts (${filteredAccounts.length})`}>
        <table className="table">
          <thead>
            <tr>
              <th>Member Name & Context</th>
              <th>DaNA ID / User ID</th>
              <th>Assigned Role</th>
              <th>Status</th>
              <th className="right">Governance Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.map((acc) => {
              const rBadge = getRoleBadge(acc.role);
              const isTargetAdmin = acc.role === ROLES.ADMIN;
              const canModify = isSuperAdmin || (!isTargetAdmin && isClinicalSupervisor);

              return (
                <tr key={acc.userId}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{acc.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>{acc.title}</div>
                  </td>
                  <td className="nowrap">
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: '#F1F5F9',
                        border: '1px solid #E2E8F0',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        fontSize: 12,
                        color: '#0F172A',
                      }}
                    >
                      {acc.danaId || danaIdFor(acc.userId)}
                    </span>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>
                      {acc.userId}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 600,
                        background: rBadge.bg,
                        color: rBadge.color,
                        border: `1px solid ${rBadge.border}`,
                      }}
                    >
                      {rBadge.label}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${acc.status === 'suspended' ? 'b-red' : 'b-green'}`}
                      style={{ fontWeight: 600, fontSize: 11.5 }}
                    >
                      {acc.status === 'suspended' ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td className="right">
                    {canModify ? (
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        {acc.status === 'suspended' ? (
                          <button
                            className="btn btn-sm"
                            style={{ background: '#00843D', color: '#fff', fontSize: 12 }}
                            onClick={() => {
                              setSelectedUser(acc);
                              setActionType('activate');
                              setActionError('');
                            }}
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button
                            className="ghost btn-sm"
                            style={{ color: '#CE1126', fontSize: 12 }}
                            onClick={() => {
                              setSelectedUser(acc);
                              setActionType('suspend');
                              setActionError('');
                            }}
                          >
                            Suspend
                          </button>
                        )}

                        <button
                          className="ghost btn-sm"
                          style={{ fontSize: 12 }}
                          onClick={() => {
                            setSelectedUser(acc);
                            setActionType('role');
                            setNewRole(acc.role);
                            setStaffCode('');
                            setActionError('');
                          }}
                        >
                          Assign Role
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11.5, color: 'var(--ink3)', fontStyle: 'italic' }}>
                        Protected Role
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!filteredAccounts.length && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--ink3)' }}>
                  No accounts matched your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Confirmation Modal: Suspend / Reactivate */}
      {(actionType === 'suspend' || actionType === 'activate') && selectedUser && (
        <Dialog
          title={actionType === 'suspend' ? 'Confirm Account Suspension' : 'Reactivate User Account'}
          onClose={() => {
            setSelectedUser(null);
            setActionType(null);
          }}
          footer={
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="ghost"
                onClick={() => {
                  setSelectedUser(null);
                  setActionType(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{
                  background: actionType === 'suspend' ? '#CE1126' : '#00843D',
                  color: '#fff',
                }}
                onClick={handleStatusToggle}
              >
                {actionType === 'suspend' ? 'Confirm Suspension' : 'Confirm Reactivation'}
              </button>
            </div>
          }
        >
          <div style={{ padding: 10 }}>
            {actionError && (
              <div
                style={{
                  background: '#FDF2F2',
                  color: '#CE1126',
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 12,
                  fontSize: 13,
                }}
              >
                {actionError}
              </div>
            )}
            <p style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.5 }}>
              Are you sure you want to {actionType === 'suspend' ? 'suspend' : 'reactivate'} the account for{' '}
              <strong>{selectedUser.name}</strong> ({selectedUser.danaId || selectedUser.userId})?
            </p>
            {actionType === 'suspend' && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: 8,
                  padding: 12,
                  marginTop: 12,
                  display: 'flex',
                  gap: 10,
                }}
              >
                <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 12.5, color: '#991B1B' }}>
                  Suspended accounts are immediately blocked from logging in, existing sessions are revoked, and all
                  subsequent authorization requests will return <code>DANA_AUTH_403_ACCOUNT_SUSPENDED</code>.
                </span>
              </div>
            )}
          </div>
        </Dialog>
      )}

      {/* Role Assignment Modal */}
      {actionType === 'role' && selectedUser && (
        <Dialog
          title={`Assign Role — ${selectedUser.name}`}
          onClose={() => {
            setSelectedUser(null);
            setActionType(null);
          }}
          footer={
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="ghost"
                onClick={() => {
                  setSelectedUser(null);
                  setActionType(null);
                }}
              >
                Cancel
              </button>
              <button className="btn" onClick={handleRoleChange}>
                Verify & Assign Role
              </button>
            </div>
          }
        >
          <div style={{ padding: 10 }}>
            {actionError && (
              <div
                style={{
                  background: '#FDF2F2',
                  color: '#CE1126',
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 12,
                  fontSize: 13,
                }}
              >
                {actionError}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Target Healthcare Role
              </label>
              <select
                className="form-control"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                style={{ width: '100%', padding: 9, borderRadius: 8, border: '1px solid var(--line)' }}
              >
                <option value={ROLES.PATIENT}>Couple / Patient (Individual Screening Participant)</option>
                <option value={ROLES.COUNSELLOR}>Genetic Counsellor (Clinical Consultation Access)</option>
                <option value={ROLES.CLINICAL_SUPERVISOR}>Clinical Supervisor (Clinical Triage & Oversight)</option>
                <option value={ROLES.CONTENT_REVIEWER}>Content Reviewer (Islamic & Medical Content Approver)</option>
                <option value={ROLES.DOH_VIEWER}>DoH Viewer / Auditor (De-identified Public Health Analytics)</option>
                <option value={ROLES.ADMIN}>Platform Administrator (Operational IAM Governance)</option>
                <option value={ROLES.SYSTEM_SERVICE}>System Service (Automated Laboratory Ingestion)</option>
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Staff Authorization Code (Required)
              </label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter staff verification code (e.g. DOH-STAFF-2026)"
                value={staffCode}
                onChange={(e) => setStaffCode(e.target.value)}
                style={{ width: '100%', padding: 9, borderRadius: 8, border: '1px solid var(--line)' }}
              />
              <span style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 4, display: 'block' }}>
                Privileged role elevation requires verified DoH credentials under UAE Health Data Law & ADHICS. Demo staff code: <code>DOH-STAFF-2026</code>.
              </span>
            </div>
          </div>
        </Dialog>
      )}
    </Page>
  );
}

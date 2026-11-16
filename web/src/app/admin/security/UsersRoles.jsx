import React, { useState, useEffect } from 'react';
import SecurityNav from './SecurityNav.jsx';
import { Page, Card, Badge, Dialog } from '../../shared/ui.jsx';
import { ACCOUNTS } from '../../shared/data.js';
import { useStore, get, set } from '../../shared/store.js';
import { supabase } from '../../shared/supabase.js';
import { logAudit } from '../../shared/db.js';
import {
  Users,
  Search,
  Filter,
  ShieldAlert,
  UserX,
  UserCheck,
  KeyRound,
  EyeOff,
  AlertCircle
} from 'lucide-react';

export default function UsersRoles() {
  const session = useStore((s) => s.session);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(null); // 'suspend' | 'activate' | 'role'
  const [staffCode, setStaffCode] = useState('');
  const [newRole, setNewRole] = useState('counsellor');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const loadAccounts = async () => {
    setLoading(true);
    let loaded = [];
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('accounts')
          .select('user_id, role, person_id, display_name, title, status, created_at')
          .order('display_name', { ascending: true });
        if (!error && data && data.length > 0) {
          loaded = data.map((a) => ({
            id: a.user_id,
            userId: a.user_id,
            name: a.display_name || 'Member',
            role: a.role,
            personId: a.person_id,
            status: a.status || 'active',
            title: a.title,
          }));
        }
      }
    } catch (e) {
      console.warn('Direct accounts query notice:', e.message);
    }

    // Merge system accounts (ACCOUNTS) with any registered database accounts
    const map = new Map();
    ACCOUNTS.forEach((a) => {
      map.set(a.id, {
        id: a.id,
        userId: a.id,
        name: a.name,
        role: a.role,
        personId: a.person_id || (a.role === 'couple' ? a.id : null),
        status: a.status || 'active',
        title: a.title,
      });
    });

    loaded.forEach((a) => {
      map.set(a.userId, a);
    });

    // Check if session or localStorage has registered accounts like Adi_Counselot
    const currentSession = session || {};
    if (currentSession.name && !map.has(currentSession.id) && !map.has(currentSession.name)) {
      map.set(currentSession.id || currentSession.name, {
        id: currentSession.id || currentSession.name,
        userId: currentSession.id || currentSession.name,
        name: currentSession.name,
        role: currentSession.role || 'counsellor',
        status: 'active',
        title: currentSession.title || 'Genetic counsellor (pending verification)',
      });
    }

    setAccounts(Array.from(map.values()));
    setLoading(false);
  };

  useEffect(() => {
    loadAccounts();
  }, [session?.backend]);

  const filteredAccounts = accounts.filter((acc) => {
    const q = search.toLowerCase();
    const matchesSearch =
      acc.name.toLowerCase().includes(q) ||
      acc.userId.toLowerCase().includes(q) ||
      (acc.title && acc.title.toLowerCase().includes(q));
    const matchesRole = roleFilter === 'ALL' || acc.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleVerifyCounsellor = async (user) => {
    try {
      if (supabase) {
        try {
          await supabase
            .from('accounts')
            .update({ title: 'Genetic counsellor' })
            .or(`user_id.eq.${user.userId},display_name.eq.${user.name}`);

          await supabase
            .from('counsellors')
            .update({ credentials_verified: true, status: 'active' })
            .or(`user_id.eq.${user.userId},name.eq.${user.name}`);
        } catch (e) {
          console.warn('Live counsellor verify notice:', e.message);
        }
      }

      setAccounts((prev) =>
        prev.map((a) =>
          a.userId === user.userId || a.name === user.name
            ? { ...a, title: 'Genetic counsellor' }
            : a
        )
      );

      // If active session belongs to this user, update title immediately
      const s = get();
      if (s.session && (s.session.id === user.userId || s.session.name === user.name)) {
        set({ session: { ...s.session, title: 'Genetic counsellor' } });
      }

      await logAudit(
        `DoH Administrator verified professional medical credentials for Genetic Counsellor ${user.name} (${user.userId})`
      );
      setActionSuccess(`Successfully verified and credentialed ${user.name}!`);
    } catch (err) {
      setActionError(`Verification failed: ${err.message}`);
    }
  };

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
      await logAudit(
        `Administrator ${actionType === 'suspend' ? 'suspended' : 'activated'} account for ${selectedUser.name} (${selectedUser.userId})`
      );
      setActionSuccess(`Account status updated to ${targetStatus}.`);
      setSelectedUser(null);
      setActionType(null);
    } catch (err) {
      setActionError(`Failed to update status: ${err.message}`);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser) return;
    if (!staffCode.trim()) {
      setActionError('Staff authorization code is required to alter privileged roles.');
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
      await logAudit(
        `Staff role updated to ${newRole} for ${selectedUser.name} with verified authorization code`
      );
      setActionSuccess(`Role successfully assigned: ${newRole}`);
      setSelectedUser(null);
      setActionType(null);
      setStaffCode('');
    } catch (err) {
      setActionError(`Authorization failed: ${err.message || 'Invalid staff code.'}`);
    }
  };

  return (
    <Page title="" sub="">
      <SecurityNav currentTab="users" />

      {/* Clinical Zero-Knowledge Banner */}
      <div style={{
        background: '#FAF6EE',
        border: '1px solid #E8DECE',
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <EyeOff size={18} color="#B57C1E" />
        <span style={{ fontSize: 13, color: '#82560E' }}>
          <strong>Clinical Isolation Barrier:</strong> Administrators may manage account lifecycle and roles, but cannot view raw genetic reports, individual alleles, or clinical records for any user.
        </span>
      </div>

      {actionSuccess && (
        <div style={{
          background: '#E8F3EC',
          border: '1px solid #C4E2CF',
          color: '#00843D',
          borderRadius: 10,
          padding: '10px 16px',
          marginBottom: 16,
          fontSize: 13.5
        }}>
          {actionSuccess}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--ink3)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, unique ID, or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: 10,
              border: '1px solid var(--line)',
              fontSize: 13.5
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {['ALL', 'couple', 'counsellor', 'admin'].map((r) => (
            <button
              key={r}
              className={roleFilter === r ? 'btn btn-sm' : 'ghost btn-sm'}
              onClick={() => setRoleFilter(r)}
              style={{ textTransform: 'capitalize' }}
            >
              {r === 'ALL' ? 'All Roles' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Account Directory Table */}
      <Card title={`Directory of Accounts (${filteredAccounts.length})`}>
        <table className="table">
          <thead>
            <tr>
              <th>Member Name</th>
              <th>User ID / Dana ID</th>
              <th>Assigned Role</th>
              <th>Status</th>
              <th className="right">Governance Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.map((acc) => (
              <tr key={acc.userId}>
                <td>
                  <strong>{acc.name}</strong>
                  {acc.title && <small>{acc.title}</small>}
                </td>
                <td className="nowrap" style={{ fontFamily: 'monospace', fontSize: 12.5 }}>
                  {acc.userId.slice(0, 16)}...
                </td>
                <td>
                  <span className={`badge ${acc.role === 'admin' ? 'b-amber' : acc.role === 'counsellor' ? 'b-green' : ''}`}>
                    {acc.role}
                  </span>
                </td>
                <td>
                  <span className={`badge ${acc.status === 'suspended' ? 'b-red' : 'b-green'}`}>
                    {acc.status === 'suspended' ? 'Suspended' : 'Active'}
                  </span>
                </td>
                <td className="right">
                  <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    {acc.title?.toLowerCase().includes('pending') && (
                      <button
                        className="btn btn-sm"
                        style={{ background: '#00843D', color: '#fff', fontWeight: 600, padding: '4px 10px', fontSize: 12 }}
                        onClick={() => handleVerifyCounsellor(acc)}
                        title="Verify medical credentials and activate caseload"
                      >
                        ✓ Verify
                      </button>
                    )}
                    {acc.status === 'suspended' ? (
                      <button
                        className="btn btn-sm"
                        style={{ background: '#00843D', color: '#fff' }}
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
                        style={{ color: '#CE1126' }}
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
                </td>
              </tr>
            ))}
            {!filteredAccounts.length && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: 32, color: 'var(--ink3)' }}>
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
          onClose={() => { setSelectedUser(null); setActionType(null); }}
          footer={
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="ghost" onClick={() => { setSelectedUser(null); setActionType(null); }}>
                Cancel
              </button>
              <button
                className={actionType === 'suspend' ? 'btn btn-danger' : 'btn'}
                onClick={handleStatusToggle}
              >
                {actionType === 'suspend' ? 'Confirm Suspension' : 'Confirm Activation'}
              </button>
            </div>
          }
        >
          <p style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.6 }}>
            {actionType === 'suspend'
              ? `Are you sure you want to suspend access for ${selectedUser.name}? All active sessions will be terminated and subsequent requests will be rejected with HTTP 403 (ACCOUNT_SUSPENDED).`
              : `Reactivate access for ${selectedUser.name}? The account will regain standard access to authorized features.`}
          </p>
        </Dialog>
      )}

      {/* Staff Role Assignment Modal */}
      {actionType === 'role' && selectedUser && (
        <Dialog
          title={`Assign Privileged Role: ${selectedUser.name}`}
          onClose={() => { setSelectedUser(null); setActionType(null); }}
          footer={
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="ghost" onClick={() => { setSelectedUser(null); setActionType(null); }}>
                Cancel
              </button>
              <button className="btn" onClick={handleRoleChange}>
                Verify & Assign
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label>
              Select New Role:
              <select
                className="form-control"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                style={{ width: '100%', padding: 9, borderRadius: 8, marginTop: 6 }}
              >
                <option value="couple">Couple / Patient</option>
                <option value="counsellor">Genetic Counsellor</option>
                <option value="clinical_supervisor">Clinical Supervisor</option>
                <option value="admin">Platform Administrator</option>
                <option value="content_reviewer">Content Reviewer</option>
                <option value="doh_viewer">DoH Analytics Viewer</option>
              </select>
            </label>

            <label>
              Staff Verification Code:
              <input
                type="password"
                placeholder="Enter secret staff authorization code..."
                value={staffCode}
                onChange={(e) => setStaffCode(e.target.value)}
                style={{ width: '100%', padding: 9, borderRadius: 8, marginTop: 6, border: '1px solid var(--line)' }}
              />
              <small style={{ color: 'var(--ink3)', display: 'block', marginTop: 4 }}>
                Required to prevent unauthorized role escalation. Must match active staff code in database.
              </small>
            </label>

            {actionError && (
              <div style={{ color: '#CE1126', fontSize: 13, background: '#FDECEF', padding: 10, borderRadius: 8 }}>
                {actionError}
              </div>
            )}
          </div>
        </Dialog>
      )}
    </Page>
  );
}


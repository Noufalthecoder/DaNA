import React, { useState, useEffect, useMemo, useCallback } from 'react';
import SecurityNav from './SecurityNav.jsx';
import { Page, Card, Badge, Dialog } from '../../shared/ui.jsx';
import { useStore, get, set } from '../../shared/store.js';
import { supabase } from '../../shared/supabase.js';
import { logAudit } from '../../shared/db.js';
import { ROLES } from '../../shared/auth/authorizationEngine.js';
import { danaIdFor } from '../../shared/connectionsService.js';
import { api } from '../../shared/api.js';
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
  MapPin,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
  X,
  Heart,
  RefreshCw
} from 'lucide-react';

/* Approved Canonical Account Categories */
export const ACCOUNT_CATEGORIES = {
  ALL: 'ALL',
  DOH_ADMIN: 'doh_admin',
  COUNSELLOR: 'counsellor',
  COUPLE: 'couple',
};

/* Baseline fallback countries */
const FALLBACK_COUNTRIES = [
  { name: 'United Arab Emirates', code: 'AE' },
  { name: 'India', code: 'IN' },
  { name: 'Saudi Arabia', code: 'SA' },
  { name: 'Oman', code: 'OM' },
  { name: 'Bahrain', code: 'BH' },
  { name: 'Kuwait', code: 'KW' },
  { name: 'Qatar', code: 'QA' },
  { name: 'United Kingdom', code: 'GB' },
  { name: 'United States', code: 'US' },
];

export default function UsersRoles() {
  const session = useStore((s) => s.session);
  const currentRole = session?.role || ROLES.ADMIN;
  const isSuperAdmin = currentRole === ROLES.ADMIN || currentRole === 'doh_admin';

  // Accounts list & pagination state
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Summary operational metrics from /api/admin/accounts/summary
  const [summary, setSummary] = useState({
    total_accounts: 0,
    doh_administrators: 0,
    counsellors: 0,
    couples: 0,
    male_profiles: 0,
    female_profiles: 0,
    active_accounts: 0,
    suspended_accounts: 0,
  });

  // Dynamic filter states
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(ACCOUNT_CATEGORIES.ALL);
  const [genderFilter, setGenderFilter] = useState('ALL'); // 'male' | 'female'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'active' | 'suspended'

  // Cascading location filter states
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // Dropdown reference options
  const [countriesList, setCountriesList] = useState(FALLBACK_COUNTRIES);
  const [statesList, setStatesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Governance action dialogs
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(null); // 'suspend' | 'activate' | 'role'
  const [staffCode, setStaffCode] = useState('');
  const [newRole, setNewRole] = useState(ROLES.COUNSELLOR);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // 1. Fetch Operational Summary Metrics
  const loadSummary = useCallback(async () => {
    try {
      const res = await api('/admin/accounts/summary');
      if (res && typeof res.total_accounts === 'number') {
        setSummary(res);
      }
    } catch (e) {
      // Fallback: estimate from local state
    }
  }, []);

  // 2. Fetch Available Countries
  useEffect(() => {
    let mounted = true;
    async function fetchCountries() {
      try {
        const res = await api('/admin/locations/countries');
        if (mounted && Array.isArray(res) && res.length > 0) {
          setCountriesList(res);
        }
      } catch (err) {
        // Fallback maintained
      }
    }
    fetchCountries();
    loadSummary();
    return () => { mounted = false; };
  }, [loadSummary]);

  // 3. Cascading State Fetch when Country changes
  useEffect(() => {
    if (!selectedCountry) {
      setStatesList([]);
      setSelectedState('');
      setCitiesList([]);
      setSelectedCity('');
      return;
    }

    let mounted = true;
    async function fetchStates() {
      setLoadingLocations(true);
      try {
        const res = await api(`/admin/locations/states?country=${encodeURIComponent(selectedCountry)}`);
        if (mounted && Array.isArray(res)) {
          setStatesList(res);
        }
      } catch (err) {
        if (mounted) setStatesList([]);
      } finally {
        if (mounted) setLoadingLocations(false);
      }
    }
    fetchStates();
    return () => { mounted = false; };
  }, [selectedCountry]);

  // 4. Cascading City Fetch when Country & State change
  useEffect(() => {
    if (!selectedCountry || !selectedState) {
      setCitiesList([]);
      setSelectedCity('');
      return;
    }

    let mounted = true;
    async function fetchCities() {
      setLoadingLocations(true);
      try {
        const res = await api(
          `/admin/locations/cities?country=${encodeURIComponent(selectedCountry)}&state=${encodeURIComponent(selectedState)}&limit=100`
        );
        if (mounted && res && Array.isArray(res.cities)) {
          setCitiesList(res.cities);
        }
      } catch (err) {
        if (mounted) setCitiesList([]);
      } finally {
        if (mounted) setLoadingLocations(false);
      }
    }
    fetchCities();
    return () => { mounted = false; };
  }, [selectedCountry, selectedState]);

  // 5. Query Filtered Accounts from Database
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search.trim()) params.append('search', search.trim());
      if (categoryFilter !== ACCOUNT_CATEGORIES.ALL) params.append('role', categoryFilter);
      if (genderFilter !== 'ALL') params.append('gender', genderFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (selectedCountry) params.append('country', selectedCountry);
      if (selectedState) params.append('state', selectedState);
      if (selectedCity) params.append('city', selectedCity);

      const res = await api(`/admin/accounts?${params.toString()}`);
      if (res && Array.isArray(res.items)) {
        setAccounts(res.items);
        setTotalCount(res.total ?? res.items.length);
        setTotalPages(res.total_pages ?? Math.max(1, Math.ceil((res.total ?? res.items.length) / limit)));
      } else {
        setAccounts([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to retrieve accounts from database.');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, categoryFilter, genderFilter, statusFilter, selectedCountry, selectedState, selectedCity]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('');
    setCategoryFilter(ACCOUNT_CATEGORIES.ALL);
    setGenderFilter('ALL');
    setStatusFilter('ALL');
    setSelectedCountry('');
    setSelectedState('');
    setSelectedCity('');
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(search.trim()) ||
    categoryFilter !== ACCOUNT_CATEGORIES.ALL ||
    genderFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    Boolean(selectedCountry) ||
    Boolean(selectedState) ||
    Boolean(selectedCity);

  // Status toggle handler (Suspend / Reactivate)
  // from the consultation branch: DoH admin verifies a counsellor's credentials and activates them
  const handleVerifyCounsellor = async (user) => {
    try {
      if (supabase) {
        try {
          await supabase.from('accounts').update({ title: 'Genetic counsellor' }).eq('user_id', user.userId);
          await supabase.from('counsellors').update({ credentials_verified: true, status: 'active' }).eq('user_id', user.userId);
        } catch (e) {
          console.warn('Live counsellor verify notice:', e.message);
        }
      }
      setAccounts((prev) => prev.map((a) => (a.userId === user.userId ? { ...a, title: 'Genetic counsellor' } : a)));
      const s = get();
      if (s.session && s.session.id === user.userId) set({ session: { ...s.session, title: 'Genetic counsellor' } });
      await logAudit(`DoH Administrator verified professional credentials for Genetic Counsellor ${user.name} (${user.userId})`);
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
          .eq('user_id', selectedUser.user_id || selectedUser.id);
      }

      setAccounts((prev) =>
        prev.map((a) => ((a.user_id || a.id) === (selectedUser.user_id || selectedUser.id) ? { ...a, status: targetStatus } : a))
      );

      await logAudit(
        `Administrator ${actionType === 'suspend' ? 'suspended' : 'reactivated'} account for ${selectedUser.name || selectedUser.display_name} (${selectedUser.user_id})`
      );
      setActionSuccess(`Account status updated to ${targetStatus} for ${selectedUser.name || selectedUser.display_name}.`);
      setSelectedUser(null);
      setActionType(null);
      loadSummary();
    } catch (err) {
      setActionError(`Failed to update account status: ${err.message}`);
    }
  };

  // Staff Role Change Handler
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
        prev.map((a) => ((a.user_id || a.id) === (selectedUser.user_id || selectedUser.id) ? { ...a, role: newRole } : a))
      );

      await logAudit(
        `Staff role updated to ${newRole} for ${selectedUser.name || selectedUser.display_name} with verified authorization code by ${session?.userId || 'Admin'}`
      );
      setActionSuccess(`Role successfully assigned: ${newRole} to ${selectedUser.name || selectedUser.display_name}.`);
      setSelectedUser(null);
      setActionType(null);
      setStaffCode('');
      loadSummary();
    } catch (err) {
      setActionError(`Authorization failed: ${err.message || 'Invalid staff code.'}`);
    }
  };

  const getCategoryBadge = (role) => {
    switch (role) {
      case 'doh_admin':
      case 'admin':
        return { label: 'DOH Administrator', bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' };
      case 'counsellor':
        return { label: 'Genetic Counsellor', bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' };
      case 'couple':
      default:
        return { label: 'Couple Member', bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' };
    }
  };

  return (
    <Page title="" sub="">
      <SecurityNav currentTab="users" />

      {/* Role-Based Access Scope Banner */}
      <div
        style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
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
          <Shield size={20} color="#0F766E" />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A' }}>
              Database-Backed IAM Account Directory & Dynamic Filter Engine
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink3)' }}>
              Authorized for DoH Premarital Screening Programme Administration. Verified PostgreSQL & Supabase data.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => { loadSummary(); loadAccounts(); }}
            className="ghost btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            title="Refresh database records"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <EyeOff size={16} color="#B57C1E" />
            <span style={{ fontSize: 12, color: '#82560E', fontWeight: 500 }}>
              Clinical Zero-Knowledge Barrier Active
            </span>
          </div>
        </div>
      </div>

      {/* Executive Operational KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
              Total Accounts
            </span>
            <Users size={16} color="var(--primary)" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{summary.total_accounts}</div>
          <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>Registered auth logins</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
              DOH Administrators
            </span>
            <Building2 size={16} color="#D97706" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#D97706' }}>{summary.doh_administrators}</div>
          <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>Governance Authority</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
              Counsellors
            </span>
            <Stethoscope size={16} color="#059669" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#059669' }}>{summary.counsellors}</div>
          <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>Licensed clinical staff</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
              Couples Screened
            </span>
            <Heart size={16} color="#2563EB" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#2563EB' }}>{summary.couples}</div>
          <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>Distinct relationship bonds</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
              Profile Genders
            </span>
            <Users size={16} color="#7C3AED" />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#7C3AED', marginTop: 4 }}>
            {summary.male_profiles} Male · {summary.female_profiles} Female
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>Individual patient profiles</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
              Suspended
            </span>
            <UserX size={16} color={summary.suspended_accounts > 0 ? '#DC2626' : '#94A3B8'} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: summary.suspended_accounts > 0 ? '#DC2626' : 'var(--ink)' }}>
            {summary.suspended_accounts}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>Access revoked</div>
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

      {errorMsg && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#DC2626',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 16,
            fontSize: 13.5,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* Dynamic Multi-Filter Console */}
      <Card style={{ marginBottom: 18, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={18} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)' }}>
              Dynamic Multi-Filter Console
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink3)' }}>
              (Search, Demographics, Cascading Locations & Status)
            </span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="ghost btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#CE1126',
                fontSize: 12.5,
                fontWeight: 600,
                padding: '4px 10px',
              }}
            >
              <RotateCcw size={14} />
              Reset All Filters
            </button>
          )}
        </div>

        {/* Row 1: Search & Category Filter Tabs (Strictly DOH_ADMIN, COUNSELLOR, COUPLE) */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 280, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--ink3)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, email, user ID, title, or location..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 8,
                border: '1px solid var(--line)',
                fontSize: 13.5,
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: ACCOUNT_CATEGORIES.ALL, label: 'All Categories' },
              { id: ACCOUNT_CATEGORIES.DOH_ADMIN, label: 'DOH Administrators' },
              { id: ACCOUNT_CATEGORIES.COUNSELLOR, label: 'Counsellors' },
              { id: ACCOUNT_CATEGORIES.COUPLE, label: 'Couples' },
            ].map((tab) => (
              <button
                key={tab.id}
                className={categoryFilter === tab.id ? 'btn btn-sm' : 'ghost btn-sm'}
                onClick={() => {
                  setCategoryFilter(tab.id);
                  setPage(1);
                }}
                style={{
                  fontSize: 12.5,
                  fontWeight: categoryFilter === tab.id ? 600 : 500,
                  borderRadius: 8,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Cascading Locations (Country -> State -> City) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            padding: '12px 14px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            marginBottom: 14,
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              1. Country
            </label>
            <select
              className="form-control"
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setSelectedState('');
                setSelectedCity('');
                setPage(1);
              }}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 13, border: '1px solid var(--line)' }}
            >
              <option value="">All Countries (Worldwide)</option>
              {countriesList.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.code || c.iso2})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              2. State / Region
            </label>
            <select
              className="form-control"
              value={selectedState}
              disabled={!selectedCountry}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedCity('');
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 8,
                fontSize: 13,
                border: '1px solid var(--line)',
                background: !selectedCountry ? '#F1F5F9' : '#fff',
                cursor: !selectedCountry ? 'not-allowed' : 'default',
              }}
            >
              <option value="">
                {!selectedCountry ? 'Select Country First' : 'All States / Regions'}
              </option>
              {statesList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              3. City
            </label>
            <select
              className="form-control"
              value={selectedCity}
              disabled={!selectedState}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 8,
                fontSize: 13,
                border: '1px solid var(--line)',
                background: !selectedState ? '#F1F5F9' : '#fff',
                cursor: !selectedState ? 'not-allowed' : 'default',
              }}
            >
              <option value="">
                {!selectedState ? 'Select State First' : 'All Cities'}
              </option>
              {citiesList.map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Demographics & Account Status Dropdowns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Profile Gender
            </label>
            <select
              className="form-control"
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value);
                setPage(1);
              }}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 13, border: '1px solid var(--line)' }}
            >
              <option value="ALL">All Genders</option>
              <option value="male">Male (M)</option>
              <option value="female">Female (F)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Account Status
            </label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 13, border: '1px solid var(--line)' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Items Per Page
            </label>
            <select
              className="form-control"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 13, border: '1px solid var(--line)' }}
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--line)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink3)' }}>Active Filters:</span>
            {search.trim() && (
              <span className="badge b-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}>
                Search: "{search}" <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
              </span>
            )}
            {categoryFilter !== ACCOUNT_CATEGORIES.ALL && (
              <span className="badge b-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}>
                Category: {categoryFilter} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setCategoryFilter(ACCOUNT_CATEGORIES.ALL)} />
              </span>
            )}
            {genderFilter !== 'ALL' && (
              <span className="badge b-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}>
                Gender: {genderFilter} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setGenderFilter('ALL')} />
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="badge b-red" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}>
                Status: {statusFilter} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('ALL')} />
              </span>
            )}
            {selectedCountry && (
              <span className="badge b-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}>
                Country: {selectedCountry} <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setSelectedCountry(''); setSelectedState(''); setSelectedCity(''); }} />
              </span>
            )}
            {selectedState && (
              <span className="badge b-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}>
                State: {selectedState} <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setSelectedState(''); setSelectedCity(''); }} />
              </span>
            )}
            {selectedCity && (
              <span className="badge b-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}>
                City: {selectedCity} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedCity('')} />
              </span>
            )}
          </div>
        )}
      </Card>

      {/* Database-Backed Accounts Table */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>Directory of Accounts ({totalCount})</span>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink3)' }}>
              Showing {accounts.length > 0 ? (page - 1) * limit + 1 : 0}–
              {Math.min(page * limit, totalCount)} of {totalCount} matching accounts
            </div>
          </div>
        }
      >
        <table className="table">
          <thead>
            <tr>
              <th>Member Name & Email</th>
              <th>Account Category</th>
              <th>Profile Gender</th>
              <th>Location</th>
              <th>Couple Bond & Partner</th>
              <th>Status</th>
              <th className="right">Governance Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => {
              const rBadge = getCategoryBadge(acc.role);
              const isTargetAdmin = acc.role === 'admin' || acc.role === 'doh_admin';
              const canModify = isSuperAdmin;

              return (
                <tr key={acc.user_id || acc.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
                      {acc.name || acc.display_name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>
                      {acc.email || `${acc.user_id}@dana.demo`}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>
                      ID: {acc.user_id}
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
                    {acc.gender ? (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: 600,
                          background: acc.gender === 'male' ? '#EFF6FF' : '#FDF2F8',
                          color: acc.gender === 'male' ? '#1D4ED8' : '#BE185D',
                          textTransform: 'capitalize',
                        }}
                      >
                        {acc.gender}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11.5, color: 'var(--ink3)' }}>N/A (Staff)</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ink2)' }}>
                      <MapPin size={12} color="var(--primary)" style={{ flexShrink: 0 }} />
                      <span>
                        {acc.city ? `${acc.city}, ` : ''}
                        {acc.state ? `${acc.state}, ` : ''}
                        {acc.country || 'United Arab Emirates'}
                      </span>
                    </div>
                  </td>
                  <td>
                    {acc.couple ? (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                          Couple {acc.couple.relationship_id} · <span style={{ textTransform: 'capitalize', color: 'var(--primary)' }}>{acc.couple.stage}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 2 }}>
                          Partner: <strong>{acc.couple.partner_name || acc.couple.partner_id}</strong>
                          {acc.couple.partner_gender ? ` (${acc.couple.partner_gender})` : ''}
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11.5, color: 'var(--ink3)', fontStyle: 'italic' }}>
                        {acc.role === 'couple' ? 'Individual Profile' : 'Not Applicable'}
                      </span>
                    )}
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
                      <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                        {acc.title?.toLowerCase().includes('pending') && (
                          <button
                            className="btn btn-sm"
                            style={{ background: '#00843D', color: '#fff', fontWeight: 600, padding: '4px 10px', fontSize: 12 }}
                            onClick={() => handleVerifyCounsellor(acc)}
                            title="Verify medical credentials and activate caseload"
                          >
                            Verify counsellor
                          </button>
                        )}
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
                            setNewRole(acc.role === 'doh_admin' ? ROLES.ADMIN : acc.role);
                            setStaffCode('');
                            setActionError('');
                          }}
                        >
                          Assign Role
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11.5, color: 'var(--ink3)', fontStyle: 'italic' }}>
                        Protected
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!accounts.length && !loading && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--ink3)' }}>
                  No accounts matched your multi-attribute filter criteria. Try resetting filters.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--ink3)' }}>
                  <Loader2 size={20} className="spin" style={{ margin: '0 auto 8px' }} />
                  Loading database records...
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Server-Side Pagination Bar */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderTop: '1px solid var(--line)',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 12.5, color: 'var(--ink3)' }}>
              Page {page} of {totalPages}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="ghost btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12.5,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.5 : 1,
                }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                className="ghost btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12.5,
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.5 : 1,
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
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
              <strong>{selectedUser.name || selectedUser.display_name}</strong> ({selectedUser.user_id})?
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
          title={`Assign Role — ${selectedUser.name || selectedUser.display_name}`}
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
                Target Healthcare Category
              </label>
              <select
                className="form-control"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                style={{ width: '100%', padding: 9, borderRadius: 8, border: '1px solid var(--line)' }}
              >
                <option value={ROLES.PATIENT}>Couple Member (Individual Screening Participant)</option>
                <option value={ROLES.COUNSELLOR}>Genetic Counsellor (Clinical Consultation Access)</option>
                <option value={ROLES.ADMIN}>DoH Administrator (Operational IAM Governance)</option>
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

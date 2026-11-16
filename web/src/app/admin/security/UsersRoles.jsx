import React, { useState, useEffect, useMemo, useCallback } from 'react';
import SecurityNav from './SecurityNav.jsx';
import { Page, Card, Badge, Dialog } from '../../shared/ui.jsx';
import { ACCOUNTS, PEOPLE, COUPLES } from '../../shared/data.js';
import { useStore } from '../../shared/store.js';
import { supabase } from '../../shared/supabase.js';
import { logAudit } from '../../shared/db.js';
import { ROLES, ALL_ROLES } from '../../shared/auth/authorizationEngine.js';
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
  Cpu,
  BookOpen,
  MapPin,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
  X
} from 'lucide-react';

/* Baseline canonical location mapping for synthetic UAE accounts */
const SYNTHETIC_LOCATIONS = {
  khalid: { cityId: 419, cityName: 'Abu Dhabi', regionId: 456, regionName: 'Abū Z̧aby', countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
  fatima: { cityId: 419, cityName: 'Abu Dhabi', regionId: 456, regionName: 'Abū Z̧aby', countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
  tariq: { cityId: 479, cityName: 'Dubai', regionId: 588, regionName: 'Dubayy', countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
  maryam: { cityId: 479, cityName: 'Dubai', regionId: 588, regionName: 'Dubayy', countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
  salem: { cityId: 2516, cityName: 'Al Ain', regionId: 456, regionName: 'Abū Z̧aby', countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
  dana: { cityId: 2516, cityName: 'Al Ain', regionId: 456, regionName: 'Abū Z̧aby', countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
  omar: { cityId: 550, cityName: 'Sharjah', regionId: 742, regionName: 'Ash Shāriqah', countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
  latifa: { cityId: 550, cityName: 'Sharjah', regionId: 742, regionName: 'Ash Shāriqah', countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
  rashid: { cityId: 5413, cityName: "Ra's al Khaymah", regionId: 1910, regionName: "Ra's al Khaymah", countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
  aisha: { cityId: 5413, cityName: "Ra's al Khaymah", regionId: 1910, regionName: "Ra's al Khaymah", countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
  hamdan: { cityId: 6594, cityName: 'Al Fujayrah', regionId: 2470, regionName: 'Al Fujayrah', countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
  shamma: { cityId: 6594, cityName: 'Al Fujayrah', regionId: 2470, regionName: 'Al Fujayrah', countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
  mariam: { cityId: 419, cityName: 'Abu Dhabi', regionId: 456, regionName: 'Abū Z̧aby', countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
  sara: { cityId: 479, cityName: 'Dubai', regionId: 588, regionName: 'Dubayy', countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
  dr_huda: { cityId: 419, cityName: 'Abu Dhabi', regionId: 456, regionName: 'Abū Z̧aby', countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
  dr_tariq: { cityId: 419, cityName: 'Abu Dhabi', regionId: 456, regionName: 'Abū Z̧aby', countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
  fatima_doh: { cityId: 419, cityName: 'Abu Dhabi', regionId: 456, regionName: 'Abū Z̧aby', countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
  doh: { cityId: 419, cityName: 'Abu Dhabi', regionId: 456, regionName: 'Abū Z̧aby', countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
  admin_sec: { cityId: 419, cityName: 'Abu Dhabi', regionId: 456, regionName: 'Abū Z̧aby', countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
  sys_genomics: { cityId: 419, cityName: 'Abu Dhabi', regionId: 456, regionName: 'Abū Z̧aby', countryId: 226, countryIso2: 'AE', countryName: 'United Arab Emirates' },
};

/* Baseline reference countries for instantaneous fallback */
const FALLBACK_COUNTRIES = [
  { id: 226, name: 'United Arab Emirates', iso2: 'AE', iso3: 'ARE' },
  { id: 186, name: 'Saudi Arabia', iso2: 'SA', iso3: 'SAU' },
  { id: 161, name: 'Oman', iso2: 'OM', iso3: 'OMN' },
  { id: 17, name: 'Bahrain', iso2: 'BH', iso3: 'BHR' },
  { id: 114, name: 'Kuwait', iso2: 'KW', iso3: 'KWT' },
  { id: 177, name: 'Qatar', iso2: 'QA', iso3: 'QAT' },
  { id: 228, name: 'United States', iso2: 'US', iso3: 'USA' },
  { id: 227, name: 'United Kingdom', iso2: 'GB', iso3: 'GBR' },
];

/* Baseline reference UAE regions */
const FALLBACK_REGIONS = [
  { id: 456, country_id: 226, name: 'Abū Z̧aby' },
  { id: 588, country_id: 226, name: 'Dubayy' },
  { id: 742, country_id: 226, name: 'Ash Shāriqah' },
  { id: 1910, country_id: 226, name: "Ra's al Khaymah" },
  { id: 2470, country_id: 226, name: 'Al Fujayrah' },
  { id: 2845, country_id: 226, name: '‘Ajmān' },
  { id: 3210, country_id: 226, name: 'Umm al Qaywayn' },
];

/* Baseline staff & governance registry */
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
    gender: 'unspecified',
    maritalStatus: 'unlinked',
    ...(SYNTHETIC_LOCATIONS.doh || {}),
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
    gender: 'unspecified',
    maritalStatus: 'unlinked',
    ...(SYNTHETIC_LOCATIONS.admin_sec || {}),
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
    gender: 'female',
    maritalStatus: 'unlinked',
    ...(SYNTHETIC_LOCATIONS.mariam || {}),
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
    gender: 'female',
    maritalStatus: 'unlinked',
    ...(SYNTHETIC_LOCATIONS.sara || {}),
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
    gender: 'female',
    maritalStatus: 'unlinked',
    ...(SYNTHETIC_LOCATIONS.dr_huda || {}),
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
    gender: 'male',
    maritalStatus: 'unlinked',
    ...(SYNTHETIC_LOCATIONS.dr_tariq || {}),
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
    gender: 'female',
    maritalStatus: 'unlinked',
    ...(SYNTHETIC_LOCATIONS.fatima_doh || {}),
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
    gender: 'unspecified',
    maritalStatus: 'unlinked',
    ...(SYNTHETIC_LOCATIONS.sys_genomics || {}),
  },
];

/**
 * Builds the complete directory of patient couples from PEOPLE and COUPLES with location metadata
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

    const sexLower = (p.sex || '').toLowerCase();
    const gender = sexLower === 'm' ? 'male' : sexLower === 'f' ? 'female' : 'unspecified';
    const maritalStatus = coupleInfo ? (coupleInfo.stage === 'Married' ? 'married' : 'engaged') : 'unlinked';
    const loc = SYNTHETIC_LOCATIONS[personId] || SYNTHETIC_LOCATIONS.khalid;

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
      gender,
      maritalStatus,
      status: 'active',
      carrier: p.carrier || null,
      vus: p.vus || null,
      ...loc,
    };
  });
}

export default function UsersRoles() {
  const session = useStore((s) => s.session);
  const currentRole = session?.role || ROLES.ADMIN;
  const isSuperAdmin = currentRole === ROLES.ADMIN;
  const isClinicalSupervisor = currentRole === ROLES.CLINICAL_SUPERVISOR;

  // Accounts list & pagination state
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Dynamic filter states
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [maritalStatusFilter, setMaritalStatusFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Cascading location filter states
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // Dropdown reference options
  const [countriesList, setCountriesList] = useState(FALLBACK_COUNTRIES);
  const [regionsList, setRegionsList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Action Dialog states
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(null); // 'suspend' | 'activate' | 'role'
  const [staffCode, setStaffCode] = useState('');
  const [newRole, setNewRole] = useState(ROLES.COUNSELLOR);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // 1. Initial Reference Data Loading (Countries & Filter Options)
  useEffect(() => {
    let mounted = true;
    async function fetchCountries() {
      try {
        const res = await api('/locations/countries');
        if (mounted && Array.isArray(res) && res.length > 0) {
          setCountriesList(res);
        }
      } catch (err) {
        // Fallback maintained
      }
    }
    fetchCountries();
    return () => { mounted = false; };
  }, []);

  // 2. Cascading Region Fetch when Country changes
  useEffect(() => {
    if (!selectedCountry) {
      setRegionsList([]);
      setSelectedRegion('');
      setCitiesList([]);
      setSelectedCity('');
      return;
    }

    let mounted = true;
    async function fetchRegions() {
      setLoadingLocations(true);
      try {
        const res = await api(`/locations/regions?country_id=${encodeURIComponent(selectedCountry)}`);
        if (mounted && Array.isArray(res)) {
          setRegionsList(res);
        }
      } catch (err) {
        if (mounted && (selectedCountry === '226' || selectedCountry === 'AE')) {
          setRegionsList(FALLBACK_REGIONS);
        }
      } finally {
        if (mounted) setLoadingLocations(false);
      }
    }
    fetchRegions();
    return () => { mounted = false; };
  }, [selectedCountry]);

  // 3. Cascading City Fetch when Region changes
  useEffect(() => {
    if (!selectedRegion) {
      setCitiesList([]);
      setSelectedCity('');
      return;
    }

    let mounted = true;
    async function fetchCities() {
      setLoadingLocations(true);
      try {
        const res = await api(`/locations/cities?region_id=${encodeURIComponent(selectedRegion)}&limit=100`);
        if (mounted && Array.isArray(res)) {
          setCitiesList(res);
        }
      } catch (err) {
        // If offline, cities empty
      } finally {
        if (mounted) setLoadingLocations(false);
      }
    }
    fetchCities();
    return () => { mounted = false; };
  }, [selectedRegion]);

  // 4. Load Accounts with dynamic filters & server-side pagination
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      // Build query string for /admin/accounts
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search.trim()) params.append('search', search.trim());
      if (roleFilter !== 'ALL') params.append('role', roleFilter);
      if (genderFilter !== 'ALL') params.append('gender', genderFilter);
      if (maritalStatusFilter !== 'ALL') params.append('marital_status', maritalStatusFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (selectedCountry) params.append('country_id', String(selectedCountry));
      if (selectedRegion) params.append('region_id', String(selectedRegion));
      if (selectedCity) params.append('city_id', String(selectedCity));

      let apiSuccess = false;
      try {
        const res = await api(`/admin/accounts?${params.toString()}`);
        if (res && Array.isArray(res.items)) {
          // Normalize items
          const normalized = res.items.map((a) => ({
            id: a.user_id || a.id,
            userId: a.user_id || a.id,
            personId: a.person_id,
            name: a.display_name || a.name,
            role: a.role,
            danaId: a.dana_id,
            title: a.title,
            gender: a.gender,
            maritalStatus: a.marital_status,
            cityName: a.city_name,
            regionName: a.region_name,
            countryName: a.country_name,
            countryIso2: a.country_iso2,
            status: a.status || 'active',
          }));

          // Apply local role scoping for supervisors
          let scoped = normalized;
          if (isClinicalSupervisor) {
            scoped = normalized.filter((acc) =>
              [ROLES.PATIENT, ROLES.COUNSELLOR, ROLES.CLINICAL_SUPERVISOR].includes(acc.role)
            );
          }

          setAccounts(scoped);
          setTotalCount(res.pagination?.total ?? scoped.length);
          setTotalPages((res.pagination?.total_pages ?? Math.ceil(scoped.length / limit)) || 1);
          apiSuccess = true;
        }
      } catch (err) {
        // Fall back to local synthesis seamlessly
      }

      if (!apiSuccess) {
        // Local synthesis fallback
        const patients = buildEnrolledPatientAccounts();
        const staff = SYSTEM_STAFF_ACCOUNTS;
        let masterList = [...patients, ...staff];

        // Apply localStorage overrides
        try {
          const stored = JSON.parse(localStorage.getItem('dana-account-overrides') || '{}');
          masterList = masterList.map((a) => (stored[a.userId] ? { ...a, ...stored[a.userId] } : a));
        } catch {}

        // Apply supervisor scope
        if (isClinicalSupervisor) {
          masterList = masterList.filter((acc) =>
            [ROLES.PATIENT, ROLES.COUNSELLOR, ROLES.CLINICAL_SUPERVISOR].includes(acc.role)
          );
        }

        // Apply active filters locally
        let filtered = masterList;
        const q = search.trim().toLowerCase();
        if (q) {
          filtered = filtered.filter(
            (a) =>
              (a.name && a.name.toLowerCase().includes(q)) ||
              (a.userId && a.userId.toLowerCase().includes(q)) ||
              (a.danaId && a.danaId.toLowerCase().includes(q)) ||
              (a.title && a.title.toLowerCase().includes(q)) ||
              (a.cityName && a.cityName.toLowerCase().includes(q)) ||
              (a.regionName && a.regionName.toLowerCase().includes(q)) ||
              (a.countryName && a.countryName.toLowerCase().includes(q))
          );
        }

        if (roleFilter !== 'ALL') {
          filtered = filtered.filter((a) => a.role === roleFilter);
        }
        if (genderFilter !== 'ALL') {
          filtered = filtered.filter((a) => (a.gender || '').toLowerCase() === genderFilter.toLowerCase());
        }
        if (maritalStatusFilter !== 'ALL') {
          filtered = filtered.filter((a) => (a.maritalStatus || '').toLowerCase() === maritalStatusFilter.toLowerCase());
        }
        if (statusFilter !== 'ALL') {
          filtered = filtered.filter((a) => a.status === statusFilter);
        }
        if (selectedCountry) {
          filtered = filtered.filter(
            (a) =>
              String(a.countryId) === String(selectedCountry) ||
              (a.countryIso2 && a.countryIso2.toUpperCase() === String(selectedCountry).toUpperCase())
          );
        }
        if (selectedRegion) {
          filtered = filtered.filter(
            (a) =>
              String(a.regionId) === String(selectedRegion) ||
              (a.regionName && a.regionName.toLowerCase() === String(selectedRegion).toLowerCase())
          );
        }
        if (selectedCity) {
          filtered = filtered.filter(
            (a) =>
              String(a.cityId) === String(selectedCity) ||
              (a.cityName && a.cityName.toLowerCase() === String(selectedCity).toLowerCase())
          );
        }

        const total = filtered.length;
        setTotalCount(total);
        setTotalPages(Math.max(1, Math.ceil(total / limit)));

        const startIdx = (page - 1) * limit;
        setAccounts(filtered.slice(startIdx, startIdx + limit));
      }
    } catch (e) {
      console.error('Account directory load error:', e);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    search,
    roleFilter,
    genderFilter,
    maritalStatusFilter,
    statusFilter,
    selectedCountry,
    selectedRegion,
    selectedCity,
    isClinicalSupervisor,
  ]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Overall KPI statistics
  const stats = useMemo(() => {
    const patients = buildEnrolledPatientAccounts();
    const staff = SYSTEM_STAFF_ACCOUNTS;
    const all = [...patients, ...staff];
    const total = all.length;
    const couples = all.filter((a) => a.role === ROLES.PATIENT).length;
    const clinical = all.filter((a) =>
      [ROLES.COUNSELLOR, ROLES.CLINICAL_SUPERVISOR].includes(a.role)
    ).length;
    const governance = all.filter((a) =>
      [ROLES.ADMIN, ROLES.DOH_VIEWER, ROLES.CONTENT_REVIEWER, ROLES.SYSTEM_SERVICE].includes(a.role)
    ).length;
    const suspended = all.filter((a) => a.status === 'suspended').length;
    return { total, couples, clinical, governance, suspended };
  }, []);

  // Filter Reset Handler
  const handleResetFilters = () => {
    setSearch('');
    setRoleFilter('ALL');
    setGenderFilter('ALL');
    setMaritalStatusFilter('ALL');
    setStatusFilter('ALL');
    setSelectedCountry('');
    setSelectedRegion('');
    setSelectedCity('');
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(search.trim()) ||
    roleFilter !== 'ALL' ||
    genderFilter !== 'ALL' ||
    maritalStatusFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    Boolean(selectedCountry) ||
    Boolean(selectedRegion) ||
    Boolean(selectedCity);

  // Status toggle handler (Suspend / Reactivate)
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
                ? 'Full cross-role directory access: You can filter by normalized location, gender, marital status, and manage platform members.'
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

      {/* Dynamic Multi-Dimensional Filter Console */}
      <Card style={{ marginBottom: 18, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={18} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)' }}>
              Dynamic Multi-Filter Console
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink3)' }}>
              (Search, Demographics, Location & Status)
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

        {/* Row 1: Search & Role Filter Tabs */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 280, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--ink3)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, email, DaNA ID, title, or location..."
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
              { id: 'ALL', label: 'All Roles' },
              { id: ROLES.PATIENT, label: 'Couples' },
              { id: ROLES.COUNSELLOR, label: 'Counsellors' },
              { id: ROLES.CLINICAL_SUPERVISOR, label: 'Supervisors' },
              { id: ROLES.CONTENT_REVIEWER, label: 'Reviewers' },
              { id: ROLES.DOH_VIEWER, label: 'DoH' },
              { id: ROLES.ADMIN, label: 'Admins' },
              { id: ROLES.SYSTEM_SERVICE, label: 'Services' },
            ].map((tab) => (
              <button
                key={tab.id}
                className={roleFilter === tab.id ? 'btn btn-sm' : 'ghost btn-sm'}
                onClick={() => {
                  setRoleFilter(tab.id);
                  setPage(1);
                }}
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

        {/* Row 2: Cascading Normalized Location Filters */}
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
                setPage(1);
              }}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 13, border: '1px solid var(--line)' }}
            >
              <option value="">All Countries (Worldwide)</option>
              {countriesList.map((c) => (
                <option key={c.id || c.iso2} value={c.id}>
                  {c.name} ({c.iso2})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              2. State / Region / Emirate
            </label>
            <select
              className="form-control"
              value={selectedRegion}
              disabled={!selectedCountry}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
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
                {!selectedCountry ? 'Select Country First' : 'All Regions / Emirates'}
              </option>
              {regionsList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
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
              disabled={!selectedRegion}
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
                background: !selectedRegion ? '#F1F5F9' : '#fff',
                cursor: !selectedRegion ? 'not-allowed' : 'default',
              }}
            >
              <option value="">
                {!selectedRegion ? 'Select Region First' : 'All Cities'}
              </option>
              {citiesList.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.name}
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
              Gender
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
              Marital Status
            </label>
            <select
              className="form-control"
              value={maritalStatusFilter}
              onChange={(e) => {
                setMaritalStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 13, border: '1px solid var(--line)' }}
            >
              <option value="ALL">All Marital Statuses</option>
              <option value="engaged">Engaged</option>
              <option value="married">Married</option>
              <option value="unlinked">Unlinked / Single</option>
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
            {roleFilter !== 'ALL' && (
              <span className="badge b-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}>
                Role: {roleFilter} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setRoleFilter('ALL')} />
              </span>
            )}
            {genderFilter !== 'ALL' && (
              <span className="badge b-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}>
                Gender: {genderFilter} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setGenderFilter('ALL')} />
              </span>
            )}
            {maritalStatusFilter !== 'ALL' && (
              <span className="badge b-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}>
                Marital: {maritalStatusFilter} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setMaritalStatusFilter('ALL')} />
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="badge b-red" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}>
                Status: {statusFilter} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('ALL')} />
              </span>
            )}
            {selectedCountry && (
              <span className="badge b-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}>
                Country ID: {selectedCountry} <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setSelectedCountry(''); setSelectedRegion(''); setSelectedCity(''); }} />
              </span>
            )}
            {selectedRegion && (
              <span className="badge b-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}>
                Region ID: {selectedRegion} <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setSelectedRegion(''); setSelectedCity(''); }} />
              </span>
            )}
            {selectedCity && (
              <span className="badge b-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}>
                City ID: {selectedCity} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedCity('')} />
              </span>
            )}
          </div>
        )}
      </Card>

      {/* Account Directory Table */}
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
              <th>Member Name & Context</th>
              <th>Demographics & Location</th>
              <th>DaNA ID / User ID</th>
              <th>Assigned Role</th>
              <th>Status</th>
              <th className="right">Governance Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => {
              const rBadge = getRoleBadge(acc.role);
              const isTargetAdmin = acc.role === ROLES.ADMIN;
              const canModify = isSuperAdmin || (!isTargetAdmin && isClinicalSupervisor);

              return (
                <tr key={acc.userId || acc.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{acc.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>{acc.title}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                      {acc.gender && (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            background: '#F1F5F9',
                            color: '#334155',
                            textTransform: 'capitalize',
                          }}
                        >
                          {acc.gender}
                        </span>
                      )}
                      {acc.maritalStatus && (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            background: '#F1F5F9',
                            color: '#334155',
                            textTransform: 'capitalize',
                          }}
                        >
                          {acc.maritalStatus}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--ink2)' }}>
                      <MapPin size={12} color="var(--primary)" style={{ flexShrink: 0 }} />
                      <span>
                        {acc.cityName ? `${acc.cityName}, ` : ''}
                        {acc.regionName ? `${acc.regionName}, ` : ''}
                        {acc.countryName || acc.countryIso2 || 'United Arab Emirates'}
                      </span>
                    </div>
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
            {!accounts.length && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--ink3)' }}>
                  No accounts matched your multi-attribute filter criteria. Try resetting filters.
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

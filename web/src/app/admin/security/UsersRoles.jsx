/* Security Console › Users & Roles: the real account directory for administrators.
   Data: supabase/036_admin_directory.sql. The database decides what an admin may see (their own area only)
   and change (suspend or reactivate, with a reason, audited). No health or genetic data is shown here.
   Counsellor verification lives in Counsellors & areas. Owner: Admin app. */
import { useCallback, useEffect, useState } from 'react';
import { Search, ShieldCheck, UserX, UserCheck, RefreshCw, Users } from 'lucide-react';
import SecurityNav from './SecurityNav.jsx';
import { Page, Card, Badge, Stat, Dialog, Notice, EmptyState, Skeleton, FormRow } from '../../shared/ui.jsx';
import { useStore } from '../../shared/store.js';
import { loadLocations } from '../../shared/locationService.js';
import { listAccounts, accountSummary, setAccountStatus, ROLE_LABEL } from '../../shared/directoryService.js';
import './usersRoles.css';

const PAGE = 20;
const ROLE_TONE = { admin: 'amber', counsellor: 'green', couple: 'blue' };
const SCOPE_LABEL = { national: 'Whole country', emirate: 'One emirate', location: 'One area' };
const NO_FILTERS = { search: '', role: '', sex: '', status: '', emirate: '', location: '' };

export default function UsersRoles() {
  const me = useStore((s) => s.session);
  const [f, setF] = useState(NO_FILTERS);
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groups, setGroups] = useState([]);
  const [acting, setActing] = useState(null); // { row, to: 'suspended' | 'active' }
  const [reason, setReason] = useState('');
  const [actErr, setActErr] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadLocations().then(setGroups); }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [list, sum] = await Promise.all([listAccounts({ ...f, location: f.location ? Number(f.location) : null, page, pageSize: PAGE }), accountSummary()]);
      setData(list); setSummary(sum);
    } catch (e) { setError(e.message); setData({ rows: [], total: 0 }); }
    setLoading(false);
  }, [f, page]);
  useEffect(() => { load(); }, [load]);

  const up = (k) => (e) => { const v = e.target.value; setF((x) => ({ ...x, [k]: v, ...(k === 'emirate' ? { location: '' } : {}) })); setPage(0); };
  const filtered = Object.values(f).some(Boolean);
  const areas = groups.find((g) => g.emirate === f.emirate)?.items || [];
  const pages = Math.max(1, Math.ceil(data.total / PAGE));

  const open = (row, to) => { setActing({ row, to }); setReason(''); setActErr(''); };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setActErr('');
    try {
      const name = await setAccountStatus(acting.row.user_id, acting.to, reason);
      setDone(`${name || acting.row.display_name} is now ${acting.to === 'suspended' ? 'suspended' : 'active'}.`);
      setActing(null);
      await load();
    } catch (err) { setActErr(err.message); }
    setBusy(false);
  };

  return (
    <Page title="" sub="">
      <SecurityNav currentTab="users" />

      <div className="ur-head">
        <div>
          <h2>Users & Roles</h2>
          <p>Every account in your area, from the live database. Health and genetic data are never shown here.</p>
        </div>
        <button type="button" className="btn-line" onClick={load} disabled={loading}><RefreshCw size={14} /> Refresh</button>
      </div>

      {data.demo && <Notice tone="info" title="Demo data.">Sign in with your email to see the real directory.</Notice>}
      {done && <Notice tone="ok" title="Done.">{done}</Notice>}

      <div className="stats four">
        <Stat label="Accounts in your area" value={summary ? summary.total : '—'} note={summary ? `${summary.active} active · ${summary.suspended} suspended` : ''} />
        <Stat label="Couple members" value={summary ? summary.couples : '—'} note={summary ? `${summary.male} ${summary.male === 1 ? 'man' : 'men'} · ${summary.female} ${summary.female === 1 ? 'woman' : 'women'}` : ''} />
        <Stat label="Genetic counsellors" value={summary ? summary.counsellors : '—'} />
        <Stat label="Administrators" value={summary ? summary.admins : '—'} />
      </div>

      <Card title={<span className="ur-ct"><Users size={17} /> Accounts</span>}
        aside={<span className="muted">{loading ? 'Loading…' : `${data.total} ${data.total === 1 ? 'account' : 'accounts'}`}</span>}>
        <div className="tbl-tools ur-tools">
          <label className="tbl-search">
            <Search size={16} aria-hidden="true" />
            <input type="search" placeholder="Search by name, DaNA ID or staff email" value={f.search} onChange={up('search')} aria-label="Search accounts" />
          </label>
          <select value={f.role} onChange={up('role')} aria-label="Role">
            <option value="">All roles</option>
            <option value="couple">Couple members</option>
            <option value="counsellor">Genetic counsellors</option>
            <option value="admin">Administrators</option>
          </select>
          <select value={f.sex} onChange={up('sex')} aria-label="Sex">
            <option value="">Men and women</option>
            <option value="M">Men</option>
            <option value="F">Women</option>
          </select>
          <select value={f.status} onChange={up('status')} aria-label="Status">
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <select value={f.emirate} onChange={up('emirate')} aria-label="Emirate">
            <option value="">All emirates</option>
            {groups.map((g) => <option key={g.emirate} value={g.emirate}>{g.emirate}</option>)}
          </select>
          <select value={f.location} onChange={up('location')} disabled={!f.emirate} aria-label="Area">
            <option value="">{f.emirate ? 'All areas' : 'Choose an emirate first'}</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.city}</option>)}
          </select>
          {filtered && <button type="button" className="link" onClick={() => { setF(NO_FILTERS); setPage(0); }}>Clear filters</button>}
        </div>

        {error ? <Notice tone="err" title="Could not load the directory.">{error}</Notice>
          : loading ? <Skeleton lines={6} />
          : !data.rows.length ? (
            <EmptyState icon={<Users size={20} />} title={filtered ? 'No accounts match these filters' : 'No accounts in your area yet'}>
              {filtered ? 'Try fewer filters.' : 'Accounts appear here once people in your area sign up.'}
            </EmptyState>
          ) : (
            <table className="table ur-table">
              <thead><tr><th>Name</th><th>Role</th><th>Area</th><th>Status</th><th /></tr></thead>
              <tbody>
                {data.rows.map((r) => {
                  const self = r.user_id === me?.userId || (!me?.backend && r.user_id === me?.id);
                  return (
                    <tr key={r.user_id}>
                      <td>
                        <b>{r.display_name}</b>
                        <small>{[r.dana_id, r.email, r.sex === 'M' ? 'Male' : r.sex === 'F' ? 'Female' : null].filter(Boolean).join(' · ') || r.title}</small>
                      </td>
                      <td>
                        <Badge tone={ROLE_TONE[r.role] || 'grey'}>{ROLE_LABEL[r.role] || r.role}</Badge>
                        {r.role === 'admin' && r.scope_level && <small>{SCOPE_LABEL[r.scope_level]}</small>}
                      </td>
                      <td>{r.location_label || <span className="muted">Not set</span>}</td>
                      <td>
                        {r.status === 'suspended'
                          ? <><Badge tone="red">Suspended</Badge>{r.status_reason && <small>{r.status_reason}</small>}</>
                          : <Badge tone="green">Active</Badge>}
                      </td>
                      <td className="right ur-actions">
                        {r.role === 'counsellor' && <a className="btn-line" href="#/app/coverage">Verify in Counsellors & areas</a>}
                        {!self && (r.status === 'suspended'
                          ? <button type="button" className="btn-line" onClick={() => open(r, 'active')}><UserCheck size={14} /> Reactivate</button>
                          : <button type="button" className="btn-line ur-danger" onClick={() => open(r, 'suspended')}><UserX size={14} /> Suspend</button>)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

        {pages > 1 && !loading && !error && (
          <div className="tbl-foot">
            <span>Showing {page * PAGE + 1}–{page * PAGE + data.rows.length} of {data.total}</span>
            <div className="tbl-pager">
              <button type="button" className="btn-line" disabled={page === 0} onClick={() => setPage(page - 1)}>← Previous</button>
              <span>Page {page + 1} of {pages}</span>
              <button type="button" className="btn-line" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          </div>
        )}
      </Card>

      <p className="ur-foot"><ShieldCheck size={14} /> You see and change accounts in your own area only. Every change is written to the audit log.</p>

      {acting && (
        <Dialog
          title={acting.to === 'suspended' ? `Suspend ${acting.row.display_name}?` : `Reactivate ${acting.row.display_name}?`}
          onClose={() => setActing(null)}
          onSubmit={submit}
          footer={<>
            <button type="button" className="btn-line" onClick={() => setActing(null)}>Cancel</button>
            <button type="submit" className={`btn${acting.to === 'suspended' ? ' ur-btn-danger' : ''}`} disabled={busy}>
              {busy ? 'Saving…' : acting.to === 'suspended' ? 'Suspend account' : 'Reactivate account'}
            </button>
          </>}>
          {acting.to === 'suspended' ? (
            <>
              <p className="ur-dlg">They are signed out of DaNA and cannot see or change any data until an administrator reactivates them.
                {acting.row.role === 'counsellor' && ' Their open slots stop taking bookings.'}</p>
              <FormRow label="Reason" hint="Kept with the account and in the audit log.">
                <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required />
              </FormRow>
            </>
          ) : (
            <p className="ur-dlg">They can sign in and use DaNA again.{acting.row.role === 'counsellor' && ' To take bookings again, activate them in Counsellors & areas.'}</p>
          )}
          {actErr && <Notice tone="err">{actErr}</Notice>}
        </Dialog>
      )}
    </Page>
  );
}

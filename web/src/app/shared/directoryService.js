/* Admin account directory (supabase/036_admin_directory.sql). Owner: Platform.
   Everything goes through database functions that check the admin's role and area,
   so this file never decides who may see or change what. Offline, the four demo accounts are shown. */
import { supabase } from './supabase.js';
import { isLive } from './db.js';
import { ACCOUNTS, PEOPLE } from './data.js';

/* a clear message when the database has not been updated yet (036 not run) */
const explain = (error) => (error?.code === 'PGRST202' || /admin_directory|admin_set_account_status/.test(error?.message || '')
  && /could not find|does not exist/i.test(error?.message || '')
  ? 'The account directory needs database update 036 (supabase/036_admin_directory.sql). Ask the database owner to run it.'
  : error.message);

export const ROLE_LABEL = { admin: 'DoH administrator', counsellor: 'Genetic counsellor', couple: 'Couple member' };

const demoRows = () => ACCOUNTS.map((a) => ({
  user_id: a.id, role: a.role, display_name: a.name, title: a.title, email: a.role === 'couple' ? null : `${a.id}@dana.demo`,
  status: 'active', status_reason: null, sex: PEOPLE[a.id]?.sex || null, location_id: null, location_label: null,
  emirate: null, dana_id: null, scope_level: a.role === 'admin' ? 'national' : null,
}));

/* filters: { search, role, sex, status, emirate, location, page (0-based), pageSize } -> { rows, total } */
export async function listAccounts(f = {}) {
  const size = f.pageSize || 25;
  if (!isLive()) {
    const q = (f.search || '').trim().toLowerCase();
    const all = demoRows().filter((r) => (!f.role || r.role === f.role) && (!f.sex || r.sex === f.sex)
      && (!f.status || r.status === f.status) && (!q || r.display_name.toLowerCase().includes(q)));
    return { rows: all.slice((f.page || 0) * size, (f.page || 0) * size + size), total: all.length, demo: true };
  }
  const { data, error } = await supabase.rpc('admin_directory', {
    p_search: f.search?.trim() || null, p_role: f.role || null, p_sex: f.sex || null, p_status: f.status || null,
    p_emirate: f.emirate || null, p_location: f.location || null, p_limit: size, p_offset: (f.page || 0) * size,
  });
  if (error) throw new Error(explain(error));
  return { rows: data || [], total: Number(data?.[0]?.total || 0) };
}

export async function accountSummary() {
  if (!isLive()) {
    const r = demoRows();
    return { total: r.length, admins: 1, counsellors: 1, couples: 2, male: r.filter((x) => x.sex === 'M').length,
      female: r.filter((x) => x.sex === 'F').length, active: r.length, suspended: 0, demo: true };
  }
  const { data, error } = await supabase.rpc('admin_directory_summary');
  if (error) throw new Error(explain(error));
  const s = data?.[0] || {};
  return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, Number(v) || 0]));
}

export async function setAccountStatus(userId, status, reason = null) {
  if (!isLive()) throw new Error('Sign in with your email to change accounts. The demo does not store changes.');
  const { data, error } = await supabase.rpc('admin_set_account_status', { p_user: userId, p_status: status, p_reason: reason });
  if (error) throw new Error(explain(error));
  return data;
}

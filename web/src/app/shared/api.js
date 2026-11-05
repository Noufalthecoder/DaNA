/* Calls to the DaNA API (FastAPI on Render). Owner: Platform.
   The user's Supabase login token is sent along, so the API acts as that user. */
import { supabase } from './supabase.js';

export const API_URL = (import.meta.env.VITE_API_URL || 'https://dana-api-589n.onrender.com').replace(/\/$/, '');

export async function api(path, { method = 'GET', body } = {}) {
  const { data } = (await supabase?.auth.getSession()) || {};
  const token = data?.session?.access_token;
  if (!token) throw new Error('Please sign in again.');
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Could not reach the DaNA server. It may be waking up; try again in a minute.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = json.detail;
    throw new Error(typeof d === 'string' ? d : d?.message || `Server error (${res.status})`);
  }
  return json;
}

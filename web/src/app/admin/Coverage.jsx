import { useEffect, useState, useCallback } from 'react';
import { Page, Card, Badge, Dialog } from '../shared/ui.jsx';
import LocationPicker from '../shared/LocationPicker.jsx';
import { supabase } from '../shared/supabase.js';
import { isLive, gulfLabel } from '../shared/db.js';
import { loadLocations, locationName, adminCounsellors, adminCoverage, setCounsellorProfile, setAdminScope } from '../shared/locationService.js';
import '../shared/location.css';

const LEVELS = { national: 'Whole country', emirate: 'One emirate', location: 'One area' };

export default function Coverage() {
  const [groups, setGroups] = useState([]);
  const [cov, setCov] = useState([]);
  const [staff, setStaff] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [me, setMe] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [editK, setEditK] = useState(null);
  const [editA, setEditA] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr('');
    try {
      const g = await loadLocations();
      setGroups(g);
      const uid = (await supabase.auth.getUser()).data?.user?.id;
      const [c, k, a] = await Promise.all([
        adminCoverage(), adminCounsellors(),
        supabase.from('accounts').select('user_id, display_name, scope_level, location_id').eq('role', 'admin').order('display_name'),
      ]);
      if (a.error) throw new Error(a.error.message);
      setCov(c || []); setStaff(k || []); setAdmins(a.data || []);
      setMe((a.data || []).find((x) => x.user_id === uid) || null);
    } catch (e) {
      setErr(/function|does not exist|schema cache/i.test(e.message) ? 'Run supabase/030_location_scope.sql in the Supabase SQL editor to turn this page on.' : e.message);
    }
  }, []);
  useEffect(() => { if (isLive()) load(); }, [load]);

  const areaText = (a) => (a.scope_level === 'national' ? 'Whole country' : `${LEVELS[a.scope_level]}: ${locationName(groups, a.location_id) || '—'}`);
  const run = async (fn, ok, done) => {
    setBusy(true); setErr(''); setMsg('');
    try { await fn(); setMsg(ok); done?.(); await load(); } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  if (!isLive()) {
    return <Page title="Counsellors and areas" sub="Who covers which emirate."><Card><p>Sign in with your email to manage areas. The demo does not store them.</p></Card></Page>;
  }

  const national = me?.scope_level === 'national';

  return (
    <Page title="Counsellors and areas" sub={me ? `Your area: ${areaText(me)}` : 'Who covers which emirate.'}>
      {err && <div className="loc-err" role="alert">{err}</div>}
      {msg && <div className="loc-ok" role="status">{msg}</div>}

      <Card title="Cover by emirate" aside={<span className="muted">Next 14 days · couple counts under 5 are hidden</span>}>
        <table className="table">
          <thead><tr><th>Emirate</th><th>Active counsellors</th><th>Open slots</th><th>Couples</th></tr></thead>
          <tbody>
            {cov.map((r) => (
              <tr key={r.emirate}>
                <td>{r.emirate}</td>
                <td className={r.counsellors_active ? '' : 'cov-warn'}>{r.counsellors_active || 'None'}</td>
                <td className={r.open_slots_14d ? '' : 'cov-warn'}>{r.open_slots_14d || 'None'}</td>
                <td>{r.couples_count}</td>
              </tr>
            ))}
            {!cov.length && <tr><td colSpan="4" className="muted">No locations yet. Counsellors and couples appear here once they set their location.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card title="Counsellors in your area">
        <table className="table">
          <thead><tr><th>Counsellor</th><th>Clinic</th><th>Formats</th><th>Caseload</th><th>Open slots (14 days)</th><th /></tr></thead>
          <tbody>
            {staff.map((k) => (
              <tr key={k.id}>
                <td>{k.name}<small>{k.credentials_verified ? (k.status === 'active' ? 'Active' : k.status) : 'Not verified yet'}</small></td>
                <td>{k.location_label || <span className="cov-warn">Not set</span>}</td>
                <td>{[k.offers_in_person && 'In person', k.offers_online && 'Online'].filter(Boolean).join(' · ') || '—'}</td>
                <td>{k.active_caseload} / {k.max_caseload}</td>
                <td>{k.open_slots_14d}{k.next_open_slot ? <small>Next: {gulfLabel(k.next_open_slot)}</small> : null}</td>
                <td><button type="button" className="btn-line" onClick={() => setEditK({ ...k, loc: k.location_id, inPerson: k.offers_in_person, online: k.offers_online })}>Set clinic</button></td>
              </tr>
            ))}
            {!staff.length && <tr><td colSpan="6" className="muted">No counsellors in your area yet.</td></tr>}
          </tbody>
        </table>
      </Card>

      {national && (
        <Card title="Admin areas" aside={<span className="muted">Only nationwide admins can change these</span>}>
          <table className="table">
            <thead><tr><th>Admin</th><th>Area</th><th /></tr></thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.user_id}>
                  <td>{a.display_name}</td>
                  <td>{areaText(a)}</td>
                  <td><button type="button" className="btn-line" onClick={() => setEditA({ ...a, level: a.scope_level, loc: a.location_id })}>Change</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {editK && (
        <Dialog
          title={`Clinic for ${editK.name}`}
          onClose={() => setEditK(null)}
          onSubmit={(e) => { e.preventDefault(); run(() => setCounsellorProfile({ counsellor: editK.id, location: editK.loc, inPerson: editK.inPerson, online: editK.online }), 'Clinic saved.', () => setEditK(null)); }}
          footer={<><button type="button" className="btn-line" onClick={() => setEditK(null)}>Cancel</button><button type="submit" className="btn" disabled={busy || (!editK.inPerson && !editK.online) || (editK.inPerson && !editK.loc)}>Save</button></>}
        >
          <LocationPicker value={editK.loc} onChange={(v) => setEditK((k) => ({ ...k, loc: v }))} label="Clinic location" />
          <label className="loc-row"><input type="checkbox" checked={editK.inPerson} onChange={(e) => setEditK((k) => ({ ...k, inPerson: e.target.checked }))} /> Sees couples in person</label>
          <label className="loc-row"><input type="checkbox" checked={editK.online} onChange={(e) => setEditK((k) => ({ ...k, online: e.target.checked }))} /> Sees couples online</label>
          <p className="loc-hint">You can only place counsellors inside your own area. The change is recorded in the audit log.</p>
        </Dialog>
      )}

      {editA && (
        <Dialog
          title={`Area for ${editA.display_name}`}
          onClose={() => setEditA(null)}
          onSubmit={(e) => { e.preventDefault(); run(() => setAdminScope(editA.user_id, editA.level, editA.level === 'national' ? null : editA.loc), 'Area saved.', () => setEditA(null)); }}
          footer={<><button type="button" className="btn-line" onClick={() => setEditA(null)}>Cancel</button><button type="submit" className="btn" disabled={busy || (editA.level !== 'national' && !editA.loc)}>Save</button></>}
        >
          <label className="dialog-field">
            This admin can manage
            <select value={editA.level} onChange={(e) => setEditA((a) => ({ ...a, level: e.target.value, loc: null }))}>
              {Object.entries(LEVELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          {editA.level !== 'national' && (
            <LocationPicker value={editA.loc} onChange={(v) => setEditA((a) => ({ ...a, loc: v }))} label={editA.level === 'emirate' ? 'Emirate' : 'Area'} emirateOnly={editA.level === 'emirate'} />
          )}
          <Badge tone="amber">Scope decides which counsellors this admin sees and edits.</Badge>
        </Dialog>
      )}
    </Page>
  );
}

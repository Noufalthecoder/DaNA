import { useEffect, useState, useCallback } from 'react';
import { Clock } from 'lucide-react';
import LocationPicker from '../shared/LocationPicker.jsx';
import { loadLocations, locationName, myHomeLocation, setMyLocation, findSlots, requestConsultation } from '../shared/locationService.js';
import { gulfLabel } from '../shared/db.js';
import '../shared/location.css';

const friendly = (m) => (/function|schema cache|does not exist/i.test(m || '') ? 'Booking is being upgraded. Please try again shortly.' : m);

const GROUPS = [
  ['your_counsellor', 'Your counsellor'],
  ['same_location', 'Closest to you'],
  ['same_emirate', 'In your emirate'],
  ['other', 'Other emirates (online)'],
];

/* Live slots, ranked: your counsellor first, then nearest. In-person only inside one emirate. */
export default function SlotFinder({ modality, onRequested, onError }) {
  const [home, setHome] = useState(null);
  const [homeLoaded, setHomeLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [groups, setGroups] = useState([]);
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([myHomeLocation(), loadLocations()]).then(([h, g]) => { setHome(h); setGroups(g); setHomeLoaded(true); setEditing(!h); });
  }, []);

  const refresh = useCallback(async () => {
    setErr('');
    try { setRows(await findSlots(modality)); } catch (e) { setErr(friendly(e.message)); setRows([]); }
  }, [modality]);
  useEffect(() => { if (homeLoaded) refresh(); }, [homeLoaded, home, refresh]);

  const saveHome = async (id) => {
    setHome(id);
    if (!id) return;
    try { await setMyLocation(id); setEditing(false); } catch (e) { setErr(e.message); }
  };

  const request = async (s) => {
    setBusy(s.slot_id); setErr('');
    try {
      await requestConsultation(s.slot_id, modality);
      await onRequested?.(s);
      await refresh();
    } catch (e) { setErr(friendly(e.message)); onError?.(friendly(e.message)); await refresh(); }
    setBusy('');
  };

  const grouped = GROUPS.map(([key, label]) => [key, label, (rows || []).filter((r) => r.match === key)]).filter(([, , list]) => list.length);

  return (
    <div className="finder">
      <div className="finder-home">
        <b>Where do you live?</b>
        {editing ? (
          <LocationPicker value={home} onChange={saveHome} label="" />
        ) : (
          <div className="loc-row">
            <span>{locationName(groups, home)}</span>
            <button type="button" className="link" onClick={() => setEditing(true)}>Change</button>
          </div>
        )}
        <span className="loc-hint">
          {modality === 'offline'
            ? 'In-person visits are offered in your emirate. Pick the area to see the nearest clinic first.'
            : 'We show your counsellor first, then counsellors closest to you.'}
        </span>
      </div>

      {err && <div className="loc-err" role="alert">{err}</div>}
      {rows === null && <p className="loc-hint">Looking for free times…</p>}
      {rows && !rows.length && !err && (
        <div className="finder-empty">
          {modality === 'offline'
            ? 'No in-person times are open in your emirate right now. Try an online session, or check again soon.'
            : 'No free times in the next few days. Your counsellor will contact you directly.'}
        </div>
      )}

      {grouped.map(([key, label, list]) => (
        <div className="finder-group" key={key}>
          <h4>{label}</h4>
          <div className="finder-grid">
            {list.map((s) => (
              <button key={s.slot_id} type="button" className="finder-slot" disabled={!!busy} onClick={() => request(s)}>
                <b><Clock size={14} /> {gulfLabel(s.slot_start)}</b>
                <span>{s.counsellor_name}</span>
                <span>{modality === 'offline' ? `${s.location_label}${s.distance_km != null ? ` · ${s.distance_km} km` : ''}` : 'Video call'}</span>
                <small>{busy === s.slot_id ? 'Sending request…' : 'Request this time →'}</small>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

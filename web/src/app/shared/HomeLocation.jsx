/* "Where you live" on the Profile page: the couple member's home area (people.location_id),
   first filled from the UAE PASS home address (035), always editable here. Owner: Couple app. */
import { useEffect, useState } from 'react';
import { Card } from './ui.jsx';
import LocationPicker from './LocationPicker.jsx';
import { myHomeLocation, setMyLocation, loadLocations, locationName } from './locationService.js';
import { myIdentity, isLive } from './db.js';
import { get, set, useStore } from './store.js';
import './location.css';

export default function HomeLocation() {
  const [saved, setSaved] = useState(null);
  const [value, setValue] = useState(null);
  const [fromUaePass, setFromUaePass] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let off = false;
    (async () => {
      const [mine, ident, groups] = await Promise.all([
        isLive() ? myHomeLocation().catch(() => null) : Promise.resolve(get().session?.homeLocation ?? null),
        myIdentity().catch(() => null),
        loadLocations(),
      ]);
      if (off) return;
      setSaved(mine); setValue(mine); set({ myHomeLocation: mine ?? null });
      if (ident?.home_location_id) setFromUaePass(locationName(groups, ident.home_location_id));
    })();
    return () => { off = true; };
  }, []);

  const save = async () => {
    if (!value) { setMsg({ err: 'Choose an emirate and an area.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const label = isLive() ? await setMyLocation(value) : (set({ session: { ...get().session, homeLocation: value } }), 'Saved');
      setSaved(value); set({ myHomeLocation: value }); setMsg({ ok: `Saved: ${label}` });
    } catch (e) { setMsg({ err: e.message }); }
    setBusy(false);
  };

  return (
    <Card title="Where you live">
      <div className="loc-section">
        <LocationPicker value={value} onChange={(v) => { setValue(v); setMsg(null); }} label="Emirate and area" />
        <p className="loc-hint">
          {fromUaePass ? `Your UAE PASS home address is ${fromUaePass}. ` : ''}
          Used to show counsellors near you first. In-person visits are offered in your emirate; online works anywhere.
        </p>
        <div className="loc-row">
          <button type="button" className="btn" onClick={save} disabled={busy || value === saved}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
        {msg?.ok && <p className="loc-ok">{msg.ok}</p>}
        {msg?.err && <p className="loc-err">{msg.err}</p>}
      </div>
    </Card>
  );
}

/* The saved home area as text, for forms that show it but do not edit it (one place to change it: Profile). */
export function HomeLocationText({ className }) {
  const id = useStore((s) => s.myHomeLocation);
  const [label, setLabel] = useState('');
  useEffect(() => {
    let off = false;
    (async () => {
      let place = id;
      if (place === undefined) {
        place = isLive() ? await myHomeLocation().catch(() => null) : (get().session?.homeLocation ?? null);
        if (!off) set({ myHomeLocation: place ?? null });
      }
      const groups = await loadLocations();
      if (!off) setLabel(place ? locationName(groups, place) : '');
    })();
    return () => { off = true; };
  }, [id]);
  return <span className={className}>{label || 'Not set yet'}</span>;
}

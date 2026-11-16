import { useEffect, useState, useCallback } from 'react';
import { Dialog, Badge } from '../shared/ui.jsx';
import LocationPicker from '../shared/LocationPicker.jsx';
import { loadLocations, locationName, myClinic, setCounsellorProfile, publishSlots, removeSlot } from '../shared/locationService.js';
import { gulfLabel } from '../shared/db.js';
import '../shared/location.css';

const DAYS = [['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 7]];
const MODES = [['both', 'Online and in person'], ['online', 'Online only'], ['in_person', 'In person only']];
const today = () => new Date(Date.now() + 4 * 3600e3 + 86400e3).toISOString().slice(0, 10); // tomorrow, Gulf time

export default function ClinicSlots({ onClose }) {
  const [clinic, setClinic] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loc, setLoc] = useState(null);
  const [inPerson, setInPerson] = useState(true);
  const [online, setOnline] = useState(true);
  const [form, setForm] = useState({ from: today(), to: today(), weekdays: [1, 2, 3, 4, 5], start: '09:00', end: '16:00', minutes: 45, gap: 15, modality: 'both' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [c, g] = await Promise.all([myClinic(), loadLocations()]);
    setGroups(g);
    if (c) { setClinic(c); setLoc(c.location_id); setInPerson(c.offers_in_person); setOnline(c.offers_online); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, ok) => {
    setBusy(true); setMsg(null);
    try { const r = await fn(); setMsg({ ok: true, text: typeof ok === 'function' ? ok(r) : ok }); await load(); }
    catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(false);
  };

  const saveClinic = () => run(
    () => setCounsellorProfile({ location: loc, inPerson, online }),
    'Clinic saved. Open slots now show this location.',
  );
  const publish = () => run(
    () => publishSlots(form),
    (n) => (n ? `${n} slot${n === 1 ? '' : 's'} published.` : 'Nothing new: those times already exist.'),
  );
  const toggleDay = (d) => setForm((f) => ({ ...f, weekdays: f.weekdays.includes(d) ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d] }));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }));
  const modeOptions = MODES.filter(([m]) => (m === 'both' ? inPerson && online : m === 'online' ? online : inPerson));

  const state = (s) => (s.is_booked ? ['Booked', 'green'] : s.is_held ? ['Requested', 'amber'] : ['Open', 'grey']);

  return (
    <Dialog
      title="Clinic and slots"
      wide
      onClose={onClose}
      onSubmit={(e) => e.preventDefault()}
      footer={<button type="button" className="btn-line" onClick={onClose}>Close</button>}
    >
      {!clinic && <p className="loc-hint">Loading your clinic details…</p>}
      {msg && <div className={msg.ok ? 'loc-ok' : 'loc-err'} role="status">{msg.text}</div>}

      <section className="loc-section">
        <h3>Where you see couples</h3>
        <LocationPicker value={loc} onChange={setLoc} label="Clinic location" />
        <div className="loc-row">
          <label className="loc-row"><input type="checkbox" checked={inPerson} onChange={(e) => setInPerson(e.target.checked)} /> I see couples in person</label>
          <label className="loc-row"><input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} /> I see couples online</label>
        </div>
        <p className="loc-hint">
          Couples are shown to you first when they live in {locationName(groups, loc) || 'your area'}'s emirate. In-person visits are only offered inside the clinic's emirate.
        </p>
        <div><button type="button" className="btn" disabled={busy || !clinic || (!inPerson && !online) || (inPerson && !loc)} onClick={saveClinic}>Save clinic</button></div>
      </section>

      <section className="loc-section">
        <h3>Publish slots</h3>
        <div className="loc-days" role="group" aria-label="Working days">
          {DAYS.map(([l, n]) => (
            <button key={n} type="button" className={`loc-day ${form.weekdays.includes(n) ? 'on' : ''}`} onClick={() => toggleDay(n)}>{l}</button>
          ))}
        </div>
        <div className="loc-grid2">
          <label className="dialog-field">From<input type="date" value={form.from} min={today()} onChange={set('from')} /></label>
          <label className="dialog-field">To<input type="date" value={form.to} min={form.from} onChange={set('to')} /></label>
          <label className="dialog-field">Day starts (Gulf time)<input type="time" value={form.start} onChange={set('start')} /></label>
          <label className="dialog-field">Day ends<input type="time" value={form.end} onChange={set('end')} /></label>
          <label className="dialog-field">Session length (min)<input type="number" min="15" max="120" step="5" value={form.minutes} onChange={set('minutes')} /></label>
          <label className="dialog-field">Gap between sessions (min)<input type="number" min="0" max="60" step="5" value={form.gap} onChange={set('gap')} /></label>
        </div>
        <label className="dialog-field">
          Format
          <select value={modeOptions.some(([m]) => m === form.modality) ? form.modality : modeOptions[0]?.[0]} onChange={set('modality')}>
            {modeOptions.map(([m, l]) => <option key={m} value={m}>{l}</option>)}
          </select>
        </label>
        <div><button type="button" className="btn" disabled={busy || !clinic || !form.weekdays.length || !modeOptions.length} onClick={publish}>Publish slots</button></div>
      </section>

      <section className="loc-section">
        <h3>Your upcoming slots</h3>
        {clinic?.slots?.length ? (
          <div className="loc-slotlist">
            {clinic.slots.map((s) => {
              const [t, tone] = state(s);
              return (
                <div className="loc-slot" key={s.id}>
                  <span>{gulfLabel(s.slot_start)} <small>· {s.modality === 'both' ? 'online or in person' : s.modality === 'online' ? 'online' : 'in person'}</small></span>
                  <span className="loc-row">
                    <Badge tone={tone}>{t}</Badge>
                    {!s.is_booked && !s.is_held && (
                      <button type="button" className="loc-x" disabled={busy} onClick={() => run(() => removeSlot(s.id), 'Slot removed.')}>Remove</button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ) : <p className="loc-hint">No upcoming slots yet. Publish some above so couples can request a time.</p>}
      </section>
    </Dialog>
  );
}

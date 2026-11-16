import { useEffect, useState } from 'react';
import { loadLocations } from './locationService.js';
import './location.css';

/* Emirate, then area. value / onChange use the locations.id (number) or null. */
export default function LocationPicker({ value, onChange, label = 'Location', emirateOnly = false, disabled = false }) {
  const [groups, setGroups] = useState([]);
  const [emirate, setEmirate] = useState('');

  useEffect(() => { loadLocations().then(setGroups); }, []);
  useEffect(() => {
    if (!groups.length) return;
    const g = groups.find((x) => x.items.some((i) => i.id === value));
    if (g) setEmirate(g.emirate);
  }, [groups, value]);

  const items = groups.find((g) => g.emirate === emirate)?.items || [];

  const pickEmirate = (e) => {
    setEmirate(e);
    const g = groups.find((x) => x.emirate === e);
    // an emirate with a single place (or a whole-emirate pick) selects it straight away
    onChange(g && (emirateOnly || g.items.length === 1) ? g.items[0].id : null);
  };

  return (
    <div>
      <span className="loc-label">{label}</span>
      <div className="loc-picker">
        <select value={emirate} onChange={(e) => pickEmirate(e.target.value)} disabled={disabled} aria-label="Emirate">
          <option value="">Choose emirate</option>
          {groups.map((g) => <option key={g.emirate} value={g.emirate}>{g.emirate}</option>)}
        </select>
        {!emirateOnly && (
          <select value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)} disabled={disabled || !emirate} aria-label="Area">
            <option value="">{emirate ? 'Choose area' : 'Emirate first'}</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.city}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

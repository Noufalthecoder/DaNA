/* Choose a profile picture. Owner: Platform. Avatars matching the person's sex are shown first. */
import { useState } from 'react';
import { setAvatar } from './db.js';
import { PEOPLE } from './data.js';
import { CHIBIS, Chibi } from './Chibi.jsx';

export default function AvatarPicker({ session, onDone }) {
  const [error, setError] = useState('');
  const sex = PEOPLE[session.id]?.sex;
  const women = ['For women', CHIBIS.filter((c) => c.sex === 'F')];
  const men = ['For men', CHIBIS.filter((c) => c.sex === 'M')];
  const groups = sex === 'M' ? [men, women] : [women, men];
  const pick = async (value) => {
    setError('');
    try { await setAvatar(value); onDone?.(); } catch (e) { setError(e.message); }
  };
  return (
    <div className="ap">
      {groups.map(([label, list]) => (
        <div key={label}>
          <small>{label}</small>
          <div className="ap-grid">
            {list.map((c) => {
              const value = `c:${c.id}`;
              const on = session.avatar === value;
              return (
                <button key={c.id} type="button" title={c.label} aria-label={c.label} aria-pressed={on}
                  className={on ? 'on' : ''} onClick={() => pick(value)}>
                  <Chibi id={c.id} size={44} />
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {session.avatar && <button type="button" className="link" onClick={() => pick(null)}>Use my initials instead</button>}
      {error && <small className="err">{error}</small>}
    </div>
  );
}

/* Round avatar in the top bar. Click → name (editable), profile settings, switch account, sign out. Owner: Platform. */
import { useEffect, useRef, useState } from 'react';
import { Avatar } from './ui.jsx';
import { setDisplayName } from './db.js';
import AvatarPicker from './AvatarPicker.jsx';

export default function ProfileMenu({ session, onSwitch, onSignOut }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(session.name || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  useEffect(() => { if (!open) { setEditing(false); setPicking(false); setError(''); setName(session.name || ''); } }, [open, session.name]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await setDisplayName(name); setEditing(false); }
    catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <div className="pm" ref={box}>
      <button className="pm-btn" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu">
        <Avatar name={session.name} size={34} icon={session.avatar} />
      </button>
      {open && (
        <div className="pm-pop" role="menu">
          <div className="pm-head">
            <button type="button" className="pm-face" onClick={() => setPicking(!picking)} title="Change picture" aria-label="Change picture">
              <Avatar name={session.name} size={42} icon={session.avatar} />
            </button>
            {editing ? (
              <form onSubmit={save} className="pm-edit">
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label="Your name" />
                <div>
                  <button className="pm-save" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
                  <button type="button" className="link" onClick={() => { setEditing(false); setName(session.name || ''); setError(''); }}>Cancel</button>
                </div>
                {error && <small className="err">{error}</small>}
              </form>
            ) : (
              <div className="pm-who">
                <b>{session.name}</b>
                <small>{session.title || session.role}</small>
                <span className="pm-links">
                  <button className="link" onClick={() => setEditing(true)}>Edit name</button>
                  <button className="link" onClick={() => setPicking(!picking)}>Change picture</button>
                </span>
              </div>
            )}
          </div>
          {picking && <div className="pm-pick"><AvatarPicker session={session} onDone={() => setPicking(false)} /></div>}
          {session.role === 'couple' && <a role="menuitem" href="#/app/profile" onClick={() => setOpen(false)}>Profile settings</a>}
          <a role="menuitem" href="#/login" onClick={(e) => { setOpen(false); onSwitch(e); }}>Switch account</a>
          <button role="menuitem" className="pm-out" onClick={() => { setOpen(false); onSignOut(); }}>Sign out</button>
        </div>
      )}
    </div>
  );
}

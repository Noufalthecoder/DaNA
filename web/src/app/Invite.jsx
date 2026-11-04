/* What a relative sees when they open a Sila alert link. No login, no names. */
import { useEffect, useState } from 'react';
import { supabase } from './shared/supabase.js';

export default function Invite({ token }) {
  const [booked, setBooked] = useState(false);
  const [state, setState] = useState(token && supabase ? 'checking' : 'demo'); // checking | valid | expired | invalid | demo
  useEffect(() => {
    if (!token || !supabase) return;
    supabase.rpc('open_sila_invitation', { token }).then(({ data, error }) => setState(error ? 'invalid' : data));
  }, [token]);
  const book = async () => {
    if (token && supabase && state === 'valid') await supabase.rpc('book_from_sila_invitation', { token });
    setBooked(true);
  };
  if (state === 'expired' || state === 'invalid') {
    return (
      <div className="login"><div className="login-card">
        <div className="login-brand"><span className="dot" />DaNA <span className="ar">دانة</span></div>
        <h1>{state === 'expired' ? 'This link has expired' : 'This link isn’t valid'}</h1>
        <p className="muted">Invitation links last 14 days. You can still book free premarital screening at any screening centre.</p>
      </div></div>
    );
  }
  return (
    <div className="login">
      <a className="login-back" href="#/">← DaNA home</a>
      <div className="login-card">
        <div className="login-brand"><span className="dot" />DaNA <span className="ar">دانة</span></div>
        <h1>Someone who cares about you</h1>
        <p className="muted">recommends free genetic screening before marriage. It’s quick, private and free for UAE nationals.</p>
        <ul className="facts">
          <li>One blood test at a nearby centre.</li>
          <li>Your result is yours alone.</li>
          <li>Many healthy people carry a gene. Knowing early helps you plan.</li>
        </ul>
        {booked
          ? <p className="ok-msg">✓ Request sent. A screening centre will contact you.</p>
          : <button className="btn wide" onClick={book} disabled={state === 'checking'}>{state === 'checking' ? 'Checking link…' : 'Book my free screening'}</button>}
        <p className="fine">You won’t learn who sent this, and they won’t learn if you book.</p>
      </div>
    </div>
  );
}

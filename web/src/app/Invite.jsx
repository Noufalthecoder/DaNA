/* What a relative sees when they open a Sila alert link. No login, no names. */
import { useState } from 'react';
import { Brand } from './shared/Logo.jsx';

export default function Invite() {
  const [booked, setBooked] = useState(false);
  return (
    <div className="login">
      <a className="login-back" href="#/">← DaNA home</a>
      <div className="login-card">
        <div className="login-brand" style={{ marginBottom: 22 }}>
          <Brand size={36} withArabic={true} href="#/" />
        </div>
        <h1>Someone who cares about you</h1>
        <p className="muted">recommends free genetic screening before marriage. It’s quick, private and free for UAE nationals.</p>
        <ul className="facts">
          <li>One blood test at a nearby centre.</li>
          <li>Your result is yours alone.</li>
          <li>Many healthy people carry a gene. Knowing early helps you plan.</li>
        </ul>
        {booked
          ? <p className="ok-msg">✓ Request sent. A screening centre will contact you.</p>
          : <button className="btn wide" onClick={() => setBooked(true)}>Book my free screening</button>}
        <p className="fine">You won’t learn who sent this, and they won’t learn if you book.</p>
      </div>
    </div>
  );
}

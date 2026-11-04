import { Page, Card, Avatar } from '../shared/ui.jsx';
import { useStore } from '../shared/store.js';
import { SLOTS } from '../shared/data.js';
import { book as bookSlot, cancelBooking } from '../shared/db.js';

export default function Counsellor() {
  const cid = useStore((s) => s.session.couple);
  const booked = useStore((s) => s.appointments[cid]);
  const book = (label) => bookSlot(cid, label);

  return (
    <Page title="Your counsellor" sub="A real, licensed person. Ask anything.">
      <Card>
        <div className="person">
          <Avatar name="Dr. Mariam Al Hosani" size={56} />
          <div><b>Dr. Mariam Al Hosani</b><small>Genetic counsellor · Arabic & English</small></div>
        </div>
      </Card>
      <Card title={booked ? 'Your session' : 'Book a video session'}>
        {booked
          ? <div className="booked"><p>✓ Booked for <b>{booked}</b>. You’ll get a reminder the day before.</p><button className="link" onClick={() => cancelBooking(cid)}>Cancel</button></div>
          : <div className="slots">{SLOTS.map((s) => <button key={s.label} className="slot" onClick={() => book(s.label)}>{s.label}</button>)}</div>}
      </Card>
    </Page>
  );
}

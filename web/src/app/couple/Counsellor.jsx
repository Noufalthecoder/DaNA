import { Page, Card, Avatar } from '../shared/ui.jsx';
import { useStore } from '../shared/store.js';
import { SLOTS } from '../shared/data.js';
import { book as bookSlot, cancelBooking, isLive } from '../shared/db.js';

export default function Counsellor() {
  const cid = useStore((s) => s.session.couple);
  const booked = useStore((s) => s.appointments[cid]);
  const liveSlots = useStore((s) => s.slots);
  const counsellor = useStore((s) => s.cases[cid]?.counsellor) || 'Dr. Mariam Al Hosani';
  const slots = isLive() ? liveSlots : SLOTS;
  const book = (slot) => bookSlot(cid, slot);

  return (
    <Page title="Your counsellor" sub="A real, licensed person. Ask anything.">
      <Card>
        <div className="person">
          <Avatar name={counsellor} size={56} />
          <div><b>{counsellor}</b><small>Genetic counsellor · Arabic & English</small></div>
        </div>
      </Card>
      <Card title={booked ? 'Your session' : 'Book a video session'}>
        {booked
          ? <div className="booked"><p>✓ Booked for <b>{booked}</b>. You’ll get a reminder the day before.</p><button className="link" onClick={() => cancelBooking(cid)}>Cancel</button></div>
          : <div className="slots">{slots.length ? slots.map((s) => <button key={s.id || s.label} className="slot" onClick={() => book(s)}>{s.label}</button>) : <p className="muted">No free times in the next 10 days. Your counsellor will contact you.</p>}</div>}
      </Card>
    </Page>
  );
}

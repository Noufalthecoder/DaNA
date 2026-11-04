import { Page, Card, Avatar } from '../shared/ui.jsx';
import { set, useStore } from '../shared/store.js';

const SLOTS = ['Sun 9 Nov · 10:00', 'Mon 10 Nov · 13:30', 'Tue 11 Nov · 17:00', 'Wed 12 Nov · 11:00'];

export default function Counsellor() {
  const booked = useStore((s) => s.booked);
  const book = (s) => set({ booked: s }, `Couple booked a counsellor session: ${s}`);

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
          ? <div className="booked"><p>✓ Booked for <b>{booked}</b>. You’ll get a reminder the day before.</p><button className="link" onClick={() => set({ booked: null }, 'Couple cancelled the counsellor session')}>Cancel</button></div>
          : <div className="slots">{SLOTS.map((s) => <button key={s} className="slot" onClick={() => book(s)}>{s}</button>)}</div>}
      </Card>
    </Page>
  );
}

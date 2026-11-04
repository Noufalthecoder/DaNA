import { Page, Card, Badge } from '../shared/ui.jsx';
import { useStore } from '../shared/store.js';

const DAY = [
  { time: '09:00', who: 'Ahmed & Noura', what: 'Urgent · prenatal testing options', tone: 'red' },
  { time: '11:30', who: 'Omar & Latifa', what: 'X-linked: planning for sons', tone: 'amber' },
  { time: '14:00', who: 'Rashid & Aisha', what: 'First session · same gene (CFTR)', tone: 'amber' },
];

export default function Schedule() {
  const booked = useStore((s) => s.booked);
  const rows = booked ? [...DAY, { time: booked.split('· ')[1], who: 'Khalid & Fatima', what: `Booked by the couple · ${booked.split(' ·')[0]}`, tone: 'green' }] : DAY;
  return (
    <Page title="Schedule" sub="Video sessions in Arabic or English">
      <Card title="Upcoming">
        <ul className="agenda">
          {rows.map((s) => <li key={s.who}><time>{s.time}</time><span><b>{s.who}</b><small>{s.what}</small></span><Badge tone={s.tone}>Video</Badge></li>)}
        </ul>
      </Card>
    </Page>
  );
}

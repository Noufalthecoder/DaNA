import { Page, Card, Badge } from '../shared/ui.jsx';
import { useStore } from '../shared/store.js';
import { COUPLES, PEOPLE } from '../shared/data.js';

const DAY = [
  { time: '09:00', who: 'Ahmed & Noura', what: 'Urgent · prenatal testing options', tone: 'red' },
  { time: '11:30', who: 'Omar & Latifa', what: 'X-linked: planning for sons', tone: 'amber' },
  { time: '14:00', who: 'Rashid & Aisha', what: 'First session · same gene (CFTR)', tone: 'amber' },
];

export default function Schedule() {
  const appts = useStore((s) => s.appointments);
  const booked = Object.entries(appts).map(([cid, label]) => {
    const c = COUPLES.find((x) => x.id === cid);
    return { time: label.split('· ')[1] || '', who: `${PEOPLE[c.a].short} & ${PEOPLE[c.b].short}`, what: `Booked by the couple · ${label.split(' ·')[0]}`, tone: 'green' };
  });
  const rows = [...DAY, ...booked];
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

import { Page, Card, Toggle } from '../shared/ui.jsx';
import { useStore } from '../shared/store.js';
import { setConsent } from '../shared/db.js';

const ITEMS = [
  ['sharePartner', 'Share my result with my partner', 'Your partner sees your result in Roots.'],
  ['shareCounsellor', 'Share my result with my counsellor', 'Needed for a counselling session.'],
  ['faithCards', 'Show faith cards', 'Scholar-reviewed guidance, optional.'],
];

export default function Privacy() {
  const consents = useStore((s) => s.consents);
  const audit = useStore((s) => s.audit);
  const me = useStore((s) => s.session.name);
  const toggle = (k, v) => setConsent(k, v);

  return (
    <Page title="Privacy" sub="You decide who sees what. Change it any time.">
      <Card title="Your consents">
        {ITEMS.map(([k, l, h]) => <Toggle key={k} label={l} hint={h} checked={consents[k]} onChange={(v) => toggle(k, v)} />)}
      </Card>
      <Card title="Recent activity on your account">
        <ul className="log">{audit.filter((a) => a.who === me).slice(0, 6).map((a, i) => <li key={i}><time>{new Date(a.t).toLocaleString()}</time>{a.what}</li>)}</ul>
      </Card>
    </Page>
  );
}

/* First screen for a brand-new account (email sign-up or Google): no results linked yet. */
import { Page, Card, Steps } from '../shared/ui.jsx';
import { useStore } from '../shared/store.js';

export default function Welcome() {
  const session = useStore((s) => s.session);
  return (
    <Page title={`Welcome, ${session.name.split(' ')[0]}`} sub={`Signed in as ${session.email || session.name}`}>
      <Card title="Your account is ready">
        <Steps items={['Account created', 'Link your results', 'Invite your partner', 'Your journey']} current={1} />
      </Card>
      <div className="grid2">
        <Card title="Link your screening results">
          <p className="muted">In the real service, your premarital screening results arrive from Malaffi automatically once you sign in with UAE PASS.</p>
          <p className="fine">Prototype: new accounts have no results yet. To explore the full journey, sign out and use <b>UAE PASS (demo)</b> as Khalid or Fatima.</p>
        </Card>
        <Card title="Book a screening">
          <p className="muted">Not screened yet? The premarital test is one blood sample at a nearby centre, free for UAE nationals.</p>
          <a className="btn" href="#/invite">Find a screening centre</a>
        </Card>
      </div>
    </Page>
  );
}

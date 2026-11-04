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
        <Card title="Connect with your partner">
          <p className="muted">Find your partner on DaNA or send them an invitation link to start your premarital genetic assessment together.</p>
          <a className="btn" href="#/app/connections">Go to Connections</a>
        </Card>
        <Card title="Premarital screening">
          <p className="muted">Complete your screening intake assessment or find an accredited screening centre near you.</p>
          <div className="btn-row">
            <a className="btn secondary" href="#/app/screening">Screening Intake</a>
            <a className="btn" href="#/invite">Find a Centre</a>
          </div>
        </Card>
      </div>
    </Page>
  );
}

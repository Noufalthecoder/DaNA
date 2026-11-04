import { Page, Card } from '../shared/ui.jsx';
import { useStore } from '../shared/store.js';

/* append-only audit log: every sign-in, consent, alert and approval in the demo */
export default function Audit() {
  const audit = useStore((s) => s.audit);
  return (
    <Page title="Audit log" sub="Every action is recorded and can’t be edited. Try the demo as a couple, then come back here.">
      <Card>
        <table className="table">
          <thead><tr><th>Time</th><th>Who</th><th>Action</th></tr></thead>
          <tbody>
            {audit.map((a, i) => <tr key={i}><td className="nowrap">{new Date(a.t).toLocaleString()}</td><td>{a.who}</td><td>{a.what}</td></tr>)}
            {!audit.length && <tr><td colSpan="3" className="empty">No activity yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </Page>
  );
}

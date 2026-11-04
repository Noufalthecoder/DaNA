import { Page, Card } from '../shared/ui.jsx';
import { useStore } from '../shared/store.js';
import { sendAlerts } from '../shared/db.js';
import { relativesFor } from '../shared/data.js';
import { useCouple } from './useCouple.js';

/* Branches: protect your family with anonymous Sila alerts */
export default function Branches() {
  const { me } = useCouple();
  const sent = useStore((s) => s.alertsSent);
  const list = relativesFor(me.id);
  const send = (ids) => sendAlerts(ids);

  return (
    <Page title="Branches" sub="Genes run in families. One private message can protect them."
      actions={<button className="btn" onClick={() => send(list.map((r) => r.id))}>Send to all</button>}>
      <div className="grid2">
        <Card title="Who may also carry it">
          <ul className="rel">
            {list.map((r) => {
              const done = sent.includes(r.id);
              return (
                <li key={r.id}>
                  <span><b>{r.label}</b><small>Chance they carry it: {r.chance}</small></span>
                  <button className={done ? 'sent' : 'btn-soft'} disabled={done} onClick={() => send([r.id])}>{done ? '✓ Sent' : 'Send alert'}</button>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card title="What they receive">
          <div className="sms">
            <small>SMS · from DaNA</small>
            <p>Someone who cares about you recommends free genetic screening before marriage. It’s quick, private and free for UAE nationals.</p>
            <a href="#/invite">dana.ae/i/7Kq2</a>
          </div>
          <ul className="facts">
            <li>No names, no condition, no family details.</li>
            <li>They never learn who sent it.</li>
            <li>Their phone number is deleted after sending.</li>
          </ul>
        </Card>
      </div>
    </Page>
  );
}

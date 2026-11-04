import { useState } from 'react';
import { Page, Card, Badge, Stat } from '../shared/ui.jsx';
import { set, useStore } from '../shared/store.js';
import { RELATIVES } from '../shared/data.js';
import { useCouple } from './useCouple.js';

export default function Branches() {
  const { me } = useCouple();
  const sent = useStore((s) => s.alertsSent || []);
  const list = RELATIVES[me.id] || [];
  const [selectedRel, setSelectedRel] = useState(null);
  const [customRelName, setCustomRelName] = useState('');
  const [customRelRole, setCustomRelRole] = useState('Brother');

  const send = (ids) => {
    const fresh = ids.filter((id) => !sent.includes(id));
    if (fresh.length) {
      set(
        { alertsSent: [...sent, ...fresh] },
        `Dispatched ${fresh.length} anonymous Sila alert${fresh.length > 1 ? 's' : ''}`
      );
    }
  };

  return (
    <Page
      title="Branches · الفروع"
      sub="Genes run in families. Protect your kin with private, anonymous Sila cascade alerts."
      actions={
        <button
          className="btn"
          disabled={sent.length === list.length}
          onClick={() => send(list.map((r) => r.id))}
        >
          {sent.length === list.length ? '✓ All Alerts Dispatched' : 'Send Sila to All Relatives'}
        </button>
      }
    >
      <div className="stats">
        <Stat label="Family Kin" value={list.length} note="Eligible relatives" />
        <Stat label="Sila Alerts Sent" value={sent.length} note="Anonymous SMS" />
        <Stat label="Privacy Level" value="Absolute" note="Zero medical disclosure" />
      </div>

      <div className="grid2">
        {/* Left: Pearl Family Tree & Relatives List */}
        <Card
          title="At-Risk Relatives (Cascade Screening)"
          aside={<span className="secure-badge">🛡️ Anonymous Cascade</span>}
        >
          <p className="lead-in">
            When you carry a recessive gene variant, relatives who share your ancestors have a predictable probability of carrying the same gene.
          </p>

          <ul className="rel">
            {list.map((r) => {
              const done = sent.includes(r.id);
              return (
                <li key={r.id}>
                  <span>
                    <b>{r.label}</b>
                    <small>Inheritance probability: <strong>{r.chance}</strong> chance</small>
                  </span>
                  <div className="rel-actions">
                    <button
                      className="ghost btn-sm"
                      onClick={() => setSelectedRel(r)}
                    >
                      Preview Message
                    </button>
                    <button
                      className={done ? 'sent' : 'btn-soft btn-sm'}
                      disabled={done}
                      onClick={() => send([r.id])}
                    >
                      {done ? '✓ Alert Sent' : 'Send Sila'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="add-relative-box">
            <h4>Add Another Relative to Your Family Tree</h4>
            <div className="add-rel-form">
              <select
                className="modal-select"
                value={customRelRole}
                onChange={(e) => setCustomRelRole(e.target.value)}
              >
                <option value="Brother">Brother (50% probability)</option>
                <option value="Sister">Sister (50% probability)</option>
                <option value="Cousin (Father’s side)">Paternal Cousin (25% probability)</option>
                <option value="Cousin (Mother’s side)">Maternal Cousin (25% probability)</option>
                <option value="Aunt">Aunt (25% probability)</option>
                <option value="Uncle">Uncle (25% probability)</option>
              </select>
              <input
                type="text"
                className="modal-input"
                placeholder="Relative nickname or phone..."
                value={customRelName}
                onChange={(e) => setCustomRelName(e.target.value)}
              />
              <button
                className="btn-soft btn-sm"
                onClick={() => {
                  if (!customRelName) return;
                  alert(`Added ${customRelRole} (${customRelName}) to your private family tree.`);
                  setCustomRelName('');
                }}
              >
                + Add Kin
              </button>
            </div>
          </div>
        </Card>

        {/* Right: What Relatives Receive & Islamic Ethos */}
        <div className="branches-right-col">
          <Card title="What Relatives Receive (Privacy-Preserving)">
            <div className="sms">
              <small>SMS from: DaNA (UAE Premarital Health)</small>
              <p>
                «رسالة من شخص يهتم بك: يوصيك بإجراء الفحص الجيني المجاني للمقبلين على الزواج في أبوظبي لحماية مستقبل عائلتك.»
              </p>
              <p>
                “Someone who cares about you recommends free premarital genetic screening in Abu Dhabi. It is quick, confidential, and free for UAE citizens.”
              </p>
              <a href="#/invite" target="_blank" rel="noreferrer">
                dana.ae/i/sila-invite-preview →
              </a>
            </div>

            <div className="privacy-callout" style={{ marginTop: '16px' }}>
              <strong>🔒 Strict Sila Privacy Protocol:</strong>
              <ul className="facts" style={{ margin: '8px 0 0' }}>
                <li><b>No names:</b> Your identity is never disclosed in the message.</li>
                <li><b>No diagnosis:</b> Your condition or gene symbol ({me.carrier}) is never mentioned.</li>
                <li><b>One-time use:</b> Phone numbers are immediately purged after SMS delivery.</li>
                <li><b>Voluntary:</b> Relatives initiate their own screening independently.</li>
              </ul>
            </div>
          </Card>

          <Card title="Silat al-Rahim · صلة الرحم">
            <p className="lead-in">
              In Islamic tradition, protecting your kin and enabling healthy generations is a profound act of love and care.
            </p>
            <p className="muted">
              By alerting relatives before they get engaged, they can complete screening without stress or last-minute wedding delays.
            </p>
          </Card>
        </div>
      </div>

      {/* MODAL: PREVIEW SPECIFIC RELATIVE MESSAGE */}
      {selectedRel && (
        <div className="modal-backdrop" onClick={() => setSelectedRel(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-h">
              <h3>Preview Sila Alert for {selectedRel.label}</h3>
              <button className="close-x" onClick={() => setSelectedRel(null)}>×</button>
            </div>
            <div className="modal-body">
              <p className="muted">
                Estimated carrier probability: <strong>{selectedRel.chance}</strong> based on Mendelian inheritance from common ancestors.
              </p>
              <div className="sms">
                <small>Preview of SMS:</small>
                <p>
                  Someone who cares about you recommends free genetic screening before marriage. It’s quick, private and free for UAE nationals.
                </p>
                <a href="#/invite">dana.ae/i/preview</a>
              </div>
              <p className="fine">
                Dispatching this alert creates an anonymous, encrypted invitation token. No recipient details are linked to your medical profile.
              </p>
            </div>
            <div className="modal-actions">
              <button className="ghost" onClick={() => setSelectedRel(null)}>Close</button>
              <button
                className="btn"
                disabled={sent.includes(selectedRel.id)}
                onClick={() => {
                  send([selectedRel.id]);
                  setSelectedRel(null);
                }}
              >
                {sent.includes(selectedRel.id) ? '✓ Alert Already Sent' : 'Send Alert Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

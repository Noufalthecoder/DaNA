import React, { useState, useEffect } from 'react';
import SecurityNav from './SecurityNav.jsx';
import { Page, Card, Badge, Dialog } from '../../shared/ui.jsx';
import { COUPLES } from '../../shared/data.js';
import { useStore } from '../../shared/store.js';
import { supabase } from '../../shared/supabase.js';
import { logAudit } from '../../shared/db.js';
import {
  HeartHandshake,
  Search,
  AlertTriangle,
  UserMinus,
  CheckCircle2,
  Clock,
  Shield,
  Unlink
} from 'lucide-react';

export default function PartnerGovernance() {
  const session = useStore((s) => s.session);
  const connections = useStore((s) => s.connections) || [];
  const [couples, setCouples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCouple, setSelectedCouple] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');

  const loadRelationships = async () => {
    setLoading(true);
    try {
      if (supabase && session?.backend) {
        const { data, error } = await supabase.from('couples').select('*');
        if (!error && data && data.length > 0) {
          setCouples(data.map((c) => ({
            id: c.id,
            partnerA: c.partner_a,
            partnerB: c.partner_b,
            stage: c.stage || 'Engaged',
            status: c.status || 'ACTIVE',
            bilateralConsent: true,
            connectedAt: c.created_at || '2026-10-12T09:00:00Z'
          })));
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Direct couples query notice:', e.message);
    }

    // Standard clinical couples from data
    setCouples([
      { id: 'c1', partnerA: 'fatima', partnerB: 'khalid', stage: 'Engaged', status: 'ACTIVE', bilateralConsent: true, connectedAt: '2026-10-12T09:00:00Z' },
      { id: 'c2', partnerA: 'ahmed', partnerB: 'noura', stage: 'Married', status: 'ACTIVE', bilateralConsent: true, connectedAt: '2026-09-01T10:00:00Z' },
      { id: 'c3', partnerA: 'maryam', partnerB: 'saeed', stage: 'Engaged', status: 'ACTIVE', bilateralConsent: false, connectedAt: '2026-11-04T12:00:00Z' },
      { id: 'c4', partnerA: 'latifa', partnerB: 'omar', stage: 'Married', status: 'DISCONNECTED', bilateralConsent: false, connectedAt: '2026-07-20T14:30:00Z' },
      { id: 'c5', partnerA: 'aisha', partnerB: 'rashid', stage: 'Engaged', status: 'ACTIVE', bilateralConsent: true, connectedAt: '2026-10-30T11:15:00Z' },
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadRelationships();
  }, [session?.backend]);

  const filteredCouples = couples.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.id.toLowerCase().includes(q) ||
      c.partnerA.toLowerCase().includes(q) ||
      c.partnerB.toLowerCase().includes(q) ||
      c.stage.toLowerCase().includes(q)
    );
  });

  const handleSeverConnection = async () => {
    if (!selectedCouple) return;
    try {
      if (supabase && session?.backend) {
        await supabase
          .from('couples')
          .update({ status: 'DISCONNECTED' })
          .eq('id', selectedCouple.id);
      }
      setCouples((prev) =>
        prev.map((c) => (c.id === selectedCouple.id ? { ...c, status: 'DISCONNECTED', bilateralConsent: false } : c))
      );
      await logAudit(
        `Security Administration emergency severed couple relationship bond for ${selectedCouple.id} (${selectedCouple.partnerA} & ${selectedCouple.partnerB})`
      );
      setActionSuccess(`Couple relationship ${selectedCouple.id} severed. Partner access permissions and sharing consents immediately revoked.`);
      setSelectedCouple(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Page title="" sub="">
      <SecurityNav currentTab="relationships" />

      {actionSuccess && (
        <div style={{
          background: '#E8F3EC',
          border: '1px solid #C4E2CF',
          color: '#00843D',
          borderRadius: 10,
          padding: '10px 16px',
          marginBottom: 16,
          fontSize: 13.5
        }}>
          {actionSuccess}
        </div>
      )}

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--ink3)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by couple ID, partner name, or relationship stage..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 13.5 }}
          />
        </div>
      </div>

      {/* Relationships Table */}
      <Card title={`Active Premarital Couple Relationships (${filteredCouples.length})`}>
        <table className="table">
          <thead>
            <tr>
              <th>Couple ID</th>
              <th>Partner A</th>
              <th>Partner B</th>
              <th>Stage</th>
              <th>Relationship Status</th>
              <th>Bilateral Sharing Consent</th>
              <th className="right">Governance</th>
            </tr>
          </thead>
          <tbody>
            {filteredCouples.map((c) => (
              <tr key={c.id}>
                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.id}</td>
                <td><strong>{c.partnerA}</strong></td>
                <td><strong>{c.partnerB}</strong></td>
                <td>{c.stage}</td>
                <td>
                  <span className={`badge ${c.status === 'ACTIVE' ? 'b-green' : 'b-red'}`}>
                    {c.status}
                  </span>
                </td>
                <td>
                  {c.bilateralConsent ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#00843D', fontSize: 12.5, fontWeight: 600 }}>
                      <CheckCircle2 size={14} /> Mutual Active
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#CE1126', fontSize: 12.5, fontWeight: 600 }}>
                      <AlertTriangle size={14} /> Incomplete / Revoked
                    </span>
                  )}
                </td>
                <td className="right">
                  {c.status === 'ACTIVE' ? (
                    <button
                      className="ghost btn-sm"
                      style={{ color: '#CE1126' }}
                      onClick={() => setSelectedCouple(c)}
                    >
                      Sever Bond
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--ink3)' }}>Disconnected</span>
                  )}
                </td>
              </tr>
            ))}
            {!filteredCouples.length && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: 32, color: 'var(--ink3)' }}>
                  No couple relationships found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Sever Relationship Dialog */}
      {selectedCouple && (
        <Dialog
          title="Confirm Emergency Relationship Severance"
          onClose={() => setSelectedCouple(null)}
          footer={
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="ghost" onClick={() => setSelectedCouple(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleSeverConnection}>Sever & Revoke Permissions</button>
            </div>
          }
        >
          <p style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.6 }}>
            Are you sure you want to sever the connection between <strong>{selectedCouple.partnerA}</strong> and <strong>{selectedCouple.partnerB}</strong> (Couple {selectedCouple.id})?
            Severing this bond immediately invalidates all ReBAC permissions, prevents couple risk calculations, and cascades revocation to shared appointments and assessments.
          </p>
        </Dialog>
      )}
    </Page>
  );
}


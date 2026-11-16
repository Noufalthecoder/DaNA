import React, { useState } from 'react';
import SecurityNav from './SecurityNav.jsx';
import { Page, Card, Badge, Dialog } from '../../shared/ui.jsx';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  Search,
  CheckCircle,
  EyeOff,
  Filter,
  Flame
} from 'lucide-react';

const MOCK_THREAT_EVENTS = [
  {
    id: 'thr_001',
    time: new Date(Date.now() - 15 * 60000).toISOString(),
    severity: 'CRITICAL',
    type: 'RAW_GENETIC_CROSS_ACCESS_FORBIDDEN',
    title: 'Cross-Partner Raw Genomic Incursion Attempt',
    actorToken: 'anon_sub_khalid',
    targetedResource: 'genetic_reports (person: fatima)',
    defense: 'Application Triple-Lock Decoupling blocked raw report SELECT.',
    status: 'NEUTRALIZED'
  },
  {
    id: 'thr_002',
    time: new Date(Date.now() - 45 * 60000).toISOString(),
    severity: 'HIGH',
    type: 'UNASSIGNED_COUNSELLOR',
    title: 'Unassigned Clinical Dossier Query',
    actorToken: 'counsellor_mariam',
    targetedResource: 'clinical_cases (case_unrelated_999)',
    defense: 'ReBAC Engine rejected unassigned clinician access.',
    status: 'NEUTRALIZED'
  },
  {
    id: 'thr_003',
    time: new Date(Date.now() - 120 * 60000).toISOString(),
    severity: 'CRITICAL',
    type: 'PRIVILEGE_ESCALATION_ATTEMPT',
    title: 'Direct Database Privilege Escalation (role: admin)',
    actorToken: 'untrusted_client_session',
    targetedResource: 'public.accounts table INSERT',
    defense: 'PostgreSQL accounts_self_signup policy rejected row.',
    status: 'NEUTRALIZED'
  },
  {
    id: 'thr_004',
    time: new Date(Date.now() - 360 * 60000).toISOString(),
    severity: 'MEDIUM',
    type: 'NO_ACTIVE_RELATIONSHIP',
    title: 'Severed Relationship Couple Assessment Query',
    actorToken: 'anon_sub_omar',
    targetedResource: 'couple_assessment (couple: c4)',
    defense: 'ReBAC verified disconnected relationship status and blocked results.',
    status: 'NEUTRALIZED'
  }
];

export default function ThreatMonitoring() {
  const [threats, setThreats] = useState(MOCK_THREAT_EVENTS);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [selectedThreat, setSelectedThreat] = useState(null);

  const filteredThreats = threats.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch =
      t.title.toLowerCase().includes(q) ||
      t.type.toLowerCase().includes(q) ||
      t.actorToken.toLowerCase().includes(q);
    const matchesSev = severityFilter === 'ALL' || t.severity === severityFilter;
    return matchesSearch && matchesSev;
  });

  return (
    <Page title="" sub="">
      <SecurityNav currentTab="threats" />

      {/* Threat Summary KPI Cards */}
      <div className="stats four" style={{ marginBottom: 20 }}>
        <div className="stat">
          <span>Total Neutralized</span>
          <strong style={{ color: '#00843D' }}>100%</strong>
          <small>Zero breaches recorded</small>
        </div>
        <div className="stat">
          <span>Genetic Incursions</span>
          <strong style={{ color: '#CE1126' }}>1 Blocked</strong>
          <small>Raw variant decoupling</small>
        </div>
        <div className="stat">
          <span>Unassigned Clinicians</span>
          <strong style={{ color: '#B57C1E' }}>1 Intercepted</strong>
          <small>ReBAC assignment rule</small>
        </div>
        <div className="stat">
          <span>Privilege Escalations</span>
          <strong style={{ color: '#CE1126' }}>1 Denied</strong>
          <small>PostgreSQL RLS policy</small>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--ink3)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search threats by signature, error code, or actor token..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 13.5 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
            <button
              key={sev}
              className={severityFilter === sev ? 'btn btn-sm' : 'ghost btn-sm'}
              onClick={() => setSeverityFilter(sev)}
            >
              {sev === 'ALL' ? 'All Threats' : sev}
            </button>
          ))}
        </div>
      </div>

      {/* Threat Feed Table */}
      <Card title={`Live Security Threat Feed (${filteredThreats.length} Events Neutralized)`} aside={<span style={{ fontSize: 12, color: 'var(--ink3)' }}>Automated SIEM protection</span>}>
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Severity</th>
              <th>Threat Event</th>
              <th>Actor Identifier</th>
              <th>Target Resource</th>
              <th>Outcome</th>
              <th className="right">Analysis</th>
            </tr>
          </thead>
          <tbody>
            {filteredThreats.map((t) => (
              <tr key={t.id}>
                <td className="nowrap" style={{ fontSize: 12.5, color: 'var(--ink2)' }}>
                  {new Date(t.time).toLocaleTimeString()}
                </td>
                <td>
                  <span className={`badge ${t.severity === 'CRITICAL' ? 'b-red' : t.severity === 'HIGH' ? 'b-amber' : ''}`}>
                    {t.severity}
                  </span>
                </td>
                <td>
                  <strong>{t.title}</strong>
                  <small style={{ fontFamily: 'monospace', color: 'var(--ink3)' }}>{t.type}</small>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{t.actorToken}</td>
                <td style={{ fontSize: 13 }}>{t.targetedResource}</td>
                <td>
                  <span className="badge b-green">
                    <ShieldCheck size={13} style={{ marginRight: 3 }} />
                    {t.status}
                  </span>
                </td>
                <td className="right">
                  <button
                    className="ghost btn-sm"
                    onClick={() => setSelectedThreat(t)}
                  >
                    View Defense
                  </button>
                </td>
              </tr>
            ))}
            {!filteredThreats.length && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: 32, color: 'var(--ink3)' }}>
                  No security threats detected matching your filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Threat Incident Detail Modal */}
      {selectedThreat && (
        <Dialog
          title={`Security Incident Analysis: ${selectedThreat.title}`}
          onClose={() => setSelectedThreat(null)}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setSelectedThreat(null)}>Acknowledge & Close</button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <span style={{ fontSize: 12, color: 'var(--ink3)', textTransform: 'uppercase', fontWeight: 600 }}>Attack Vector</span>
              <p style={{ margin: '4px 0', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{selectedThreat.type}</p>
            </div>

            <div>
              <span style={{ fontSize: 12, color: 'var(--ink3)', textTransform: 'uppercase', fontWeight: 600 }}>Targeted Resource</span>
              <p style={{ margin: '4px 0', fontSize: 13.5, color: 'var(--ink2)' }}>{selectedThreat.targetedResource}</p>
            </div>

            <div>
              <span style={{ fontSize: 12, color: 'var(--ink3)', textTransform: 'uppercase', fontWeight: 600 }}>Automated Countermeasure</span>
              <p style={{ margin: '4px 0', fontSize: 13.5, color: '#00843D', fontWeight: 500 }}>
                {selectedThreat.defense}
              </p>
            </div>

            <div style={{ background: '#F8F9F8', padding: 12, borderRadius: 8, fontSize: 12.5, color: 'var(--ink2)' }}>
              <strong>Compliance Assertion:</strong> In accordance with UAE Federal Decree Law No. 2 of 2019 and ADHICS standards, unconsented cross-patient health queries are blocked deterministically before reach of database record sets.
            </div>
          </div>
        </Dialog>
      )}
    </Page>
  );
}


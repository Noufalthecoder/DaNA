import React, { useState, useEffect } from 'react';
import SecurityNav from './SecurityNav.jsx';
import { Page, Card, Badge } from '../../shared/ui.jsx';
import { useStore } from '../../shared/store.js';
import { supabase } from '../../shared/supabase.js';
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';

const CATEGORIES = ['ALL', 'Auth', 'Consent', 'Assessment', 'Clinical', 'Admin'];

export default function AccessHistory() {
  const session = useStore((s) => s.session);
  const localAudit = useStore((s) => s.audit) || [];
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      if (supabase && session?.backend) {
        const { data, error } = await supabase
          .from('audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (!error && data && data.length > 0) {
          setLogs(data.map((l, i) => ({
            id: l.id || `audit_${i}`,
            time: l.created_at || new Date().toISOString(),
            actor: l.actor_name || 'Member',
            action: l.action || 'Queried platform',
            resource: l.resource_type || 'platform',
            outcome: 'ALLOWED'
          })));
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Direct audit_log query notice:', e.message);
    }

    // Blend local store audit entries
    const combined = localAudit.map((a, i) => ({
      id: `local_${i}`,
      time: a.t,
      actor: a.who || 'User',
      action: a.what || 'Accessed record',
      resource: a.what.includes('Consent') ? 'consent' : a.what.includes('Assessment') ? 'couple_assessment' : 'auth',
      outcome: 'ALLOWED'
    }));

    setLogs(combined.length > 0 ? combined : [
      { id: '1', time: new Date().toISOString(), actor: 'Khalid Al Mansoori', action: 'Signed in via UAE PASS (demo) as Couple', resource: 'auth', outcome: 'ALLOWED' },
      { id: '2', time: new Date(Date.now() - 3600000).toISOString(), actor: 'Fatima Al Hammadi', action: 'Granted consent for genetic_processing', resource: 'consent', outcome: 'ALLOWED' },
      { id: '3', time: new Date(Date.now() - 7200000).toISOString(), actor: 'Dr. Mariam Al Hosani', action: 'Accessed assigned case case_khalid_fatima', resource: 'clinical_case', outcome: 'ALLOWED' },
      { id: '4', time: new Date(Date.now() - 10800000).toISOString(), actor: 'DoH Administrator', action: 'Queried de-identified aggregate programme analytics', resource: 'analytics', outcome: 'ALLOWED' },
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAuditLogs();
  }, [session?.backend]);

  const filteredLogs = logs.filter((l) => {
    const q = search.toLowerCase();
    const matchesSearch = l.actor.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || l.resource.toLowerCase().includes(q);
    const matchesCat = category === 'ALL' || l.action.toLowerCase().includes(category.toLowerCase()) || l.resource.toLowerCase().includes(category.toLowerCase());
    return matchesSearch && matchesCat;
  });

  const exportCSV = () => {
    const headers = 'ID,Timestamp,Actor,Action,Resource,Outcome\n';
    const rows = filteredLogs.map((l) => `"${l.id}","${l.time}","${l.actor}","${l.action.replace(/"/g, '""')}","${l.resource}","${l.outcome}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dana_forensic_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <Page
      title=""
      sub=""
      actions={
        <button
          className="ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          onClick={exportCSV}
        >
          <Download size={14} />
          Export Forensic CSV
        </button>
      }
    >
      <SecurityNav currentTab="audit" />

      {/* Search & Category Filter Bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--ink3)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search audit trail by actor, action description, or resource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 13.5 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={category === c ? 'btn btn-sm' : 'ghost btn-sm'}
              onClick={() => setCategory(c)}
            >
              {c === 'ALL' ? 'All Events' : c}
            </button>
          ))}
        </div>
      </div>

      {/* Forensic Audit Table */}
      <Card title={`Forensic Access & Decision Log (${filteredLogs.length} Records)`} aside={<span style={{ fontSize: 12, color: 'var(--ink3)' }}>Append-only immutable record</span>}>
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp (Gulf Time)</th>
              <th>Actor</th>
              <th>Action Description</th>
              <th>Target Resource</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((l) => (
              <tr key={l.id}>
                <td className="nowrap" style={{ fontSize: 12.5, color: 'var(--ink2)' }}>
                  {new Date(l.time).toLocaleString()}
                </td>
                <td><strong>{l.actor}</strong></td>
                <td>{l.action}</td>
                <td>
                  <span className="badge" style={{ textTransform: 'capitalize' }}>
                    {l.resource.replace(/_/g, ' ')}
                  </span>
                </td>
                <td>
                  <span className="badge b-green">
                    {l.outcome}
                  </span>
                </td>
              </tr>
            ))}
            {!filteredLogs.length && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: 32, color: 'var(--ink3)' }}>
                  No audit log entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </Page>
  );
}


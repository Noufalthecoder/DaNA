import React, { useState, useEffect } from 'react';
import SecurityNav from './SecurityNav.jsx';
import { Page, Card, Badge, Priority, Dialog } from '../../shared/ui.jsx';
import { useStore } from '../../shared/store.js';
import { supabase } from '../../shared/supabase.js';
import { api } from '../../shared/api.js';
import { logAudit } from '../../shared/db.js';
import {
  Stethoscope,
  Search,
  UserCheck,
  AlertTriangle,
  EyeOff,
  Lock,
  ArrowRightLeft
} from 'lucide-react';

const COUNSELLORS_LIST = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Dr. Mariam Al Hosani', specialty: 'Hemoglobinopathies & Premarital' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Dr. Salem Al Kaabi', specialty: 'Spinal Muscular Atrophy & Metabolic' }
];

export default function ClinicalAssignments() {
  const session = useStore((s) => s.session);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [newCounsellorId, setNewCounsellorId] = useState(COUNSELLORS_LIST[0].id);
  const [actionSuccess, setActionSuccess] = useState('');

  const loadCases = async () => {
    setLoading(true);
    try {
      const res = await api('/cases');
      if (Array.isArray(res) && res.length > 0) {
        setCases(res.map((c, i) => ({
          id: c.id || `case_${i + 1}`,
          coupleId: c.couple_id || 'c1',
          tier: c.triage_tier || 2,
          urgency: (c.clinical_urgency || 'HIGH').toLowerCase(),
          workflow: c.workflow_status || 'PENDING_COUNSELLING',
          counsellorName: c.case_assignments?.[0]?.counsellors?.name || 'Dr. Mariam Al Hosani'
        })));
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('API cases query notice:', e.message);
    }

    // Standard clinical demonstration cases
    setCases([
      { id: '33333333-3333-3333-3333-333333333331', coupleId: 'c1 (Fatima & Khalid)', tier: 2, urgency: 'high', workflow: 'PENDING_COUNSELLING', counsellorName: 'Dr. Mariam Al Hosani' },
      { id: '33333333-3333-3333-3333-333333333332', coupleId: 'c2 (Noura & Ahmed)', tier: 1, urgency: 'urgent', workflow: 'IN_CONSULTATION', counsellorName: 'Dr. Salem Al Kaabi' },
      { id: '33333333-3333-3333-3333-333333333333', coupleId: 'c3 (Maryam & Saeed)', tier: 3, urgency: 'moderate', workflow: 'ASSESSMENT_COMPLETED', counsellorName: 'Dr. Mariam Al Hosani' },
      { id: '33333333-3333-3333-3333-333333333334', coupleId: 'c5 (Aisha & Rashid)', tier: 4, urgency: 'routine', workflow: 'PENDING_COUNSELLING', counsellorName: 'Unassigned' }
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadCases();
  }, [session?.backend]);

  const filteredCases = cases.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.id.toLowerCase().includes(q) ||
      c.coupleId.toLowerCase().includes(q) ||
      c.counsellorName.toLowerCase().includes(q) ||
      c.workflow.toLowerCase().includes(q)
    );
  });

  const handleReassign = async () => {
    if (!selectedCase) return;
    const assignedCounsellor = COUNSELLORS_LIST.find((cn) => cn.id === newCounsellorId);
    try {
      if (supabase && session?.backend) {
        await supabase
          .from('case_assignments')
          .update({ counsellor_id: newCounsellorId })
          .eq('case_id', selectedCase.id);
      }
      setCases((prev) =>
        prev.map((c) =>
          c.id === selectedCase.id
            ? { ...c, counsellorName: assignedCounsellor?.name || 'Dr. Assigned' }
            : c
        )
      );
      await logAudit(
        `Clinical Supervisor reassigned clinical case ${selectedCase.id} to ${assignedCounsellor?.name}`
      );
      setActionSuccess(`Case ${selectedCase.id} successfully reassigned to ${assignedCounsellor?.name}.`);
      setSelectedCase(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Page title="" sub="">
      <SecurityNav currentTab="clinical" />

      {/* Zero-Knowledge Clinical Barrier */}
      <div style={{
        background: '#FAF6EE',
        border: '1px solid #E8DECE',
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <Lock size={18} color="#B57C1E" />
        <span style={{ fontSize: 13, color: '#82560E' }}>
          <strong>Zero-Knowledge Clinical Boundary:</strong> Case management is limited to workload triage and provider reassignment. Administrators have zero access to clinical consultation notes or patient genetic reports.
        </span>
      </div>

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
            placeholder="Search by case ID, couple identifier, or assigned clinician..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 13.5 }}
          />
        </div>
      </div>

      {/* Cases Directory Table */}
      <Card title={`Active Clinical Cases & Triage Assignments (${filteredCases.length})`}>
        <table className="table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Couple Identifier</th>
              <th>Triage Priority</th>
              <th>Workflow Status</th>
              <th>Assigned Genetic Counsellor</th>
              <th className="right">Clinical Assignment</th>
            </tr>
          </thead>
          <tbody>
            {filteredCases.map((c) => (
              <tr key={c.id}>
                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.id.slice(0, 16)}...</td>
                <td><strong>{c.coupleId}</strong></td>
                <td><Priority p={c.urgency} /></td>
                <td>
                  <span className="badge">
                    {c.workflow.replace(/_/g, ' ')}
                  </span>
                </td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--ink)' }}>
                    <Stethoscope size={15} color="var(--green)" />
                    {c.counsellorName}
                  </span>
                </td>
                <td className="right">
                  <button
                    className="ghost btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    onClick={() => setSelectedCase(c)}
                  >
                    <ArrowRightLeft size={13} />
                    Reassign
                  </button>
                </td>
              </tr>
            ))}
            {!filteredCases.length && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: 32, color: 'var(--ink3)' }}>
                  No clinical cases found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Case Reassignment Dialog */}
      {selectedCase && (
        <Dialog
          title="Reassign Clinical Case"
          onClose={() => setSelectedCase(null)}
          footer={
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="ghost" onClick={() => setSelectedCase(null)}>Cancel</button>
              <button className="btn" onClick={handleReassign}>Confirm Reassignment</button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13.5, color: 'var(--ink2)', margin: 0 }}>
              Select an authorized, licensed genetic counsellor to assign to case <strong>{selectedCase.id}</strong> ({selectedCase.coupleId}).
              The new counsellor will gain ReBAC relationship access to the patient clinical dossier upon assignment.
            </p>

            <label>
              Select Genetic Counsellor:
              <select
                className="form-control"
                value={newCounsellorId}
                onChange={(e) => setNewCounsellorId(e.target.value)}
                style={{ width: '100%', padding: 9, borderRadius: 8, marginTop: 6 }}
              >
                {COUNSELLORS_LIST.map((cn) => (
                  <option key={cn.id} value={cn.id}>
                    {cn.name} ({cn.specialty})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Dialog>
      )}
    </Page>
  );
}


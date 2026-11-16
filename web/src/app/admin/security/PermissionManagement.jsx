import React, { useState } from 'react';
import SecurityNav from './SecurityNav.jsx';
import { Page, Card, Badge } from '../../shared/ui.jsx';
import {
  ROLES,
  RESOURCES,
  ACTIONS,
  evaluateAccess,
  SECURITY_ERRORS
} from '../../shared/auth/authorizationEngine.js';
import {
  KeyRound,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Play
} from 'lucide-react';

const MATRIX_DATA = [
  {
    role: 'Patient / Couple',
    roleKey: ROLES.PATIENT,
    report: 'Self Only (Consented)',
    variant: 'Self Only',
    medical: 'Self Only',
    assessment: 'Active Couple + Bilateral Consent',
    clinicalCase: 'No Access',
    note: 'No Access',
    roots: 'Self Only (Autonomous)',
    audit: 'No Access',
    analytics: 'No Access'
  },
  {
    role: 'Counsellor',
    roleKey: ROLES.COUNSELLOR,
    report: 'Assigned Cases Only',
    variant: 'Assigned Cases Only',
    medical: 'Assigned Cases Only',
    assessment: 'Assigned Cases Only',
    clinicalCase: 'Assigned Cases Only',
    note: 'Full Read/Write (Assigned)',
    roots: 'Assigned Pedigree',
    audit: 'Session Activity',
    analytics: 'No Access'
  },
  {
    role: 'Clinical Supervisor',
    roleKey: ROLES.CLINICAL_SUPERVISOR,
    report: 'Consented Audit / Escalated',
    variant: 'Escalated Cases',
    medical: 'Escalated Cases',
    assessment: 'Audit & Second Opinion',
    clinicalCase: 'Department Queue & Reassign',
    note: 'Audit Review',
    roots: 'Consented Pedigree',
    audit: 'Clinical Log Read',
    analytics: 'Department Totals'
  },
  {
    role: 'Platform Admin',
    roleKey: ROLES.ADMIN,
    report: 'STRICTLY DENIED',
    variant: 'STRICTLY DENIED',
    medical: 'STRICTLY DENIED',
    assessment: 'STRICTLY DENIED',
    clinicalCase: 'Metadata Only (Zero PHI)',
    note: 'STRICTLY DENIED',
    roots: 'STRICTLY DENIED',
    audit: 'Full Forensic Read',
    analytics: 'De-identified Aggregate'
  },
  {
    role: 'Content Reviewer',
    roleKey: ROLES.CONTENT_REVIEWER,
    report: 'STRICTLY DENIED',
    variant: 'STRICTLY DENIED',
    medical: 'STRICTLY DENIED',
    assessment: 'STRICTLY DENIED',
    clinicalCase: 'STRICTLY DENIED',
    note: 'STRICTLY DENIED',
    roots: 'STRICTLY DENIED',
    audit: 'No Access',
    analytics: 'No Access'
  },
  {
    role: 'DoH Viewer',
    roleKey: ROLES.DOH_VIEWER,
    report: 'STRICTLY DENIED',
    variant: 'STRICTLY DENIED',
    medical: 'STRICTLY DENIED',
    assessment: 'STRICTLY DENIED',
    clinicalCase: 'STRICTLY DENIED',
    note: 'STRICTLY DENIED',
    roots: 'STRICTLY DENIED',
    audit: 'De-identified Logs',
    analytics: 'k-Anonymity (k ≥ 5) Aggregate'
  },
  {
    role: 'System Service',
    roleKey: ROLES.SYSTEM_SERVICE,
    report: 'Batch Ingest (Consented)',
    variant: 'Batch Ingest',
    medical: 'FHIR Ingest',
    assessment: 'Algorithm Execution',
    clinicalCase: 'Triage Sync',
    note: 'System Logs',
    roots: 'Batch Sync',
    audit: 'Append Only',
    analytics: 'Sync Pipeline'
  }
];

export default function PermissionManagement() {
  // Simulator State
  const [simRole, setSimRole] = useState(ROLES.PATIENT);
  const [simAction, setSimAction] = useState(ACTIONS.READ);
  const [simResource, setSimResource] = useState(RESOURCES.GENETIC_REPORT);
  const [isCrossAccess, setIsCrossAccess] = useState(false);
  const [isCoupleActive, setIsCoupleActive] = useState(true);
  const [hasConsent, setHasConsent] = useState(true);
  const [simResult, setSimResult] = useState(null);

  const runSimulation = () => {
    const actor = {
      id: 'sim_actor_001',
      userId: 'sim_actor_001',
      personId: 'person_alpha',
      role: simRole,
      status: 'active',
      credentialsVerified: true,
      counsellorId: 'counsellor_001'
    };

    const target = {
      personId: isCrossAccess ? 'person_beta' : 'person_alpha',
      coupleId: 'couple_001',
      couple: {
        id: 'couple_001',
        partner_a: 'person_alpha',
        partner_b: 'person_beta',
        status: isCoupleActive ? 'active' : 'disconnected'
      },
      caseId: 'case_001'
    };

    const context = {
      couples: [target.couple],
      consents: hasConsent ? [
        { purpose: 'share_combined_assessment', person_id: 'person_alpha', status: 'active' },
        { purpose: 'share_combined_assessment', person_id: 'person_beta', status: 'active' },
        { purpose: 'counsellor_clinical_access', person_id: 'person_alpha', status: 'active' }
      ] : [],
      assignments: [
        { case_id: 'case_001', counsellor_id: 'counsellor_001', status: 'active' }
      ]
    };

    const evalResult = evaluateAccess({
      actor,
      resource: simResource,
      action: simAction,
      target,
      context
    });

    setSimResult(evalResult);
  };

  const getTone = (val) => {
    if (val.includes('DENIED') || val.includes('No Access')) return '#FDECEF';
    if (val.includes('Assigned') || val.includes('Self Only') || val.includes('Active')) return '#E8F3EC';
    return '#F0F3F1';
  };

  const getTextColor = (val) => {
    if (val.includes('DENIED') || val.includes('No Access')) return '#CE1126';
    if (val.includes('Assigned') || val.includes('Self Only') || val.includes('Active')) return '#00843D';
    return '#56625B';
  };

  return (
    <Page title="" sub="">
      <SecurityNav currentTab="permissions" />

      {/* Permission Matrix Table */}
      <Card title="DaNA 7-Role Permission Matrix" aside={<span style={{ fontSize: 12, color: 'var(--ink3)' }}>Enforced via Triple-Lock Engine</span>}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th>Healthcare Role</th>
                <th>Raw Report</th>
                <th>Genomic Variants</th>
                <th>Medical Record</th>
                <th>Couple Risk</th>
                <th>Clinical Dossier</th>
                <th>Counselling Notes</th>
                <th>Public Analytics</th>
              </tr>
            </thead>
            <tbody>
              {MATRIX_DATA.map((row) => (
                <tr key={row.role}>
                  <td><strong>{row.role}</strong></td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: getTone(row.report),
                      color: getTextColor(row.report)
                    }}>
                      {row.report}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: getTone(row.variant),
                      color: getTextColor(row.variant)
                    }}>
                      {row.variant}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: getTone(row.medical),
                      color: getTextColor(row.medical)
                    }}>
                      {row.medical}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: getTone(row.assessment),
                      color: getTextColor(row.assessment)
                    }}>
                      {row.assessment}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: getTone(row.clinicalCase),
                      color: getTextColor(row.clinicalCase)
                    }}>
                      {row.clinicalCase}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: getTone(row.note),
                      color: getTextColor(row.note)
                    }}>
                      {row.note}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: getTone(row.analytics),
                      color: getTextColor(row.analytics)
                    }}>
                      {row.analytics}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Live Interactive Permission Simulator */}
      <Card title="Live Policy Decision Simulator" style={{ marginTop: 20 }}>
        <p style={{ fontSize: 13.5, color: 'var(--ink2)', marginBottom: 16 }}>
          Test the real-time authorization engine decision pipeline (`evaluateAccess`) against dynamic conditions, role changes, and cross-resource requests.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
          <label>
            Actor Role:
            <select
              className="form-control"
              value={simRole}
              onChange={(e) => setSimRole(e.target.value)}
              style={{ width: '100%', padding: 8, marginTop: 4, borderRadius: 8 }}
            >
              <option value={ROLES.PATIENT}>Patient / Couple</option>
              <option value={ROLES.COUNSELLOR}>Counsellor</option>
              <option value={ROLES.CLINICAL_SUPERVISOR}>Clinical Supervisor</option>
              <option value={ROLES.ADMIN}>Platform Admin</option>
              <option value={ROLES.CONTENT_REVIEWER}>Content Reviewer</option>
              <option value={ROLES.DOH_VIEWER}>DoH Viewer</option>
            </select>
          </label>

          <label>
            Target Resource:
            <select
              className="form-control"
              value={simResource}
              onChange={(e) => setSimResource(e.target.value)}
              style={{ width: '100%', padding: 8, marginTop: 4, borderRadius: 8 }}
            >
              <option value={RESOURCES.GENETIC_REPORT}>Genetic Report</option>
              <option value={RESOURCES.GENETIC_VARIANT}>Genetic Variant</option>
              <option value={RESOURCES.MEDICAL_RECORD}>Medical Record</option>
              <option value={RESOURCES.COUPLE_ASSESSMENT}>Couple Assessment</option>
              <option value={RESOURCES.CLINICAL_CASE}>Clinical Case</option>
              <option value={RESOURCES.COUNSELLING_NOTE}>Counselling Note</option>
              <option value={RESOURCES.ROOTS_SILA}>Roots / Sila Cascade</option>
              <option value={RESOURCES.ANALYTICS}>DoH Aggregate Analytics</option>
            </select>
          </label>

          <label>
            Requested Action:
            <select
              className="form-control"
              value={simAction}
              onChange={(e) => setSimAction(e.target.value)}
              style={{ width: '100%', padding: 8, marginTop: 4, borderRadius: 8 }}
            >
              <option value={ACTIONS.READ}>READ</option>
              <option value={ACTIONS.WRITE}>WRITE</option>
              <option value={ACTIONS.EXECUTE}>EXECUTE</option>
            </select>
          </label>
        </div>

        {/* Condition Checkboxes */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isCrossAccess}
              onChange={(e) => setIsCrossAccess(e.target.checked)}
            />
            Target belongs to another user (Cross-Access IDOR Attempt)
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isCoupleActive}
              onChange={(e) => setIsCoupleActive(e.target.checked)}
            />
            Couple Relationship Active
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hasConsent}
              onChange={(e) => setHasConsent(e.target.checked)}
            />
            Active Patient Consent Granted
          </label>
        </div>

        <button className="btn" onClick={runSimulation} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Play size={14} />
          Evaluate Live Decision
        </button>

        {simResult && (
          <div style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 12,
            border: `1px solid ${simResult.allowed ? '#C4E2CF' : '#F5C6CB'}`,
            background: simResult.allowed ? '#E8F3EC' : '#FDECEF'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              {simResult.allowed ? (
                <CheckCircle2 size={20} color="#00843D" />
              ) : (
                <XCircle size={20} color="#CE1126" />
              )}
              <strong style={{ fontSize: 16, color: simResult.allowed ? '#00843D' : '#CE1126' }}>
                Decision: {simResult.allowed ? 'ACCESS GRANTED (ALLOW)' : 'ACCESS DENIED (DENY)'}
              </strong>
            </div>

            <p style={{ fontSize: 13.5, margin: '6px 0', color: 'var(--ink)' }}>
              {simResult.allowed
                ? 'Evaluation successful: Actor satisfied role credentials, relationship parameters, and active consent requirements.'
                : `Security Violation: ${simResult.error?.message} (${simResult.error?.code})`}
            </p>
          </div>
        )}
      </Card>
    </Page>
  );
}


import { useState, useEffect } from 'react';
import { Badge } from '../shared/ui.jsx';
import { useCouple } from './useCouple.js';
import { SYNTHETIC_INTAKES } from '../shared/data.js';
import { set, useStore, signOut } from '../shared/store.js';
import { signOut as supabaseSignOut } from '../shared/supabase.js';
import { go } from '../shared/router.js';

const STEPS = [
  { id: 1, label: 'Patient info' },
  { id: 2, label: 'Health history' },
  { id: 3, label: 'Family history' },
  { id: 4, label: 'Compliance Q&A' },
  { id: 5, label: 'Consent' },
  { id: 6, label: 'Verify & Submit' },
];

const RELATIONS = [
  'Mother', 'Father', 'Brother', 'Sister',
  'Maternal Grandfather', 'Maternal Grandmother',
  'Paternal Grandfather', 'Paternal Grandmother',
  'Maternal Uncle', 'Maternal Aunt',
  'Paternal Uncle', 'Paternal Aunt',
  'First Cousin (Paternal)', 'First Cousin (Maternal)',
  'Child', 'Other Relative'
];

export default function Screening() {
  const { me, partner } = useCouple();
  const session = useStore((s) => s.session);
  const intakes = useStore((s) => s.screeningIntakes || {});
  const existingIntake = intakes[me.id];

  // Only UAE PASS auto-fills. Google sign-in, email, signup, and manual all default strictly to manual.
  const isUaePass = session?.authMethod === 'uae_pass' || session?.via === 'uaepass';
  const isManual = !isUaePass;
  const mode = isManual ? 'manual' : 'uae_pass';

  const defaultPreset = isManual
    ? {
        personal: {
          fullName: session?.name || '',
          fullNameAr: '',
          emiratesId: '',
          dob: '',
          gender: 'Female',
          phone: '',
          email: session?.email || '',
          nationality: 'United Arab Emirates',
          city: 'Abu Dhabi',
        },
        medical: {
          bloodGroup: 'O+',
          conditions: '',
          medications: '',
          surgeries: '',
          allergies: '',
        },
        family: [
          { id: 1, relation: 'Mother', condition: '', cancerHistory: '' },
          { id: 2, relation: 'Father', condition: '', cancerHistory: '' },
        ],
        compliance: {
          isPregnant: 'no',
          gestationalWeeks: '',
          isConsanguineous: 'no',
          relationToPartner: '',
          weddingDate: '',
          previousScreening: 'no',
        },
        consent: {
          malaffiSync: false,
          partnerShare: false,
          counsellorAccess: false,
          anonymizedResearch: false,
        },
      }
    : (SYNTHETIC_INTAKES[me.id] || SYNTHETIC_INTAKES.fatima);

  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(!!existingIntake?.completed);

  // Form State
  const [personal, setPersonal] = useState(defaultPreset.personal);
  const [medical, setMedical] = useState(defaultPreset.medical);
  const [family, setFamily] = useState(defaultPreset.family);
  const [compliance, setCompliance] = useState(defaultPreset.compliance);
  const [consent, setConsent] = useState(defaultPreset.consent);
  const [certified, setCertified] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset wizard flow whenever user, intake state, or manual mode changes
  useEffect(() => {
    setStep(1);
    setIsSubmitted(!!existingIntake?.completed);
    setPersonal(defaultPreset.personal);
    setMedical(defaultPreset.medical);
    setFamily(defaultPreset.family);
    setCompliance(defaultPreset.compliance);
    setConsent(defaultPreset.consent);
    setCertified(false);
    setErrors({});
  }, [me.id, isManual, existingIntake?.completed]);

  // Family dynamic table helpers (Image 2 style)
  const addFamilyRow = () => {
    const newId = Date.now();
    setFamily([...family, { id: newId, relation: 'Brother', condition: 'None', cancerHistory: 'None' }]);
  };

  const updateFamilyRow = (id, field, value) => {
    setFamily(family.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const removeFamilyRow = (id) => {
    if (family.length <= 1) return;
    setFamily(family.filter((row) => row.id !== id));
  };

  // Step navigation validator
  const handleContinue = () => {
    const errs = {};
    if (step === 1) {
      if (!personal.fullName?.trim()) errs.fullName = 'Full legal name is required.';
      if (!personal.emiratesId?.trim()) errs.emiratesId = 'Emirates ID is required.';
      if (!personal.dob) errs.dob = 'Date of birth is required.';
    } else if (step === 4) {
      if (compliance.isPregnant === 'yes' && !compliance.gestationalWeeks) {
        errs.gestationalWeeks = 'Gestational weeks required for urgent clinical triage.';
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  // Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!certified) {
      setErrors({ certified: 'Certification & electronic signature is required before submitting your intake.' });
      return;
    }

    setErrors({});
    const payload = {
      completed: true,
      mode,
      submittedAt: new Date().toISOString(),
      personal,
      medical,
      family,
      compliance,
      consent,
    };

    set((s) => ({
      screeningIntakes: { ...(s.screeningIntakes || {}), [me.id]: payload },
    }), `User ${me.name} submitted premarital screening intake (${mode === 'uae_pass' ? 'UAE PASS verified' : 'Manual entry'})`);

    go('/app');
  };

  if (isSubmitted) {
    return (
      <div className="workday-sheet">
        <div className="sheet-top-nav">
          <a href="#/app" className="link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
            ← Back to Dashboard
          </a>
          <Badge tone="green">Verified & Synchronized</Badge>
        </div>
        <div style={{ textAlign: 'center', padding: '36px 16px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-l)', color: 'var(--green)', fontSize: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            ✓
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Screening Intake Received</h2>
          <p className="muted" style={{ maxWidth: 540, margin: '0 auto 20px', lineHeight: 1.6 }}>
            Your personal information, medical history, family pedigree, and consent have been securely processed
            under UAE Federal Decree-Law No. 49 of 2023.
          </p>
          <div style={{ display: 'inline-flex', gap: 10, margin: '12px 0 24px' }}>
            <Badge tone="green">Verified via UAE PASS & Malaffi</Badge>
            <Badge tone="grey">{new Date().toLocaleDateString('en-GB')}</Badge>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <a href="#/app" className="btn">Continue to Journey Dashboard →</a>
            <button className="ghost" onClick={() => setIsSubmitted(false)}>Review / Edit Intake</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="workday-sheet">
      <div className="sheet-top-nav">
        {existingIntake?.completed ? (
          <a href="#/app" className="link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
            ← Back to Dashboard
          </a>
        ) : (
          <a
            href="#/"
            className="link"
            onClick={async (e) => {
              e.preventDefault();
              signOut();
              try { await supabaseSignOut(); } catch {}
              go('/');
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}
          >
            ← Back to home
          </a>
        )}
        {existingIntake?.completed && (
          <Badge tone="green">Intake on File · Edit & Resubmit to Update</Badge>
        )}
      </div>

      <div className="sheet-head">
        <h1>Premarital Screening Intake</h1>
        <p>Step 1 of your journey: Health history, family pedigree and informed consent</p>
      </div>

      {/* Workday-style Stepper (Reference Image 2) */}
      <div className="workday-stepper-wrap">
        <ol className="workday-stepper">
          <div className="stepper-track-bg" />
          <div
            className="stepper-track-fill"
            style={{ width: `${(step - 1) * (100 / 6)}%` }}
          />
          {STEPS.map((s) => {
            const isCompleted = step > s.id;
            const isActive = step === s.id;
            return (
              <li
                key={s.id}
                className={`workday-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => { setErrors({}); setStep(s.id); }}
              >
                <div className="step-circle">{isCompleted ? '✓' : s.id}</div>
                <span className="step-label">{s.label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Mode Notification Banner */}
      <div className="mode-banner">
        <div className="mode-info">
          <div className="mode-text">
            <h4>{mode === 'uae_pass' ? 'UAE PASS & Malaffi Synchronized' : 'Manual Intake Entry'}</h4>
            <p>
              {mode === 'uae_pass'
                ? 'Data retrieved from verified civil identity and synthetic health exchange records.'
                : 'Enter patient information, medical history, and family pedigree manually.'}
            </p>
          </div>
        </div>
        <Badge tone={mode === 'uae_pass' ? 'green' : 'grey'}>
          {mode === 'uae_pass' ? 'Auto-Filled via UAE PASS' : 'Manual Entry'}
        </Badge>
      </div>

      {/* Step Content */}
      <div className="sheet-step-container">
        <div className="sheet-step-header">
          <h2>{STEPS[step - 1].label}</h2>
          <span className="sheet-step-badge">Step {step} of {STEPS.length}</span>
        </div>
          {/* STEP 1: PERSONAL DETAILS */}
          {step === 1 && (
            <div className="form-section">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Full Legal Name (English) <span className="req">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={personal.fullName}
                    onChange={(e) => {
                      setPersonal({ ...personal, fullName: e.target.value });
                      if (e.target.value) setErrors((prev) => ({ ...prev, fullName: null }));
                    }}
                    disabled={mode === 'uae_pass'}
                  />
                  {errors.fullName && <span className="field-error">* {errors.fullName}</span>}
                  {mode === 'uae_pass' && <span className="form-hint">Verified via UAE PASS</span>}
                </div>
                <div className="form-group">
                  <label>Full Name (Arabic) <span className="req">*</span></label>
                  <input
                    type="text"
                    dir="rtl"
                    className="form-control"
                    value={personal.fullNameAr}
                    onChange={(e) => setPersonal({ ...personal, fullNameAr: e.target.value })}
                    disabled={mode === 'uae_pass'}
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Emirates ID <span className="req">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={personal.emiratesId}
                    onChange={(e) => {
                      setPersonal({ ...personal, emiratesId: e.target.value });
                      if (e.target.value) setErrors((prev) => ({ ...prev, emiratesId: null }));
                    }}
                    disabled={mode === 'uae_pass'}
                  />
                  {errors.emiratesId && <span className="field-error">* {errors.emiratesId}</span>}
                </div>
                <div className="form-group">
                  <label>Date of Birth <span className="req">*</span></label>
                  <input
                    type="date"
                    className="form-control"
                    value={personal.dob}
                    onChange={(e) => {
                      setPersonal({ ...personal, dob: e.target.value });
                      if (e.target.value) setErrors((prev) => ({ ...prev, dob: null }));
                    }}
                    disabled={mode === 'uae_pass'}
                  />
                  {errors.dob && <span className="field-error">* {errors.dob}</span>}
                </div>
                <div className="form-group">
                  <label>Biological Sex <span className="req">*</span></label>
                  <select
                    className="form-control"
                    value={personal.gender}
                    onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}
                    disabled={mode === 'uae_pass'}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={personal.phone}
                    onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    value={personal.email}
                    onChange={(e) => setPersonal({ ...personal, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>City / Emirate</label>
                  <select
                    className="form-control"
                    value={personal.city}
                    onChange={(e) => setPersonal({ ...personal, city: e.target.value })}
                  >
                    <option value="Abu Dhabi">Abu Dhabi</option>
                    <option value="Dubai">Dubai</option>
                    <option value="Sharjah">Sharjah</option>
                    <option value="Ajman">Ajman</option>
                    <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                    <option value="Fujairah">Fujairah</option>
                    <option value="Umm Al Quwain">Umm Al Quwain</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: HEALTH & MEDICAL RECORDS */}
          {step === 2 && (
            <div className="form-section">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Blood Group & Rh Factor</label>
                  <select
                    className="form-control"
                    value={medical.bloodGroup}
                    onChange={(e) => setMedical({ ...medical, bloodGroup: e.target.value })}
                  >
                    <option value="O+">O Positive (O+)</option>
                    <option value="O-">O Negative (O-)</option>
                    <option value="A+">A Positive (A+)</option>
                    <option value="A-">A Negative (A-)</option>
                    <option value="B+">B Positive (B+)</option>
                    <option value="B-">B Negative (B-)</option>
                    <option value="AB+">AB Positive (AB+)</option>
                    <option value="AB-">AB Negative (AB-)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Known Chronic or Blood Conditions</label>
                  <input
                    type="text"
                    className="form-control"
                    value={medical.conditions}
                    placeholder="e.g. Iron deficiency anemia, G6PD, Asthma"
                    onChange={(e) => setMedical({ ...medical, conditions: e.target.value })}
                  />
                  <span className="form-hint">Synthetic EHR records from Malaffi HIE</span>
                </div>
              </div>

              <div className="form-group">
                <label>Current Medications & Supplements</label>
                <input
                  type="text"
                  className="form-control"
                  value={medical.medications}
                  placeholder="e.g. Folic acid supplements, inhaler"
                  onChange={(e) => setMedical({ ...medical, medications: e.target.value })}
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Surgical History / Recent Hospitalizations</label>
                  <textarea
                    rows="3"
                    className="form-control"
                    value={medical.surgeries}
                    placeholder="List any major surgeries or hospitalizations..."
                    onChange={(e) => setMedical({ ...medical, surgeries: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Allergies (Medications / Foods)</label>
                  <textarea
                    rows="3"
                    className="form-control"
                    value={medical.allergies}
                    placeholder="e.g. Penicillin, Fava beans (Favism), Nuts"
                    onChange={(e) => setMedical({ ...medical, allergies: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FAMILY HISTORY TABLE (Image 2 style) */}
          {step === 3 && (
            <div className="form-section">
              <p className="muted" style={{ margin: '0 0 8px' }}>
                Document blood relatives to help clinicians evaluate background hereditary health patterns.
              </p>

              <div className="table-family-wrap">
                <table className="table-family">
                  <thead>
                    <tr>
                      <th style={{ width: '28%' }}>Relation</th>
                      <th style={{ width: '36%' }}>Health conditions</th>
                      <th style={{ width: '30%' }}>Family history of cancer</th>
                      <th style={{ width: '6%', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {family.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <select
                            className="form-control"
                            value={row.relation}
                            onChange={(e) => updateFamilyRow(row.id, 'relation', e.target.value)}
                          >
                            {RELATIONS.map((rel) => (
                              <option key={rel} value={rel}>{rel}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            value={row.condition}
                            placeholder="e.g. Beta-thalassaemia trait, Diabetes"
                            onChange={(e) => updateFamilyRow(row.id, 'condition', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            value={row.cancerHistory}
                            placeholder="e.g. None, Breast cancer (age 50)"
                            onChange={(e) => updateFamilyRow(row.id, 'cancerHistory', e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-trash"
                            title="Remove row"
                            aria-label="Remove row"
                            onClick={() => removeFamilyRow(row.id)}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <button type="button" className="btn-add-row" onClick={addFamilyRow}>
                  + Add Row
                </button>
              </div>

              <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
                <label style={{ fontSize: 14, fontWeight: 700, display: 'block', marginBottom: 8 }}>
                  Consanguinity & Family Relationship
                </label>
                <div className="radio-cards">
                  <label className={`radio-card ${compliance.isConsanguineous === 'yes' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="consanguinity"
                      value="yes"
                      checked={compliance.isConsanguineous === 'yes'}
                      onChange={() => setCompliance({ ...compliance, isConsanguineous: 'yes' })}
                    />
                    <div className="radio-card-content">
                      <strong>Yes, we are related</strong>
                      <small>e.g. First or second cousins (shared grandparents or great-grandparents)</small>
                    </div>
                  </label>
                  <label className={`radio-card ${compliance.isConsanguineous === 'no' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="consanguinity"
                      value="no"
                      checked={compliance.isConsanguineous === 'no'}
                      onChange={() => setCompliance({ ...compliance, isConsanguineous: 'no', relationToPartner: 'None' })}
                    />
                    <div className="radio-card-content">
                      <strong>No known biological relation</strong>
                      <small>From different families with no known common ancestors</small>
                    </div>
                  </label>
                </div>
                {compliance.isConsanguineous === 'yes' && (
                  <div className="form-group" style={{ marginTop: 14 }}>
                    <label>How are you related to {partner.name}?</label>
                    <input
                      type="text"
                      className="form-control"
                      value={compliance.relationToPartner}
                      placeholder="e.g. Second cousins (maternal grandmothers are sisters)"
                      onChange={(e) => setCompliance({ ...compliance, relationToPartner: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: COMPLIANCE & PREGNANCY TRIAGE Q&A */}
          {step === 4 && (
            <div className="form-section">
              <div>
                <label style={{ fontSize: 14, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                  Active Pregnancy Declaration <span className="req">*</span>
                </label>
                <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
                  Declaring pregnancy triggers expedited clinical triage so prenatal diagnostic windows
                  (10–13 weeks for CVS, 15–20 weeks for amniocentesis) are never missed.
                </p>
                <div className="radio-cards">
                  <label className={`radio-card ${compliance.isPregnant === 'yes' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="pregnancy"
                      value="yes"
                      checked={compliance.isPregnant === 'yes'}
                      onChange={() => setCompliance({ ...compliance, isPregnant: 'yes' })}
                    />
                    <div className="radio-card-content">
                      <strong>Yes, currently pregnant</strong>
                      <small>Time-sensitive case &mdash; routed directly to Tier 1 Urgent clinical queue</small>
                    </div>
                  </label>
                  <label className={`radio-card ${compliance.isPregnant === 'no' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="pregnancy"
                      value="no"
                      checked={compliance.isPregnant === 'no'}
                      onChange={() => setCompliance({ ...compliance, isPregnant: 'no', gestationalWeeks: '' })}
                    />
                    <div className="radio-card-content">
                      <strong>No current pregnancy</strong>
                      <small>Standard pre-marital or preconception pathway</small>
                    </div>
                  </label>
                </div>
                {compliance.isPregnant === 'yes' && (
                  <div className="form-group" style={{ marginTop: 14 }}>
                    <label>Gestational Age (in weeks) <span className="req">*</span></label>
                    <input
                      type="number"
                      min="1"
                      max="40"
                      className="form-control"
                      style={{ maxWidth: 220 }}
                      placeholder="e.g. 11"
                      value={compliance.gestationalWeeks}
                      onChange={(e) => {
                        setCompliance({ ...compliance, gestationalWeeks: e.target.value });
                        if (e.target.value) setErrors((prev) => ({ ...prev, gestationalWeeks: null }));
                      }}
                    />
                    {errors.gestationalWeeks && <span className="field-error">* {errors.gestationalWeeks}</span>}
                    <span className="form-hint" style={{ color: 'var(--red)', fontWeight: 600 }}>
                      [Priority Notice] Urgent clinical escalation will be flagged for Dr. Mariam Al Hosani.
                    </span>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Target Wedding Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={compliance.weddingDate}
                      onChange={(e) => setCompliance({ ...compliance, weddingDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Have you had prior premarital screening?</label>
                    <select
                      className="form-control"
                      value={compliance.previousScreening}
                      onChange={(e) => setCompliance({ ...compliance, previousScreening: e.target.value })}
                    >
                      <option value="no">No, this is my first test</option>
                      <option value="yes">Yes, previously screened</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: GRANULAR CONSENT & REGULATORY AUTHORIZATION */}
          {step === 5 && (
            <div className="form-section">
              <p className="muted" style={{ margin: '0 0 14px' }}>
                In accordance with <b>Federal Decree-Law No. 49 of 2023 on the Human Genome</b> and the UAE Personal Data Protection Law (PDPL), your consent is specific, informed, and revocable at any time.
              </p>

              <label className={`consent-item ${consent.malaffiSync ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={consent.malaffiSync}
                  onChange={(e) => setConsent({ ...consent, malaffiSync: e.target.checked })}
                />
                <div className="consent-item-text">
                  <h4>1. Authorize Malaffi Genetic Data Retrieval</h4>
                  <p>
                    I authorize DaNA to securely retrieve and parse my 570-gene premarital screening report from the Malaffi Health Information Exchange.
                  </p>
                </div>
              </label>

              <label className={`consent-item ${consent.partnerShare ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={consent.partnerShare}
                  onChange={(e) => setConsent({ ...consent, partnerShare: e.target.checked })}
                />
                <div className="consent-item-text">
                  <h4>2. Authorize Bilateral Partner Variant Matching</h4>
                  <p>
                    I consent to cross-matching my genetic screening findings with <b>{partner.name}</b> exclusively to calculate shared reproductive risks. Neither partner gains unrestricted access to the other’s medical record.
                  </p>
                </div>
              </label>

              <label className={`consent-item ${consent.counsellorAccess ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={consent.counsellorAccess}
                  onChange={(e) => setConsent({ ...consent, counsellorAccess: e.target.checked })}
                />
                <div className="consent-item-text">
                  <h4>3. Grant Clinical Dossier Access to Licensed Counsellor</h4>
                  <p>
                    I grant permission for assigned Department of Health genetic counsellors (e.g. Dr. Mariam Al Hosani) to view my summary for consultations.
                  </p>
                </div>
              </label>

              <label className={`consent-item ${consent.anonymizedResearch ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={consent.anonymizedResearch}
                  onChange={(e) => setConsent({ ...consent, anonymizedResearch: e.target.checked })}
                />
                <div className="consent-item-text">
                  <h4>4. De-Identified Public Health Research (Optional)</h4>
                  <p>
                    I allow my de-identified, aggregated screening results to inform national UAE genome public health analytics under strict <i>k</i>-anonymity rules.
                  </p>
                </div>
              </label>

              <div className="disclaimer">
                Note: You may revoke any of these consents independently from the <b>Privacy</b> tab. Revocation immediately terminates partner sharing.
              </div>
            </div>
          )}

          {/* STEP 6: VERIFY & SUBMIT */}
          {step === 6 && (
            <div className="form-section">
              <p className="muted" style={{ margin: '0 0 16px' }}>
                Please review your intake details before final submission.
              </p>

              <div className="review-block">
                <div className="review-block-h">
                  <h3>Personal Information</h3>
                  <button type="button" className="link" onClick={() => setStep(1)}>Edit</button>
                </div>
                <div className="review-grid">
                  <div><span>Full Name</span><b>{personal.fullName} ({personal.fullNameAr})</b></div>
                  <div><span>Emirates ID</span><b>{personal.emiratesId}</b></div>
                  <div><span>Date of Birth / Sex</span><b>{personal.dob} · {personal.gender}</b></div>
                  <div><span>Contact</span><b>{personal.phone} · {personal.city}</b></div>
                </div>
              </div>

              <div className="review-block">
                <div className="review-block-h">
                  <h3>Medical & Surgical History</h3>
                  <button type="button" className="link" onClick={() => setStep(2)}>Edit</button>
                </div>
                <div className="review-grid">
                  <div><span>Blood Group</span><b>{medical.bloodGroup}</b></div>
                  <div><span>Conditions</span><b>{medical.conditions || 'None'}</b></div>
                  <div><span>Surgeries</span><b>{medical.surgeries || 'None'}</b></div>
                  <div><span>Allergies</span><b>{medical.allergies || 'None'}</b></div>
                </div>
              </div>

              <div className="review-block">
                <div className="review-block-h">
                  <h3>Family History & Kinship</h3>
                  <button type="button" className="link" onClick={() => setStep(3)}>Edit</button>
                </div>
                <div style={{ fontSize: 13.5, marginBottom: 8 }}>
                  <b>Consanguinity:</b> {compliance.isConsanguineous === 'yes' ? `Related (${compliance.relationToPartner})` : 'No known relation'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink2)' }}>
                  {family.length} relative(s) documented: {family.map((f) => `${f.relation} (${f.condition})`).join(', ')}
                </div>
              </div>

              <div className="review-block">
                <div className="review-block-h">
                  <h3>Triage & Legal Consent</h3>
                  <button type="button" className="link" onClick={() => setStep(5)}>Edit</button>
                </div>
                <div className="review-grid">
                  <div><span>Active Pregnancy</span><b>{compliance.isPregnant === 'yes' ? `Yes (${compliance.gestationalWeeks} wks)` : 'No'}</b></div>
                  <div><span>Target Wedding</span><b>{compliance.weddingDate}</b></div>
                  <div><span>Malaffi Data Sync</span><b>{consent.malaffiSync ? '✓ Granted' : '✗ Withheld'}</b></div>
                  <div><span>Partner Matching</span><b>{consent.partnerShare ? '✓ Granted' : '✗ Withheld'}</b></div>
                </div>
              </div>

              <label
                className={`consent-item ${certified ? 'checked' : ''} ${errors.certified ? 'error' : ''}`}
                style={{ marginTop: 12 }}
              >
                <input
                  type="checkbox"
                  checked={certified}
                  onChange={(e) => {
                    setCertified(e.target.checked);
                    if (e.target.checked) setErrors((prev) => ({ ...prev, certified: null }));
                  }}
                />
                <div className="consent-item-text">
                  <h4>Certification & Electronic Signature</h4>
                  <p>
                    I, <b>{personal.fullName}</b>, certify that all information submitted in this premarital screening intake is true, accurate, and complete.
                  </p>
                </div>
              </label>
              {errors.certified && (
                <div className="field-error-msg">
                  * {errors.certified}
                </div>
              )}
            </div>
          )}

          {/* Stepper Navigation Actions */}
          <div className="wizard-footer">
            <div>
              {step > 1 && (
                <button type="button" className="ghost" onClick={() => { setErrors({}); setStep(step - 1); }}>
                  ← Back
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {step < STEPS.length ? (
                <button type="button" className="btn" onClick={handleContinue}>
                  Continue to {STEPS[step].label} →
                </button>
              ) : (
                <button
                  type="button"
                  className="btn"
                  style={{ background: 'var(--green)', padding: '12px 24px', fontSize: 15 }}
                  onClick={handleSubmit}
                >
                  Submit Premarital Screening Intake
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}

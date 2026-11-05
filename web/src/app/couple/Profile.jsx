import { useState, useEffect } from 'react';
import { Page, Card, Badge } from '../shared/ui.jsx';
import { useCouple } from './useCouple.js';
import { SYNTHETIC_INTAKES } from '../shared/data.js';
import { set, useStore, EMPTY_OBJ } from '../shared/store.js';
import { go } from '../shared/router.js';
import { EditIcon, CheckIcon } from '../shared/Icons.jsx';
import AvatarPicker from '../shared/AvatarPicker.jsx';
import { setMySex } from '../shared/db.js';
import { PEOPLE } from '../shared/data.js';
import { Avatar } from '../shared/ui.jsx';

const RELATIONS = [
  'Mother', 'Father', 'Brother', 'Sister',
  'Maternal Grandfather', 'Maternal Grandmother',
  'Paternal Grandfather', 'Paternal Grandmother',
  'Maternal Uncle', 'Maternal Aunt',
  'Paternal Uncle', 'Paternal Aunt',
  'First Cousin (Paternal)', 'First Cousin (Maternal)',
  'Child', 'Other Relative'
];

export default function Profile() {
  const { me, partner, couple } = useCouple();
  const session = useStore((s) => s.session);
  const intakes = useStore((s) => s.screeningIntakes) || EMPTY_OBJ;
  const existingIntake = intakes[me.id];

  const isUaePass = session?.authMethod === 'uae_pass' || session?.via === 'uaepass';
  const fallback = SYNTHETIC_INTAKES[me.id] || SYNTHETIC_INTAKES.fatima;

  // Active intake profile data (falls back to synthetic if verified, or empty defaults)
  const basePersonal = existingIntake?.personal || (isUaePass ? fallback.personal : {
    fullName: session?.name || me.name || '',
    fullNameAr: '',
    emiratesId: '',
    dob: '',
    gender: 'Female',
    phone: '',
    email: session?.email || '',
    nationality: 'United Arab Emirates',
    city: 'Abu Dhabi',
  });

  const baseMedical = existingIntake?.medical || (isUaePass ? fallback.medical : {
    bloodGroup: 'O+',
    conditions: '',
    medications: '',
    surgeries: '',
    allergies: '',
  });

  const baseFamily = existingIntake?.family || (isUaePass ? fallback.family : [
    { id: 1, relation: 'Mother', condition: '', cancerHistory: '' },
    { id: 2, relation: 'Father', condition: '', cancerHistory: '' },
  ]);

  const baseCompliance = existingIntake?.compliance || (isUaePass ? fallback.compliance : {
    isPregnant: 'no',
    gestationalWeeks: '',
    isConsanguineous: 'no',
    relationToPartner: '',
    weddingDate: '',
    previousScreening: 'no',
  });

  const baseConsent = existingIntake?.consent || (isUaePass ? fallback.consent : {
    malaffiSync: isUaePass,
    partnerShare: true,
    counsellorAccess: true,
    anonymizedResearch: false,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [personal, setPersonal] = useState(basePersonal);
  const [medical, setMedical] = useState(baseMedical);
  const [family, setFamily] = useState(baseFamily);
  const [compliance, setCompliance] = useState(baseCompliance);
  const [consent, setConsent] = useState(baseConsent);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setPersonal(basePersonal);
    setMedical(baseMedical);
    setFamily(baseFamily);
    setCompliance(baseCompliance);
    setConsent(baseConsent);
  }, [existingIntake, me.id]);

  const handleSave = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!personal.fullName?.trim()) newErrors.fullName = 'Full name is required';
    if (!personal.emiratesId?.trim()) newErrors.emiratesId = 'Emirates ID is required';
    if (!personal.phone?.trim()) newErrors.phone = 'Mobile number is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const updatedPayload = {
      ...(existingIntake || {}),
      completed: true,
      mode: existingIntake?.mode || (isUaePass ? 'uae_pass' : 'manual'),
      submittedAt: existingIntake?.submittedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      personal,
      medical,
      family,
      compliance,
      consent,
    };

    set((s) => ({
      screeningIntakes: {
        ...(s.screeningIntakes || {}),
        [me.id]: updatedPayload,
      },
    }), `User ${me.name} updated health profile & screening data`);

    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4500);
  };

  const handleCancel = () => {
    setPersonal(basePersonal);
    setMedical(baseMedical);
    setFamily(baseFamily);
    setCompliance(baseCompliance);
    setConsent(baseConsent);
    setErrors({});
    setIsEditing(false);
  };

  const addFamilyMember = () => {
    setFamily([
      ...family,
      { id: Date.now(), relation: 'Sibling', condition: '', cancerHistory: '' },
    ]);
  };

  const updateFamilyMember = (id, field, value) => {
    setFamily(family.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const removeFamilyMember = (id) => {
    if (family.length <= 1) return;
    setFamily(family.filter((f) => f.id !== id));
  };

  const isIntakeCompleted = !!existingIntake?.completed;
  const account = useStore((s) => s.session) || {};
  const [mySex, setMySexState] = useState(PEOPLE[account.id]?.sex || '');
  const [sexErr, setSexErr] = useState('');

  return (
    <Page
      title="Profile & Health Data"
      sub="Manage your personal identification, clinical medical records, pedigree, and privacy consents."
      actions={
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {!isEditing ? (
            <button
              type="button"
              className="btn"
              onClick={() => setIsEditing(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <EditIcon />
              Edit Profile & Health Data
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn"
                onClick={handleSave}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <CheckIcon />
                Save Changes
              </button>
              <button type="button" className="ghost" onClick={handleCancel}>
                Cancel
              </button>
            </>
          )}
        </div>
      }
    >
      {saveSuccess && (
        <div
          style={{
            background: 'var(--green-l)',
            color: 'var(--green)',
            border: '1px solid var(--green)',
            borderRadius: 12,
            padding: '12px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          <CheckIcon />
          Health profile and screening intake data saved successfully.
        </div>
      )}

      <Card title="Profile picture">
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Avatar name={account.name} size={64} icon={account.avatar} />
          <div style={{ flex: 1, minWidth: 220 }}><AvatarPicker session={account} /></div>
        </div>
      </Card>

      {account.backend && !account.needsProfile && (
        <Card title="About you">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>I am</span>
            <div className="seg" role="radiogroup" aria-label="I am" style={{ marginBottom: 0 }}>
              {[['F', 'Female'], ['M', 'Male']].map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={mySex === v} className={mySex === v ? 'on' : ''}
                  onClick={async () => { if (v === mySex) return; setSexErr(''); try { await setMySex(v); setMySexState(v); } catch (e) { setSexErr(e.message); } }}>{l}</button>
              ))}
            </div>
            <small className="muted">Used to read your result and to find your partner. Locked once you are linked.</small>
          </div>
          {sexErr && <p className="err">{sexErr}</p>}
        </Card>
      )}

      {/* Profile Overview Card */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--green-l)',
              color: 'var(--green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              fontWeight: 700,
              fontFamily: 'var(--head)',
              flexShrink: 0,
            }}
          >
            {me.short ? me.short.slice(0, 2).toUpperCase() : 'PA'}
          </div>

          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{personal.fullName || me.name}</h2>
              {personal.fullNameAr && (
                <span style={{ fontSize: 18, color: 'var(--ink2)', direction: 'rtl' }}>{personal.fullNameAr}</span>
              )}
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
              Emirates ID: <b>{personal.emiratesId || 'Not specified'}</b> · Partnered with <b>{partner.name}</b>
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <Badge tone={isIntakeCompleted ? 'green' : 'amber'}>
              {isIntakeCompleted
                ? (existingIntake?.mode === 'uae_pass' ? 'UAE PASS Verified' : 'Self-Reported')
                : 'Intake Pending'}
            </Badge>
            <span style={{ fontSize: 12, color: 'var(--ink3)' }}>
              {existingIntake?.updatedAt
                ? `Last modified: ${new Date(existingIntake.updatedAt).toLocaleDateString('en-GB')}`
                : existingIntake?.submittedAt
                  ? `Submitted: ${new Date(existingIntake.submittedAt).toLocaleDateString('en-GB')}`
                  : 'Sync via Profile'}
            </span>
          </div>
        </div>
      </Card>

      {/* Form Content */}
      <form onSubmit={handleSave}>
        <div className="grid2">
          {/* Section 1: Personal & Identification */}
          <Card title="Personal & Contact Info">
            <div className="form-grid" style={{ display: 'grid', gap: 14 }}>
              <div>
                <label className="field-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                  Full Legal Name (English)
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={personal.fullName}
                    onChange={(e) => setPersonal({ ...personal, fullName: e.target.value })}
                    className="input"
                    style={{ width: '100%' }}
                  />
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{personal.fullName || '—'}</div>
                )}
                {errors.fullName && <div className="field-error-msg">{errors.fullName}</div>}
              </div>

              <div>
                <label className="field-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                  Arabic Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={personal.fullNameAr}
                    onChange={(e) => setPersonal({ ...personal, fullNameAr: e.target.value })}
                    className="input"
                    style={{ width: '100%', direction: 'rtl' }}
                    placeholder="الاسم الكامل بالعربية"
                  />
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 500, direction: 'rtl', textAlign: 'left' }}>
                    {personal.fullNameAr || '—'}
                  </div>
                )}
              </div>

              <div className="grid2" style={{ margin: 0, gap: 12 }}>
                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                    Emirates ID
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={personal.emiratesId}
                      onChange={(e) => setPersonal({ ...personal, emiratesId: e.target.value })}
                      className="input"
                      placeholder="784-YYYY-XXXXXXX-Z"
                      style={{ width: '100%' }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{personal.emiratesId || '—'}</div>
                  )}
                  {errors.emiratesId && <div className="field-error-msg">{errors.emiratesId}</div>}
                </div>

                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                    Date of Birth
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={personal.dob}
                      onChange={(e) => setPersonal({ ...personal, dob: e.target.value })}
                      className="input"
                      style={{ width: '100%' }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{personal.dob || '—'}</div>
                  )}
                </div>
              </div>

              <div className="grid2" style={{ margin: 0, gap: 12 }}>
                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                    Gender
                  </label>
                  {isEditing ? (
                    <select
                      value={personal.gender}
                      onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}
                      className="input"
                      style={{ width: '100%' }}
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{personal.gender || '—'}</div>
                  )}
                </div>

                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                    City / Emirate
                  </label>
                  {isEditing ? (
                    <select
                      value={personal.city}
                      onChange={(e) => setPersonal({ ...personal, city: e.target.value })}
                      className="input"
                      style={{ width: '100%' }}
                    >
                      <option value="Abu Dhabi">Abu Dhabi</option>
                      <option value="Al Ain">Al Ain</option>
                      <option value="Al Dhafra">Al Dhafra</option>
                      <option value="Dubai">Dubai</option>
                      <option value="Sharjah">Sharjah</option>
                      <option value="Ajman">Ajman</option>
                      <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                      <option value="Fujairah">Fujairah</option>
                    </select>
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{personal.city || '—'}</div>
                  )}
                </div>
              </div>

              <div className="grid2" style={{ margin: 0, gap: 12 }}>
                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                    Mobile Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={personal.phone}
                      onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
                      className="input"
                      placeholder="+971 50 000 0000"
                      style={{ width: '100%' }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{personal.phone || '—'}</div>
                  )}
                  {errors.phone && <div className="field-error-msg">{errors.phone}</div>}
                </div>

                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                    Email Address
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={personal.email}
                      onChange={(e) => setPersonal({ ...personal, email: e.target.value })}
                      className="input"
                      placeholder="user@example.ae"
                      style={{ width: '100%' }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{personal.email || '—'}</div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Section 2: Clinical & Health History */}
          <Card title="Medical & Clinical History">
            <div className="form-grid" style={{ display: 'grid', gap: 14 }}>
              <div>
                <label className="field-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                  Blood Group & Rh Factor
                </label>
                {isEditing ? (
                  <select
                    value={medical.bloodGroup}
                    onChange={(e) => setMedical({ ...medical, bloodGroup: e.target.value })}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    <Badge tone="grey">{medical.bloodGroup || 'Not tested'}</Badge>
                  </div>
                )}
              </div>

              <div>
                <label className="field-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                  Known Health Conditions
                </label>
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={medical.conditions}
                    onChange={(e) => setMedical({ ...medical, conditions: e.target.value })}
                    className="input"
                    placeholder="e.g. Mild iron-deficiency anemia, G6PD deficiency, or None"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{medical.conditions || 'None reported'}</div>
                )}
              </div>

              <div>
                <label className="field-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                  Regular Medications & Supplements
                </label>
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={medical.medications}
                    onChange={(e) => setMedical({ ...medical, medications: e.target.value })}
                    className="input"
                    placeholder="e.g. Folic acid (0.4mg daily), or None"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{medical.medications || 'None'}</div>
                )}
              </div>

              <div>
                <label className="field-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                  Past Surgeries & Hospitalizations
                </label>
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={medical.surgeries}
                    onChange={(e) => setMedical({ ...medical, surgeries: e.target.value })}
                    className="input"
                    placeholder="e.g. Appendectomy in 2018 at Cleveland Clinic Abu Dhabi, or None"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{medical.surgeries || 'None'}</div>
                )}
              </div>

              <div>
                <label className="field-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                  Allergies (Medications / Food / Environmental)
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={medical.allergies}
                    onChange={(e) => setMedical({ ...medical, allergies: e.target.value })}
                    className="input"
                    placeholder="e.g. Penicillin, Pollen, or None"
                    style={{ width: '100%' }}
                  />
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{medical.allergies || 'None'}</div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Section 3: Family Pedigree & Consanguinity */}
        <Card title="Family Pedigree & Consanguinity" style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 18 }}>
            <label className="field-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
              Consanguinity with Partner ({partner.name})
            </label>
            {isEditing ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', gap: 18 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <input
                      type="radio"
                      name="isConsanguineous"
                      value="yes"
                      checked={compliance.isConsanguineous === 'yes'}
                      onChange={() => setCompliance({ ...compliance, isConsanguineous: 'yes' })}
                    />
                    Yes, related by blood
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <input
                      type="radio"
                      name="isConsanguineous"
                      value="no"
                      checked={compliance.isConsanguineous === 'no'}
                      onChange={() => setCompliance({ ...compliance, isConsanguineous: 'no', relationToPartner: '' })}
                    />
                    No, unrelated
                  </label>
                </div>
                {compliance.isConsanguineous === 'yes' && (
                  <input
                    type="text"
                    value={compliance.relationToPartner}
                    onChange={(e) => setCompliance({ ...compliance, relationToPartner: e.target.value })}
                    className="input"
                    placeholder="e.g. Second cousin (Maternal grandmothers are sisters)"
                    style={{ width: '100%' }}
                  />
                )}
              </div>
            ) : (
              <div style={{ fontSize: 14, fontWeight: 500 }}>
                {compliance.isConsanguineous === 'yes'
                  ? `Consanguineous · ${compliance.relationToPartner || 'Related by blood'}`
                  : 'Unrelated'}
              </div>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label className="field-label" style={{ fontSize: 13, fontWeight: 600 }}>
                Family Members with Known Conditions
              </label>
              {isEditing && (
                <button
                  type="button"
                  onClick={addFamilyMember}
                  className="link"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  + Add Relative
                </button>
              )}
            </div>

            <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ background: '#F8F9FA', borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 600, width: '28%' }}>Relationship</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, width: '36%' }}>Genetic or Chronic Condition</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, width: '28%' }}>Cancer History</th>
                    {isEditing && <th style={{ padding: '8px 12px', width: '8%', textAlign: 'center' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {family.map((f) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '8px 12px' }}>
                        {isEditing ? (
                          <select
                            value={f.relation}
                            onChange={(e) => updateFamilyMember(f.id, 'relation', e.target.value)}
                            className="input"
                            style={{ width: '100%', padding: '4px 8px' }}
                          >
                            {RELATIONS.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        ) : (
                          <b>{f.relation}</b>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={f.condition}
                            onChange={(e) => updateFamilyMember(f.id, 'condition', e.target.value)}
                            className="input"
                            placeholder="e.g. Beta-thalassaemia trait"
                            style={{ width: '100%', padding: '4px 8px' }}
                          />
                        ) : (
                          <span>{f.condition || 'None reported'}</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={f.cancerHistory}
                            onChange={(e) => updateFamilyMember(f.id, 'cancerHistory', e.target.value)}
                            className="input"
                            placeholder="e.g. None or Colorectal (age 72)"
                            style={{ width: '100%', padding: '4px 8px' }}
                          />
                        ) : (
                          <span>{f.cancerHistory || 'None'}</span>
                        )}
                      </td>
                      {isEditing && (
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => removeFamilyMember(f.id)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}
                            title="Remove relative"
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Section 4: Consents & Malaffi Connectivity */}
        <Card title="Privacy, Consent & Exchange Settings" style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div>
                <b style={{ fontSize: 14, display: 'block' }}>Malaffi Health Information Exchange Sync</b>
                <small style={{ color: 'var(--ink2)' }}>
                  Permit Abu Dhabi Department of Health (DoH) Malaffi records to securely cross-verify blood traits.
                </small>
              </div>
              <div>
                {isEditing ? (
                  <input
                    type="checkbox"
                    checked={consent.malaffiSync}
                    onChange={(e) => setConsent({ ...consent, malaffiSync: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: 'var(--green)' }}
                  />
                ) : (
                  <Badge tone={consent.malaffiSync ? 'green' : 'grey'}>
                    {consent.malaffiSync ? 'Connected' : 'Disconnected'}
                  </Badge>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div>
                <b style={{ fontSize: 14, display: 'block' }}>Partner Result Sharing</b>
                <small style={{ color: 'var(--ink2)' }}>
                  Share joint compatibility results and recommended care options with fiancé/fiancée ({partner.name}).
                </small>
              </div>
              <div>
                {isEditing ? (
                  <input
                    type="checkbox"
                    checked={consent.partnerShare}
                    onChange={(e) => setConsent({ ...consent, partnerShare: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: 'var(--green)' }}
                  />
                ) : (
                  <Badge tone={consent.partnerShare ? 'green' : 'amber'}>
                    {consent.partnerShare ? 'Authorized' : 'Restricted'}
                  </Badge>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div>
                <b style={{ fontSize: 14, display: 'block' }}>Assigned Genetic Counsellor Access</b>
                <small style={{ color: 'var(--ink2)' }}>
                  Allow licensed DoH medical genetic counsellors to review your pedigree and discuss reproductive choices.
                </small>
              </div>
              <div>
                {isEditing ? (
                  <input
                    type="checkbox"
                    checked={consent.counsellorAccess}
                    onChange={(e) => setConsent({ ...consent, counsellorAccess: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: 'var(--green)' }}
                  />
                ) : (
                  <Badge tone={consent.counsellorAccess ? 'green' : 'amber'}>
                    {consent.counsellorAccess ? 'Authorized' : 'Restricted'}
                  </Badge>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <div>
                <b style={{ fontSize: 14, display: 'block' }}>Anonymized Genomic Research Participation</b>
                <small style={{ color: 'var(--ink2)' }}>
                  Contribute de-identified variant data to UAE National Genomic Studies under strict ethical review.
                </small>
              </div>
              <div>
                {isEditing ? (
                  <input
                    type="checkbox"
                    checked={consent.anonymizedResearch}
                    onChange={(e) => setConsent({ ...consent, anonymizedResearch: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: 'var(--green)' }}
                  />
                ) : (
                  <Badge tone={consent.anonymizedResearch ? 'green' : 'grey'}>
                    {consent.anonymizedResearch ? 'Enrolled' : 'Opted Out'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Wizard Rerun Banner */}
        <div
          style={{
            marginTop: 24,
            padding: '16px 20px',
            background: '#F8F9FA',
            border: '1px dashed var(--line)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Need to redo the full guided intake?</div>
            <div style={{ fontSize: 13, color: 'var(--ink2)' }}>
              You can reopen the complete step-by-step premarital screening wizard at any time.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="ghost"
              onClick={() => go('/app/report')}
              style={{ fontSize: 13 }}
            >
              View Medical Report →
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => go('/app/screening')}
              style={{ fontSize: 13 }}
            >
              Open Guided Screening Wizard →
            </button>
          </div>
        </div>
      </form>
    </Page>
  );
}

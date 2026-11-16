import { useState, useEffect } from 'react';
import { Page, Card, Badge } from '../shared/ui.jsx';
import { useCouple } from './useCouple.js';
import { SYNTHETIC_INTAKES, generateDanaId } from '../shared/data.js';
import { set, useStore, EMPTY_OBJ } from '../shared/store.js';
import { saveScreeningIntake } from '../shared/db.js';
import { go } from '../shared/router.js';
import { EditIcon, CheckIcon } from '../shared/Icons.jsx';
import AvatarPicker from '../shared/AvatarPicker.jsx';
import { setMySex } from '../shared/db.js';
import { PEOPLE } from '../shared/data.js';
import { Avatar } from '../shared/ui.jsx';
import HomeLocation, { HomeLocationText } from '../shared/HomeLocation.jsx';
import FamilyPedigree from '../shared/FamilyPedigree.jsx';

export default function Profile() {
  const { me, partner, couple } = useCouple();
  const session = useStore((s) => s.session);
  const intakes = useStore((s) => s.screeningIntakes) || EMPTY_OBJ;
  const existingIntake = intakes[me.id];

  const isUaePass = session?.authMethod === 'uae_pass' || session?.via === 'uaepass' || session?.email?.endsWith('@dana.demo');
  const fallback = SYNTHETIC_INTAKES[me.id] || (me.sex === 'M' ? SYNTHETIC_INTAKES.khalid : SYNTHETIC_INTAKES.fatima);

  const authName = session?.name || session?.userMetadata?.full_name || session?.userMetadata?.name || me.name || '';
  const authEmail = session?.email || session?.userMetadata?.email || '';
  const authPhone = session?.phone || session?.userMetadata?.phone || '';

  // Active intake profile data (falls back to synthetic if verified, or empty defaults)
  const basePersonal = existingIntake?.personal || (isUaePass ? fallback.personal : {
    fullName: authName,
    fullNameAr: '',
    emiratesId: '',
    dob: '',
    gender: '',
    phone: authPhone,
    email: authEmail,
    nationality: 'United Arab Emirates',
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
    if (existingIntake) {
      setPersonal(existingIntake.personal || basePersonal);
      setMedical(existingIntake.medical || baseMedical);
      setFamily(existingIntake.family || baseFamily);
      setCompliance(existingIntake.compliance || baseCompliance);
      setConsent(existingIntake.consent || baseConsent);
    } else if (!isUaePass) {
      setPersonal((prev) => ({
        ...prev,
        fullName: prev.fullName || authName,
        email: prev.email || authEmail,
        phone: prev.phone || authPhone,
      }));
    } else {
      setPersonal(basePersonal);
      setMedical(baseMedical);
      setFamily(baseFamily);
      setCompliance(baseCompliance);
      setConsent(baseConsent);
    }
  }, [existingIntake, me.id, isUaePass, authName, authEmail, authPhone]);

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
    const assignedDanaId = existingIntake?.danaId || personal.danaId || generateDanaId(session?.id || me.id);
    const updatedPayload = {
      ...(existingIntake || {}),
      danaId: assignedDanaId,
      completed: true,
      mode: existingIntake?.mode || (isUaePass ? 'uae_pass' : 'manual'),
      submittedAt: existingIntake?.submittedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      personal: {
        ...personal,
        // sex comes from the account (About you); the home area lives in people.location_id
        gender: mySex === 'M' ? 'Male' : mySex === 'F' ? 'Female' : personal.gender,
        city: undefined,
        danaId: assignedDanaId,
      },
      medical,
      family,
      compliance,
      consent,
    };

    saveScreeningIntake(me.id, updatedPayload);

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

      {account.role === 'couple' && <HomeLocation />}

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
              DaNA ID: <b style={{ color: 'var(--green)', fontFamily: 'monospace' }}>{existingIntake?.danaId || personal.danaId || generateDanaId(session?.id || me.id)}</b> · Emirates ID: <b>{personal.emiratesId || 'Not specified'}</b> · Partner: <b>{partner.name}</b>
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <Badge tone="green">✓ Verified with UAE PASS</Badge>
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
                  <div className="pf-readonly"><b>{mySex === 'M' ? 'Male' : mySex === 'F' ? 'Female' : '—'}</b> <small>Set in About you</small></div>
                </div>

                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                    Where you live
                  </label>
                  <div className="pf-readonly"><b><HomeLocationText /></b> <small>Change it in Where you live</small></div>
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

        {/* Section 3: Family Pedigree & Consanguinity, from the person's answers and the Family Tree */}
        <div className="pf-gap"><FamilyPedigree me={me} partnerName={partner.name} /></div>

        <Card title="Sharing and consent" style={{ marginTop: 16 }}>
          <p className="muted" style={{ margin: '0 0 12px' }}>Who can see your result, who opened your data, and your Malaffi consent are all on one page.</p>
          <a className="btn-line" href="#/app/privacy">Open Privacy →</a>
        </Card>
      </form>
    </Page>
  );
}

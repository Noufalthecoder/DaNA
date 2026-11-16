/* Profile: who I am (from UAE PASS), where I live, my health details, my family and my picture.
   Each fact has one source and one place to change it:
   - identity: UAE PASS (read-only; corrected in UAE PASS)
   - where I live: people.location_id (the Where you live card)
   - health details: my screening intake (edited here)
   - family: the Details answers and the Family Tree (FamilyPedigree)
   Owner: Couple app. */
import { useEffect, useState } from 'react';
import { BadgeCheck, HeartPulse, IdCard, ShieldCheck, Pencil, MapPin, Users } from 'lucide-react';
import { Page, Card, Badge, Avatar, Accordion, Field, FieldGrid, FormRow, Notice, Skeleton } from '../shared/ui.jsx';
import { useCouple } from './useCouple.js';
import { PEOPLE } from '../shared/data.js';
import { danaIdFor } from '../shared/connectionsService.js';
import { useStore, EMPTY_OBJ } from '../shared/store.js';
import { saveScreeningIntake, myIdentity, setMySex } from '../shared/db.js';
import AvatarPicker from '../shared/AvatarPicker.jsx';
import HomeLocation, { HomeLocationText } from '../shared/HomeLocation.jsx';
import FamilyPedigree from '../shared/FamilyPedigree.jsx';
import './profile.css';

const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const EMPTY_MEDICAL = { bloodGroup: '', conditions: '', medications: '', surgeries: '', allergies: '' };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const fmtEid = (v) => {
  const d = String(v || '').replace(/\D/g, '');
  return d.length === 15 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 14)}-${d.slice(14)}` : v;
};
const sexLabel = (s) => (s === 'M' ? 'Male' : s === 'F' ? 'Female' : '');

export default function Profile() {
  const { me, partner, isConnected } = useCouple();
  const account = useStore((s) => s.session) || {};
  const intake = (useStore((s) => s.screeningIntakes) || EMPTY_OBJ)[me.id];

  // identity from UAE PASS (null until linked; undefined while loading)
  const [identity, setIdentity] = useState(undefined);
  useEffect(() => {
    let off = false;
    myIdentity().then((i) => { if (!off) setIdentity(i || null); }, () => { if (!off) setIdentity(null); });
    return () => { off = true; };
  }, [account.id]);

  const [sexChoice, setSexChoice] = useState('');
  const [sexErr, setSexErr] = useState('');
  const sex = identity?.sex || sexChoice || PEOPLE[me.id]?.sex || '';
  const danaId = danaIdFor(account.id || me.id); // the same DaNA ID as Connections and Details
  const name = identity?.full_name_en || account.name || me.name;
  const nameAr = identity?.full_name_ar || intake?.personal?.fullNameAr || '';

  // health details: the only part of the old intake still edited here
  const saved = { ...EMPTY_MEDICAL, ...(intake?.medical || {}) };
  const [editing, setEditing] = useState(false);
  const [medical, setMedical] = useState(saved);
  const [done, setDone] = useState(false);
  useEffect(() => { if (!editing) setMedical({ ...EMPTY_MEDICAL, ...(intake?.medical || {}) }); }, [intake, editing]);
  const up = (k) => (e) => setMedical((m) => ({ ...m, [k]: e.target.value }));

  const saveHealth = (e) => {
    e.preventDefault();
    const personal = {
      ...(intake?.personal || {}),
      // identity always mirrors UAE PASS, so no screen keeps an old typed value
      ...(identity ? {
        fullName: identity.full_name_en, emiratesId: identity.emirates_id, dob: identity.date_of_birth,
        phone: identity.mobile, email: identity.email, nationality: identity.nationality,
      } : {}),
      gender: sexLabel(sex) || intake?.personal?.gender || '',
      city: undefined,
      danaId,
    };
    saveScreeningIntake(me.id, {
      ...(intake || {}),
      danaId, completed: true,
      mode: intake?.mode || (identity ? 'uae_pass' : 'manual'),
      submittedAt: intake?.submittedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      personal, medical,
    });
    setEditing(false); setDone(true);
    setTimeout(() => setDone(false), 4000);
  };

  const chooseSex = async (v) => {
    setSexErr('');
    try { await setMySex(v); setSexChoice(v); } catch (err) { setSexErr(err.message); }
  };

  return (
    <Page title="Profile" sub="Your identity, where you live, your health details and your family, in one place.">
      {/* ---- who I am ---- */}
      <section className="pf-hero">
        <Avatar name={name} size={72} icon={account.avatar} />
        <div className="pf-hero-main">
          <div className="pf-hero-name">
            <h2>{name}</h2>
            {nameAr && <span dir="rtl" lang="ar">{nameAr}</span>}
          </div>
          <div className="pf-hero-meta">
            <span className="pf-chip"><IdCard size={14} /> DaNA ID <b className="is-mono">{danaId}</b></span>
            {isConnected && partner?.name && <span className="pf-chip"><Users size={14} /> Partner <b>{partner.name}</b></span>}
            <span className="pf-chip"><MapPin size={14} /> <HomeLocationText /></span>
          </div>
        </div>
        {identity
          ? <Badge tone="green"><BadgeCheck size={14} /> Verified with UAE PASS{identity.source === 'uaepass_simulated' ? ' (simulated)' : ''}</Badge>
          : identity === null && <Badge tone="amber">Not verified yet</Badge>}
      </section>

      {done && <Notice tone="ok" title="Saved.">Your health details are up to date.</Notice>}

      <div className="pf-cols">
        {/* ---- identity, read-only from UAE PASS ---- */}
        <Card title={<span className="pf-ct"><ShieldCheck size={17} /> Identity</span>}
          aside={identity ? <span className="pf-aside">From UAE PASS</span> : null}>
          {identity === undefined ? <Skeleton lines={4} /> : identity ? (
            <>
              <FieldGrid cols={2}>
                <Field label="Full name (English)" value={identity.full_name_en} />
                <Field label="Full name (Arabic)" value={nameAr} dir="rtl" />
                <Field label="Emirates ID" value={fmtEid(identity.emirates_id)} mono />
                <Field label="Date of birth" value={fmtDate(identity.date_of_birth)} />
                <Field label="Sex" value={sexLabel(sex)} />
                <Field label="Nationality" value={identity.nationality} />
                <Field label="Mobile" value={identity.mobile} mono />
                <Field label="Email" value={identity.email} />
              </FieldGrid>
              <p className="pf-note">These come from UAE PASS and cannot be changed in DaNA. To correct them, update UAE PASS.</p>
            </>
          ) : (
            <>
              <FieldGrid cols={2}>
                <Field label="Name" value={account.name} />
                <Field label="Email" value={account.email} />
              </FieldGrid>
              {account.backend && (
                <div className="pf-sex">
                  <span className="frow-l">I am</span>
                  <div className="seg" role="radiogroup" aria-label="I am">
                    {[['F', 'Female'], ['M', 'Male']].map(([v, l]) => {
                      const on = sex === v;
                      return <button key={v} type="button" role="radio" aria-checked={on} className={on ? 'on' : ''} onClick={() => !on && chooseSex(v)}>{l}</button>;
                    })}
                  </div>
                  {sexErr && <p className="err">{sexErr}</p>}
                </div>
              )}
              <Notice tone="info" title="Verify with UAE PASS">Your identity is filled in once you verify with UAE PASS.</Notice>
            </>
          )}
        </Card>

        {/* ---- health details, editable ---- */}
        <Card title={<span className="pf-ct"><HeartPulse size={17} /> Health details</span>}
          aside={!editing && <button type="button" className="btn-soft" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</button>}>
          {editing ? (
            <form className="pf-form" onSubmit={saveHealth}>
              <FormRow label="Blood group">
                <select value={medical.bloodGroup} onChange={up('bloodGroup')}>
                  <option value="">Not known</option>
                  {BLOOD.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </FormRow>
              <FormRow label="Known health conditions" hint="For example: iron-deficiency anaemia, G6PD deficiency">
                <textarea rows={2} value={medical.conditions} onChange={up('conditions')} />
              </FormRow>
              <FormRow label="Regular medicines and supplements" hint="For example: folic acid 0.4 mg daily">
                <textarea rows={2} value={medical.medications} onChange={up('medications')} />
              </FormRow>
              <FormRow label="Past operations and hospital stays">
                <textarea rows={2} value={medical.surgeries} onChange={up('surgeries')} />
              </FormRow>
              <FormRow label="Allergies" hint="Medicines, food or environmental">
                <input value={medical.allergies} onChange={up('allergies')} />
              </FormRow>
              <div className="pf-actions">
                <button type="button" className="ghost" onClick={() => { setMedical(saved); setEditing(false); }}>Cancel</button>
                <button type="submit" className="btn">Save health details</button>
              </div>
            </form>
          ) : (
            <FieldGrid cols={1}>
              <Field label="Blood group" value={medical.bloodGroup} />
              <Field label="Known health conditions" value={medical.conditions} />
              <Field label="Regular medicines and supplements" value={medical.medications} />
              <Field label="Past operations and hospital stays" value={medical.surgeries} />
              <Field label="Allergies" value={medical.allergies} />
            </FieldGrid>
          )}
        </Card>
      </div>

      {account.role === 'couple' && <HomeLocation />}

      <FamilyPedigree me={me} partnerName={partner?.name} />

      <Card title="Profile picture">
        <Accordion title="Choose a picture" hint="Shown to your counsellor and your partner">
          <AvatarPicker session={account} />
        </Accordion>
      </Card>

      <Card title="Sharing and consent">
        <div className="pf-row">
          <p className="muted">Who can see your result, who opened your data, and your Malaffi consent are all on one page.</p>
          <a className="btn-line" href="#/app/privacy">Open Privacy →</a>
        </div>
      </Card>
    </Page>
  );
}

import { Page, Card, Stat, Badge } from '../shared/ui.jsx';
import Journey from '../shared/Journey.jsx';
import { useJourney } from '../shared/journey.js';
import { useStore, EMPTY_OBJ, EMPTY_ARR } from '../shared/store.js';
import { useState, useMemo } from 'react';
import { Calendar, Clock, Video, MapPin, Check, ExternalLink, X } from 'lucide-react';
import { useCouple } from './useCouple.js';
import { fetchMalaffi, book as bookSlot } from '../shared/db.js';
import { SLOTS } from '../shared/data.js';
import './counsellor.css';

export default function Home() {
  const { me, partner, result, couple } = useCouple();
  const journey = useJourney();
  const intakes = useStore((s) => s.screeningIntakes) || EMPTY_OBJ;
  const myIntake = intakes[me.id];
  const isScreened = !!myIntake?.completed;

  // live couples: the result is only meaningful once BOTH lab reports are in
  const live = useStore((s) => !!s.session?.backend);
  const reports = useStore((s) => s.reports) || EMPTY_OBJ;
  const mine = reports[me.id];
  const theirs = reports[partner.id];
  const fresh = useStore((s) => !!s.session?.fresh);
  const waiting = (live && (!mine || !theirs)) || (fresh && !mine);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookModality, setBookModality] = useState('online');

  const handleBookSlot = (slot) => {
    const isOnline = bookModality === 'online';
    bookSlot(cid, slot, {
      mode: isOnline ? 'online' : 'offline',
      who: session?.name || 'Khalid & Fatima',
      doctor: 'Dr. Mariam Al Hosani',
      what: 'Pre-marital counselling',
      priority: 'pending',
      status: 'pending',
      confirmed: false,
      requestedAt: new Date().toISOString(),
      tone: 'amber',
      meetLink: isOnline ? `https://meet.google.com/dan-${cid}-0224` : null,
      clinicName: isOnline ? null : 'DaNA Partner Clinic',
      clinicRoom: isOnline ? null : 'Abu Dhabi · Building A · Room 204',
      clinicAddress: isOnline ? null : 'Cleveland Clinic Abu Dhabi, Al Maryah Island',
    });
    setShowBookModal(false);
  };
  const fetchMine = async () => {
    setBusy(true); setErr('');
    try { await fetchMalaffi(); } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const session = useStore((s) => s.session);
  const cid = session?.couple || couple?.id || 'c1';
  const sent = useStore((s) => s.alertsSent) || EMPTY_ARR;
  const plan = useStore((s) => (couple?.id ? s.plans[couple.id] : null) || s.plan);
  const scheduleAppointments = useStore((s) => s.scheduleAppointments) || EMPTY_ARR;
  const bookedLabel = useStore((s) => s.appointments[cid]) || useStore((s) => s.booked);

  const formatDateLabel = (d) => {
    if (!d) return '';
    if (typeof d === 'string' && d.includes('-')) {
      const parts = d.split('-');
      if (parts.length === 3) {
        const [y, m, day] = parts;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(m, 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          return `${parseInt(day, 10)} ${months[mIdx]} ${y}`;
        }
      }
    }
    return d;
  };

  const activeAppt = useMemo(() => {
    const found = scheduleAppointments.find((a) => a.cid === cid);
    if (found) return found;
    if (bookedLabel) {
      let apptDate = '2026-11-10';
      let apptTime = '13:30';
      if (bookedLabel.includes('9 Nov')) { apptDate = '2026-11-09'; apptTime = '10:00'; }
      else if (bookedLabel.includes('10 Nov')) { apptDate = '2026-11-10'; apptTime = '13:30'; }
      else if (bookedLabel.includes('11 Nov')) { apptDate = '2026-11-11'; apptTime = '17:00'; }
      else if (bookedLabel.includes('12 Nov')) { apptDate = '2026-11-12'; apptTime = '11:00'; }
      return {
        id: `appt_${cid}`,
        date: apptDate,
        time: apptTime,
        endTime: '14:15',
        doctor: 'Dr. Mariam Al Hosani',
        mode: 'online',
        type: 'Video',
        what: 'Pre-marital counselling',
        meetLink: 'https://meet.google.com/dan-c1-0224',
        priority: 'pending',
        confirmed: false,
        status: 'pending',
        notes: bookedLabel,
      };
    }
    return null;
  }, [scheduleAppointments, cid, bookedLabel]);

  // the counsellor comes in once the groundwork is done: own result seen and the couple result ready
  const counsellorReady = journey.done.result && journey.done.together;

  return (
    <Page
      title={`Welcome, ${me.short}`}
      sub={
        !journey.linked ? 'Your premarital screening · link your partner to see your couple result'
          : `You and ${partner.short} · ${waiting ? 'waiting for lab results' : 'premarital screening'}`
      }
    >
      <Journey />

      <div className={counsellorReady ? 'grid2' : undefined}>
        <Card title="Your couple result">
          <div className="result-mini">
            {waiting ? (
              <>
                <Badge tone="grey">Waiting for results</Badge>
                <p>
                  You: <b>{mine ? 'received ✓' : 'not fetched yet'}</b>{journey.linked && <> · {partner.short}: <b>{theirs ? 'received ✓' : 'not fetched yet'}</b></>}
                </p>
                {!journey.linked ? (
                  <>
                    <p className="muted">Screening is done as a couple: the chance for a child depends on both of you. Link your partner to see your couple result.</p>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                      <a className="btn" href="#/app/connections">Link your partner</a>
                      <a href="#/app/result">See my own result →</a>
                    </div>
                  </>
                ) : <p className="muted">We'll show your couple result as soon as {partner.short}'s report arrives.</p>}
                {err && <p className="err">{err}</p>}
              </>
            ) : (
              <>
                <Badge tone={result.type === 'clear' ? 'green' : 'amber'}>{result.label}</Badge>
                <p><b>{result.condition || 'No shared finding'}</b> · {result.risk}</p>
                <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                  <a href="#/app/result">What does this mean? →</a>
                  <a href="#/app/report" style={{ color: 'var(--ink2)' }}>View medical report →</a>
                  <a href="#/app/profile" style={{ color: 'var(--ink2)' }}>Update profile data →</a>
                </div>
              </>
            )}
          </div>
        </Card>
        {counsellorReady && (
        <Card title={activeAppt ? 'Your counsellor session' : 'Your counsellor'}>
          {!activeAppt ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>
                A genetics counsellor can explain your result, answer questions and help you think through options. Free and confidential.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 14px', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Dr. Mariam Al Hosani</span>
                  <span style={{ fontSize: 12, color: '#64748B' }}>· Available for premarital booking</span>
                </div>
                <Badge tone="green">Available</Badge>
              </div>
              <button
                type="button"
                className="btn btn-green"
                onClick={() => setShowBookModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 8,
                  background: '#00843D',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: 14,
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: 2,
                  alignSelf: 'flex-start',
                }}
              >
                <Calendar size={15} /> Book a conversation →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Status Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {activeAppt.confirmed === false || activeAppt.priority === 'pending' ? (
                    <Badge tone="amber"><Clock size={12} /> Awaiting Counsellor Confirmation</Badge>
                  ) : (
                    <Badge tone="green"><Check size={12} /> Verified & Confirmed</Badge>
                  )}
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    {activeAppt.mode === 'online' ? 'Google Meet Video' : 'In-Person Clinic Visit'}
                  </span>
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A' }}>
                  {activeAppt.doctor || 'Dr. Mariam Al Hosani'}
                </span>
              </div>

              {/* Appointment Schedule Box */}
              <div style={{
                background: activeAppt.confirmed === false || activeAppt.priority === 'pending' ? '#FFFBEB' : '#F0FDF4',
                border: activeAppt.confirmed === false || activeAppt.priority === 'pending' ? '1px solid #FDE68A' : '1px solid #BBF7D0',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 10
              }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Date</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar size={13} color="#2563EB" /> {formatDateLabel(activeAppt.date)}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Time</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={13} color="#059669" /> {activeAppt.time} {activeAppt.endTime ? `– ${activeAppt.endTime}` : ''} GST
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Session Format</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {activeAppt.mode === 'online' ? <Video size={13} color="#2563EB" /> : <MapPin size={13} color="#059669" />}
                    {activeAppt.mode === 'online' ? 'Video Call' : 'Clinic Visit'}
                  </span>
                </div>
              </div>

              {/* Notice */}
              {activeAppt.confirmed === false || activeAppt.priority === 'pending' ? (
                <p style={{ margin: 0, fontSize: 12.5, color: '#92400E', lineHeight: 1.4 }}>
                  ⏳ Your request has been forwarded to Dr. Mariam for clinical confirmation. Meeting room activates upon acceptance.
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: 12.5, color: '#047857', lineHeight: 1.4 }}>
                  ✓ Clinically verified by Dr. Mariam. Your encrypted Google Meet room is ready for you and your partner.
                </p>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                {activeAppt.confirmed && activeAppt.mode === 'online' && (
                  <a
                    href={activeAppt.meetLink || 'https://meet.google.com/dan-prem-103'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-green"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#00843D',
                      color: '#ffffff',
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: 'none'
                    }}
                  >
                    <Video size={14} /> Join consultation <ExternalLink size={12} />
                  </a>
                )}
                <a
                  href="#/app/counsellor"
                  className="btn-line"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    color: '#334155'
                  }}
                >
                  Manage Appointment →
                </a>
              </div>
            </div>
          )}
        </Card>
        )}
      </div>

      <div className="tiles">
        <a className="tile" href="#/app/bonds"><small>Your plan</small><b>{plan ? plan.split(':')[0] : 'Not chosen yet'}</b><span>{plan ? 'Change any time' : 'Take your time →'}</span></a>
        <a className="tile" href="#/app/roots"><small>Relatives invited</small><b>{sent.length}</b><span>Anonymous alerts →</span></a>
        <a className="tile" href="#/app/my-report"><small>Your report</small><b>Ready</b><span>English · العربية · اردو →</span></a>
      </div>
      {/* ─── Book Consultation Quick Modal ─── */}
      {showBookModal && (
        <div className="patient-modal-overlay" onClick={() => setShowBookModal(false)}>
          <div className="patient-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="patient-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F0FDF4', display: 'grid', placeItems: 'center', color: '#00843D' }}>
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#0F172A' }}>Book Premarital Consultation</h3>
                  <small style={{ color: '#64748B' }}>With Dr. Mariam Al Hosani · Genetic Counsellor</small>
                </div>
              </div>
              <button
                type="button"
                className="patient-modal-close"
                onClick={() => setShowBookModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="patient-modal-body" style={{ gap: 16 }}>
              {/* Modality choice selector */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: 8 }}>
                  Select Consultation Format
                </label>
                <div className="patient-modality-toggle-grid">
                  <div
                    className={`patient-modality-choice-card ${bookModality === 'online' ? 'selected' : ''}`}
                    onClick={() => setBookModality('online')}
                  >
                    <b><Video size={16} color="#2563EB" /> Online Video Call</b>
                    <span>Google Meet encrypted consultation</span>
                  </div>

                  <div
                    className={`patient-modality-choice-card ${bookModality === 'offline' ? 'selected' : ''}`}
                    onClick={() => setBookModality('offline')}
                  >
                    <b><MapPin size={16} color="#059669" /> In-Person Clinic Visit</b>
                    <span>Cleveland Clinic Abu Dhabi, Bldg A</span>
                  </div>
                </div>
              </div>

              {/* Available Slots */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: 8 }}>
                  Choose an Available Time Slot
                </label>
                <div className="patient-slots-grid">
                  {SLOTS.map((s) => (
                    <button
                      key={s.id || s.label}
                      type="button"
                      className="patient-slot-btn"
                      onClick={() => handleBookSlot(s)}
                    >
                      <Clock size={16} color="#059669" />
                      <span>{s.label}</span>
                      <small style={{ color: '#00843D', fontSize: 11.5, fontWeight: 700 }}>Request Slot →</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="patient-modal-footer">
              <button
                type="button"
                className="patient-btn-secondary"
                onClick={() => setShowBookModal(false)}
              >
                Cancel
              </button>
              <a
                href="#/app/counsellor"
                className="btn-line"
                style={{ fontSize: 13, textDecoration: 'none', color: '#00843D', fontWeight: 600 }}
                onClick={() => setShowBookModal(false)}
              >
                Open Full Schedule →
              </a>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

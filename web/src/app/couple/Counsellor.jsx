import { useState, useMemo, useEffect } from 'react';
import {
  Video,
  MapPin,
  Calendar,
  Clock,
  User,
  ExternalLink,
  Copy,
  Check,
  RotateCw,
  X,
  ShieldCheck,
  AlertCircle,
  FileText,
  Navigation,
  Info,
  CheckCircle,
  Sparkles,
  Star
} from 'lucide-react';
import { Page, Card, Avatar, Badge } from '../shared/ui.jsx';
import { useStore } from '../shared/store.js';
import { SLOTS, INITIAL_SCHEDULE, COUNSELLORS } from '../shared/data.js';
import { book as bookSlot, cancelBooking, rescheduleAppointment, confirmAppointment, selectCounsellor, isLive } from '../shared/db.js';
import SlotFinder from './SlotFinder.jsx';
import { syncConsultationsFromSupabase } from '../shared/consultationService.js';
import { getRecommendedCounsellors } from '../shared/counsellorMatcher.js';
import './counsellor.css';

export default function Counsellor() {
  const session = useStore((s) => s.session);
  const cid = session?.couple || 'c1';
  const bookedLabel = useStore((s) => s.appointments[cid]);
  const scheduleAppointments = useStore((s) => s.scheduleAppointments) || INITIAL_SCHEDULE;
  const liveSlots = useStore((s) => s.slots);
  // hooks must run on every render, so read both values first, then pick
  const lockedCounsellor = useStore((s) => s.coupleCounsellors?.[cid]);
  const caseCounsellor = useStore((s) => s.cases?.[cid]?.counsellor);
  const dedicatedCounsellor = lockedCounsellor || caseCounsellor || 'Dr. Mariam Al Hosani';
  const counsellorName = dedicatedCounsellor;
  const counsellorObj = COUNSELLORS.find((c) => c.name === dedicatedCounsellor) || COUNSELLORS[0];

  const [toastMessage, setToastMessage] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showDirectionsModal, setShowDirectionsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

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

  // Reschedule form state
  const [selectedNewSlot, setSelectedNewSlot] = useState(SLOTS[0]?.label || '');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Booking mode state if not booked
  const [bookModality, setBookModality] = useState('online');

  const slots = isLive() && liveSlots?.length ? liveSlots : SLOTS;

  // Find active appointment for this couple
  const activeAppt = useMemo(() => {
    const coupleAppts = scheduleAppointments.filter((a) => a.cid === cid);
    const found = coupleAppts.find((a) => a.confirmed === true || a.status === 'confirmed' || a.priority === 'upcoming') || coupleAppts[0];
    if (found) return found;

    // Fallback if booked label exists but not in schedule list
    if (bookedLabel) {
      return {
        id: `appt_${cid}`,
        date: '2026-11-09',
        time: '10:00',
        endTime: '10:45',
        who: session?.name || 'Khalid & Fatima',
        what: 'Pre-marital counselling',
        priority: 'upcoming',
        tone: 'green',
        doctor: counsellorName,
        mode: 'online',
        type: 'Video',
        provider: 'Google Meet',
        meetLink: 'https://meet.google.com/dan-prem-103',
        language: 'Arabic',
        cid: cid,
        notes: bookedLabel,
      };
    }
    return null;
  }, [scheduleAppointments, cid, bookedLabel, session, counsellorName]);

  useEffect(() => {
    if (cid) {
      syncConsultationsFromSupabase(cid);
    }
  }, [cid]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyLink = (link) => {
    if (!link) return;
    navigator.clipboard?.writeText(link);
    setCopySuccess(true);
    showToast('Meeting link copied to clipboard');
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleCancel = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    cancelBooking(cid);
    setShowCancelModal(false);
    showToast('Consultation appointment cancelled');
  };

  const handleConfirmReschedule = () => {
    if (!selectedNewSlot) return;

    // Parse chosen slot
    const slotObj = slots.find((s) => s.label === selectedNewSlot);
    let newDate = '2026-11-09';
    let newTime = '10:00';
    if (selectedNewSlot.includes('9 Nov')) { newDate = '2026-11-09'; newTime = '10:00'; }
    else if (selectedNewSlot.includes('10 Nov')) { newDate = '2026-11-10'; newTime = '13:30'; }
    else if (selectedNewSlot.includes('11 Nov')) { newDate = '2026-11-11'; newTime = '17:00'; }
    else if (selectedNewSlot.includes('12 Nov')) { newDate = '2026-11-12'; newTime = '11:00'; }

    rescheduleAppointment(cid, selectedNewSlot, {
      id: activeAppt?.id,
      date: newDate,
      time: newTime,
      note: rescheduleReason || 'Patient requested slot change via portal',
    });

    setShowRescheduleModal(false);
    showToast(`Appointment rescheduled to ${selectedNewSlot}`);
  };

  const handleBookNew = (slot) => {
    const isOnline = bookModality === 'online';
    bookSlot(cid, slot, {
      mode: isOnline ? 'online' : 'offline',
      who: session?.name || 'Khalid & Fatima',
      doctor: counsellorName,
      what: 'Pre-marital counselling',
      priority: 'pending',
      status: 'pending',
      confirmed: false,
      requestedAt: new Date().toISOString(),
      tone: 'amber',
      meetLink: isOnline ? `https://meet.google.com/dan-${cid}-${Date.now().toString().slice(-4)}` : null,
      clinicName: isOnline ? null : (counsellorObj?.clinicName || counsellorObj?.clinic || 'DaNA Partner Clinic'),
      clinicRoom: isOnline ? null : (counsellorObj?.clinicRoom || counsellorObj?.room || 'Abu Dhabi · Building A · Room 204'),
      clinicAddress: isOnline ? null : (counsellorObj?.clinicAddress || counsellorObj?.address || 'Cleveland Clinic Abu Dhabi, Al Maryah Island'),
    });
    showToast(`Appointment request forwarded to ${counsellorName} for confirmation.`);
  };

  return (
    <Page title="Your Counsellor" sub="A real, licensed person. Ask anything.">
      <div className="patient-counsellor-container">
        
        {/* ─── Counsellor Profile Header ─── */}
        <div className="patient-counsellor-profile">
          <div className="counsellor-bio-left">
            <div className="counsellor-avatar-wrap">
              <Avatar name={counsellorName} size={64} />
              <span className="counsellor-online-dot" title="Available now" />
            </div>
            <div className="counsellor-bio-info">
              <h2>{counsellorName}</h2>
              <div className="counsellor-role-title">{counsellorObj?.title || 'Genetic Counsellor'} · {counsellorObj?.languages?.join(' & ') || 'Arabic & English'}</div>
              <div className="counsellor-license-tag">
                <ShieldCheck size={13} color="#059669" />
                <span>{counsellorObj?.license || 'DoH Licensed (DOH-GC-88412)'} · {counsellorObj?.clinicName || counsellorObj?.clinic || 'Cleveland Clinic Abu Dhabi Partner'}</span>
              </div>
            </div>
          </div>
          <div className="counsellor-badge-verified">
            <Check size={14} /> Dedicated Clinical Counsellor (Stages 3–7)
          </div>
        </div>

        {/* ─── Consultation Session Card (Image 5) ─── */}
        {activeAppt ? (
          <div className="patient-appt-card">
            
            {/* Header */}
            <div className="patient-appt-card-header">
              <div className="patient-appt-title-group">
                <h3>{activeAppt.what || 'Premarital Genetic Consultation'}</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`patient-appt-modality-badge ${activeAppt.mode === 'online' ? 'online' : 'offline'}`}>
                    {activeAppt.mode === 'online' ? <Video size={13} /> : <MapPin size={13} />}
                    {activeAppt.mode === 'online' ? 'Online Consultation' : 'In-Person Consultation'}
                  </span>
                  {activeAppt.priority === 'urgent' ? (
                    <span className="patient-appt-status-pill urgent">Tier 1 · Urgent</span>
                  ) : activeAppt.confirmed === false || activeAppt.priority === 'pending' ? (
                    <span className="patient-appt-status-pill pending">
                      <Clock size={12} /> Awaiting Counsellor Confirmation
                    </span>
                  ) : (
                    <span className="patient-appt-status-pill upcoming">
                      <Check size={12} /> ✓ Verified & Confirmed
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Key details grid */}
            <div className="patient-appt-details-grid">
              <div className="patient-appt-meta-item">
                <span className="patient-appt-meta-label">Date</span>
                <span className="patient-appt-meta-value">
                  <Calendar size={15} color="#2563EB" />
                  {formatDateLabel(activeAppt.date)}
                </span>
              </div>

              <div className="patient-appt-meta-item">
                <span className="patient-appt-meta-label">Time & Duration</span>
                <span className="patient-appt-meta-value">
                  <Clock size={15} color="#059669" />
                  {activeAppt.time} {activeAppt.endTime ? `– ${activeAppt.endTime}` : ''} GST
                </span>
              </div>

              <div className="patient-appt-meta-item">
                <span className="patient-appt-meta-label">Language</span>
                <span className="patient-appt-meta-value">
                  {activeAppt.language || 'Arabic & English'}
                </span>
              </div>

              <div className="patient-appt-meta-item">
                <span className="patient-appt-meta-label">Session Topic</span>
                <span className="patient-appt-meta-value">
                  {activeAppt.what}
                </span>
              </div>
            </div>

            {/* Request & Acceptance Verification Banner */}
            {activeAppt.confirmed === false || activeAppt.priority === 'pending' ? (
              <div className="patient-status-banner pending">
                <div className="patient-status-banner-left">
                  <div className="patient-pending-icon-wrap">
                    <Clock size={22} color="#D97706" />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: 14.5, color: '#92400E', fontWeight: 700 }}>
                      Request Forwarded to {activeAppt.doctor || counsellorName}
                    </h4>
                    <p style={{ margin: 0, fontSize: 13, color: '#B45309', lineHeight: 1.45 }}>
                      Your consultation request for <b>{formatDateLabel(activeAppt.date)} at {activeAppt.time} GST</b> has been forwarded for clinical review. Once confirmed, this appointment will be officially verified on both portals and your secure meeting room will activate.
                    </p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="patient-status-banner verified">
                <div className="patient-status-banner-left">
                  <div className="patient-verified-icon-wrap">
                    <CheckCircle size={22} color="#059669" />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: 14.5, color: '#065F46', fontWeight: 700 }}>
                      ✓ Appointment Verified & Confirmed
                    </h4>
                    <p style={{ margin: 0, fontSize: 13, color: '#047857', lineHeight: 1.45 }}>
                      <b>{activeAppt.doctor || counsellorName}</b> has confirmed your consultation. This appointment is verified across both portals and your encrypted video meeting room is active.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Modality Specific Section (Image 5) */}
            {activeAppt.mode === 'online' ? (
              /* Online / Google Meet Layout */
              <div className="patient-modality-box online-box">
                <div className="patient-modality-row">
                  <div className="patient-provider-info">
                    <div className="patient-provider-icon">
                      <Video size={22} />
                    </div>
                    <div className="patient-provider-text">
                      <b>{activeAppt.provider || 'Google Meet'} Video Consultation</b>
                      <code>{activeAppt.meetLink || 'https://meet.google.com/dan-prem-103'}</code>
                    </div>
                  </div>

                  <div className="patient-modality-actions">
                    <button
                      type="button"
                      className="patient-btn-secondary"
                      onClick={() => handleCopyLink(activeAppt.meetLink || 'https://meet.google.com/dan-prem-103')}
                    >
                      {copySuccess ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                      {copySuccess ? 'Copied' : 'Copy meeting link'}
                    </button>

                    {activeAppt.confirmed === false || activeAppt.priority === 'pending' ? null : (
                      <a
                        href={activeAppt.meetLink || 'https://meet.google.com/dan-prem-103'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="patient-btn-join"
                      >
                        <Video size={16} />
                        Join consultation
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>

                <div className="patient-privacy-notice">
                  <ShieldCheck size={17} />
                  <div>
                    <b>Authorized Access Only:</b> The meeting link is accessible only to authorized participants. Please ensure you are logged in with your registered account before joining. All counselling sessions comply with UAE Health Data Law and DoH privacy standards.
                  </div>
                </div>
              </div>
            ) : (
              /* Offline / Clinic Layout */
              <div className="patient-modality-box offline-box">
                <div className="patient-modality-row">
                  <div className="patient-provider-info">
                    <div className="patient-provider-icon clinic">
                      <MapPin size={22} />
                    </div>
                    <div className="patient-clinic-location">
                      <div className="patient-clinic-name">{activeAppt.clinicName || counsellorObj?.clinicName || counsellorObj?.clinic || 'DaNA Partner Clinic'}</div>
                      <div className="patient-clinic-room">{activeAppt.clinicRoom || counsellorObj?.clinicRoom || counsellorObj?.room || 'Abu Dhabi · Building A · Room 204'}</div>
                      <div className="patient-clinic-address">{activeAppt.clinicAddress || counsellorObj?.clinicAddress || counsellorObj?.address || 'Cleveland Clinic Abu Dhabi, Al Maryah Island'}</div>
                    </div>
                  </div>

                  <div className="patient-modality-actions">
                    <button
                      type="button"
                      className="patient-btn-secondary"
                      onClick={() => setShowDirectionsModal(true)}
                    >
                      <Navigation size={14} />
                      View directions
                    </button>
                    <a
                      href={counsellorObj?.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(counsellorObj?.clinicAddress || counsellorObj?.clinicName || 'Cleveland Clinic Abu Dhabi')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="patient-btn-join"
                      style={{ background: '#0F172A' }}
                    >
                      <ExternalLink size={14} />
                      Open in Maps
                    </a>
                  </div>
                </div>

                <div className="patient-privacy-notice">
                  <Info size={17} />
                  <div>
                    <b>Arrival Instructions:</b> Please arrive 15 minutes before your scheduled appointment with your Emirates ID. Complimentary valet parking is available at the main hospital entrance.
                  </div>
                </div>
              </div>
            )}

            {/* Actions footer */}
            <div className="patient-appt-footer">
              <button
                type="button"
                className="patient-btn-reschedule"
                onClick={() => setShowRescheduleModal(true)}
              >
                <RotateCw size={14} />
                Reschedule request
              </button>

              <button
                type="button"
                className="patient-btn-cancel"
                onClick={handleCancel}
              >
                <X size={14} />
                Cancel appointment
              </button>
            </div>

          </div>
        ) : (
          /* ─── No Appointment Booked View ─── */
          <div className="patient-appt-card">
            <div className="patient-book-section">
              <div className="patient-appt-title-group">
                <h3>Request a Consultation</h3>
                <p style={{ margin: 0, color: '#64748B', fontSize: 14 }}>
                  Schedule a confidential 45-minute consultation with {counsellorName} to discuss your screening results. Choose your format and preferred slot; your request will be forwarded for confirmation.
                </p>
              </div>

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
                    <span>Google Meet encrypted consultation from anywhere</span>
                  </div>

                  <div
                    className={`patient-modality-choice-card ${bookModality === 'offline' ? 'selected' : ''}`}
                    onClick={() => setBookModality('offline')}
                  >
                    <b><MapPin size={16} color="#059669" /> In-Person Clinic Visit</b>
                    <span>At your counsellor's clinic, in your emirate</span>
                  </div>
                </div>
              </div>

              {/* Available Slots */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: 8 }}>
                  Available Time Slots
                </label>
                {isLive() ? (
                  <SlotFinder
                    modality={bookModality}
                    onRequested={async () => { await syncConsultationsFromSupabase(cid); showToast('Request sent. Your counsellor will confirm shortly.'); }}
                    onError={(m) => showToast(m)}
                  />
                ) : slots.length ? (
                  <div className="patient-slots-grid">
                    {slots.map((s) => (
                      <button
                        key={s.id || s.label}
                        type="button"
                        className="patient-slot-btn"
                        onClick={() => handleBookNew(s)}
                      >
                        <Clock size={16} color="#059669" />
                        <span>{s.label}</span>
                        <small style={{ color: '#059669', fontSize: 11.5, fontWeight: 600 }}>Request Slot →</small>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No free times in the next 10 days. Your counsellor will contact you directly.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Clinical Preparation Guide ─── */}
        <div className="patient-prep-guide">
          <h4><FileText size={17} color="#2563EB" /> How to Prepare for Your Consultation</h4>
          <ul className="patient-prep-list">
            <li className="patient-prep-item">
              <Check size={16} />
              <span><b>Attend Together:</b> Whenever possible, both partners should join the session together so both can ask questions and discuss carrier findings.</span>
            </li>
            <li className="patient-prep-item">
              <Check size={16} />
              <span><b>Review Your Screening Results:</b> Check the genetic report tab beforehand. Note down any specific terms (e.g. autosomal recessive carrier, VUS) you want explained.</span>
            </li>
            <li className="patient-prep-item">
              <Check size={16} />
              <span><b>Family Medical History:</b> Mention any family history of inherited conditions, hearing loss, or chronic childhood disorders.</span>
            </li>
            <li className="patient-prep-item">
              <Check size={16} />
              <span><b>Completely Confidential:</b> Your genetic information is protected under UAE Federal Law on Human Genome Testing and is never shared without your written consent.</span>
            </li>
          </ul>
        </div>

      </div>

      {/* ─── Reschedule Request Modal ─── */}
      {showRescheduleModal && (
        <div className="patient-modal-overlay" onClick={() => setShowRescheduleModal(false)}>
          <div className="patient-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="patient-modal-header">
              <h3>Request Appointment Reschedule</h3>
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="patient-modal-body">
              <div>
                <span style={{ fontSize: 13, color: '#64748B', display: 'block', marginBottom: 4 }}>
                  Current Appointment
                </span>
                <b style={{ fontSize: 14.5, color: '#0F172A' }}>
                  {activeAppt?.date} at {activeAppt?.time} GST with {activeAppt?.doctor || counsellorName}
                </b>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: 8 }}>
                  Select Alternative Slot
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {slots.map((s) => (
                    <label
                      key={s.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: selectedNewSlot === s.label ? '2px solid #059669' : '1px solid #CBD5E1',
                        background: selectedNewSlot === s.label ? '#ECFDF5' : '#ffffff',
                        cursor: 'pointer',
                        fontSize: 13.5,
                        fontWeight: 500,
                        color: '#0F172A'
                      }}
                    >
                      <input
                        type="radio"
                        name="rescheduleSlot"
                        value={s.label}
                        checked={selectedNewSlot === s.label}
                        onChange={(e) => setSelectedNewSlot(e.target.value)}
                      />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: 6 }}>
                  Reason for Rescheduling (Optional)
                </label>
                <textarea
                  rows={3}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Work conflict, family emergency, travel schedule..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 13.5,
                    fontFamily: 'inherit',
                    resize: 'none'
                  }}
                />
              </div>
            </div>

            <div className="patient-modal-footer">
              <button
                type="button"
                className="patient-btn-secondary"
                onClick={() => setShowRescheduleModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="patient-btn-join"
                style={{ padding: '9px 18px' }}
                onClick={handleConfirmReschedule}
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Clinic Directions Modal ─── */}
      {showDirectionsModal && (
        <div className="patient-modal-overlay" onClick={() => setShowDirectionsModal(false)}>
          <div className="patient-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="patient-modal-header">
              <h3>Clinic Location & Directions</h3>
              <button
                type="button"
                onClick={() => setShowDirectionsModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="patient-modal-body">
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div className="patient-provider-icon clinic" style={{ width: 44, height: 44 }}>
                  <MapPin size={24} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 16, color: '#0F172A' }}>
                    {activeAppt?.clinicName || counsellorObj?.clinicName || counsellorObj?.clinic || 'DaNA Partner Clinic'}
                  </h4>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#15803D', marginBottom: 4 }}>
                    {activeAppt?.clinicRoom || counsellorObj?.clinicRoom || counsellorObj?.room || 'Abu Dhabi · Building A · Room 204'}
                  </div>
                  <div style={{ fontSize: 13, color: '#475569' }}>
                    {activeAppt?.clinicAddress || counsellorObj?.clinicAddress || counsellorObj?.address || 'Cleveland Clinic Abu Dhabi, Al Maryah Island, Abu Dhabi, UAE'}
                  </div>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 14 }}>
                <h5 style={{ margin: '0 0 8px 0', fontSize: 13.5, color: '#0F172A' }}>Parking & Entry Information</h5>
                <p style={{ margin: '0 0 6px 0', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                  • <b>Complimentary Valet Parking:</b> Available at the Main Hospital Entrance.
                </p>
                <p style={{ margin: '0 0 6px 0', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                  • <b>Self Parking:</b> Park in P1 Visitor Parking; take Elevator B to Level 2.
                </p>
                <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                  • <b>Reception Desk:</b> Present your Emirates ID at the Level 2 Genetics Specialty Desk.
                </p>
              </div>
            </div>

            <div className="patient-modal-footer">
              <button
                type="button"
                className="patient-btn-secondary"
                onClick={() => setShowDirectionsModal(false)}
              >
                Close
              </button>
              <a
                href="https://maps.google.com/?q=Cleveland+Clinic+Abu+Dhabi"
                target="_blank"
                rel="noopener noreferrer"
                className="patient-btn-join"
                style={{ background: '#0F172A' }}
              >
                <ExternalLink size={14} />
                Open Google Maps
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─── Cancel Appointment Confirmation Modal (In-App Modal, No Browser Alert) ─── */}
      {showCancelModal && (
        <div className="patient-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="patient-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="patient-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={20} color="#DC2626" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>Cancel Consultation</h3>
                  <span style={{ fontSize: 12, color: '#64748B' }}>Confirm cancellation</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="patient-modal-body" style={{ gap: 14 }}>
              <p style={{ margin: 0, fontSize: 13.5, color: '#334155', lineHeight: 1.5 }}>
                Are you sure you want to cancel your consultation appointment with <b>{activeAppt?.doctor || counsellorName}</b>?
              </p>

              {activeAppt && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#475569' }}>
                  <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>{activeAppt.what || 'Pre-marital counselling'}</div>
                  <div>📅 {formatDateLabel(activeAppt.date)} · ⏰ {activeAppt.time} GST ({activeAppt.mode === 'online' ? 'Google Meet Video' : 'Clinic Visit'})</div>
                </div>
              )}

              <p style={{ margin: 0, fontSize: 12.5, color: '#64748B', lineHeight: 1.4 }}>
                Your slot will be freed up immediately. You can book a new appointment from scratch anytime.
              </p>
            </div>

            <div className="patient-modal-footer">
              <button
                type="button"
                className="patient-btn-secondary"
                onClick={() => setShowCancelModal(false)}
              >
                Keep Appointment
              </button>
              <button
                type="button"
                className="patient-btn-join"
                style={{ background: '#DC2626', borderColor: '#DC2626', color: '#ffffff' }}
                onClick={handleConfirmCancel}
              >
                Yes, Cancel Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toast Feedback ─── */}
      {toastMessage && (
        <div className="patient-toast-pill">
          <Check size={16} color="#34D399" />
          <span>{toastMessage}</span>
        </div>
      )}
    </Page>
  );
}

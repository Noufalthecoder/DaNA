import { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  Stethoscope,
  Video,
  Plus,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Check,
  FileText,
  MapPin,
  AlertCircle,
  X,
  ExternalLink,
  Copy,
  CalendarCheck
} from 'lucide-react';
import { Dialog, Badge } from '../shared/ui.jsx';
import { useStore } from '../shared/store.js';
import { COUPLES, PEOPLE, INITIAL_SCHEDULE } from '../shared/data.js';
import { completeAppointment, saveScheduleAppointments } from '../shared/db.js';
import './schedule.css';

const DOCTORS = [
  'All Doctors',
  'Dr. Mariam Al Hosani',
  'Dr. Tariq Al Nuaimi',
  'Dr. Fatima Al Zaabi',
];

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 10, 5)); // November 5, 2026
  const [selectedDateStr, setSelectedDateStr] = useState('2026-11-05');
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day' | 'list' | 'consultation'
  const [selectedDoctor, setSelectedDoctor] = useState('All Doctors');
  const storedAppts = useStore((s) => s.scheduleAppointments);
  const appointments = storedAppts && storedAppts.length > 0 ? storedAppts : INITIAL_SCHEDULE;
  const setAppointments = (updater) => {
    const next = typeof updater === 'function' ? updater(appointments) : updater;
    saveScheduleAppointments(next);
  };

  // Side panel drawer state
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [drawerAppt, setDrawerAppt] = useState(null); // null = Day List; object = Detail View

  // Dialog Modals
  const [availabilityModal, setAvailabilityModal] = useState(false);
  const [newApptModal, setNewApptModal] = useState(false);
  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [apptToReschedule, setApptToReschedule] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Availability Settings State (Image 1)
  const [isAvailable, setIsAvailable] = useState(true);
  const [workingDays, setWorkingDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [workStart, setWorkStart] = useState('08:30');
  const [workEnd, setWorkEnd] = useState('17:00');
  const [autoSyncGcal, setAutoSyncGcal] = useState(true);

  // New Appointment Modal Form State (Image 4)
  const [newMode, setNewMode] = useState('online'); // 'online' | 'offline'
  const [newCouple, setNewCouple] = useState('Ahmed & Noura');
  const [newCid, setNewCid] = useState('c2');
  const [newDate, setNewDate] = useState('2026-11-05');
  const [newTime, setNewTime] = useState('16:00');
  const [newDoctor, setNewDoctor] = useState('Dr. Mariam Al Hosani');
  const [newTopic, setNewTopic] = useState('Prenatal counselling follow-up');
  const [newLanguage, setNewLanguage] = useState('Arabic');
  const [newMeetLink, setNewMeetLink] = useState('https://meet.google.com/dan-gen-new');
  const [newClinicName, setNewClinicName] = useState('DaNA Partner Clinic');
  const [newClinicRoom, setNewClinicRoom] = useState('Abu Dhabi · Building A · Room 204');

  // Filtered by selected doctor
  const filteredAppointments = useMemo(() => {
    if (selectedDoctor === 'All Doctors') return appointments;
    return appointments.filter((a) => a.doctor === selectedDoctor);
  }, [appointments, selectedDoctor]);

  // Appointments on currently selected date
  const selectedDayAppts = useMemo(() => {
    return filteredAppointments.filter((a) => a.date === selectedDateStr);
  }, [filteredAppointments, selectedDateStr]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarCells = useMemo(() => {
    const cells = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        dateStr: `${year}-${String(month).padStart(2, '0')}-${String(daysInPrevMonth - i).padStart(2, '0')}`,
      });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      cells.push({
        dayNumber: i,
        isCurrentMonth: true,
        dateStr,
        isToday: dateStr === '2026-11-05',
      });
    }
    const totalCells = cells.length <= 35 ? 35 : 42;
    const remaining = totalCells - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        dayNumber: i,
        isCurrentMonth: false,
        dateStr: `${year}-${String(month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      });
    }
    return cells;
  }, [year, month, daysInMonth, firstDayIndex, daysInPrevMonth]);

  // Pager navigation inside drawer
  const currentApptIndex = useMemo(() => {
    if (!drawerAppt) return -1;
    return selectedDayAppts.findIndex((a) => a.id === drawerAppt.id);
  }, [drawerAppt, selectedDayAppts]);

  const handlePrevAppt = () => {
    if (currentApptIndex > 0) {
      setDrawerAppt(selectedDayAppts[currentApptIndex - 1]);
    }
  };

  const handleNextAppt = () => {
    if (currentApptIndex < selectedDayAppts.length - 1) {
      setDrawerAppt(selectedDayAppts[currentApptIndex + 1]);
    }
  };

  const handleCopyLink = (link) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(link);
    }
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2200);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Appointment Actions
  const handleMarkComplete = (appt) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === appt.id ? { ...a, priority: 'completed', tone: 'green' } : a))
    );
    if (appt.cid) completeAppointment(appt.cid);
    showToast(`Session with ${appt.who} marked completed.`);
    if (drawerAppt?.id === appt.id) {
      setDrawerAppt((curr) => ({ ...curr, priority: 'completed', tone: 'green' }));
    }
  };

  const handleCancelAppt = (appt) => {
    if (window.confirm(`Cancel appointment with ${appt.who} on ${appt.date} at ${appt.time}?`)) {
      setAppointments((prev) => prev.filter((a) => a.id !== appt.id));
      setDrawerAppt(null);
      showToast(`Appointment with ${appt.who} cancelled.`);
    }
  };

  const handleConfirmReschedule = (newSlotTime) => {
    if (!apptToReschedule) return;
    setAppointments((prev) =>
      prev.map((a) => (a.id === apptToReschedule.id ? { ...a, time: newSlotTime } : a))
    );
    if (drawerAppt?.id === apptToReschedule.id) {
      setDrawerAppt((curr) => ({ ...curr, time: newSlotTime }));
    }
    setRescheduleModal(false);
    showToast(`Appointment rescheduled to ${newSlotTime}. Notification sent to patients.`);
  };

  const handleCreateAppointment = (e) => {
    e.preventDefault();
    const newEntry = {
      id: `custom_${Date.now()}`,
      date: newDate,
      time: newTime,
      endTime: `${parseInt(newTime.slice(0, 2))}:${parseInt(newTime.slice(3)) + 45}`,
      who: newCouple,
      what: newTopic,
      priority: 'upcoming',
      tone: newMode === 'online' ? 'blue' : 'green',
      doctor: newDoctor,
      mode: newMode,
      type: newMode === 'online' ? 'Video' : 'Clinic',
      provider: newMode === 'online' ? 'Google Meet' : null,
      meetLink: newMode === 'online' ? newMeetLink : null,
      clinicName: newMode === 'offline' ? newClinicName : null,
      clinicRoom: newMode === 'offline' ? newClinicRoom : null,
      clinicAddress: newMode === 'offline' ? 'Cleveland Clinic Abu Dhabi, Al Maryah Island' : null,
      language: newLanguage,
      cid: newCid,
      notes: `Consultation scheduled with ${newDoctor}. Focus: ${newTopic}`,
    };
    setAppointments((prev) => [...prev, newEntry]);
    setSelectedDateStr(newDate);
    setSidePanelOpen(true);
    setDrawerAppt(newEntry);
    setNewApptModal(false);
    showToast(`Appointment for ${newCouple} created successfully.`);
  };

  return (
    <div className="appt-calendar-page">
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          background: '#0F172A',
          color: '#F8FAFC',
          padding: '12px 20px',
          borderRadius: 10,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 9999,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          border: '1px solid #334155',
        }}>
          <Check size={16} color="#10B981" />
          {toastMessage}
        </div>
      )}

      {/* ─── Top Header (Image 1) ─── */}
      <header className="appt-cal-header">
        <div className="appt-cal-header-top">
          <div className="appt-cal-title-row">
            <h1>Appointment Calendar</h1>
            <span
              className="appt-status-badge"
              style={{ cursor: 'pointer' }}
              title="Click to manage availability"
              onClick={() => setAvailabilityModal(true)}
            >
              <span
                className="appt-status-dot"
                style={{ background: isAvailable ? '#10B981' : '#94A3B8' }}
              />
              {isAvailable ? 'Available' : 'Unavailable'}
            </span>
          </div>

          <div className="appt-cal-actions">
            <button
              type="button"
              className={`appt-btn-outline ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode(viewMode === 'list' ? 'month' : 'list')}
            >
              <ListIcon size={16} />
              List View
            </button>

            <button
              type="button"
              className={`appt-btn-outline ${viewMode === 'consultation' ? 'active' : ''}`}
              onClick={() => setViewMode(viewMode === 'consultation' ? 'month' : 'consultation')}
            >
              <Stethoscope size={16} />
              Consultation View
            </button>

            <button
              type="button"
              className="appt-btn-outline"
              onClick={() => setAvailabilityModal(true)}
            >
              <CalendarIcon size={16} />
              Availability
            </button>

            <button
              type="button"
              className="appt-btn-new"
              onClick={() => setNewApptModal(true)}
            >
              <Plus size={16} />
              New Appointment
            </button>
          </div>
        </div>

        <p className="appt-cal-subtitle">
          Google Calendar connection can live inside Availability settings.
        </p>
      </header>

      {/* ─── Secondary Controls Bar ─── */}
      <div className="appt-cal-controls">
        <div className="appt-view-toggle">
          <button
            type="button"
            className={`appt-view-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => { setViewMode('day'); setSidePanelOpen(true); }}
          >
            Day
          </button>
          <button
            type="button"
            className={`appt-view-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            Week
          </button>
          <button
            type="button"
            className={`appt-view-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            Month
          </button>
        </div>

        <div className="appt-controls-right">
          <select
            className="appt-select-doc"
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >
            {DOCTORS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <button
            type="button"
            className="appt-btn-today"
            onClick={() => {
              setCurrentDate(new Date(2026, 10, 5));
              setSelectedDateStr('2026-11-05');
              setSidePanelOpen(true);
            }}
          >
            Today
          </button>

          <div className="appt-nav-arrows">
            <button
              type="button"
              className="appt-nav-btn"
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="appt-nav-btn"
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="appt-month-label">
            {MONTH_NAMES[month]} {year}
          </div>
        </div>
      </div>

      {/* ─── Main Workspace: Calendar Left + Side Panel Right (Image 2) ─── */}
      <div className="appt-workspace">
        <div className="appt-calendar-area">
          {viewMode === 'month' && (
            <div className="appt-calendar-card">
              <div className="appt-grid-header">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="appt-grid-col-head">{day}</div>
                ))}
              </div>

              <div className="appt-grid-body">
                {calendarCells.map((cell, idx) => {
                  const dayAppts = filteredAppointments.filter((a) => a.date === cell.dateStr);
                  const isSelected = selectedDateStr === cell.dateStr;

                  return (
                    <div
                      key={`${cell.dateStr}-${idx}`}
                      className={`appt-day-cell ${!cell.isCurrentMonth ? 'is-other-month' : ''} ${cell.isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => {
                        setSelectedDateStr(cell.dateStr);
                        setSidePanelOpen(true);
                        setDrawerAppt(null); // Reset to day's list view
                      }}
                    >
                      <div className="appt-day-top">
                        <span className={`appt-day-num ${cell.isToday ? 'today-badge' : ''}`}>
                          {cell.dayNumber}
                        </span>
                        {dayAppts.length > 0 && (
                          <span className="appt-day-badge-count">
                            {dayAppts.length}
                          </span>
                        )}
                      </div>

                      <div className="appt-day-appts">
                        {dayAppts.map((appt) => (
                          <div
                            key={appt.id}
                            className={`appt-chip tone-${appt.tone || 'blue'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDateStr(cell.dateStr);
                              setSidePanelOpen(true);
                              setDrawerAppt(appt); // Open detail view inside drawer
                            }}
                          >
                            <div className="appt-chip-h">
                              <span className="appt-chip-time">{appt.time}</span>
                              <span className="appt-chip-badge">{appt.mode === 'online' ? 'Video' : 'Clinic'}</span>
                            </div>
                            <div className="appt-chip-who">{appt.who}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'week' && (
            <div className="appt-calendar-card appt-week-view">
              <div className="appt-week-header">
                <div className="appt-time-gutter">Time</div>
                {WEEKDAYS.map((day, i) => (
                  <div key={day} className="appt-grid-col-head" style={{ borderRight: '1px solid #E2E8F0' }}>
                    {day} {i === 4 ? '(Today Nov 5)' : ''}
                  </div>
                ))}
              </div>
              <div className="appt-week-body">
                {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'].map((timeSlot) => (
                  <div key={timeSlot} className="appt-week-row">
                    <div className="appt-time-gutter">{timeSlot}</div>
                    {WEEKDAYS.map((day, dIdx) => {
                      const match = dIdx === 4
                        ? filteredAppointments.filter((a) => a.date === '2026-11-05' && a.time.startsWith(timeSlot.slice(0, 2)))
                        : [];
                      return (
                        <div key={dIdx} className="appt-week-slot">
                          {match.map((m) => (
                            <div
                              key={m.id}
                              className={`appt-chip tone-${m.tone}`}
                              onClick={() => {
                                setSelectedDateStr('2026-11-05');
                                setSidePanelOpen(true);
                                setDrawerAppt(m);
                              }}
                            >
                              <span className="appt-chip-time">{m.time} · {m.who}</span>
                              <span className="appt-chip-topic">{m.what}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'day' && (
            <div className="appt-calendar-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#0F172A' }}>
                    Schedule for Thursday, November 5, 2026
                  </h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
                    {selectedDayAppts.length} appointments confirmed today
                  </p>
                </div>
                <span className="appt-status-badge">
                  <span className="appt-status-dot" /> Available
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {selectedDayAppts.map((a) => (
                  <div key={a.id} className="appt-list-item">
                    <div className="appt-list-time">
                      <span>{a.time}</span>
                      <small>GST</small>
                    </div>
                    <div className="appt-list-info">
                      <div className="appt-list-who">{a.who}</div>
                      <div className="appt-list-topic">{a.what}</div>
                      <div className="appt-list-counsellor">
                        <User size={13} /> {a.doctor} · {a.mode === 'online' ? <Video size={13} /> : <MapPin size={13} />} {a.type}
                      </div>
                    </div>
                    <div className="appt-list-actions">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setSidePanelOpen(true);
                          setDrawerAppt(a);
                        }}
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(viewMode === 'list' || viewMode === 'consultation') && (
            <div className="appt-calendar-card appt-list-view">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  {viewMode === 'consultation' ? 'Telehealth & Clinic Consultations' : 'All Scheduled Appointments'}
                </h3>
                <span style={{ fontSize: 13, color: '#64748B' }}>
                  Showing {filteredAppointments.length} appointment(s)
                </span>
              </div>

              {filteredAppointments.map((appt) => (
                <div key={appt.id} className="appt-list-item">
                  <div className="appt-list-time">
                    <span>{appt.time}</span>
                    <small>{appt.date.slice(5)}</small>
                  </div>

                  <div className="appt-list-info">
                    <div className="appt-list-who">{appt.who}</div>
                    <div className="appt-list-topic">{appt.what}</div>
                    <div className="appt-list-counsellor">
                      <User size={13} /> {appt.doctor} · {appt.mode === 'online' ? 'Google Meet Video' : 'DaNA Partner Clinic'}
                    </div>
                  </div>

                  <div className="appt-list-actions">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setSelectedDateStr(appt.date);
                        setSidePanelOpen(true);
                        setDrawerAppt(appt);
                      }}
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── SIDE PANEL DRAWER (Images 2, 3 & 4) ─── */}
        {sidePanelOpen && (
          <aside className="appt-side-panel">
            {/* Drawer Header */}
            <div className="appt-panel-header">
              <div>
                <h2 className="appt-panel-date-title">
                  {selectedDateStr === '2026-11-05' ? 'Thursday, November 5' : `Date: ${selectedDateStr}`}
                </h2>
                <p className="appt-panel-count-sub">
                  {selectedDayAppts.length} appointment{selectedDayAppts.length !== 1 ? 's' : ''} scheduled
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="appt-panel-badge-available">Available</span>
                <button
                  type="button"
                  className="appt-panel-close-btn"
                  onClick={() => setSidePanelOpen(false)}
                  title="Close panel"
                  aria-label="Close panel"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ── STATE A: List of appointments for the day (Image 2) ── */}
            {!drawerAppt ? (
              <>
                <div className="appt-panel-body">
                  <h3 className="appt-panel-section-title">Today's appointments</h3>

                  {selectedDayAppts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94A3B8' }}>
                      <CalendarIcon size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                      <p style={{ margin: 0, fontSize: 14 }}>No appointments scheduled for this date.</p>
                      <button
                        type="button"
                        className="appt-btn-new"
                        style={{ marginTop: 14, display: 'inline-flex' }}
                        onClick={() => { setNewDate(selectedDateStr); setNewApptModal(true); }}
                      >
                        + Book for this date
                      </button>
                    </div>
                  ) : (
                    selectedDayAppts.map((appt) => (
                      <div key={appt.id} className="appt-card-dark">
                        <div className="appt-card-dark-top">
                          <span className="appt-card-dark-time">{appt.time}</span>
                          <span
                            className={
                              appt.priority === 'urgent'
                                ? 'dark-badge-urgent'
                                : appt.priority === 'pending'
                                  ? 'dark-badge-pending'
                                  : 'dark-badge-upcoming'
                            }
                          >
                            {appt.priority}
                          </span>
                        </div>

                        <div>
                          <h4 className="appt-card-dark-who">{appt.who}</h4>
                          <p className="appt-card-dark-what">{appt.what}</p>
                        </div>

                        <div className="appt-card-dark-bottom">
                          <button
                            type="button"
                            className="appt-card-link-btn"
                            onClick={() => setDrawerAppt(appt)}
                          >
                            View details →
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="appt-panel-footer">
                  <span>
                    {selectedDayAppts.length} appointments · {selectedDayAppts.filter((a) => a.priority === 'urgent').length} urgent
                  </span>
                  <button
                    type="button"
                    className="appt-panel-footer-btn"
                    onClick={() => setAvailabilityModal(true)}
                  >
                    Manage availability
                  </button>
                </div>
              </>
            ) : (
              /* ── STATE B: Appointment Detail View Inside Drawer (Images 3 & 4) ── */
              <>
                <div className="appt-panel-body">
                  {/* Previous / Next navigation controls */}
                  <div className="appt-detail-nav">
                    <button
                      type="button"
                      className="appt-detail-back-btn"
                      onClick={() => setDrawerAppt(null)}
                    >
                      ← Back to list
                    </button>

                    <div className="appt-detail-pager">
                      <button
                        type="button"
                        className="appt-pager-btn"
                        onClick={handlePrevAppt}
                        disabled={currentApptIndex <= 0}
                        title="Previous appointment"
                      >
                        ⟨ Prev
                      </button>
                      <span style={{ fontSize: 11.5, color: '#94A3B8' }}>
                        {currentApptIndex + 1} of {selectedDayAppts.length}
                      </span>
                      <button
                        type="button"
                        className="appt-pager-btn"
                        onClick={handleNextAppt}
                        disabled={currentApptIndex >= selectedDayAppts.length - 1}
                        title="Next appointment"
                      >
                        Next ⟩
                      </button>
                    </div>
                  </div>

                  {/* Header */}
                  <div>
                    <span className="appt-detail-eyebrow">APPOINTMENT DETAILS</span>
                    <div className="appt-detail-title-row">
                      <h3 className="appt-detail-title">{drawerAppt.who}</h3>
                      <span
                        className={
                          drawerAppt.priority === 'urgent'
                            ? 'dark-badge-urgent'
                            : drawerAppt.priority === 'pending'
                              ? 'dark-badge-pending'
                              : 'dark-badge-upcoming'
                        }
                      >
                        {drawerAppt.priority}
                      </span>
                    </div>
                    <p className="appt-detail-sub">
                      {drawerAppt.what} · {drawerAppt.mode === 'online' ? 'Video session' : 'In-person consultation'}
                    </p>
                  </div>

                  {/* Table details (Image 3) */}
                  <div className="appt-detail-table">
                    <div className="appt-detail-row">
                      <span className="appt-detail-label">Date</span>
                      <span className="appt-detail-val">5 Nov 2026</span>
                    </div>
                    <div className="appt-detail-row">
                      <span className="appt-detail-label">Time</span>
                      <span className="appt-detail-val">{drawerAppt.time} – {drawerAppt.endTime || '09:45'}</span>
                    </div>
                    <div className="appt-detail-row">
                      <span className="appt-detail-label">Language</span>
                      <span className="appt-detail-val">{drawerAppt.language || 'Arabic'}</span>
                    </div>
                    <div className="appt-detail-row">
                      <span className="appt-detail-label">Session</span>
                      <span className="appt-detail-val">{drawerAppt.mode === 'online' ? 'Video' : 'In-person'}</span>
                    </div>
                  </div>

                  {/* ── Online vs Offline Section (Image 4) ── */}
                  {drawerAppt.mode === 'online' ? (
                    <div className="appt-meeting-box">
                      <div className="appt-meeting-box-title">
                        <Video size={16} color="#34D399" />
                        <span>Google Meet</span>
                      </div>
                      <p className="appt-meeting-box-sub">
                        Meeting link is available to authorized participants.
                      </p>
                      <a
                        href={drawerAppt.meetLink || 'https://meet.google.com/dan-pren-900'}
                        target="_blank"
                        rel="noreferrer"
                        className="appt-btn-join"
                      >
                        <ExternalLink size={15} />
                        Join consultation
                      </a>
                      <div className="appt-meeting-actions-sub">
                        <button
                          type="button"
                          className="appt-action-link"
                          onClick={() => handleCopyLink(drawerAppt.meetLink || 'https://meet.google.com/dan-pren-900')}
                        >
                          {copyFeedback ? '✓ Copied link' : 'Copy meeting link'}
                        </button>
                        <button
                          type="button"
                          className="appt-action-link"
                          onClick={() => {
                            setApptToReschedule(drawerAppt);
                            setRescheduleModal(true);
                          }}
                        >
                          Reschedule
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="appt-meeting-box">
                      <div className="appt-meeting-box-title">
                        <MapPin size={16} color="#34D399" />
                        <span>{drawerAppt.clinicName || 'DaNA Partner Clinic'}</span>
                      </div>
                      <p className="appt-meeting-box-sub" style={{ color: '#F1F5F9', fontWeight: 600 }}>
                        {drawerAppt.clinicRoom || 'Abu Dhabi · Building A · Room 204'}
                      </p>
                      <p className="appt-meeting-box-sub">
                        {drawerAppt.clinicAddress || 'Cleveland Clinic Abu Dhabi, Al Maryah Island'}
                      </p>
                      <div className="appt-meeting-actions-sub" style={{ marginTop: 4 }}>
                        <button
                          type="button"
                          className="appt-card-link-btn"
                          onClick={() => alert(`Directions to ${drawerAppt.clinicName}: Cleveland Clinic Abu Dhabi, Al Maryah Island, Clinical Building A, 2nd Floor, Room 204.`)}
                        >
                          View directions →
                        </button>
                        <button
                          type="button"
                          className="appt-action-link"
                          onClick={() => {
                            setApptToReschedule(drawerAppt);
                            setRescheduleModal(true);
                          }}
                        >
                          Reschedule
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Appointment Actions Group (Image 3) */}
                  <div className="appt-actions-group">
                    <h4 className="appt-actions-title">Appointment actions</h4>
                    <div className="appt-actions-buttons">
                      <button
                        type="button"
                        className="appt-act-btn"
                        onClick={() => {
                          setApptToReschedule(drawerAppt);
                          setRescheduleModal(true);
                        }}
                      >
                        <CalendarCheck size={16} color="#38BDF8" />
                        Reschedule
                      </button>

                      <button
                        type="button"
                        className="appt-act-btn"
                        onClick={() => handleMarkComplete(drawerAppt)}
                      >
                        <Check size={16} color="#34D399" />
                        Complete
                      </button>

                      <button
                        type="button"
                        className="appt-act-btn btn-cancel"
                        onClick={() => handleCancelAppt(drawerAppt)}
                      >
                        <X size={16} color="#F87171" />
                        Cancel
                      </button>
                    </div>
                  </div>

                  {/* Primary Link Button (Image 3) */}
                  <a
                    href={`#/app/case/${drawerAppt.cid || 'c2'}`}
                    className="appt-btn-case-details"
                  >
                    <span>Open case details</span>
                    <ExternalLink size={16} />
                  </a>
                </div>
              </>
            )}
          </aside>
        )}
      </div>

      {/* ─── AVAILABILITY DIALOG (Image 1) ─── */}
      {availabilityModal && (
        <Dialog
          title="Availability & Working Hours"
          onClose={() => setAvailabilityModal(false)}
          onSubmit={(e) => {
            e.preventDefault();
            setAvailabilityModal(false);
            showToast('Availability settings updated.');
          }}
          footer={
            <>
              <button
                type="button"
                className="btn-line"
                onClick={() => setAvailabilityModal(false)}
              >
                Close
              </button>
              <button type="submit" className="btn">
                Save Availability
              </button>
            </>
          }
        >
          {/* Item 1: Available / Unavailable toggle */}
          <div className="avail-toggle-row">
            <div>
              <b style={{ fontSize: 15, color: '#0F172A', display: 'block', marginBottom: 2 }}>
                Consultation Status
              </b>
              <span style={{ fontSize: 13, color: '#64748B' }}>
                Toggle your active availability for premarital patient booking.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAvailable(!isAvailable)}
              style={{
                background: isAvailable ? '#00843D' : '#94A3B8',
                color: '#ffffff',
                border: 'none',
                borderRadius: 20,
                padding: '8px 16px',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffffff' }} />
              {isAvailable ? 'Available' : 'Unavailable'}
            </button>
          </div>

          {/* Item 2: Working days and hours */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 13.5, fontWeight: 700, color: '#1E293B', display: 'block', marginBottom: 4 }}>
              Working Days &amp; Consultation Hours
            </label>
            <div className="avail-days-grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => {
                const active = workingDays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    className={`avail-day-pill ${active ? 'active' : ''}`}
                    onClick={() => {
                      setWorkingDays((prev) =>
                        active ? prev.filter((x) => x !== d) : [...prev, d]
                      );
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="appt-form-group">
                <label>Day Start Time (GST)</label>
                <input
                  type="time"
                  className="appt-form-control"
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                />
              </div>
              <div className="appt-form-group">
                <label>Day End Time (GST)</label>
                <input
                  type="time"
                  className="appt-form-control"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Item 3: Breaks and blocked dates */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 13.5, fontWeight: 700, color: '#1E293B', display: 'block', marginBottom: 8 }}>
              Breaks &amp; Blocked Buffers
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F1F5F9', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
                <div>
                  <b style={{ color: '#0F172A' }}>Daily Lunch Break</b>
                  <div style={{ color: '#64748B', fontSize: 12 }}>13:00 – 14:00 GST</div>
                </div>
                <Badge tone="grey">Standard Break</Badge>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FEF2F2', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
                <div>
                  <b style={{ color: '#991B1B' }}>Emergency Buffer (Tier 1 Priority)</b>
                  <div style={{ color: '#B91C1C', fontSize: 12 }}>16:00 – 17:00 GST (Reserved for urgent pregnant couples)</div>
                </div>
                <Badge tone="red">Reserved Buffer</Badge>
              </div>
            </div>
          </div>

          {/* Item 4 & 5: Google Calendar connection status & Manage calendar sync */}
          <div className="avail-sync-box">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
                <b style={{ fontSize: 14, color: '#0F172A' }}>Google Calendar Connected</b>
              </div>
              <div style={{ fontSize: 12.5, color: '#64748B' }}>
                Synced with <b>dr.mariam@doh.gov.ae</b> · 2-way real-time calendar synchronization active.
              </div>
            </div>
            <button
              type="button"
              className="btn-soft"
              onClick={() => showToast('Calendar synced with Google Calendar.')}
            >
              Sync Now
            </button>
          </div>
        </Dialog>
      )}

      {/* ─── NEW APPOINTMENT MODAL (Image 4: Online vs Offline) ─── */}
      {newApptModal && (
        <Dialog
          title="Create New Appointment"
          onClose={() => setNewApptModal(false)}
          onSubmit={handleCreateAppointment}
          footer={
            <>
              <button
                type="button"
                className="btn-line"
                onClick={() => setNewApptModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn">
                Confirm &amp; Schedule
              </button>
            </>
          }
        >
          {/* Section 1: Online vs Offline Selection Cards (Image 4) */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13.5, fontWeight: 700, color: '#1E293B', display: 'block', marginBottom: 8 }}>
              Appointment Mode
            </label>
            <div className="appt-mode-cards">
              <div
                className={`appt-mode-card ${newMode === 'online' ? 'selected' : ''}`}
                onClick={() => setNewMode('online')}
              >
                <Video size={22} color={newMode === 'online' ? '#00843D' : '#64748B'} />
                <strong>Online</strong>
                <small>Video consultation</small>
              </div>

              <div
                className={`appt-mode-card ${newMode === 'offline' ? 'selected' : ''}`}
                onClick={() => setNewMode('offline')}
              >
                <MapPin size={22} color={newMode === 'offline' ? '#00843D' : '#64748B'} />
                <strong>Offline</strong>
                <small>In-person consultation</small>
              </div>
            </div>
          </div>

          {/* Section 2: Mode-specific details */}
          {newMode === 'online' ? (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: 14, borderRadius: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 6 }}>
                Online Telehealth Settings
              </div>
              <div className="appt-form-group" style={{ marginBottom: 8 }}>
                <label>Meeting Provider</label>
                <input
                  type="text"
                  className="appt-form-control"
                  value="Google Meet (DoH Approved Encrypted Provider)"
                  disabled
                />
              </div>
              <div className="appt-form-group" style={{ marginBottom: 0 }}>
                <label>Meeting Link (Visible to both parties upon confirmation)</label>
                <input
                  type="url"
                  className="appt-form-control"
                  value={newMeetLink}
                  onChange={(e) => setNewMeetLink(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 14, borderRadius: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                Clinic Location Details
              </div>
              <div className="appt-form-group" style={{ marginBottom: 8 }}>
                <label>Clinic / Hospital Name</label>
                <input
                  type="text"
                  className="appt-form-control"
                  value={newClinicName}
                  onChange={(e) => setNewClinicName(e.target.value)}
                />
              </div>
              <div className="appt-form-group" style={{ marginBottom: 0 }}>
                <label>Building &amp; Room</label>
                <input
                  type="text"
                  className="appt-form-control"
                  value={newClinicRoom}
                  onChange={(e) => setNewClinicRoom(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Couple & Doctor selection */}
          <div className="appt-form-group">
            <label>Couple / Patients</label>
            <select
              className="appt-form-control"
              value={newCouple}
              onChange={(e) => {
                setNewCouple(e.target.value);
                if (e.target.value.includes('Ahmed')) setNewCid('c2');
                else if (e.target.value.includes('Khalid')) setNewCid('c1');
                else if (e.target.value.includes('Omar')) setNewCid('c4');
                else if (e.target.value.includes('Saeed')) setNewCid('c3');
                else if (e.target.value.includes('Rashid')) setNewCid('c5');
                else setNewCid('c6');
              }}
            >
              <option value="Ahmed & Noura">Ahmed Al Ketbi & Noura Al Ketbi (Prenatal · Urgent)</option>
              <option value="Khalid & Fatima">Khalid Al Mansoori & Fatima Al Hammadi (Thalassaemia Carrier Concordant)</option>
              <option value="Omar & Latifa">Omar Al Dhaheri & Latifa Al Mazrouei (G6PD Carrier)</option>
              <option value="Saeed & Maryam">Saeed Al Nuaimi & Maryam Al Shamsi (SMA Carrier)</option>
              <option value="Rashid & Aisha">Rashid Al Suwaidi & Aisha Al Falasi (CFTR Carrier)</option>
              <option value="Hamdan & Shamma">Hamdan Al Qubaisi & Shamma Al Zaabi</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="appt-form-group">
              <label>Date</label>
              <input
                type="date"
                className="appt-form-control"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="appt-form-group">
              <label>Time Slot (GST)</label>
              <input
                type="time"
                className="appt-form-control"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="appt-form-group">
              <label>Attending Genetic Counsellor</label>
              <select
                className="appt-form-control"
                value={newDoctor}
                onChange={(e) => setNewDoctor(e.target.value)}
              >
                <option value="Dr. Mariam Al Hosani">Dr. Mariam Al Hosani</option>
                <option value="Dr. Tariq Al Nuaimi">Dr. Tariq Al Nuaimi</option>
                <option value="Dr. Fatima Al Zaabi">Dr. Fatima Al Zaabi</option>
              </select>
            </div>
            <div className="appt-form-group">
              <label>Language</label>
              <select
                className="appt-form-control"
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
              >
                <option value="Arabic">Arabic (العربية)</option>
                <option value="English">English</option>
              </select>
            </div>
          </div>

          <div className="appt-form-group">
            <label>Clinical Objective / Focus</label>
            <input
              type="text"
              className="appt-form-control"
              value={newTopic}
              placeholder="e.g. Prenatal diagnostic consultation, Carrier concordance"
              onChange={(e) => setNewTopic(e.target.value)}
            />
          </div>
        </Dialog>
      )}

      {/* ─── RESCHEDULE MODAL ─── */}
      {rescheduleModal && apptToReschedule && (
        <Dialog
          title={`Reschedule Appointment · ${apptToReschedule.who}`}
          onClose={() => setRescheduleModal(false)}
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirmReschedule('16:00');
          }}
          footer={
            <>
              <button
                type="button"
                className="btn-line"
                onClick={() => setRescheduleModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handleConfirmReschedule('16:00')}
              >
                Confirm Alternative Slot
              </button>
            </>
          }
        >
          <p style={{ fontSize: 14, color: '#334155', margin: '0 0 16px' }}>
            Current appointment: <b>{apptToReschedule.date} at {apptToReschedule.time} GST</b>.
            Please select an alternative available slot:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '1px solid #CBD5E1', borderRadius: 8, cursor: 'pointer', background: '#F8FAFC' }}>
              <input type="radio" name="reslot" defaultChecked />
              <div>
                <b style={{ color: '#0F172A' }}>Today (5 Nov) · 16:00 GST</b>
                <div style={{ fontSize: 12, color: '#64748B' }}>Tier 1 Reserved Buffer Slot · Dr. Mariam Al Hosani</div>
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '1px solid #CBD5E1', borderRadius: 8, cursor: 'pointer' }}>
              <input type="radio" name="reslot" />
              <div>
                <b style={{ color: '#0F172A' }}>Tomorrow (6 Nov) · 10:00 GST</b>
                <div style={{ fontSize: 12, color: '#64748B' }}>Morning Consultation Window · Dr. Mariam Al Hosani</div>
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '1px solid #CBD5E1', borderRadius: 8, cursor: 'pointer' }}>
              <input type="radio" name="reslot" />
              <div>
                <b style={{ color: '#0F172A' }}>Sunday (8 Nov) · 11:30 GST</b>
                <div style={{ fontSize: 12, color: '#64748B' }}>Next Week First Slot · Dr. Mariam Al Hosani</div>
              </div>
            </label>
          </div>
          <p className="fine" style={{ marginTop: 14 }}>
            Patients will be automatically notified via SMS and their DaNA patient dashboard.
          </p>
        </Dialog>
      )}
    </div>
  );
}

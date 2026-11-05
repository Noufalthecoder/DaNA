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
  AlertCircle
} from 'lucide-react';
import { Dialog, Badge } from '../shared/ui.jsx';
import { useStore } from '../shared/store.js';
import { COUPLES, PEOPLE } from '../shared/data.js';
import { completeAppointment } from '../shared/db.js';
import './schedule.css';

const DOCTORS = [
  'All Doctors',
  'Dr. Mariam Al Hosani',
  'Dr. Tariq Al Nuaimi',
  'Dr. Fatima Al Zaabi',
];

const INITIAL_SCHEDULE = [
  {
    id: 'appt_1',
    date: '2026-11-05',
    time: '09:00',
    who: 'Ahmed & Noura',
    what: 'Urgent · prenatal testing options',
    tone: 'red',
    doctor: 'Dr. Mariam Al Hosani',
    type: 'Video',
    cid: 'c2',
    notes: 'Gestational age 11 weeks. Bilateral carrier screening positive for GJB2 sensorineural hearing loss.',
  },
  {
    id: 'appt_2',
    date: '2026-11-05',
    time: '11:30',
    who: 'Omar & Latifa',
    what: 'X-linked: planning for sons',
    tone: 'amber',
    doctor: 'Dr. Tariq Al Nuaimi',
    type: 'Video',
    cid: 'c4',
    notes: 'Latifa is an asymptomatic G6PD carrier. Discuss inheritance pattern for future male offspring.',
  },
  {
    id: 'appt_3',
    date: '2026-11-05',
    time: '14:00',
    who: 'Rashid & Aisha',
    what: 'First session · same gene (CFTR)',
    tone: 'amber',
    doctor: 'Dr. Mariam Al Hosani',
    type: 'Video',
    cid: 'c5',
    notes: 'Both partners confirmed CFTR delta-F508 heterozygous carriers. Autosomal recessive risk review.',
  },
  {
    id: 'appt_4',
    date: '2026-11-10',
    time: '10:00',
    who: 'Fatima & Khalid',
    what: 'Carrier concordance evaluation · HBB',
    tone: 'green',
    doctor: 'Dr. Mariam Al Hosani',
    type: 'Video',
    cid: 'c1',
    notes: 'Second cousins. Both carriers for Beta-thalassaemia trait. Evaluate IVF with PGT-M vs prenatal options.',
  },
  {
    id: 'appt_5',
    date: '2026-11-12',
    time: '15:00',
    who: 'Saeed & Maryam',
    what: 'SMA carrier screening discussion · SMN1',
    tone: 'green',
    doctor: 'Dr. Fatima Al Zaabi',
    type: 'Clinic',
    cid: 'c3',
    notes: 'Saeed confirmed SMN1 exon 7 carrier. Maryam screening clear.',
  },
  {
    id: 'appt_6',
    date: '2026-11-16',
    time: '11:00',
    who: 'Hamdan & Shamma',
    what: 'Premarital clearance pre-contract review',
    tone: 'blue',
    doctor: 'Dr. Tariq Al Nuaimi',
    type: 'Video',
    cid: 'c6',
    notes: 'Routine premarital genomics evaluation completed with zero common autosomal recessive variants.',
  },
];

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 10, 5)); // November 5, 2026
  const [viewMode, setViewMode] = useState('month'); // 'day' | 'week' | 'month' | 'list' | 'consultation'
  const [selectedDoctor, setSelectedDoctor] = useState('All Doctors');
  const [appointments, setAppointments] = useState(INITIAL_SCHEDULE);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [newApptModal, setNewApptModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // New appointment form state
  const [newCouple, setNewCouple] = useState('Fatima & Khalid');
  const [newDate, setNewDate] = useState('2026-11-05');
  const [newTime, setNewTime] = useState('16:00');
  const [newDoctor, setNewDoctor] = useState('Dr. Mariam Al Hosani');
  const [newType, setNewType] = useState('Video');
  const [newTopic, setNewTopic] = useState('Premarital genetic carrier evaluation');

  // Store appointments
  const bookedStore = useStore((s) => s.appointments) || {};

  // Merge store appointments with local schedule
  const allAppointments = useMemo(() => {
    const list = [...appointments];
    Object.entries(bookedStore).forEach(([cid, label]) => {
      const c = COUPLES.find((x) => x.id === cid);
      const who = c ? `${PEOPLE[c.a]?.short || 'Partner'} & ${PEOPLE[c.b]?.short || 'Partner'}` : 'Couple';
      const time = label.split('· ')[1] || '10:00';
      const what = `Booked consultation · ${label.split(' ·')[0] || 'Scheduled'}`;
      if (!list.some((item) => item.cid === cid)) {
        list.push({
          id: `booked_${cid}`,
          date: '2026-11-05',
          time,
          who,
          what,
          tone: 'green',
          doctor: 'Dr. Mariam Al Hosani',
          type: 'Video',
          cid,
          notes: 'Session booked by the couple through DaNA premarital portal.',
        });
      }
    });
    return list;
  }, [appointments, bookedStore, refreshKey]);

  // Filtered by selected doctor
  const filteredAppointments = useMemo(() => {
    if (selectedDoctor === 'All Doctors') return allAppointments;
    return allAppointments.filter((a) => a.doctor === selectedDoctor);
  }, [allAppointments, selectedDoctor]);

  // Calendar calculations for Month View
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 for Sunday
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarCells = useMemo(() => {
    const cells = [];
    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        dateStr: `${year}-${String(month).padStart(2, '0')}-${String(daysInPrevMonth - i).padStart(2, '0')}`,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      cells.push({
        dayNumber: i,
        isCurrentMonth: true,
        dateStr,
        isToday: year === 2026 && month === 10 && i === 5,
      });
    }

    // Next month filler days (fill to 35 or 42 cells)
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

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 10, 5));
  };

  const handleCreateAppointment = (e) => {
    e.preventDefault();
    const newEntry = {
      id: `custom_${Date.now()}`,
      date: newDate,
      time: newTime,
      who: newCouple,
      what: newTopic,
      tone: newType === 'Video' ? 'blue' : 'green',
      doctor: newDoctor,
      type: newType,
      notes: `Scheduled appointment with ${newDoctor}. Topic: ${newTopic}`,
    };
    setAppointments((prev) => [...prev, newEntry]);
    setNewApptModal(false);
  };

  return (
    <div className="appt-calendar-page">
      {/* Top Header */}
      <div className="appt-cal-header">
        <div className="appt-cal-title">
          <h1>Appointment Calendar</h1>
          <p>View and manage appointments in calendar view.</p>
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
            className="appt-btn-primary"
            onClick={() => setNewApptModal(true)}
          >
            <Plus size={16} />
            New Appointment
          </button>

          <button
            type="button"
            className="appt-btn-icon"
            title="Refresh schedule"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            <RotateCw size={16} />
          </button>
        </div>
      </div>

      {/* Secondary Controls Bar */}
      <div className="appt-cal-controls">
        <div className="appt-view-toggle">
          <button
            type="button"
            className={`appt-view-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
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
            onClick={handleToday}
          >
            Today
          </button>

          <div className="appt-nav-arrows">
            <button
              type="button"
              className="appt-nav-btn"
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="appt-nav-btn"
              onClick={handleNextMonth}
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

      {/* Main Content Area */}
      {viewMode === 'month' && (
        <div className="appt-calendar-card">
          <div className="appt-grid-header">
            {WEEKDAYS.map((day) => (
              <div key={day} className="appt-grid-col-head">
                {day}
              </div>
            ))}
          </div>

          <div className="appt-grid-body">
            {calendarCells.map((cell, idx) => {
              const dayAppts = filteredAppointments.filter((a) => a.date === cell.dateStr);

              return (
                <div
                  key={`${cell.dateStr}-${idx}`}
                  className={`appt-day-cell ${!cell.isCurrentMonth ? 'is-other-month' : ''} ${cell.isToday ? 'is-today' : ''}`}
                  onClick={() => {
                    if (dayAppts.length > 0) setSelectedAppt(dayAppts[0]);
                  }}
                >
                  <div className="appt-day-top">
                    <span className={`appt-day-num ${cell.isToday ? 'today-badge' : ''}`}>
                      {cell.dayNumber}
                    </span>
                  </div>

                  <div className="appt-day-appts">
                    {dayAppts.map((appt) => (
                      <div
                        key={appt.id}
                        className={`appt-chip tone-${appt.tone || 'blue'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppt(appt);
                        }}
                      >
                        <div className="appt-chip-h">
                          <span className="appt-chip-time">{appt.time}</span>
                          <span className="appt-chip-badge">{appt.type}</span>
                        </div>
                        <div className="appt-chip-who">{appt.who}</div>
                        <div className="appt-chip-topic">{appt.what}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
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
                          onClick={() => setSelectedAppt(m)}
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

      {/* Day View */}
      {viewMode === 'day' && (
        <div className="appt-calendar-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#0F172A' }}>
                Schedule for Thursday, November 5, 2026
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
                3 premarital genetic counselling sessions confirmed today
              </p>
            </div>
            <Badge tone="green">3 Consultations Active</Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredAppointments.filter((a) => a.date === '2026-11-05').map((a) => (
              <div key={a.id} className="appt-list-item">
                <div className="appt-list-time">
                  <span>{a.time}</span>
                  <small>GST (UTC+4)</small>
                </div>
                <div className="appt-list-info">
                  <div className="appt-list-who">{a.who}</div>
                  <div className="appt-list-topic">{a.what}</div>
                  <div className="appt-list-counsellor">
                    <User size={13} /> {a.doctor} · <Video size={13} /> {a.type} Telehealth
                  </div>
                </div>
                <div className="appt-list-actions">
                  <button type="button" className="btn" onClick={() => setSelectedAppt(a)}>
                    Open Dossier
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
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
                  <User size={13} /> {appt.doctor} · <MapPin size={13} /> {appt.type === 'Video' ? 'Telehealth Room' : 'Clinic (Cleveland Clinic Abu Dhabi)'}
                </div>
              </div>

              <div className="appt-list-actions">
                {appt.cid && (
                  <button
                    type="button"
                    className="btn-soft"
                    onClick={() => completeAppointment(appt.cid)}
                  >
                    Mark Done
                  </button>
                )}
                <button
                  type="button"
                  className="btn"
                  onClick={() => setSelectedAppt(appt)}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Appointment Detail Dialog */}
      {selectedAppt && (
        <Dialog
          title={`Appointment Details · ${selectedAppt.who}`}
          onClose={() => setSelectedAppt(null)}
          onSubmit={(e) => {
            e.preventDefault();
            setSelectedAppt(null);
          }}
          footer={
            <>
              <button
                type="button"
                className="btn-line"
                onClick={() => setSelectedAppt(null)}
              >
                Close
              </button>
              {selectedAppt.type === 'Video' && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => alert(`Starting encrypted video consultation session for ${selectedAppt.who}...`)}
                >
                  <Video size={16} /> Launch Video Session
                </button>
              )}
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, background: '#F8FAFC', padding: 14, borderRadius: 10 }}>
              <div>
                <span style={{ fontSize: 12, color: '#64748B', display: 'block' }}>Date & Time</span>
                <b style={{ fontSize: 14, color: '#0F172A' }}>{selectedAppt.date} at {selectedAppt.time} GST</b>
              </div>
              <div>
                <span style={{ fontSize: 12, color: '#64748B', display: 'block' }}>Assigned Geneticist</span>
                <b style={{ fontSize: 14, color: '#0F172A' }}>{selectedAppt.doctor}</b>
              </div>
              <div>
                <span style={{ fontSize: 12, color: '#64748B', display: 'block' }}>Session Modality</span>
                <b style={{ fontSize: 14, color: '#0F172A' }}>{selectedAppt.type} Telehealth</b>
              </div>
              <div>
                <span style={{ fontSize: 12, color: '#64748B', display: 'block' }}>Clinical Priority</span>
                <Badge tone={selectedAppt.tone || 'green'}>{selectedAppt.tone === 'red' ? 'Tier 1 Urgent' : 'Standard Routine'}</Badge>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', display: 'block', marginBottom: 4 }}>
                Clinical Assessment &amp; Objectives
              </label>
              <p style={{ margin: 0, fontSize: 13.5, color: '#334155', lineHeight: 1.5 }}>
                {selectedAppt.what}
              </p>
            </div>

            {selectedAppt.notes && (
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', display: 'block', marginBottom: 4 }}>
                  Patient Intake Notes
                </label>
                <div style={{ background: '#F1F5F9', padding: '10px 14px', borderRadius: 8, fontSize: 13, color: '#475569' }}>
                  {selectedAppt.notes}
                </div>
              </div>
            )}
          </div>
        </Dialog>
      )}

      {/* New Appointment Modal */}
      {newApptModal && (
        <Dialog
          title="Schedule New Premarital Consultation"
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
                Confirm &amp; Book Appointment
              </button>
            </>
          }
        >
          <div className="appt-form-group">
            <label>Couple / Patients</label>
            <select
              className="appt-form-control"
              value={newCouple}
              onChange={(e) => setNewCouple(e.target.value)}
            >
              <option value="Fatima & Khalid">Fatima Al Hammadi & Khalid Al Mansoori</option>
              <option value="Ahmed & Noura">Ahmed & Noura</option>
              <option value="Saeed & Maryam">Saeed & Maryam</option>
              <option value="Omar & Latifa">Omar & Latifa</option>
              <option value="Rashid & Aisha">Rashid & Aisha</option>
              <option value="Hamdan & Shamma">Hamdan & Shamma</option>
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
              <label>Attending Doctor / Counsellor</label>
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
              <label>Modality</label>
              <select
                className="appt-form-control"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              >
                <option value="Video">Encrypted Video Telehealth</option>
                <option value="Clinic">In-Person Consultation (Abu Dhabi)</option>
              </select>
            </div>
          </div>

          <div className="appt-form-group">
            <label>Clinical Focus / Reason for Referral</label>
            <input
              type="text"
              className="appt-form-control"
              value={newTopic}
              placeholder="e.g. Carrier concordance, prenatal testing options"
              onChange={(e) => setNewTopic(e.target.value)}
            />
          </div>
        </Dialog>
      )}
    </div>
  );
}

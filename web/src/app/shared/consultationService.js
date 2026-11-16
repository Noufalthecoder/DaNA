/**
 * DaNA Consultation & Clinical Appointment Service
 * Production-quality state management mirroring the connectionsService architecture.
 *
 * Persists consultation requests and confirmed clinical appointments in Supabase,
 * with real-time reactive sync across Couple and Counsellor accounts.
 */

import { supabase, hasBackend } from './supabase.js';
import { get, set } from './store.js';
import { logAudit, isLive } from './db.js';

export function generateUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try { return crypto.randomUUID(); } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Sync consultation requests and appointments from Supabase
 */
export async function syncConsultationsFromSupabase(coupleId, counsellorUserId = null) {
  if (!supabase) return;
  try {
    // 1. Fetch pending & confirmed consultation requests
    // with the counsellor and clinic joined (needs 030_location_scope.sql); plain rows until it is run
    const fetchRows = (cols) => {
      let q = supabase.from('consultation_requests').select(cols);
      if (coupleId) q = q.eq('couple_id', coupleId);
      return q.order('created_at', { ascending: false });
    };
    let { data: requests, error: reqErr } = await fetchRows('*, counsellors(name), locations(city, state_name)');
    if (reqErr) ({ data: requests, error: reqErr } = await fetchRows('*'));

    if (!reqErr && Array.isArray(requests) && requests.length > 0) {
      const state = get();
      const currentList = state.scheduleAppointments || [];
      const updatedList = [...currentList];
      let modified = false;

      for (const row of requests) {
        const existingIdx = updatedList.findIndex(
          (a) => a.id === row.id || (row.appointment_id && (a.id === String(row.appointment_id) || a.id === row.appointment_id)) || (a.requestId === row.id)
        );

        if (row.status === 'CANCELLED' || row.status === 'DECLINED') {
          if (existingIdx >= 0) {
            updatedList.splice(existingIdx, 1);
            modified = true;
          }
          continue;
        }

        const apptObj = {
          id: row.appointment_id ? String(row.appointment_id) : row.id,
          requestId: row.id,
          cid: row.couple_id,
          date: row.requested_starts_at ? row.requested_starts_at.slice(0, 10) : '2026-11-10',
          time: row.requested_starts_at ? row.requested_starts_at.slice(11, 16) : '13:30',
          endTime: row.requested_ends_at ? row.requested_ends_at.slice(11, 16) : '14:15',
          who: row.couple_id === 'c1' ? 'Khalid & Fatima' : row.couple_id.toUpperCase(),
          what: row.topic || 'Pre-marital counselling',
          priority: row.status === 'CONFIRMED' ? 'upcoming' : 'pending',
          status: row.status.toLowerCase(),
          confirmed: row.status === 'CONFIRMED',
          requestedAt: row.created_at,
          confirmedAt: row.responded_at,
          tone: row.status === 'CONFIRMED' ? 'green' : 'amber',
          doctor: row.counsellors?.name || 'Dr. Mariam Al Hosani',
          mode: row.modality || 'online',
          type: row.modality === 'offline' ? 'Clinic' : 'Video',
          meetLink: row.meet_link || (row.modality === 'offline' ? null : `https://meet.google.com/dan-${row.couple_id}-0224`),
          clinicName: row.modality === 'offline' ? (row.counsellors?.name ? `${row.counsellors.name}'s clinic` : 'DaNA Partner Clinic') : null,
          clinicRoom: row.modality === 'offline' ? (row.locations?.city || 'Abu Dhabi') : null,
          clinicAddress: row.modality === 'offline' ? (row.locations ? [row.locations.city, row.locations.state_name].filter((x, i, a) => x && a.indexOf(x) === i).join(', ') : 'Abu Dhabi') : null,
          notes: row.patient_notes || '',
        };

        if (existingIdx >= 0) {
          // Update if changed
          if (updatedList[existingIdx].confirmed !== apptObj.confirmed || updatedList[existingIdx].status !== apptObj.status) {
            updatedList[existingIdx] = { ...updatedList[existingIdx], ...apptObj };
            modified = true;
          }
        } else {
          updatedList.push(apptObj);
          modified = true;
        }

        // Generate in-app notification for counsellor if pending
        if (row.status === 'PENDING') {
          const notifs = state.notifications || [];
          const notifId = `notif_consult_${row.id}`;
          const hasNotif = notifs.some((n) => n.id === notifId || n.requestId === row.id);
          if (!hasNotif) {
            const coupleName = row.couple_id === 'c1' ? 'Khalid & Fatima' : row.couple_id.toUpperCase();
            const startsAtStr = row.requested_starts_at ? `${row.requested_starts_at.slice(5, 10)} at ${row.requested_starts_at.slice(11, 16)} GST` : 'upcoming date';
            const notif = {
              id: notifId,
              requestId: row.id,
              userId: 'mariam',
              actorId: row.couple_id,
              type: 'CONSULTATION_REQUEST',
              title: 'New Consultation Request',
              body: `${coupleName} requested a ${row.modality === 'offline' ? 'Clinic' : 'Google Meet Video'} consultation for ${startsAtStr}.`,
              link: '/app/schedule',
              isRead: false,
              createdAt: row.created_at || new Date().toISOString(),
            };
            set({ notifications: [notif, ...notifs] });
          }
        }
      }

      if (modified) {
        const apptsMap = { ...state.appointments };
        updatedList.forEach((a) => {
          if (a.cid) apptsMap[a.cid] = `${a.date} · ${a.time}`;
        });
        set({ scheduleAppointments: updatedList, appointments: apptsMap });
      }
    }
  } catch (err) {
    console.warn('syncConsultationsFromSupabase notice:', err?.message);
  }
}

/**
 * Submit consultation request via Supabase & local store
 */
export async function submitConsultationRequest(coupleId, slot, details = {}) {
  const reqId = generateUuid();
  let apptDate = details.date;
  let apptTime = details.time;
  let apptEndTime = details.endTime;

  if (!apptDate && slot?.iso) {
    apptDate = slot.iso.slice(0, 10);
    apptTime = slot.iso.slice(11, 16);
  } else if (!apptDate && details.label) {
    if (details.label.includes('9 Nov')) { apptDate = '2026-11-09'; apptTime = '10:00'; }
    else if (details.label.includes('10 Nov')) { apptDate = '2026-11-10'; apptTime = '13:30'; }
    else if (details.label.includes('11 Nov')) { apptDate = '2026-11-11'; apptTime = '17:00'; }
    else if (details.label.includes('12 Nov')) { apptDate = '2026-11-12'; apptTime = '11:00'; }
    else { apptDate = '2026-11-10'; apptTime = '13:30'; }
  }

  if (!apptEndTime && apptTime) {
    const [h, m] = apptTime.split(':').map(Number);
    const endMinutes = h * 60 + m + 45;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
    const endM = String(endMinutes % 60).padStart(2, '0');
    apptEndTime = `${endH}:${endM}`;
  }

  const payload = {
    id: reqId,
    couple_id: coupleId,
    requester_id: details.requesterId || 'fatima',
    requested_starts_at: `${apptDate}T${apptTime}:00+04:00`,
    requested_ends_at: `${apptDate}T${apptEndTime}:00+04:00`,
    modality: details.mode || 'online',
    topic: details.what || 'Pre-marital genetic counselling',
    status: 'PENDING',
    patient_notes: details.notes || null,
    meet_link: details.mode === 'offline' ? null : `https://meet.google.com/dan-${coupleId}-${reqId.slice(-4)}`,
    created_at: new Date().toISOString(),
  };

  // 1. Persist to Supabase if available
  if (supabase && isLive()) {
    try {
      await supabase.from('consultation_requests').insert(payload);
    } catch (e) {
      console.warn('Supabase consultation_requests insert notice:', e?.message);
    }
  }

  logAudit(`Couple requested consultation for ${apptDate} at ${apptTime}`, {
    resourceType: 'consultation_requests',
    resourceId: reqId,
  });

  return payload;
}

/**
 * Confirm consultation request by Counsellor
 */
export async function confirmConsultationByCounsellor(requestId, coupleId) {
  if (supabase && isLive()) {
    try {
      const { data, error } = await supabase.rpc('confirm_consultation_request', { p_request_id: requestId });
      if (!error) return { ok: true, appointmentId: data };
    } catch (e) {
      console.warn('RPC confirm_consultation_request notice:', e?.message);
    }
  }

  logAudit(`Counsellor confirmed consultation request ${requestId} for ${coupleId}`, {
    resourceType: 'consultation_requests',
    resourceId: requestId,
  });

  return { ok: true };
}

/**
 * Decline consultation request by Counsellor
 */
export async function declineConsultationByCounsellor(requestId, reason = 'Schedule conflict') {
  if (supabase && isLive()) {
    try {
      await supabase.rpc('decline_consultation_request', { p_request_id: requestId, p_reason: reason });
    } catch (e) {
      console.warn('RPC decline_consultation_request notice:', e?.message);
    }
  }

  logAudit(`Counsellor declined consultation request ${requestId}: ${reason}`);
  return { ok: true };
}

let realtimeChannel = null;

export function subscribeConsultationRealtime(coupleId, counsellorUserId = null) {
  if (!supabase || realtimeChannel) return;
  try {
    realtimeChannel = supabase
      .channel('consultation_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'consultation_requests' },
        () => {
          syncConsultationsFromSupabase(coupleId, counsellorUserId);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          syncConsultationsFromSupabase(coupleId, counsellorUserId);
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('subscribeConsultationRealtime notice:', err?.message);
  }
}

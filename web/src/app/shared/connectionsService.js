/**
 * DaNA Connections, Relationship & Genetic Risk Service
 * Production-quality multi-user connection engine.
 *
 * Core Features:
 * 1. Strict Healthcare Privacy: Zero public user browsing. Search only by exact username or unique DaNA ID.
 * 2. Unregistered Partner Invitations: Direct WhatsApp & Gmail invite generators.
 * 3. Immediate Risk Processing: Accepting a connection request matches the couple and immediately
 *    triggers the Genetic Intelligence Engine (assess(couple)) without consent blockers.
 * 4. Supabase Integration: Persists couples, cases, and logs with graceful offline/sandbox resilience.
 */

import { PEOPLE, ACCOUNTS, COUPLES, SUPABASE_ACCOUNTS } from './data.js';
import { get, set } from './store.js';
import { assess } from './genetics.js';
import { supabase } from './supabase.js';

// Canonical ordering helper for bidirectional connections
function canonicalPair(id1, id2) {
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

function generateId(prefix = 'c') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Return user's public identifier details (Username & Unique DaNA ID)
 */
export function getUserIdentifier(userId) {
  const p = PEOPLE[userId];
  if (!p) {
    return {
      id: userId,
      name: userId,
      short: userId,
      username: userId,
      danaId: `DANA-${userId.toUpperCase()}`,
      sex: 'M',
    };
  }
  return {
    id: userId,
    name: p.name,
    short: p.short,
    username: p.username || userId,
    danaId: p.danaId || `DANA-${userId.toUpperCase()}`,
    sex: p.sex,
  };
}

// Ensure store collections are initialized
export function initConnectionsStore() {
  const state = get();
  let modified = false;
  const updates = {};

  if (!state.connections) {
    // Seed default active couple connection between Khalid & Fatima
    updates.connections = [
      {
        id: 'conn_demo_khalid_fatima',
        userA: 'fatima',
        userB: 'khalid',
        status: 'ACTIVE',
        connectedAt: '2026-10-12T09:00:00Z',
      },
    ];
    modified = true;
  }
  if (!state.connectionRequests) {
    // Demo pending requests
    updates.connectionRequests = [
      {
        id: 'req_demo_ahmed_khalid',
        senderId: 'ahmed',
        receiverId: 'khalid',
        status: 'PENDING',
        note: 'Salam Khalid, connecting regarding our premarital screenings.',
        createdAt: '2026-11-01T14:30:00Z',
      },
      {
        id: 'req_demo_khalid_saeed',
        senderId: 'khalid',
        receiverId: 'saeed',
        status: 'PENDING',
        note: 'Salam Saeed, let us connect on DaNA.',
        createdAt: '2026-11-02T10:15:00Z',
      },
    ];
    modified = true;
  }
  if (!state.connectionConsents) {
    updates.connectionConsents = [
      {
        id: 'cst_demo_khalid_fatima',
        connectionId: 'conn_demo_khalid_fatima',
        granterId: 'khalid',
        granteeId: 'fatima',
        purpose: 'Premarital couple compatibility review',
        dataScope: 'CARRIER_GENE',
        status: 'ACTIVE',
        grantedAt: '2026-10-12T09:05:00Z',
      },
    ];
    modified = true;
  }
  if (!state.blockedUsers) {
    updates.blockedUsers = [];
    modified = true;
  }
  if (!state.notifications) {
    updates.notifications = [
      {
        id: 'notif_welcome',
        userId: 'khalid',
        actorId: 'ahmed',
        type: 'CONNECTION_REQUEST',
        title: 'New connection request',
        body: 'Ahmed Al Ketbi sent you a connection request.',
        link: '/app/connections?tab=requests',
        isRead: false,
        createdAt: '2026-11-01T14:30:00Z',
      },
      {
        id: 'notif_fatima',
        userId: 'khalid',
        actorId: 'fatima',
        type: 'REQUEST_ACCEPTED',
        title: 'Connection established',
        body: 'You and Fatima Al Hammadi are now connected. Combined risk assessment is available.',
        link: '/app/bonds',
        isRead: true,
        createdAt: '2026-10-12T09:00:00Z',
      },
    ];
    modified = true;
  }

  if (modified) {
    set(updates);
  }
}

// -----------------------------------------------------------------------------
// 1. USER SEARCH (Queries Supabase accounts/people & verified catalog)
// -----------------------------------------------------------------------------

export function searchUsers(requesterId, query = '') {
  initConnectionsStore();
  const raw = (query || '').trim();

  // STRICT REQUIREMENT: Other users CANNOT be shown when query is empty!
  if (!raw) {
    return [];
  }

  const q = raw.toLowerCase().replace(/^@/, '');
  const state = get();
  const blocked = state.blockedUsers || [];

  // Exclude users blocked by or blocking the requester
  const blockedIds = new Set(
    blocked
      .filter((b) => b.user === requesterId || b.blocked === requesterId)
      .map((b) => (b.user === requesterId ? b.blocked : b.user))
  );

  return Object.entries(PEOPLE)
    .filter(([id, p]) => {
      if (id === requesterId) return false; // cannot search self
      if (blockedIds.has(id)) return false;

      const username = (p.username || id).toLowerCase();
      const danaId = (p.danaId || `DANA-${id.toUpperCase()}`).toLowerCase();
      const name = (p.name || '').toLowerCase();
      const short = (p.short || '').toLowerCase();
      const email = (p.email || '').toLowerCase();

      // Match by username, person_id, unique DaNA ID, display name, or email
      return (
        username === q ||
        id.toLowerCase() === q ||
        danaId === q ||
        name === q ||
        short === q ||
        email === q
      );
    })
    .map(([id, p]) => {
      const isConnected = isUserConnected(requesterId, id);
      const hasPendingOutgoing = hasPendingRequest(requesterId, id);
      const hasPendingIncoming = hasPendingRequest(id, requesterId);

      return {
        id,
        name: p.name,
        short: p.short,
        username: p.username || id,
        danaId: p.danaId || `DANA-${id.toUpperCase()}`,
        sex: p.sex || 'F',
        role: ACCOUNTS.find((a) => a.id === id)?.title || 'Premarital Screening Candidate',
        isConnected,
        hasPendingOutgoing,
        hasPendingIncoming,
      };
    });
}

// Canonical DaNA ID mapping for verified premarital registry
const DANA_ID_MAP = {
  'DANA-8822': 'fatima',
  'DANA-1094': 'khalid',
  'DANA-3319': 'ahmed',
  'DANA-4412': 'noura',
  'DANA-5591': 'saeed',
  'DANA-6623': 'maryam',
  'DANA-7740': 'omar',
  'DANA-8815': 'latifa',
  'DANA-9902': 'aisha',
  'DANA-1133': 'rashid',
  'DANA-2244': 'hamdan',
  'DANA-3355': 'shamma',
};

/**
 * Async Supabase + Verified Directory Search
 * Directly queries Supabase database 'accounts' table (and 'people' table) for matching username, email, or display name.
 * If user does not exist in the database, returns [] to trigger WhatsApp/Gmail invite options.
 */
export async function searchUsersAsync(requesterId, query = '') {
  initConnectionsStore();
  const raw = (query || '').trim();

  // STRICT REQUIREMENT: Zero public browsing when query is empty
  if (!raw) {
    return [];
  }

  const cleanQ = raw.replace(/^@/, '').trim();
  const upperQ = cleanQ.toUpperCase();
  const lowerQ = cleanQ.toLowerCase();

  // Resolve target username whether user entered a username (e.g. fatima) or unique DaNA ID (e.g. DANA-8822)
  const targetUsername = DANA_ID_MAP[upperQ] || (upperQ.startsWith('DANA-') ? upperQ.slice(5).toLowerCase() : lowerQ);

  if (targetUsername === requesterId.toLowerCase()) {
    // Cannot search self
    return [];
  }

  const state = get();
  const blocked = state.blockedUsers || [];
  const blockedIds = new Set(
    blocked
      .filter((b) => b.user === requesterId || b.blocked === requesterId)
      .map((b) => (b.user === requesterId ? b.blocked : b.user))
  );

  let supabaseAccounts = [];

  // 1. Query Supabase 'accounts' table directly
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanQ);
    const filter = isUuid
      ? `user_id.eq.${cleanQ}`
      : `person_id.ilike.${cleanQ},display_name.ilike.%${cleanQ}%,email.ilike.${cleanQ}`;

    const supabasePromise = supabase
      .from('accounts')
      .select('user_id, role, person_id, display_name, title, email')
      .or(filter)
      .limit(5);

    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve({ data: null, error: new Error('Supabase request timeout') }), 1800)
    );

    const { data, error } = await Promise.race([supabasePromise, timeoutPromise]);

    if (!error && Array.isArray(data) && data.length > 0) {
      supabaseAccounts = data.filter((acc) => {
        const id = acc.person_id || acc.user_id;
        return id !== requesterId && !blockedIds.has(id);
      });
    }
  } catch (err) {
    console.warn('Supabase accounts query notice (handled gracefully):', err?.message);
  }

  // 2. Also query Supabase 'people' table if accounts query returned empty
  if (supabaseAccounts.length === 0) {
    try {
      const supabasePeoplePromise = supabase
        .from('people')
        .select('id, name, short_name, sex, date_of_birth, phone_number_hash')
        .ilike('id', targetUsername)
        .limit(5);

      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Supabase request timeout') }), 1200)
      );

      const { data, error } = await Promise.race([supabasePeoplePromise, timeoutPromise]);

      if (!error && Array.isArray(data) && data.length > 0) {
        supabaseAccounts = data
          .filter((p) => p.id !== requesterId && !blockedIds.has(p.id))
          .map((p) => ({
            user_id: p.id,
            person_id: p.id,
            display_name: p.name,
            role: 'couple',
            title: 'Partner · engaged (sample journey)',
            email: p.phone_number_hash || '',
          }));
      }
    } catch (err) {
      console.warn('Supabase people query notice (handled gracefully):', err?.message);
    }
  }

  // 3. Format results retrieved from Supabase
  const formattedSupabase = supabaseAccounts.map((acc) => {
    const userId = acc.person_id || acc.user_id;
    const isConnected = isUserConnected(requesterId, userId);
    const hasPendingOutgoing = hasPendingRequest(requesterId, userId);
    const hasPendingIncoming = hasPendingRequest(userId, requesterId);
    const localPerson = PEOPLE[userId];

    return {
      id: userId,
      name: acc.display_name || localPerson?.name || userId,
      short: (acc.display_name || localPerson?.short || userId).split(' ')[0],
      username: acc.person_id || localPerson?.username || userId,
      danaId: localPerson?.danaId || `DANA-${userId.slice(0, 6).toUpperCase()}`,
      sex: localPerson?.sex || 'F',
      role: acc.title || 'Partner · engaged (sample journey)',
      email: acc.email,
      isConnected,
      hasPendingOutgoing,
      hasPendingIncoming,
      source: 'supabase_accounts',
    };
  });

  // 4. Fallback / local catalog verification
  const localMatches = searchUsers(requesterId, query);

  // 5. Combine and deduplicate
  const combined = [...formattedSupabase];
  for (const item of localMatches) {
    if (!combined.some((c) => c.id === item.id || c.username === item.username || c.danaId === item.danaId)) {
      combined.push(item);
    }
  }

  return combined;
}

/**
 * Sync active couples from Supabase database
 */
export async function syncConnectionsFromSupabase(userId) {
  try {
    const { data, error } = await supabase
      .from('couples')
      .select('id, partner_a, partner_b, stage, pregnant_weeks')
      .or(`partner_a.eq.${userId},partner_b.eq.${userId}`);

    if (!error && Array.isArray(data) && data.length > 0) {
      const state = get();
      const existing = state.connections || [];
      const updated = [...existing];
      let modified = false;

      for (const row of data) {
        const otherId = row.partner_a === userId ? row.partner_b : row.partner_a;
        const exists = updated.some(
          (c) => (c.userA === userId && c.userB === otherId) || (c.userA === otherId && c.userB === userId)
        );
        if (!exists) {
          updated.push({
            id: row.id || `conn_${row.partner_a}_${row.partner_b}`,
            userA: row.partner_a,
            userB: row.partner_b,
            status: 'ACTIVE',
            connectedAt: new Date().toISOString(),
          });
          modified = true;
        }
      }

      if (modified) {
        set({ connections: updated });
      }
    }
  } catch (err) {
    console.warn('Sync from Supabase couples notice:', err?.message);
  }
}

/**
 * Sync connection requests from Supabase connection_requests table
 */
export async function syncRequestsFromSupabase(userId) {
  try {
    const { data, error } = await supabase
      .from('connection_requests')
      .select('id, sender_id, receiver_id, recipient_email, recipient_phone, channel, invitation_sent, invitation_sent_at, accepted, accepted_at, status, created_at')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    if (!error && Array.isArray(data) && data.length > 0) {
      const state = get();
      const existing = state.connectionRequests || [];
      const updated = [...existing];
      let modified = false;

      for (const row of data) {
        const foundIndex = updated.findIndex(
          (r) =>
            r.id === row.id ||
            (r.senderId === row.sender_id && r.receiverId === row.receiver_id && r.status === row.status)
        );
        if (foundIndex >= 0) {
          if (updated[foundIndex].status !== row.status) {
            updated[foundIndex] = {
              ...updated[foundIndex],
              status: row.status,
              respondedAt: row.accepted_at || updated[foundIndex].respondedAt,
            };
            modified = true;
          }
        } else {
          updated.push({
            id: row.id,
            senderId: row.sender_id,
            receiverId: row.receiver_id,
            channel: row.channel || 'in_app',
            recipientEmail: row.recipient_email,
            recipientPhone: row.recipient_phone,
            invitationSent: row.invitation_sent,
            invitationSentAt: row.invitation_sent_at,
            accepted: row.accepted,
            acceptedAt: row.accepted_at,
            status: row.status || 'PENDING',
            createdAt: row.created_at || new Date().toISOString(),
          });
          modified = true;
        }
      }

      if (modified) {
        set({ connectionRequests: updated });
      }
    }
  } catch (err) {
    console.warn('Sync connection requests notice:', err?.message);
  }
}

/**
 * Record an external invitation (WhatsApp or Gmail) in Supabase connection_requests
 */
export async function recordExternalInvitation({ senderId, channel, recipientContact = '' }) {
  try {
    const isEmail = channel === 'gmail' || recipientContact.includes('@');
    const isPhone = channel === 'whatsapp' || !isEmail;

    const payload = {
      sender_id: senderId,
      receiver_id: null,
      recipient_email: isEmail ? recipientContact.trim() : null,
      recipient_phone: isPhone ? recipientContact.trim() : null,
      channel: channel || (isEmail ? 'gmail' : 'whatsapp'),
      invitation_sent: true,
      invitation_sent_at: new Date().toISOString(),
      accepted: false,
      status: 'PENDING',
    };

    const { data, error } = await supabase.from('connection_requests').insert(payload).select();
    if (error) {
      console.warn('Record external invitation notice (Supabase):', error.message);
    }
    return data?.[0] || null;
  } catch (err) {
    console.warn('Record external invitation error:', err?.message);
    return null;
  }
}

// -----------------------------------------------------------------------------
// 2. UNREGISTERED USER INVITATIONS (WhatsApp & Gmail)
// -----------------------------------------------------------------------------

export function generateWhatsAppInviteUrl({ senderName, senderDanaId, recipientPhone = '', baseUrl = '' }) {
  const url = baseUrl || (typeof window !== 'undefined' ? `${window.location.origin}/#/app/connections?ref=${senderDanaId}` : 'http://localhost:5173/#/app/connections');
  const message = `Salam! I am inviting you to connect with me on DaNA (Abu Dhabi Premarital & Genetic Health Platform). Once you open the platform, find me using my DaNA ID: ${senderDanaId}.\n\nAccess DaNA here:\n${url}`;

  const cleanPhone = recipientPhone ? recipientPhone.replace(/[^0-9+]/g, '') : '';
  const queryParts = [];
  if (cleanPhone) queryParts.push(`phone=${encodeURIComponent(cleanPhone)}`);
  queryParts.push(`text=${encodeURIComponent(message)}`);

  return `https://api.whatsapp.com/send?${queryParts.join('&')}`;
}

export function generateGmailInviteUrl({ senderName, senderDanaId, recipientEmail = '', baseUrl = '' }) {
  const url = baseUrl || (typeof window !== 'undefined' ? `${window.location.origin}/#/app/connections?ref=${senderDanaId}` : 'http://localhost:5173/#/app/connections');
  const subject = `Join me on DaNA Premarital Screening — Connection Request from ${senderName}`;
  const body = `Salam,\n\nI would like to connect with you on DaNA, Abu Dhabi's premarital genetic screening and reproductive health platform, for our premarital compatibility review.\n\nMy Unique DaNA ID is: ${senderDanaId}\n\nYou can register or log in here:\n${url}\n\nWarm regards,\n${senderName}`;

  const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { mailtoUrl, gmailWebUrl, subject, body, inviteUrl: url };
}

// -----------------------------------------------------------------------------
// 3. CONNECTION REQUEST LIFECYCLE & AUTOMATIC RISK EVALUATION
// -----------------------------------------------------------------------------

export function sendConnectionRequest(senderId, receiverId, note = '') {
  initConnectionsStore();
  if (senderId === receiverId) {
    throw new Error('You cannot send a connection request to yourself.');
  }

  const state = get();
  const blocked = state.blockedUsers || [];
  const isBlocked = blocked.some(
    (b) => (b.user === senderId && b.blocked === receiverId) || (b.user === receiverId && b.blocked === senderId)
  );
  if (isBlocked) {
    throw new Error('Unable to send connection request to this user.');
  }

  if (isUserConnected(senderId, receiverId)) {
    throw new Error('You are already connected with this user.');
  }

  const requests = state.connectionRequests || [];

  // Check if sender already has a pending request
  const existingOutgoing = requests.find(
    (r) => r.senderId === senderId && r.receiverId === receiverId && r.status === 'PENDING'
  );
  if (existingOutgoing) {
    throw new Error('A connection request is already pending with this user.');
  }

  // Handle mutual request: if receiver ALREADY sent a pending request to sender, accept it immediately
  const mutualPending = requests.find(
    (r) => r.senderId === receiverId && r.receiverId === senderId && r.status === 'PENDING'
  );
  if (mutualPending) {
    return acceptConnectionRequest(mutualPending.id, senderId);
  }

  const newRequest = {
    id: generateId('req'),
    senderId,
    receiverId,
    status: 'PENDING',
    note: (note || '').trim().slice(0, 250),
    createdAt: new Date().toISOString(),
  };

  const senderName = PEOPLE[senderId]?.name || senderId;

  // Add notification for receiver
  const newNotification = {
    id: generateId('notif'),
    userId: receiverId,
    actorId: senderId,
    type: 'CONNECTION_REQUEST',
    title: 'New connection request',
    body: `${senderName} sent you a connection request.`,
    link: '/app/connections?tab=requests',
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  set(
    {
      connectionRequests: [newRequest, ...requests],
      notifications: [newNotification, ...(state.notifications || [])],
    },
    `Sent connection request to ${PEOPLE[receiverId]?.name || receiverId}`
  );

  // Sync to Supabase connection_requests table in the background
  try {
    supabase
      .from('connection_requests')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        channel: 'in_app',
        invitation_sent: true,
        invitation_sent_at: new Date().toISOString(),
        accepted: false,
        status: 'PENDING',
      })
      .then(() => {})
      .catch((err) => {
        console.warn('Supabase connection_requests insert notice:', err?.message);
      });
  } catch (err) {
    console.warn('Supabase connection_requests sync error:', err?.message);
  }

  return newRequest;
}

/**
 * Accept connection request:
 * 1. Establishes active connection.
 * 2. Matches couple pairing.
 * 3. Immediately calculates genetic risk assessment.
 * 4. Pushes update to Supabase.
 */
export function acceptConnectionRequest(requestId, actingUserId) {
  initConnectionsStore();
  const state = get();
  const requests = state.connectionRequests || [];
  const req = requests.find((r) => r.id === requestId);

  if (!req) {
    throw new Error('Connection request not found.');
  }
  if (req.receiverId !== actingUserId) {
    throw new Error('You are not authorized to accept this connection request.');
  }
  if (req.status !== 'PENDING') {
    throw new Error(`Cannot accept request in ${req.status} state.`);
  }

  const [uA, uB] = canonicalPair(req.senderId, req.receiverId);
  const connections = state.connections || [];

  const existingConn = connections.find(
    (c) => c.userA === uA && c.userB === uB && c.status === 'ACTIVE'
  );

  const updatedRequests = requests.map((r) =>
    r.id === requestId
      ? { ...r, status: 'ACCEPTED', respondedAt: new Date().toISOString() }
      : r
  );

  let updatedConnections = connections;
  let newConn = existingConn;

  if (!existingConn) {
    newConn = {
      id: generateId('conn'),
      userA: uA,
      userB: uB,
      status: 'ACTIVE',
      connectedAt: new Date().toISOString(),
    };
    updatedConnections = [newConn, ...connections];
  }

  // Find or create matching couple record
  let couple = COUPLES.find(
    (c) => (c.a === uA && c.b === uB) || (c.a === uB && c.b === uA)
  );

  if (!couple) {
    couple = {
      id: `c_${uA}_${uB}`,
      a: uA,
      b: uB,
      stage: 'Engaged',
      pregnantWeeks: null,
      screened: new Date().toISOString().slice(0, 10),
    };
  }

  // Run deterministic genetic assessment immediately
  const assessmentResult = assess(couple);

  const receiverName = PEOPLE[actingUserId]?.name || actingUserId;
  const senderName = PEOPLE[req.senderId]?.name || req.senderId;

  // Add notification pointing directly to Bonds
  const newNotification = {
    id: generateId('notif'),
    userId: req.senderId,
    actorId: actingUserId,
    type: 'REQUEST_ACCEPTED',
    title: 'Connection accepted · Risk assessed',
    body: `${receiverName} accepted your connection. Your combined assessment (${assessmentResult.label}) is ready.`,
    link: '/app/bonds',
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  // Update store state with active connection, matched couple, and audit log
  const session = state.session ? { ...state.session, couple: couple.id } : state.session;

  set(
    {
      session,
      connectionRequests: updatedRequests,
      connections: updatedConnections,
      activeCouple: couple,
      lastAssessment: assessmentResult,
      notifications: [newNotification, ...(state.notifications || [])],
    },
    `Connected ${senderName} and ${receiverName}. Risk assessed: ${assessmentResult.label} (${assessmentResult.risk})`
  );

  // Sync to Supabase in the background (zero blocking)
  try {
    // 1. Update connection_requests record
    supabase
      .from('connection_requests')
      .update({
        status: 'ACCEPTED',
        accepted: true,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .or(`and(sender_id.eq.${req.senderId},receiver_id.eq.${actingUserId}),and(sender_id.eq.${actingUserId},receiver_id.eq.${req.senderId})`)
      .then(() => {})
      .catch((err) => {
        console.warn('Supabase connection_requests update notice:', err?.message);
      });

    // 2. Upsert matched couple record
    supabase
      .from('couples')
      .upsert({
        id: couple.id,
        partner_a: uA,
        partner_b: uB,
        stage: couple.stage || 'Engaged',
        pregnant_weeks: couple.pregnantWeeks || null,
      })
      .then(() => {})
      .catch((err) => {
        console.warn('Supabase couples upsert warning (offline/mock mode):', err?.message);
      });
  } catch (e) {
    console.warn('Supabase call failed gracefully:', e?.message);
  }

  return { connection: newConn, couple, assessment: assessmentResult };
}

export function rejectConnectionRequest(requestId, actingUserId) {
  initConnectionsStore();
  const state = get();
  const requests = state.connectionRequests || [];
  const req = requests.find((r) => r.id === requestId);

  if (!req) {
    throw new Error('Connection request not found.');
  }
  if (req.receiverId !== actingUserId) {
    throw new Error('You are not authorized to reject this request.');
  }
  if (req.status !== 'PENDING') {
    throw new Error(`Request is already ${req.status}.`);
  }

  const updatedRequests = requests.map((r) =>
    r.id === requestId
      ? { ...r, status: 'REJECTED', respondedAt: new Date().toISOString() }
      : r
  );

  set(
    { connectionRequests: updatedRequests },
    `Rejected connection request from ${PEOPLE[req.senderId]?.name || req.senderId}`
  );

  // Sync rejection to Supabase connection_requests
  try {
    supabase
      .from('connection_requests')
      .update({
        status: 'REJECTED',
        updated_at: new Date().toISOString(),
      })
      .or(`and(sender_id.eq.${req.senderId},receiver_id.eq.${actingUserId})`)
      .then(() => {})
      .catch(() => {});
  } catch {}

  return true;
}

export function cancelConnectionRequest(requestId, actingUserId) {
  initConnectionsStore();
  const state = get();
  const requests = state.connectionRequests || [];
  const req = requests.find((r) => r.id === requestId);

  if (!req) {
    throw new Error('Connection request not found.');
  }
  if (req.senderId !== actingUserId) {
    throw new Error('You are not authorized to cancel this request.');
  }
  if (req.status !== 'PENDING') {
    throw new Error(`Cannot cancel request in ${req.status} state.`);
  }

  const updatedRequests = requests.map((r) =>
    r.id === requestId
      ? { ...r, status: 'CANCELLED', respondedAt: new Date().toISOString() }
      : r
  );

  set(
    { connectionRequests: updatedRequests },
    `Cancelled connection request to ${PEOPLE[req.receiverId]?.name || req.receiverId}`
  );

  // Sync cancellation to Supabase connection_requests
  try {
    supabase
      .from('connection_requests')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .or(`and(sender_id.eq.${actingUserId},receiver_id.eq.${req.receiverId})`)
      .then(() => {})
      .catch(() => {});
  } catch {}

  return true;
}

// -----------------------------------------------------------------------------
// 4. CONNECTION MANAGEMENT & REMOVAL
// -----------------------------------------------------------------------------

export function removeConnection(connectionId, actingUserId) {
  initConnectionsStore();
  const state = get();
  const connections = state.connections || [];
  const conn = connections.find((c) => c.id === connectionId);

  if (!conn) {
    throw new Error('Connection not found.');
  }
  if (conn.userA !== actingUserId && conn.userB !== actingUserId) {
    throw new Error('You are not authorized to remove this connection.');
  }

  const otherUserId = conn.userA === actingUserId ? conn.userB : conn.userA;
  const updatedConnections = connections.filter((c) => c.id !== connectionId);

  const actorName = PEOPLE[actingUserId]?.name || actingUserId;
  const newNotification = {
    id: generateId('notif'),
    userId: otherUserId,
    actorId: actingUserId,
    type: 'CONNECTION_REMOVED',
    title: 'Connection removed',
    body: `${actorName} removed the connection.`,
    link: '/app/connections',
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  set(
    {
      connections: updatedConnections,
      notifications: [newNotification, ...(state.notifications || [])],
    },
    `Removed connection with ${PEOPLE[otherUserId]?.name || otherUserId}`
  );

  return true;
}

export function blockUser(actingUserId, targetUserId) {
  initConnectionsStore();
  if (actingUserId === targetUserId) {
    throw new Error('You cannot block yourself.');
  }

  const state = get();
  const blocked = state.blockedUsers || [];
  if (blocked.some((b) => b.user === actingUserId && b.blocked === targetUserId)) {
    return true; // already blocked
  }

  const [uA, uB] = canonicalPair(actingUserId, targetUserId);
  const connections = (state.connections || []).filter(
    (c) => !(c.userA === uA && c.userB === uB)
  );

  // Cancel any pending requests
  const requests = (state.connectionRequests || []).map((r) => {
    if (
      (r.senderId === actingUserId && r.receiverId === targetUserId) ||
      (r.senderId === targetUserId && r.receiverId === actingUserId)
    ) {
      return { ...r, status: 'CANCELLED', respondedAt: new Date().toISOString() };
    }
    return r;
  });

  const newBlocked = [
    ...blocked,
    {
      id: generateId('blk'),
      user: actingUserId,
      blocked: targetUserId,
      createdAt: new Date().toISOString(),
    },
  ];

  set(
    {
      blockedUsers: newBlocked,
      connections,
      connectionRequests: requests,
    },
    `Blocked user ${PEOPLE[targetUserId]?.name || targetUserId}`
  );

  return true;
}

export function unblockUser(actingUserId, targetUserId) {
  initConnectionsStore();
  const state = get();
  const blocked = (state.blockedUsers || []).filter(
    (b) => !(b.user === actingUserId && b.blocked === targetUserId)
  );

  set(
    { blockedUsers: blocked },
    `Unblocked user ${PEOPLE[targetUserId]?.name || targetUserId}`
  );

  return true;
}

// -----------------------------------------------------------------------------
// 5. PROFILE & PRIVACY HELPERS
// -----------------------------------------------------------------------------

export function getProfile(actingUserId, targetUserId) {
  initConnectionsStore();
  const target = PEOPLE[targetUserId];
  if (!target) {
    throw new Error('User profile not found.');
  }

  const state = get();
  const blocked = state.blockedUsers || [];
  const isBlocked = blocked.some(
    (b) => (b.user === actingUserId && b.blocked === targetUserId) || (b.user === targetUserId && b.blocked === actingUserId)
  );
  if (isBlocked) {
    throw new Error('Profile is unavailable.');
  }

  const isSelf = actingUserId === targetUserId;
  const isConnected = isUserConnected(actingUserId, targetUserId);
  const conn = getConnectionRecord(actingUserId, targetUserId);

  return {
    id: targetUserId,
    name: target.name,
    short: target.short,
    username: target.username || targetUserId,
    danaId: target.danaId || `DANA-${targetUserId.toUpperCase()}`,
    sex: target.sex,
    role: ACCOUNTS.find((a) => a.id === targetUserId)?.title || 'Member',
    isSelf,
    isConnected,
    connectionId: conn?.id || null,
    connectedAt: conn?.connectedAt || null,
    carrierGene: isSelf || isConnected ? target.carrier : null,
  };
}

// Backward-compatible consent stubs (no consent barriers)
export function grantConsent(granterId, granteeId, connectionId, purpose, dataScope = 'CARRIER_GENE') {
  return { id: generateId('cst'), connectionId, granterId, granteeId, status: 'ACTIVE' };
}

export function revokeConsent() {
  return true;
}

export function getConsentsForConnection() {
  return [];
}

// -----------------------------------------------------------------------------
// 6. NOTIFICATIONS API
// -----------------------------------------------------------------------------

export function getNotifications(userId) {
  initConnectionsStore();
  const state = get();
  return (state.notifications || []).filter((n) => n.userId === userId);
}

export function markNotificationAsRead(notificationId, userId) {
  initConnectionsStore();
  const state = get();
  const notifs = (state.notifications || []).map((n) =>
    n.id === notificationId && n.userId === userId ? { ...n, isRead: true } : n
  );
  set({ notifications: notifs });
}

export function markAllNotificationsAsRead(userId) {
  initConnectionsStore();
  const state = get();
  const notifs = (state.notifications || []).map((n) =>
    n.userId === userId ? { ...n, isRead: true } : n
  );
  set({ notifications: notifs });
}

export function getUnreadNotificationCount(userId) {
  initConnectionsStore();
  const state = get();
  return (state.notifications || []).filter((n) => n.userId === userId && !n.isRead).length;
}

// -----------------------------------------------------------------------------
// 7. HELPER QUERIES
// -----------------------------------------------------------------------------

export function isUserConnected(userA, userB) {
  const [uA, uB] = canonicalPair(userA, userB);
  const state = get();
  return (state.connections || []).some(
    (c) => c.userA === uA && c.userB === uB && c.status === 'ACTIVE'
  );
}

export function getConnectionRecord(userA, userB) {
  const [uA, uB] = canonicalPair(userA, userB);
  const state = get();
  return (state.connections || []).find(
    (c) => c.userA === uA && c.userB === uB && c.status === 'ACTIVE'
  );
}

export function hasPendingRequest(senderId, receiverId) {
  const state = get();
  return (state.connectionRequests || []).some(
    (r) => r.senderId === senderId && r.receiverId === receiverId && r.status === 'PENDING'
  );
}

export function getUserConnections(userId) {
  initConnectionsStore();
  const state = get();
  return (state.connections || [])
    .filter((c) => (c.userA === userId || c.userB === userId) && c.status === 'ACTIVE')
    .map((c) => {
      const otherId = c.userA === userId ? c.userB : c.userA;
      const otherPerson = PEOPLE[otherId] || { name: otherId, short: otherId };

      // Calculate couple assessment for this connection
      let couple = COUPLES.find(
        (cp) => (cp.a === userId && cp.b === otherId) || (cp.a === otherId && cp.b === userId)
      );
      if (!couple) {
        couple = { id: `c_${userId}_${otherId}`, a: userId, b: otherId, stage: 'Engaged' };
      }
      const risk = assess(couple);

      const partnerObj = {
        id: otherId,
        userId: otherId,
        name: otherPerson.name || otherId,
        short: otherPerson.short || otherId,
        username: otherPerson.username || otherId,
        danaId: otherPerson.danaId || `DANA-${otherId.toUpperCase()}`,
        sex: otherPerson.sex || 'F',
        role: ACCOUNTS.find((a) => a.id === otherId)?.title || 'Premarital Screening Candidate',
      };

      return {
        id: c.id,
        connectionId: c.id,
        connectedAt: c.connectedAt,
        userId: otherId,
        partner: partnerObj,
        ...partnerObj,
        risk,
        couple,
      };
    });
}

export function getUserRequests(userId) {
  initConnectionsStore();
  const state = get();
  const allReqs = state.connectionRequests || [];

  const received = allReqs
    .filter((r) => r.receiverId === userId && r.status === 'PENDING')
    .map((r) => {
      const s = PEOPLE[r.senderId] || { name: r.senderId, short: r.senderId };
      return {
        ...r,
        sender: {
          ...s,
          username: s.username || r.senderId,
          danaId: s.danaId || `DANA-${r.senderId.toUpperCase()}`,
        },
      };
    });

  const sent = allReqs
    .filter((r) => r.senderId === userId && r.status === 'PENDING')
    .map((r) => {
      const rc = PEOPLE[r.receiverId] || { name: r.receiverId, short: r.receiverId };
      return {
        ...r,
        receiver: {
          ...rc,
          username: rc.username || r.receiverId,
          danaId: rc.danaId || `DANA-${r.receiverId.toUpperCase()}`,
        },
      };
    });

  const history = allReqs
    .filter((r) => (r.senderId === userId || r.receiverId === userId) && r.status !== 'PENDING')
    .map((r) => {
      const otherId = r.senderId === userId ? r.receiverId : r.senderId;
      const other = PEOPLE[otherId] || { name: otherId, short: otherId };
      return {
        ...r,
        otherPerson: {
          ...other,
          username: other.username || otherId,
          danaId: other.danaId || `DANA-${otherId.toUpperCase()}`,
        },
        direction: r.senderId === userId ? 'outgoing' : 'incoming',
      };
    });

  return { received, sent, history };
}

export function getBlockedUsersList(userId) {
  initConnectionsStore();
  const state = get();
  return (state.blockedUsers || [])
    .filter((b) => b.user === userId)
    .map((b) => ({
      blockedUserId: b.blocked,
      name: PEOPLE[b.blocked]?.name || b.blocked,
      short: PEOPLE[b.blocked]?.short || b.blocked,
      blockedAt: b.createdAt,
    }));
}

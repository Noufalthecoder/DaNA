import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for node test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

import {
  initConnectionsStore,
  searchUsers,
  searchUsersAsync,
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  cancelConnectionRequest,
  removeConnection,
  blockUser,
  unblockUser,
  getUserConnections,
  getUserRequests,
  getNotifications,
  markNotificationAsRead,
  getUserIdentifier,
  generateWhatsAppInviteUrl,
  generateGmailInviteUrl,
} from '../web/src/app/shared/connectionsService.js';
import { set, get } from '../web/src/app/shared/store.js';

describe('Connections & Risk Processing Engine Unit Tests', () => {
  beforeEach(() => {
    // Clean state before each test
    set({
      session: { id: 'khalid', role: 'couple', name: 'Khalid Al Mansoori' },
      connections: [],
      connectionRequests: [],
      connectionConsents: [],
      blockedUsers: [],
      notifications: [],
      profileVisibility: {},
    });
    initConnectionsStore();
  });

  it('1. Prevents user from sending a connection request to themselves', () => {
    assert.throws(
      () => sendConnectionRequest('khalid', 'khalid', 'Self request'),
      /cannot send a connection request to yourself/i
    );
  });

  it('2. Prevents duplicate pending connection requests', () => {
    sendConnectionRequest('khalid', 'omar', 'Hello Omar');
    assert.throws(
      () => sendConnectionRequest('khalid', 'omar', 'Duplicate request'),
      /already pending/i
    );
  });

  it('3. Handles mutual connection requests by automatically resolving to active connection', () => {
    // User A sends to User B
    sendConnectionRequest('khalid', 'omar', 'Hello Omar');
    // User B sends to User A -> should auto-accept and connect!
    const res = sendConnectionRequest('omar', 'khalid', 'Hello Khalid');
    assert.ok(res, 'Connection result should be returned');

    const connections = getUserConnections('khalid');
    const omarConn = connections.find((c) => c.userId === 'omar');
    assert.ok(omarConn, 'Omar should now be in active connections');
  });

  it('4. Prevents accepting already rejected or invalid requests', () => {
    const req = sendConnectionRequest('khalid', 'omar', 'Hi');
    rejectConnectionRequest(req.id, 'omar');

    assert.throws(
      () => acceptConnectionRequest(req.id, 'omar'),
      /cannot accept request in REJECTED state/i
    );
  });

  it('5. Allows sender to cancel pending outgoing request', () => {
    const req = sendConnectionRequest('khalid', 'omar', 'Cancel me');
    const result = cancelConnectionRequest(req.id, 'khalid');
    assert.equal(result, true);

    const { sent } = getUserRequests('khalid');
    const stillPending = sent.some((r) => r.id === req.id);
    assert.equal(stillPending, false, 'Request should no longer be pending');
  });

  it('6. Strict Privacy: Empty search query NEVER displays user directory (zero public browsing)', () => {
    const emptyResults = searchUsers('khalid', '');
    assert.equal(emptyResults.length, 0, 'Must return 0 results when search query is empty');

    const whitespaceResults = searchUsers('khalid', '   ');
    assert.equal(whitespaceResults.length, 0, 'Must return 0 results when query is only whitespace');
  });

  it('7. Strict Search Matching: Matches exact username, unique DaNA ID, or short name', () => {
    // Match by exact username
    const byUsername = searchUsers('khalid', 'fatima');
    assert.equal(byUsername.length, 1);
    assert.equal(byUsername[0].id, 'fatima');
    assert.equal(byUsername[0].danaId, 'DANA-8822');

    // Match with @ prefix
    const withAt = searchUsers('khalid', '@fatima');
    assert.equal(withAt.length, 1);
    assert.equal(withAt[0].id, 'fatima');

    // Match by unique DaNA ID
    const byId = searchUsers('khalid', 'DANA-8822');
    assert.equal(byId.length, 1);
    assert.equal(byId[0].id, 'fatima');

    // Unregistered / Non-existent username returns 0 results
    const nonExistent = searchUsers('khalid', 'unknown_user_123');
    assert.equal(nonExistent.length, 0);
  });

  it('8. Unregistered Partner Invitations: Generates WhatsApp and Gmail invite URLs', () => {
    const waUrl = generateWhatsAppInviteUrl({
      senderName: 'Khalid Al Mansoori',
      senderDanaId: 'DANA-7701',
      recipientPhone: '+971501234567',
    });
    assert.ok(waUrl.includes('api.whatsapp.com/send'));
    assert.ok(waUrl.includes('971501234567'));
    assert.ok(waUrl.includes('DANA-7701'));

    const gmail = generateGmailInviteUrl({
      senderName: 'Khalid Al Mansoori',
      senderDanaId: 'DANA-7701',
      recipientEmail: 'partner@example.com',
    });
    assert.ok(gmail.mailtoUrl.includes('mailto:partner%40example.com'));
    assert.ok(gmail.gmailWebUrl.includes('mail.google.com/mail'));
    assert.ok(gmail.body.includes('DANA-7701'));
  });

  it('9. Immediate Risk Evaluation upon Acceptance: Matches couple and triggers Genetic Intelligence Engine', () => {
    // Ahmed requests Khalid
    const req = sendConnectionRequest('ahmed', 'khalid', 'Connect for premarital screening');
    const result = acceptConnectionRequest(req.id, 'khalid');

    assert.ok(result.connection, 'Connection record created');
    assert.equal(result.connection.status, 'ACTIVE');
    assert.ok(result.assessment, 'Genetic risk assessment calculated immediately');
    assert.ok(result.assessment.label, 'Assessment label provided');

    // Verify stored lastAssessment and active couple
    const state = get();
    assert.ok(state.lastAssessment);
    assert.ok(state.activeCouple);

    // Notification generated pointing directly to Bonds
    const ahmedNotifs = getNotifications('ahmed');
    const acceptedNotif = ahmedNotifs.find((n) => n.type === 'REQUEST_ACCEPTED');
    assert.ok(acceptedNotif);
    assert.equal(acceptedNotif.link, '/app/bonds');
  });

  it('10. Removing a connection deletes active connection', () => {
    const req = sendConnectionRequest('saeed', 'khalid', 'Connect');
    const res = acceptConnectionRequest(req.id, 'khalid');
    const connId = res.connection.id;

    removeConnection(connId, 'khalid');

    // Connection must be gone
    assert.equal(getUserConnections('khalid').some((c) => c.connectionId === connId), false);
  });

  it('11. Blocking a user severs connections and prevents discovery', () => {
    const req = sendConnectionRequest('saeed', 'khalid', 'Connect');
    acceptConnectionRequest(req.id, 'khalid');

    // Khalid blocks Saeed
    blockUser('khalid', 'saeed');

    // Khalid cannot find Saeed in search results
    const search = searchUsers('khalid', 'saeed');
    assert.equal(search.length, 0);

    // Unblock restores normal search
    unblockUser('khalid', 'saeed');
    const searchAfterUnblock = searchUsers('khalid', 'saeed');
    assert.equal(searchAfterUnblock.length, 1);
  });

  it('12. Notification system receives events and updates read statuses', () => {
    sendConnectionRequest('khalid', 'omar', 'Hello');
    const omarNotifs = getNotifications('omar');
    assert.ok(omarNotifs.length > 0);
    const lastNotif = omarNotifs[0];
    assert.equal(lastNotif.type, 'CONNECTION_REQUEST');
    assert.equal(lastNotif.isRead, false);

    markNotificationAsRead(lastNotif.id, 'omar');
    const updated = getNotifications('omar').find((n) => n.id === lastNotif.id);
    assert.equal(updated.isRead, true);
  });

  it('13. Async Supabase search: Matches existing username or unique ID, returns [] for non-existing user', async () => {
    // Existing user by username
    const existingUsername = await searchUsersAsync('khalid', 'fatima');
    assert.equal(existingUsername.length, 1);
    assert.equal(existingUsername[0].id, 'fatima');
    assert.equal(existingUsername[0].danaId, 'DANA-8822');

    // Existing user by unique DaNA ID
    const existingDanaId = await searchUsersAsync('khalid', 'DANA-8822');
    assert.equal(existingDanaId.length, 1);
    assert.equal(existingDanaId[0].id, 'fatima');

    // Non-existing user returns [] to trigger WhatsApp / Gmail invitation
    const nonExistent = await searchUsersAsync('khalid', 'unknown_future_spouse');
    assert.equal(nonExistent.length, 0, 'Unregistered user must return 0 results to trigger invite options');

    // Empty search returns [] (zero public directory)
    const emptySearch = await searchUsersAsync('khalid', '');
    assert.equal(emptySearch.length, 0);
  });
});

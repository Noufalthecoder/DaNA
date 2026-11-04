import { useState, useMemo, useEffect } from 'react';
import { Page, Card, Badge, Avatar } from '../shared/ui.jsx';
import { useStore } from '../shared/store.js';
import {
  IconSearch,
  IconInbox,
  IconPartner,
  IconShield,
  IconCopy,
  IconCheck,
  IconClose,
  IconSlash,
  IconClock,
  IconWhatsApp,
  IconMail,
  IconSparkles,
  IconArrowRight,
  IconCalendar,
  IconUserMinus,
} from '../shared/Icons.jsx';
import {
  searchUsers,
  searchUsersAsync,
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  cancelConnectionRequest,
  getUserConnections,
  getUserRequests,
  removeConnection,
  blockUser,
  unblockUser,
  getBlockedUsersList,
  getUserIdentifier,
  generateWhatsAppInviteUrl,
  generateGmailInviteUrl,
  initConnectionsStore,
  syncConnectionsFromSupabase,
  syncRequestsFromSupabase,
  recordExternalInvitation,
} from '../shared/connectionsService.js';
import './Connections.css';

export default function Connections({ defaultTab = 'discover' }) {
  initConnectionsStore();
  const session = useStore((s) => s.session);
  const meId = session?.id || 'khalid';
  const myIdentifier = getUserIdentifier(meId);

  // Read tab from URL hash query parameters
  const parseHashParams = () => {
    try {
      const hash = window.location.hash || '';
      const qIdx = hash.indexOf('?');
      if (qIdx !== -1) {
        const params = new URLSearchParams(hash.slice(qIdx));
        const t = params.get('tab');
        if (['discover', 'requests', 'connections', 'blocked'].includes(t)) {
          return t;
        }
      }
    } catch {}
    return defaultTab;
  };

  const [tab, setTab] = useState(parseHashParams());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', msg: '', link?: '' }
  const [copied, setCopied] = useState(false);

  // Invite channel inputs
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');

  // Request modal state
  const [requestTarget, setRequestTarget] = useState(null);
  const [requestNote, setRequestNote] = useState('');

  // React to hashchange events (e.g. from notification clicks)
  useEffect(() => {
    const handleHash = () => {
      setTab(parseHashParams());
    };
    window.addEventListener('hashchange', handleHash);
    // Background sync active couples and connection requests from Supabase
    syncConnectionsFromSupabase(meId);
    syncRequestsFromSupabase(meId);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [meId]);

  // Query live data from connection service
  const connections = getUserConnections(meId);
  const { received, sent } = getUserRequests(meId);
  const blockedList = getBlockedUsersList(meId);

  // Live Supabase Query Effect with Debounce
  // STRICT: Search only based on username alone or unique DaNA ID
  // If user does not exist in Supabase/registry, returns [] to trigger WhatsApp/Gmail invite
  useEffect(() => {
    const raw = (searchQuery || '').trim();
    if (!raw) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchDone(false);
      return;
    }

    let active = true;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchUsersAsync(meId, raw);
        if (active) {
          setSearchResults(results);
          setIsSearching(false);
          setSearchDone(true);
        }
      } catch (err) {
        if (active) {
          // Fallback to strict synchronous search
          setSearchResults(searchUsers(meId, raw));
          setIsSearching(false);
          setSearchDone(true);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [meId, searchQuery]);

  const switchTab = (nextTab) => {
    setTab(nextTab);
    window.location.hash = `/app/connections?tab=${nextTab}`;
  };

  const notify = (msg, type = 'success', link = null) => {
    setFeedback({ msg, type, link });
    setTimeout(() => setFeedback(null), 7000);
  };

  const copyToClipboard = (text, label = 'Copied') => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      notify(`${label} copied to clipboard!`);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      notify('Unable to copy automatically.', 'error');
    }
  };

  // Actions
  const handleSendRequest = () => {
    if (!requestTarget) return;
    try {
      sendConnectionRequest(meId, requestTarget.id, requestNote);
      notify(`Connection request sent to ${requestTarget.name}.`);
      setRequestTarget(null);
      setRequestNote('');
      setSearchQuery('');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleAccept = (reqId, senderName) => {
    try {
      const res = acceptConnectionRequest(reqId, meId);
      notify(
        `Connection established with ${senderName}! Genetic risk assessed (${res.assessment?.label || 'Complete'}).`,
        'success',
        '#/app/bonds'
      );
      switchTab('connections');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleReject = (reqId, senderName) => {
    try {
      rejectConnectionRequest(reqId, meId);
      notify(`Connection request from ${senderName} declined.`);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleCancel = (reqId) => {
    try {
      cancelConnectionRequest(reqId, meId);
      notify('Connection request cancelled.');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleRemove = (connectionId, partnerName) => {
    if (!window.confirm(`Are you sure you want to disconnect from ${partnerName}?`)) return;
    try {
      removeConnection(connectionId, meId);
      notify(`Disconnected from ${partnerName}.`);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleBlock = (targetId, targetName) => {
    if (!window.confirm(`Block ${targetName}? They will not be able to find or request to connect with you.`)) return;
    try {
      blockUser(meId, targetId);
      notify(`Blocked ${targetName}.`);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleUnblock = (targetId, targetName) => {
    try {
      unblockUser(meId, targetId);
      notify(`Unblocked ${targetName}.`);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/#/app/connections?ref=${myIdentifier.danaId}`
    : `http://localhost:5173/#/app/connections?ref=${myIdentifier.danaId}`;

  const waUrl = generateWhatsAppInviteUrl({
    senderName: myIdentifier.name,
    senderDanaId: myIdentifier.danaId,
    recipientPhone: partnerPhone,
  });

  const gmailData = generateGmailInviteUrl({
    senderName: myIdentifier.name,
    senderDanaId: myIdentifier.danaId,
    recipientEmail: partnerEmail,
  });

  return (
    <Page
      title="Connections · الروابط والشريك"
      sub="Connect with your premarital partner to evaluate combined reproductive genetic risks."
    >
      <div className="conn-wrapper">
        {/* Toast Feedback */}
        {feedback && (
          <div className={`conn-toast ${feedback.type === 'error' ? 'conn-toast-error' : 'conn-toast-success'}`}>
            <div className="conn-toast-content">
              <span>{feedback.msg}</span>
              {feedback.link && (
                <a href={feedback.link} className="btn btn-sm conn-toast-link">
                  View Assessment in Bonds
                  <IconArrowRight size={14} />
                </a>
              )}
            </div>
            <button className="conn-toast-close" onClick={() => setFeedback(null)} aria-label="Close">
              <IconClose size={15} />
            </button>
          </div>
        )}

        {/* Your DaNA Identity Card */}
        <div className="conn-identity-card">
          <div className="conn-identity-left">
            <Avatar name={myIdentifier.name} sex={myIdentifier.sex} size={44} />
            <div className="conn-identity-meta">
              <h4>
                {myIdentifier.name}
                <span className="conn-identity-username">(@{myIdentifier.username})</span>
              </h4>
              <p className="conn-identity-sub">
                Your Unique DaNA ID:
                <span className="conn-id-pill">{myIdentifier.danaId}</span>
              </p>
            </div>
          </div>
          <button
            className="btn-soft conn-copy-btn"
            onClick={() => copyToClipboard(myIdentifier.danaId, 'DaNA ID')}
          >
            {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
            <span>{copied ? 'Copied ID' : 'Copy My DaNA ID'}</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="conn-tabs-nav">
          <button
            className={`conn-tab-btn ${tab === 'discover' ? 'active' : ''}`}
            onClick={() => switchTab('discover')}
          >
            <IconSearch size={16} />
            <span>Find Partner</span>
          </button>
          <button
            className={`conn-tab-btn ${tab === 'requests' ? 'active' : ''}`}
            onClick={() => switchTab('requests')}
          >
            <IconInbox size={16} />
            <span>Requests</span>
            {received.length > 0 && (
              <span className="conn-tab-badge conn-tab-badge-amber">{received.length}</span>
            )}
          </button>
          <button
            className={`conn-tab-btn ${tab === 'connections' ? 'active' : ''}`}
            onClick={() => switchTab('connections')}
          >
            <IconPartner size={16} />
            <span>My Connection</span>
            {connections.length > 0 && (
              <span className="conn-tab-badge conn-tab-badge-active">{connections.length}</span>
            )}
          </button>
          {blockedList.length > 0 && (
            <button
              className={`conn-tab-btn ${tab === 'blocked' ? 'active' : ''}`}
              onClick={() => switchTab('blocked')}
            >
              <IconSlash size={16} />
              <span>Blocked ({blockedList.length})</span>
            </button>
          )}
        </div>

        {/* TAB 1: FIND PARTNER (Zero Public Directory) */}
        {tab === 'discover' && (
          <Card title="Search & Connect with Your Partner">
            <p className="lead-in">
              Enter your partner’s exact <b>Username</b> or <b>Unique DaNA ID</b> to connect.
            </p>

            <div className="conn-search-box">
              <span className="conn-search-icon">
                <IconSearch size={18} />
              </span>
              <input
                type="text"
                className="conn-search-input"
                placeholder="Enter partner's username or DaNA ID (e.g. fatima or DANA-8822)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {isSearching ? (
                <span className="conn-search-spinner">
                  <span className="spin" />
                </span>
              ) : searchQuery ? (
                <button
                  className="conn-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <IconClose size={15} />
                </button>
              ) : null}
            </div>

            {/* Live Search In-Flight Notice */}
            {isSearching && (
              <div className="conn-search-loading">
                <span className="spin" />
                <span>Querying Supabase registry for &ldquo;{searchQuery}&rdquo;...</span>
              </div>
            )}

            {/* When query is empty: STRICT ZERO PUBLIC DIRECTORY */}
            {!searchQuery.trim() && (
              <div className="conn-privacy-banner">
                <div className="conn-privacy-shield">
                  <IconShield size={22} />
                </div>
                <h3>Strict Healthcare Privacy Enforced</h3>
                <p>
                  In compliance with UAE Federal Decree-Law No. 49 of 2023, DaNA does not display public user directories. To protect citizen privacy, you can only find your partner by entering their exact username or unique DaNA ID above.
                </p>
              </div>
            )}

            {/* When query is typed and matches a registered user */}
            {searchQuery.trim() && !isSearching && searchResults.length > 0 && (
              <div className="conn-results-grid">
                {searchResults.map((user) => (
                  <div key={user.id} className="conn-user-card">
                    <div className="conn-user-info">
                      <Avatar name={user.name} sex={user.sex} size={48} />
                      <div className="conn-user-details">
                        <h4>{user.name}</h4>
                        <div className="conn-user-handle">
                          <span>@{user.username}</span>
                          <span>·</span>
                          <span className="conn-id-pill">{user.danaId}</span>
                        </div>
                        <Badge tone="green">Premarital Screening Verified</Badge>
                      </div>
                    </div>

                    <div className="conn-user-actions">
                      {user.isConnected ? (
                        <a href="#/app/bonds" className="btn btn-sm">
                          <IconCheck size={14} />
                          <span>Connected · View in Bonds</span>
                          <IconArrowRight size={14} />
                        </a>
                      ) : user.hasPendingOutgoing ? (
                        <button className="btn-soft btn-sm" disabled>
                          <IconClock size={14} />
                          <span>Request Pending</span>
                        </button>
                      ) : user.hasPendingIncoming ? (
                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            const req = received.find((r) => r.senderId === user.id);
                            if (req) handleAccept(req.id, user.name);
                          }}
                        >
                          <IconCheck size={14} />
                          <span>Accept Request</span>
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            setRequestTarget(user);
                            setRequestNote('');
                          }}
                        >
                          <span>+ Connect with {user.short}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* When query is typed and NO user matches: UNREGISTERED PARTNER INVITE */}
            {searchQuery.trim() && !isSearching && searchDone && searchResults.length === 0 && (
              <div className="conn-invite-card">
                <div className="conn-invite-header">
                  <h3>Partner Not Yet on DaNA? Invite Them</h3>
                  <p>
                    No registered user found matching username or ID <b>&ldquo;{searchQuery}&rdquo;</b> in Supabase. Invite your partner directly through WhatsApp or Gmail so they can register and link with your premarital screening.
                  </p>
                </div>

                <div className="conn-channels-grid">
                  {/* WhatsApp Channel */}
                  <div className="conn-channel-box">
                    <div className="conn-channel-title">
                      <IconWhatsApp size={20} />
                      <span>WhatsApp Invitation</span>
                    </div>
                    <p className="conn-channel-desc">
                      Send an official prefilled invitation message directly to your partner on WhatsApp.
                    </p>
                    <input
                      type="tel"
                      className="conn-channel-input"
                      placeholder="Partner WhatsApp Number (e.g. +971501234567)"
                      value={partnerPhone}
                      onChange={(e) => setPartnerPhone(e.target.value)}
                    />
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="conn-btn-whatsapp"
                      onClick={() => {
                        recordExternalInvitation({
                          senderId: meId,
                          channel: 'whatsapp',
                          recipientContact: partnerPhone,
                        });
                        notify('WhatsApp invitation recorded. Link opened!');
                      }}
                    >
                      <IconWhatsApp size={16} />
                      <span>Open in WhatsApp</span>
                      <IconArrowRight size={14} />
                    </a>
                  </div>

                  {/* Gmail Channel */}
                  <div className="conn-channel-box">
                    <div className="conn-channel-title">
                      <IconMail size={20} />
                      <span>Gmail / Email Invitation</span>
                    </div>
                    <p className="conn-channel-desc">
                      Send an official prefilled email with your DaNA ID and screening link.
                    </p>
                    <input
                      type="email"
                      className="conn-channel-input"
                      placeholder="Partner Email Address (optional)"
                      value={partnerEmail}
                      onChange={(e) => setPartnerEmail(e.target.value)}
                    />
                    <div className="conn-email-actions">
                      <a
                        href={gmailData.gmailWebUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="conn-btn-gmail"
                        onClick={() => {
                          recordExternalInvitation({
                            senderId: meId,
                            channel: 'gmail',
                            recipientContact: partnerEmail,
                          });
                          notify('Email invitation recorded. Gmail opened!');
                        }}
                      >
                        <IconMail size={16} />
                        <span>Open Gmail</span>
                        <IconArrowRight size={14} />
                      </a>
                      <a
                        href={gmailData.mailtoUrl}
                        className="btn-soft btn-sm"
                        title="Open default email application"
                        onClick={() => {
                          recordExternalInvitation({
                            senderId: meId,
                            channel: 'gmail',
                            recipientContact: partnerEmail,
                          });
                          notify('Email invitation recorded.');
                        }}
                      >
                        Default Mail
                      </a>
                    </div>
                  </div>
                </div>

                {/* Direct Link Copy */}
                <div className="conn-direct-link-section">
                  <label className="conn-direct-link-label">
                    Or share your direct registration &amp; link URL:
                  </label>
                  <div className="conn-link-copy-box">
                    <input type="text" readOnly className="conn-link-input" value={inviteUrl} />
                    <button
                      className="btn-soft conn-copy-btn"
                      onClick={() => copyToClipboard(inviteUrl, 'Invite Link')}
                    >
                      <IconCopy size={14} />
                      <span>Copy Link</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* TAB 2: REQUESTS (INCOMING & OUTGOING) */}
        {tab === 'requests' && (
          <div className="conn-requests-stack">
            {/* Incoming Requests */}
            <Card
              title="Incoming Connection Requests"
              aside={<Badge tone={received.length ? 'amber' : 'grey'}>{received.length} Pending</Badge>}
            >
              {received.length === 0 ? (
                <div className="conn-empty-state">
                  <p className="conn-empty-state-p muted">No incoming connection requests at this time.</p>
                </div>
              ) : (
                <div className="conn-requests-list">
                  {received.map((req) => (
                    <div key={req.id} className="conn-request-card incoming">
                      <div className="conn-req-header">
                        <Avatar name={req.sender?.name} sex={req.sender?.sex} size={42} />
                        <div className="conn-req-meta">
                          <h4>{req.sender?.name}</h4>
                          <span className="conn-req-handle">
                            @{req.sender?.username} · <span className="conn-id-pill">{req.sender?.danaId}</span>
                          </span>
                          <span className="conn-req-date">
                            Received on {new Date(req.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {req.note && <div className="conn-req-note">{req.note}</div>}

                      <div className="conn-req-actions">
                        <button
                          className="btn btn-sm"
                          onClick={() => handleAccept(req.id, req.sender?.name || 'Partner')}
                        >
                          <IconCheck size={14} />
                          <span>Accept Connection</span>
                        </button>
                        <button
                          className="btn-soft btn-sm"
                          onClick={() => handleReject(req.id, req.sender?.name || 'Partner')}
                        >
                          <IconClose size={14} />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Sent Requests */}
            <Card
              title="Sent Requests"
              aside={<Badge tone="grey">{sent.length} Sent</Badge>}
            >
              {sent.length === 0 ? (
                <div className="conn-empty-state">
                  <p className="conn-empty-state-p muted">No pending sent requests.</p>
                </div>
              ) : (
                <div className="conn-requests-list">
                  {sent.map((req) => (
                    <div key={req.id} className="conn-request-card outgoing">
                      <div className="conn-req-header">
                        <Avatar name={req.receiver?.name} sex={req.receiver?.sex} size={42} />
                        <div className="conn-req-meta">
                          <h4>{req.receiver?.name}</h4>
                          <span className="conn-req-handle">
                            @{req.receiver?.username} · <span className="conn-id-pill">{req.receiver?.danaId}</span>
                          </span>
                          <span className="conn-req-date">
                            Sent on {new Date(req.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {req.note && <div className="conn-req-note">{req.note}</div>}

                      <div className="conn-req-actions">
                        <Badge tone="amber">Pending Partner Acceptance</Badge>
                        <button
                          className="ghost btn-sm"
                          onClick={() => handleCancel(req.id)}
                        >
                          Cancel Request
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 3: ACTIVE CONNECTIONS & RISK SUMMARY */}
        {tab === 'connections' && (
          <div className="conn-active-stack">
            {connections.length === 0 ? (
              <Card title="No Active Connection">
                <div className="conn-empty-state">
                  <p className="conn-empty-state-p muted">
                    You have not connected with a premarital partner yet. Search for your partner by username or DaNA ID to get started.
                  </p>
                  <button className="btn btn-sm" onClick={() => switchTab('discover')}>
                    <IconSearch size={15} />
                    <span>Find Partner</span>
                  </button>
                </div>
              </Card>
            ) : (
              connections.map((conn) => (
                <Card
                  key={conn.id}
                  title="Active Premarital Connection"
                  aside={<Badge tone="green">Connection Active</Badge>}
                >
                  <div className="conn-active-card-body">
                    <div className="conn-active-header">
                      <div className="conn-active-profile">
                        <Avatar name={conn.partner?.name || conn.name || 'Partner'} sex={conn.partner?.sex || conn.sex || 'F'} size={54} />
                        <div>
                          <h3>{conn.partner?.name || conn.name || 'Connected Partner'}</h3>
                          <p className="conn-active-meta">
                            <span>@{conn.partner?.username || conn.username || 'partner'}</span>
                            <span>·</span>
                            <span className="conn-id-pill">{conn.partner?.danaId || conn.danaId || 'DANA-ID'}</span>
                            <span>·</span>
                            <Badge tone="green">Verified Screening</Badge>
                          </p>
                          <span className="conn-active-date">
                            Connected since {conn.connectedAt ? new Date(conn.connectedAt).toLocaleDateString() : 'Active'}
                          </span>
                        </div>
                      </div>

                      <a href="#/app/bonds" className="btn">
                        <IconSparkles size={16} />
                        <span>View Combined Risk in Bonds</span>
                        <IconArrowRight size={14} />
                      </a>
                    </div>

                    {/* Immediate Combined Risk Preview */}
                    <div className="conn-risk-overview">
                      <div className="conn-risk-info">
                        <h4>
                          <IconShield size={16} />
                          <span>Genetic Assessment Ready: Actionable Plan Recommended</span>
                        </h4>
                        <p>
                          Both partners have verified genetic screening datasets. Combined Mendelian analysis for <b>Beta-thalassaemia (HBB)</b> is complete and ready for review.
                        </p>
                      </div>
                      <a href="#/app/bonds" className="btn btn-sm">
                        <span>Open Bonds</span>
                        <IconArrowRight size={14} />
                      </a>
                    </div>

                    <div className="conn-active-actions">
                      <a href="#/app/counsellor" className="btn-soft btn-sm">
                        <IconCalendar size={14} />
                        <span>Book Counsellor (Dr. Mariam)</span>
                      </a>
                      <div className="conn-active-actions-right">
                        <button
                          className="ghost btn-sm"
                          onClick={() => handleRemove(conn.id || conn.connectionId, conn.partner?.name || conn.name || 'Partner')}
                        >
                          <IconUserMinus size={14} />
                          <span>Disconnect</span>
                        </button>
                        <button
                          className="ghost btn-sm"
                          onClick={() => handleBlock(conn.partner?.id || conn.userId, conn.partner?.name || conn.name || 'User')}
                        >
                          <IconSlash size={14} />
                          <span>Block User</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* TAB 4: BLOCKED USERS */}
        {tab === 'blocked' && (
          <Card
            title="Blocked Users"
            aside={<Badge tone="grey">{blockedList.length} Blocked</Badge>}
          >
            {blockedList.length === 0 ? (
              <div className="conn-empty-state">
                <p className="conn-empty-state-p muted">No users are currently blocked.</p>
              </div>
            ) : (
              <div className="conn-blocked-list">
                {blockedList.map((item) => (
                  <div key={item.blocked} className="conn-blocked-item">
                    <div>
                      <strong>{item.user?.name || item.blocked}</strong>
                      <span className="conn-blocked-date">
                        Blocked on {new Date(item.blockedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      className="btn-soft btn-sm"
                      onClick={() => handleUnblock(item.blocked, item.user?.name || item.blocked)}
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Send Request Modal */}
        {requestTarget && (
          <div className="conn-modal-backdrop" onClick={() => setRequestTarget(null)}>
            <div className="conn-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="conn-modal-header">
                <h3>Connect with {requestTarget.name}</h3>
                <button
                  className="conn-modal-close"
                  onClick={() => setRequestTarget(null)}
                  aria-label="Close"
                >
                  <IconClose size={16} />
                </button>
              </div>

              <div className="conn-modal-body">
                <p>
                  Sending a connection request will allow both of your premarital screening profiles to be evaluated by DaNA’s Genetic Intelligence Engine.
                </p>

                <div className="conn-modal-group">
                  <label htmlFor="conn-req-note-input">Personal Note (Optional):</label>
                  <textarea
                    id="conn-req-note-input"
                    rows={3}
                    className="conn-modal-textarea"
                    placeholder="Salam, connecting regarding our premarital screenings on DaNA..."
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    maxLength={250}
                  />
                </div>
              </div>

              <div className="conn-modal-footer">
                <button className="ghost" onClick={() => setRequestTarget(null)}>
                  Cancel
                </button>
                <button className="btn" onClick={handleSendRequest}>
                  <span>Send Connection Request</span>
                  <IconArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}

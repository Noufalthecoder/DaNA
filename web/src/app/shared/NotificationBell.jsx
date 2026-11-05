import { useState, useEffect, useRef } from 'react';
import { useStore } from './store.js';
import { go } from './router.js';
import {
  IconBell,
  IconInbox,
  IconPartner,
  IconClose,
  IconUserMinus,
  IconShield,
  IconLock,
} from './Icons.jsx';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  initConnectionsStore,
} from './connectionsService.js';

function NotificationTypeIcon({ type }) {
  switch (type) {
    case 'CONNECTION_REQUEST':
      return <IconInbox size={16} />;
    case 'REQUEST_ACCEPTED':
      return <IconPartner size={16} />;
    case 'REQUEST_REJECTED':
      return <IconClose size={16} />;
    case 'CONNECTION_REMOVED':
      return <IconUserMinus size={16} />;
    case 'CONSENT_GRANTED':
      return <IconShield size={16} />;
    case 'CONSENT_REVOKED':
      return <IconLock size={16} />;
    default:
      return <IconBell size={16} />;
  }
}

export default function NotificationBell() {
  initConnectionsStore();
  const session = useStore((s) => s.session);
  const notificationsState = useStore((s) => s.notifications);
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  const userId = session?.id;
  const userNotifications = userId ? getNotifications(userId) : [];
  const unreadCount = userId ? getUnreadNotificationCount(userId) : 0;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!userId) return null;

  const handleItemClick = (n) => {
    markNotificationAsRead(n.id, userId);
    setOpen(false);
    if (n.link) {
      go(n.link);
    }
  };

  const handleMarkAll = () => {
    markAllNotificationsAsRead(userId);
  };

  return (
    <div className="notif-wrapper" ref={popoverRef}>
      <button
        className="notif-btn"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        title="In-app notifications"
      >
        <span className="notif-icon">
          <IconBell size={18} />
        </span>
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button className="link notif-mark-btn" onClick={handleMarkAll}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-body">
            {userNotifications.length === 0 ? (
              <div className="notif-empty">No notifications yet.</div>
            ) : (
              <ul className="notif-list">
                {userNotifications.slice(0, 10).map((n) => (
                  <li
                    key={n.id}
                    className={`notif-item ${!n.isRead ? 'unread' : ''}`}
                    onClick={() => handleItemClick(n)}
                  >
                    <span className="notif-type-icon">
                      <NotificationTypeIcon type={n.type} />
                    </span>
                    <div className="notif-text">
                      <div className="notif-title-row">
                        <span className="notif-title">{n.title}</span>
                        {!n.isRead && <span className="notif-dot" />}
                      </div>
                      <p className="notif-desc">{n.body}</p>
                      <time className="notif-time">
                        {new Date(n.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

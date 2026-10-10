import React, { useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, AlertTriangle, Info, ShieldAlert, X } from 'lucide-react';

export const NotificationPanel = () => {
  const {
    notifications,
    isNotificationOpen,
    setIsNotificationOpen,
    markAllNotificationsAsRead,
    clearNotification
  } = useApp();
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        // Check if click was on notification bell button
        if (!event.target.closest('#notification-bell-btn')) {
          setIsNotificationOpen(false);
        }
      }
    };
    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationOpen, setIsNotificationOpen]);

  if (!isNotificationOpen) return null;

  const handleNotificationClick = (notif) => {
    if (notif.link) {
      navigate(notif.link);
      setIsNotificationOpen(false);
    }
  };

  return (
    <div className="notification-panel" ref={panelRef} role="region" aria-label="Notifications panel">
      <div className="notification-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={14} style={{ color: 'var(--text-white)' }} />
          <span className="font-tech" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-white)' }}>
            System Alerts
          </span>
          <span
            className="font-tech"
            style={{
              fontSize: '0.68rem',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-white)',
              padding: '1px 6px',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xs)',
              fontWeight: 700
            }}
          >
            {notifications.length}
          </span>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={markAllNotificationsAsRead}
            className="font-tech"
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
            title="Mark all as read"
          >
            <CheckCheck size={13} />
            <span>Mark read</span>
          </button>
        )}
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '0.85rem' }}>No new notifications at this time.</p>
          </div>
        ) : (
          notifications.map((notif) => {
            let Icon = Info;
            let iconColor = 'var(--text-white)';
            if (notif.type === 'critical') {
              Icon = ShieldAlert;
              iconColor = 'var(--color-danger)';
            } else if (notif.type === 'warning') {
              Icon = AlertTriangle;
              iconColor = 'var(--color-warning)';
            }

            return (
              <div
                key={notif.id}
                className={`notification-item ${!notif.read ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notif)}
                style={{ cursor: notif.link ? 'pointer' : 'default' }}
              >
                <div style={{ flexShrink: 0, marginTop: '2px', color: iconColor }}>
                  <Icon size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {notif.title}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearNotification(notif.id);
                      }}
                      style={{ color: 'var(--text-muted)', padding: '2px' }}
                      aria-label="Dismiss notification"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.4 }}>
                    {notif.message}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {notif.timeAgo}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

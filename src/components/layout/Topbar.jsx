import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { NotificationPanel } from './NotificationPanel';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

export const Topbar = () => {
  const {
    unreadCount,
    isNotificationOpen,
    setIsNotificationOpen,
    isSidebarOpen,
    setIsSidebarOpen
  } = useApp();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="mobile-nav-toggle"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label="Toggle mobile menu"
          id="mobile-menu-toggle-btn"
        >
          <Menu size={22} />
        </button>
        <SearchBar />
      </div>

      <div className="topbar-right">
        {/* Notification Bell Button */}
        <button
          id="notification-bell-btn"
          className="icon-btn"
          onClick={() => setIsNotificationOpen(!isNotificationOpen)}
          aria-label={`Notifications (${unreadCount} unread)`}
          aria-expanded={isNotificationOpen}
        >
          <Bell size={18} />
          {unreadCount > 0 && <span className="badge-dot" />}
        </button>

        {/* User Account / Profile Preview */}
        <div
          className="topbar-user"
          onClick={() => navigate('/settings/account')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              navigate('/settings/account');
            }
          }}
          title="View Account Profile"
        >
          <div className="user-avatar">AC</div>
          <div className="user-meta">
            <span className="user-name">Alex Chen</span>
            <span className="user-role">Inventory Lead</span>
          </div>
        </div>

        {/* Floating Notification Panel */}
        <NotificationPanel />
      </div>
    </header>
  );
};

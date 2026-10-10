import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Shirt,
  Store,
  User,
  X,
  ArrowLeftRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar = () => {
  const { isSidebarOpen, setIsSidebarOpen } = useApp();

  const closeMobileSidebar = () => {
    setIsSidebarOpen(false);
  };

  const navItems = [
    { to: '/manager/overview', label: 'Overview', idx: '01', icon: LayoutDashboard },
    { to: '/manager/inventory', label: 'Inventory', idx: '02', icon: Shirt },
    { to: '/manager/stores', label: 'Store Network', idx: '03', icon: Store },
    { to: '/manager/transfers', label: 'Stock Transfers', idx: '04', icon: ArrowLeftRight },
    { to: '/manager/settings/account', label: 'Account Profile', idx: '05', icon: User }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          onClick={closeMobileSidebar}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 45
          }}
        />
      )}

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`} aria-label="Main Navigation">
        {/* Brand Block */}
        <div className="sidebar-header">
          <div className="brand-wrapper">
            <div className="brand-symbol">TQ</div>
            <div>
              <div className="brand-title">
                THREAD<span>//IQ</span>
              </div>
            </div>
          </div>
          <span className="brand-ver">V2.4</span>

          {isSidebarOpen && (
            <button
              onClick={closeMobileSidebar}
              className="icon-btn"
              style={{ marginLeft: 'auto', width: '32px', height: '32px' }}
              aria-label="Close navigation"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Navigation Items with Technical Indices */}
        <nav className="sidebar-nav">
          <div className="nav-section-title">Navigation // Ops</div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobileSidebar}
              >
                <span className="technical-index" style={{ width: '22px' }}>{item.idx}</span>
                <Icon size={15} style={{ flexShrink: 0 }} />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <span className="nav-badge" title={`${item.badge} pending actions`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="demo-tag" style={{ justifyContent: 'center' }}>
            <span>Synthetic Demonstration Data</span>
          </div>
          <div className="system-status">
            <span className="status-indicator-dot" />
            <span>Store Balancer Node Active</span>
          </div>
        </div>
      </aside>
    </>
  );
};

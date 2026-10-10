import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [settings, setSettings] = useState({
    lowStockAlerts: true,
    notificationAlerts: true,
    overstockAlerts: true,
    aiRecommendationNotifications: true,
    inventoryAgeingAlerts: false,
    lowStockThreshold: 15,
    overstockThreshold: 90,
    inventoryAgeingThreshold: 45,
    preferredInventoryAction: 'Transfer'
  });
  const [toasts, setToasts] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Initialize data
  useEffect(() => {
    const loadInit = async () => {
      try {
        const [recs, notifs, sets] = await Promise.all([
          api.fetchRecommendations(),
          api.fetchNotifications(),
          api.fetchSettings()
        ]);
        setRecommendations(recs);
        setNotifications(notifs);
        if (sets) setSettings(sets);
      } catch (err) {
        console.error('Initialization error', err);
      } finally {
        setLoadingInitial(false);
      }
    };
    loadInit();
  }, []);

  // Real-time SSE synchronization with backend
  useEffect(() => {
    let eventSource = null;
    let reconnectTimer = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/realtime/events');

        eventSource.addEventListener('transfer_update', async (e) => {
          try {
            const data = JSON.parse(e.data);
            const freshRecs = await api.fetchRecommendations();
            if (freshRecs && Array.isArray(freshRecs)) {
              setRecommendations(freshRecs);
            }
            window.dispatchEvent(new CustomEvent('threadiq:transfer_update', { detail: data }));
          } catch (err) {
            console.error('SSE transfer_update error:', err);
          }
        });

        eventSource.addEventListener('inventory_update', async (e) => {
          try {
            const data = JSON.parse(e.data);
            window.dispatchEvent(new CustomEvent('threadiq:inventory_update', { detail: data }));
          } catch (err) {
            console.error('SSE inventory_update error:', err);
          }
        });

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          reconnectTimer = setTimeout(connectSSE, 4000);
        };
      } catch (err) {
        reconnectTimer = setTimeout(connectSSE, 4000);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    addToast('All notifications marked as read', 'info');
  };

  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleApproveRecommendation = async (id, notes = '') => {
    await api.approveRecommendation(id, notes);
    setRecommendations(prev =>
      prev.map(r => r.id === id ? { ...r, status: 'approved', decidedAt: 'Just now', notes } : r)
    );
    addToast('Recommendation approved successfully (Prototype action recorded)', 'success');
  };

  const handleRejectRecommendation = async (id, reason = '') => {
    await api.rejectRecommendation(id, reason);
    setRecommendations(prev =>
      prev.map(r => r.id === id ? { ...r, status: 'rejected', decidedAt: 'Just now', reason } : r)
    );
    addToast('Recommendation rejected (Prototype status updated)', 'danger');
  };

  const handleSaveSettings = async (newSettings) => {
    await api.updateSettings(newSettings);
    setSettings(newSettings);
    addToast('Settings preferences saved to local profile', 'success');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        notifications,
        unreadCount,
        isNotificationOpen,
        setIsNotificationOpen,
        isSidebarOpen,
        setIsSidebarOpen,
        recommendations,
        settings,
        setSettings,
        toasts,
        addToast,
        removeToast,
        markAllNotificationsAsRead,
        clearNotification,
        handleApproveRecommendation,
        handleRejectRecommendation,
        handleSaveSettings,
        loadingInitial
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

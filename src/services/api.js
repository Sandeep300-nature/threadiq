/**
 * ThreadIQ - Central API Service Module
 *
 * NOTE FOR BACKEND DEVELOPER:
 * This module isolates all API communication for the frontend.
 * If the backend at VITE_API_BASE_URL is reachable, requests are dispatched.
 * If the backend is offline, unreachable, or returns a network error,
 * the frontend automatically falls back to synthetic mock data and local storage state.
 *
 * PROPOSED BACKEND CONTRACT SPECIFICATION:
 * 1. GET  /api/v1/inventory         Query params: ?store=&size=&category=&status=&search=
 * 2. GET  /api/v1/stores            Returns list of retail store hubs with stock statistics
 * 3. GET  /api/v1/recommendations   Returns AI proposed actions (Transfer, Reorder, Markdown, Wait)
 * 4. POST /api/v1/recommendations/generate Triggers AI batch calculation on demand
 * 5. POST /api/v1/recommendations/:id/approve Body: { notes?: string, timestamp: string }
 * 6. POST /api/v1/recommendations/:id/reject  Body: { reason?: string, timestamp: string }
 * 7. GET  /api/v1/settings          Returns alert thresholds and automation preferences
 * 8. PUT  /api/v1/settings          Body: updated settings object
 * 9. GET  /api/v1/notifications     Returns alert notifications
 */

import { MOCK_INVENTORY } from '../data/mockInventory';
import { MOCK_STORES } from '../data/mockStores';
import { MOCK_RECOMMENDATIONS } from '../data/mockRecommendations';
import { MOCK_NOTIFICATIONS } from '../data/mockNotifications';

const BASE_URL = typeof window !== 'undefined' && (window.location.port === '3000' || !import.meta.env.VITE_API_BASE_URL)
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || '');

// Fallback local memory state for mutation prototyping
let localRecommendations = [...MOCK_RECOMMENDATIONS];
let localInventory = [...MOCK_INVENTORY];

let localTransfers = [
  {
    transferId: 'TR-001',
    recommendationId: 'rec-101',
    productName: 'Vintage Washed Oversized Heavyweight Tee',
    category: 'T-shirts',
    size: '4XL',
    quantity: 45,
    sourceStoreId: 'store-02',
    sourceStoreName: 'Heritage Mall Hub (Mysuru)',
    destStoreId: 'store-01',
    destStoreName: 'Brigade Road Flagship (Bengaluru)',
    deliveryMode: 'normal', // 'express' | 'normal'
    deliveryStatus: 'approved', // 'approved' | 'dispatched' | 'in_transit' | 'delivered'
    dispatchTime: null,
    deliveredTime: null,
    notes: 'Approved 4XL rebalance transfer via NH 275 Bengaluru-Mysuru Expressway',
    lastUpdated: '10 mins ago'
  },
  {
    transferId: 'TR-002',
    recommendationId: 'rec-104',
    productName: 'Organic Supima Crew Neck Tee',
    category: 'T-shirts',
    size: '3XL',
    quantity: 30,
    sourceStoreId: 'store-04',
    sourceStoreName: 'North Karnataka Hub (Hubballi-Dharwad)',
    destStoreId: 'store-05',
    destStoreName: 'Cantonment Galleria (Belagavi)',
    deliveryMode: 'express',
    deliveryStatus: 'in_transit',
    dispatchTime: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    deliveredTime: null,
    notes: 'Express dispatch via NH 48 North Karnataka corridor',
    lastUpdated: '2 hours ago'
  },
  {
    transferId: 'TR-003',
    recommendationId: 'rec-105',
    productName: 'Heavyweight Fleece Boxy Hoodie',
    category: 'Hoodies',
    size: '2XL',
    quantity: 25,
    sourceStoreId: 'store-01',
    sourceStoreName: 'Brigade Road Flagship (Bengaluru)',
    destStoreId: 'store-03',
    destStoreName: 'Coastal City Pavilion (Mangaluru)',
    deliveryMode: 'normal',
    deliveryStatus: 'approved',
    dispatchTime: null,
    deliveredTime: null,
    notes: 'Approved coastal replenishment via NH 75 Shiradi Ghat route',
    lastUpdated: '30 mins ago'
  }
];
let localSettings = {
  lowStockAlerts: true,
  notificationAlerts: true,
  overstockAlerts: true,
  aiRecommendationNotifications: true,
  inventoryAgeingAlerts: false,
  lowStockThreshold: 15,
  overstockThreshold: 90,
  inventoryAgeingThreshold: 45,
  preferredInventoryAction: 'Transfer'
};

// Check if localStorage has saved settings
try {
  const saved = localStorage.getItem('threadiq_settings');
  if (saved) {
    localSettings = { ...localSettings, ...JSON.parse(saved) };
  }
} catch (e) {
  console.warn('LocalStorage not available', e);
}

const safeFetch = async (endpoint, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500); // Fast timeout for responsive fallback

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    // Silent fallback to mock data when backend is not running
    // console.info(`[ThreadIQ API] Backend offline or unavailable at ${BASE_URL}${endpoint}. Utilizing fallback mock data.`);
    return null;
  }
};

export const api = {
  /**
   * Fetch inventory items with optional filtering
   * @param {Object} filters - { store, size, category, status, search }
   */
  async fetchInventory(filters = {}) {
    const query = new URLSearchParams();
    if (filters.store && filters.store !== 'All Stores') query.set('store', filters.store);
    if (filters.size && filters.size !== 'All Sizes') query.set('size', filters.size);
    if (filters.category && filters.category !== 'All Categories') query.set('category', filters.category);
    if (filters.status && filters.status !== 'All Statuses') query.set('status', filters.status);
    if (filters.approvalStatus && filters.approvalStatus !== 'All') query.set('approvalStatus', filters.approvalStatus);
    if (filters.search) query.set('search', filters.search);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const remoteData = await safeFetch(`/api/v1/inventory${queryString}`);

    if (remoteData && remoteData.items) {
      return remoteData.items;
    }

    // Mock filtering logic
    let result = [...localInventory];

    if (filters.store && filters.store !== 'All Stores') {
      result = result.filter(item => item.storeName === filters.store || item.storeId === filters.store);
    }
    if (filters.size && filters.size !== 'All Sizes') {
      result = result.filter(item => item.size === filters.size);
    }
    if (filters.category && filters.category !== 'All Categories') {
      result = result.filter(item => item.category === filters.category);
    }
    if (filters.status && filters.status !== 'All Statuses' && filters.status !== 'All') {
      const s = filters.status.toLowerCase();
      result = result.filter(item => {
        const itemStatus = item.stockStatus.toLowerCase();
        if (s.includes('balanc')) return itemStatus.includes('balanc');
        if (s.includes('excess')) return itemStatus.includes('excess');
        if (s.includes('low')) return itemStatus.includes('low');
        return itemStatus === s;
      });
    }
    if (filters.approvalStatus && filters.approvalStatus !== 'All') {
      const app = filters.approvalStatus.toLowerCase();
      result = result.filter(item => {
        const itemApp = (item.approvalStatus || '').toLowerCase();
        return itemApp === app;
      });
    }
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.skuCode.toLowerCase().includes(q) ||
        item.colour.toLowerCase().includes(q) ||
        item.size.toLowerCase().includes(q) ||
        item.storeName.toLowerCase().includes(q)
      );
    }

    return result;
  },

  /**
   * Approve an inventory item proposal
   */
  async approveInventoryItem(itemId, notes = '', decisionPayload = null) {
    const remoteData = await safeFetch(`/api/v1/inventory/${itemId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes, decisionPayload, decidedAt: new Date().toISOString() })
    });

    if (remoteData && remoteData.success) {
      return remoteData;
    }

    localInventory = localInventory.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          approvalStatus: 'Approved',
          approvalNotes: notes,
          decidedAt: 'Just now',
          ...(decisionPayload ? { decisionPayload } : {})
        };
      }
      return item;
    });

    const updated = localInventory.find(i => i.id === itemId);

    // If an inter-store transfer was authorized, instantiate transfer in localTransfers
    if (decisionPayload?.strategy === 'transfer' && decisionPayload.sourceStore) {
      const newTransferId = `TR-${String(localTransfers.length + 1).padStart(3, '0')}`;
      localTransfers.unshift({
        transferId: newTransferId,
        recommendationId: updated?.actionProposal?.id || `rec-${Date.now()}`,
        productName: updated?.name || 'Apparel Item',
        category: updated?.category || 'T-shirts',
        size: updated?.size || '4XL',
        quantity: decisionPayload.transferQty || 15,
        sourceStoreId: decisionPayload.sourceStore.storeId,
        sourceStoreName: decisionPayload.sourceStore.storeName,
        destStoreId: updated?.storeId || 'store-01',
        destStoreName: updated?.storeName || 'Brigade Road Flagship',
        deliveryMode: decisionPayload.deliveryMode || 'normal',
        deliveryStatus: 'approved',
        dispatchTime: null,
        deliveredTime: null,
        notes: decisionPayload.notes || notes,
        isEmergencyMode: decisionPayload.isEmergencyMode || false,
        emergencyReason: decisionPayload.emergencyReason || null,
        lastUpdated: 'Just now'
      });
    }

    // Synchronize matching recommendation if linked
    if (updated?.actionProposal?.id) {
      localRecommendations = localRecommendations.map(rec =>
        rec.id === updated.actionProposal.id
          ? { ...rec, status: 'approved', decidedAt: 'Just now', notes }
          : rec
      );
    }

    return { success: true, item: updated };
  },

  /**
   * Reject an inventory item proposal
   */
  async rejectInventoryItem(itemId, reason = '') {
    const remoteData = await safeFetch(`/api/v1/inventory/${itemId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason, decidedAt: new Date().toISOString() })
    });

    if (remoteData && remoteData.success) {
      return remoteData;
    }

    localInventory = localInventory.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          approvalStatus: 'Rejected',
          rejectionReason: reason,
          decidedAt: 'Just now'
        };
      }
      return item;
    });

    const updated = localInventory.find(i => i.id === itemId);

    // Synchronize matching recommendation if linked
    if (updated?.actionProposal?.id) {
      localRecommendations = localRecommendations.map(rec =>
        rec.id === updated.actionProposal.id
          ? { ...rec, status: 'rejected', decidedAt: 'Just now', reason }
          : rec
      );
    }

    return { success: true, item: updated };
  },

  /**
   * Fetch all store locations and balance analytics
   */
  async fetchStores() {
    const remoteData = await safeFetch('/api/v1/stores');
    if (remoteData && Array.isArray(remoteData)) {
      return remoteData.map(st => ({
        ...st,
        state: st.state || 'KA',
        capacityUsagePct: st.capacityUsagePct ?? Math.min(95, Math.max(50, Math.round(((st.totalUnits || 500) / 800) * 100))),
        shortageSizes: Array.isArray(st.shortageSizes) ? st.shortageSizes : [],
        excessSizes: Array.isArray(st.excessSizes) ? st.excessSizes : [],
        transferOpportunitiesCount: st.transferOpportunitiesCount ?? (st.lowStockCount ? Math.min(4, st.lowStockCount) : 0),
        highlight: st.highlight || (st.lowStockCount ? `Alert: ${st.lowStockCount} size bottleneck(s) detected.` : 'All monitored sizes balanced.')
      }));
    }
    return MOCK_STORES;
  },

  /**
   * Fetch AI recommendations
   */
  async fetchRecommendations() {
    const remoteData = await safeFetch('/api/v1/recommendations');
    if (remoteData && Array.isArray(remoteData)) {
      return remoteData;
    }
    return localRecommendations;
  },

  /**
   * Trigger AI recommendation generation
   */
  async generateRecommendations() {
    const remoteData = await safeFetch('/api/v1/recommendations/generate', { method: 'POST' });
    if (remoteData && Array.isArray(remoteData)) {
      return remoteData;
    }
    return localRecommendations;
  },

  /**
   * Approve a recommendation
   */
  async approveRecommendation(id, notes = '') {
    const remoteData = await safeFetch(`/api/v1/recommendations/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes, decidedAt: new Date().toISOString() })
    });

    if (remoteData && remoteData.success) {
      return remoteData;
    }

    // Update local state prototype
    localRecommendations = localRecommendations.map(rec =>
      rec.id === id ? { ...rec, status: 'approved', decidedAt: 'Just now', notes } : rec
    );
    return { success: true, id, status: 'approved' };
  },

  /**
   * Reject a recommendation
   */
  async rejectRecommendation(id, reason = '') {
    const remoteData = await safeFetch(`/api/v1/recommendations/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason, decidedAt: new Date().toISOString() })
    });

    if (remoteData && remoteData.success) {
      return remoteData;
    }

    // Update local state prototype
    localRecommendations = localRecommendations.map(rec =>
      rec.id === id ? { ...rec, status: 'rejected', decidedAt: 'Just now', reason } : rec
    );
    return { success: true, id, status: 'rejected' };
  },

  /**
   * Fetch application configuration & thresholds
   */
  async fetchSettings() {
    const remoteData = await safeFetch('/api/v1/settings');
    if (remoteData && typeof remoteData === 'object') {
      return remoteData;
    }
    return { ...localSettings };
  },

  /**
   * Update application configuration & thresholds
   */
  async updateSettings(newSettings) {
    const remoteData = await safeFetch('/api/v1/settings', {
      method: 'PUT',
      body: JSON.stringify(newSettings)
    });

    if (remoteData && remoteData.success) {
      return remoteData;
    }

    localSettings = { ...localSettings, ...newSettings };
    try {
      localStorage.setItem('threadiq_settings', JSON.stringify(localSettings));
    } catch (e) {
      console.warn('Could not persist to localStorage', e);
    }

    return { success: true, settings: localSettings };
  },

  /**
   * Fetch alert notifications
   */
  async fetchNotifications() {
    const remoteData = await safeFetch('/api/v1/notifications');
    if (remoteData && Array.isArray(remoteData)) {
      return remoteData;
    }
    return MOCK_NOTIFICATIONS;
  },

  /**
   * Fetch approved inventory transfers
   */
  async fetchTransfers() {
    const remoteData = await safeFetch('/api/v1/transfers');
    if (remoteData && Array.isArray(remoteData)) {
      return remoteData;
    }
    return [...localTransfers];
  },

  /**
   * Update transfer delivery mode, status, or dispatch details
   */
  async updateTransfer(transferId, updates = {}) {
    const remoteData = await safeFetch(`/api/v1/transfers/${transferId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });

    if (remoteData && remoteData.success) {
      return remoteData;
    }

    localTransfers = localTransfers.map(tr =>
      tr.transferId === transferId
        ? { ...tr, ...updates, lastUpdated: new Date().toLocaleTimeString() }
        : tr
    );

    const updated = localTransfers.find(tr => tr.transferId === transferId);
    return { success: true, transfer: updated };
  }
};

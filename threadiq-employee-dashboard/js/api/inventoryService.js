/**
 * ThreadIQ Dedicated API Service Layer
 * Connects to Python FastAPI backend with SQLite shared database,
 * token-based authentication, optimistic concurrency control, and real-time SSE.
 */

import { MockStorage } from './mockStorage.js';
import { APP_CONFIG } from '../config.js';

class InventoryService {
  constructor() {
    this.apiBase = '/api';
    this.token = sessionStorage.getItem('threadiq_session_token') || localStorage.getItem('threadiq_session_token') || null;
    this.currentUser = JSON.parse(sessionStorage.getItem('threadiq_current_user') || localStorage.getItem('threadiq_current_user') || 'null');
    this.listeners = new Set();
    this.eventSource = null;
    this.connectionState = {
      status: 'offline', // 'connected' | 'reconnecting' | 'offline'
      lastSyncTime: new Date().toISOString(),
      latencyMs: 18
    };

    // Auto-connect SSE if session exists
    if (this.token) {
      this.connectRealtime();
    }
  }

  // Event Subscription (Pub/Sub)
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(event, data) {
    this.listeners.forEach(cb => {
      try {
        cb(event, data);
      } catch (err) {
        console.error('Listener callback error', err);
      }
    });
  }

  // Headers helper
  _getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------
  async login(username, password) {
    try {
      const res = await fetch(`${this.apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Invalid Employee ID or password.');
      }

      const data = await res.json();
      this.token = data.token;
      this.currentUser = data.employee;

      sessionStorage.setItem('threadiq_session_token', this.token);
      sessionStorage.setItem('threadiq_current_user', JSON.stringify(this.currentUser));
      localStorage.setItem('threadiq_session_token', this.token);
      localStorage.setItem('threadiq_current_user', JSON.stringify(this.currentUser));

      // Connect Real-Time SSE
      this.connectRealtime();

      this.emit('AUTH_STATE_CHANGED', { isAuthenticated: true, user: this.currentUser });
      return data;
    } catch (err) {
      console.warn('Backend login error:', err.message);
      throw err;
    }
  }

  async logout() {
    if (this.token) {
      try {
        await fetch(`${this.apiBase}/auth/logout`, {
          method: 'POST',
          headers: this._getHeaders()
        });
      } catch {}
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.token = null;
    this.currentUser = null;
    this.connectionState.status = 'offline';
    sessionStorage.removeItem('threadiq_session_token');
    sessionStorage.removeItem('threadiq_current_user');
    localStorage.removeItem('threadiq_session_token');
    localStorage.removeItem('threadiq_current_user');

    this.emit('AUTH_STATE_CHANGED', { isAuthenticated: false, user: null });
    this.emit('CONNECTION_STATUS_CHANGED', { status: 'offline' });
  }

  isAuthenticated() {
    return Boolean(this.token && this.currentUser);
  }

  getCurrentUser() {
    return this.currentUser;
  }

  // ---------------------------------------------------------------------------
  // Real-Time Server-Sent Events (SSE) Stream
  // ---------------------------------------------------------------------------
  connectRealtime() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    if (!this.token) {
      this.connectionState.status = 'offline';
      this.emit('CONNECTION_STATUS_CHANGED', { status: 'offline' });
      return;
    }

    const sseUrl = `${this.apiBase}/realtime/events?token=${encodeURIComponent(this.token)}`;
    this.eventSource = new EventSource(sseUrl);

    this.eventSource.onopen = () => {
      this.connectionState.status = 'connected';
      this.connectionState.lastSyncTime = new Date().toISOString();
      this.emit('CONNECTION_STATUS_CHANGED', { status: 'connected' });
    };

    this.eventSource.onerror = () => {
      this.connectionState.status = 'reconnecting';
      this.emit('CONNECTION_STATUS_CHANGED', { status: 'reconnecting' });
    };

    // Listen for inventory update broadcast
    this.eventSource.addEventListener('inventory_update', (e) => {
      try {
        const payload = JSON.parse(e.data);
        this.connectionState.lastSyncTime = new Date().toISOString();
        this.emit('REALTIME_INVENTORY_UPDATE', payload);
      } catch (err) {
        console.error('SSE inventory_update parse error', err);
      }
    });

    // Listen for transfer update broadcast
    this.eventSource.addEventListener('transfer_update', (e) => {
      try {
        const payload = JSON.parse(e.data);
        this.connectionState.lastSyncTime = new Date().toISOString();
        this.emit('REALTIME_TRANSFER_UPDATE', payload);
      } catch (err) {
        console.error('SSE transfer_update parse error', err);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Store Inventory Endpoints
  // ---------------------------------------------------------------------------
  async getInventory(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.colour && filters.colour !== 'all') queryParams.append('colour', filters.colour);
      if (filters.size && filters.size !== 'all') queryParams.append('size', filters.size);
      if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);

      const targetStoreId = filters.storeId || this.currentUser?.assigned_store_id || 'STORE_KA_MYS_01';
      queryParams.append('storeId', targetStoreId);

      // Try primary store-scoped endpoint, falling back to central manager endpoints
      let res = await fetch(`${this.apiBase}/stores/me/inventory?${queryParams.toString()}`, {
        headers: this._getHeaders()
      });

      if (!res.ok) {
        res = await fetch(`${this.apiBase}/v1/inventory?${queryParams.toString()}`, {
          headers: this._getHeaders()
        });
      }
      if (!res.ok) {
        res = await fetch(`${this.apiBase}/inventory?${queryParams.toString()}`, {
          headers: this._getHeaders()
        });
      }

      if (!res.ok) {
        throw new Error(`Inventory fetch failed: HTTP ${res.status}`);
      }

      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items || []);
      const totalCount = data.totalCount ?? data.total ?? items.length;
      const storeName = data.storeName || (targetStoreId === 'STORE_KA_MYS_01' ? 'Mysuru Central' : 'Brigade Road Flagship');

      return {
        storeId: targetStoreId,
        storeName: storeName,
        items: items,
        totalCount: totalCount
      };
    } catch (err) {
      console.warn('API getInventory error:', err.message);
      return {
        storeId: filters.storeId || this.currentUser?.assigned_store_id || 'STORE_KA_MYS_01',
        storeName: filters.storeId === 'STORE_KA_MYS_01' ? 'Mysuru Central' : 'Assigned Store',
        items: [],
        totalCount: 0,
        error: err.message
      };
    }
  }

  async getSummary(storeId) {
    try {
      const targetStoreId = storeId || this.currentUser?.assigned_store_id || 'STORE_KA_MYS_01';
      let res = await fetch(`${this.apiBase}/stores/me/inventory/summary?storeId=${encodeURIComponent(targetStoreId)}`, {
        headers: this._getHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        return data;
      }

      // Fallback: derive authoritative summary directly from getInventory
      const invRes = await this.getInventory({ storeId: targetStoreId });
      const items = invRes.items || [];
      const totalUnits = items.reduce((s, i) => s + (i.quantity ?? i.availableQty ?? 0), 0);
      const availableCount = items.filter(i => (i.quantity ?? i.availableQty ?? 0) > 0).length;
      const lowStockCount = items.filter(i => {
        const q = i.quantity ?? i.availableQty ?? 0;
        const th = i.minThreshold ?? 15;
        return q > 0 && q < th;
      }).length;
      const outOfStockCount = items.filter(i => (i.quantity ?? i.availableQty ?? 0) === 0).length;

      return {
        storeId: targetStoreId,
        storeName: invRes.storeName,
        storeCode: items[0]?.storeCode || (targetStoreId === 'STORE_KA_MYS_01' ? 'KA-MYS-01' : 'KA-BLR-01'),
        totalStockUnits: totalUnits,
        availableProducts: availableCount,
        lowStockVariants: lowStockCount,
        outOfStockVariants: outOfStockCount,
        totalTrackedVariants: items.length,
        lastSyncTimestamp: new Date().toISOString()
      };
    } catch (err) {
      console.warn('API getSummary error:', err.message);
      return {
        storeId: storeId || 'STORE_KA_MYS_01',
        storeName: 'Assigned Store',
        totalStockUnits: 0,
        availableProducts: 0,
        lowStockVariants: 0,
        outOfStockVariants: 0,
        totalTrackedVariants: 0,
        lastSyncTimestamp: new Date().toISOString()
      };
    }
  }

  async submitAdjustment(payload) {
    try {
      const endpoint = (payload.updateType === 'physical_count' || payload.storeId)
        ? `${this.apiBase}/inventory/update`
        : `${this.apiBase}/stores/me/inventory/adjustments`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: this._getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 409) {
          throw new Error(errorData.detail || 'Concurrency Conflict: Stock was updated by another session. Please reload and retry.');
        }
        throw new Error(errorData.detail || `Stock adjustment rejected: HTTP ${res.status}`);
      }

      const data = await res.json();
      this.emit('INVENTORY_UPDATED', data);
      return data;
    } catch (err) {
      console.error('submitAdjustment error:', err.message);
      throw err;
    }
  }

  async getHistory(filters = {}, storeId = null) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.updateType && filters.updateType !== 'all') queryParams.append('update_type', filters.updateType);
      if (filters.search) queryParams.append('search', filters.search);
      const targetStoreId = storeId || this.currentUser?.assigned_store_id;
      if (targetStoreId) queryParams.append('storeId', targetStoreId);

      const res = await fetch(`${this.apiBase}/stores/me/inventory/history?${queryParams.toString()}`, {
        headers: this._getHeaders()
      });

      if (!res.ok) throw new Error(`History fetch failed: HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('API getHistory error:', err.message);
      return { history: [] };
    }
  }

  async getAlerts(storeId = null) {
    try {
      const targetStoreId = storeId || this.currentUser?.assigned_store_id;
      const url = targetStoreId
        ? `${this.apiBase}/stores/me/inventory/alerts?storeId=${encodeURIComponent(targetStoreId)}`
        : `${this.apiBase}/stores/me/inventory/alerts`;
      const res = await fetch(url, {
        headers: this._getHeaders()
      });

      if (!res.ok) throw new Error(`Alerts fetch failed: HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('API getAlerts error:', err.message);
      return { alerts: [] };
    }
  }

  async getTransfers(storeId = null) {
    try {
      const targetStoreId = storeId || this.currentUser?.assigned_store_id;
      const url = targetStoreId
        ? `${this.apiBase}/stores/me/transfers?storeId=${encodeURIComponent(targetStoreId)}`
        : `${this.apiBase}/stores/me/transfers`;
      let res = await fetch(url, {
        headers: this._getHeaders()
      });

      if (!res.ok) {
        res = await fetch(`${this.apiBase}/v1/transfers?storeId=${encodeURIComponent(targetStoreId || '')}`, {
          headers: this._getHeaders()
        });
      }
      if (!res.ok) {
        res = await fetch(`${this.apiBase}/transfers?storeId=${encodeURIComponent(targetStoreId || '')}`, {
          headers: this._getHeaders()
        });
      }

      if (!res.ok) throw new Error(`Transfers fetch failed: HTTP ${res.status}`);
      const data = await res.json();
      const transfers = Array.isArray(data) ? data : (data.transfers || []);
      return { transfers: transfers };
    } catch (err) {
      console.warn('API getTransfers error:', err.message);
      return { transfers: [], error: err.message };
    }
  }

  async confirmTransferReceipt(transferId, employee = null) {
    try {
      const res = await fetch(`${this.apiBase}/transfers/${transferId}/receive`, {
        method: 'POST',
        headers: this._getHeaders(),
        body: JSON.stringify({ notes: `Received by ${employee?.name || this.currentUser?.name}` })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Receipt confirmation rejected: HTTP ${res.status}`);
      }

      const data = await res.json();
      this.emit('TRANSFER_RECEIVED', data);
      return data;
    } catch (err) {
      console.error('confirmTransferReceipt error:', err.message);
      throw err;
    }
  }
}

export const inventoryService = new InventoryService();

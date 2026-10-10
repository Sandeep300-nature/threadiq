/**
 * ThreadIQ Reactive Application State Manager
 * Centralizes data store, real-time SSE listener triggers, and authentication state.
 */

import { inventoryService } from '../api/inventoryService.js';
import { toast } from '../components/toast.js';

class AppStore {
  constructor() {
    const currentUser = inventoryService.getCurrentUser();
    this.state = {
      isAuthenticated: inventoryService.isAuthenticated(),
      currentUser: currentUser,
      selectedStoreId: currentUser?.assigned_store_id || 'STORE_KA_MYS_01',
      connectionStatus: inventoryService.connectionState.status, // 'connected' | 'reconnecting' | 'offline'
      activeView: 'dashboard',
      inventory: [],
      inventoryFilters: {
        search: '',
        colour: 'all',
        size: 'all',
        status: 'all'
      },
      summary: {
        totalStockUnits: 0,
        availableProducts: 0,
        lowStockVariants: 0,
        outOfStockVariants: 0,
        totalTrackedVariants: 0,
        storeName: '',
        storeCode: ''
      },
      alerts: [],
      transfers: [],
      history: [],
      historyFilters: {
        search: '',
        updateType: 'all'
      },
      isLoading: false,
      lastSyncTimestamp: new Date().toISOString(),
      unreadAlertsCount: 0
    };

    this.subscribers = new Set();

    // Listen to API service events
    inventoryService.subscribe((event, data) => {
      this.handleServiceEvent(event, data);
    });
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  notify() {
    this.subscribers.forEach(fn => {
      try {
        fn(this.state);
      } catch (err) {
        console.error('State subscriber error', err);
      }
    });
  }

  setState(partial) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  getState() {
    return this.state;
  }

  // Handle service events (including real-time SSE broadcasts)
  async handleServiceEvent(event, data) {
    if (event === 'AUTH_STATE_CHANGED') {
      const assignedStore = data.user?.assigned_store_id || 'STORE_KA_MYS_01';
      this.setState({
        isAuthenticated: data.isAuthenticated,
        currentUser: data.user,
        selectedStoreId: assignedStore
      });
      if (data.isAuthenticated) {
        await this.refreshAllData();
      }
    } else if (event === 'CONNECTION_STATUS_CHANGED') {
      this.setState({ connectionStatus: data.status });
      // Re-fetch authoritative status on reconnection
      if (data.status === 'connected' && this.state.isAuthenticated) {
        await this.refreshAllData();
      }
    } else if (event === 'REALTIME_INVENTORY_UPDATE') {
      // Real-time synchronization without manual reload
      const currentStoreId = this.state.currentUser?.assigned_store_id;
      if (!currentStoreId || currentStoreId === data.storeId) {
        toast.info(
          'Live Inventory Sync',
          `Stock updated for ${data.sku} (${data.previousQuantity} → ${data.newQuantity} units by ${data.employeeName}).`
        );
        await this.refreshAllData();
      }
    } else if (event === 'REALTIME_TRANSFER_UPDATE') {
      toast.info(
        'Manager Transfer Update',
        `Transfer ${data.transferId} status updated to ${data.status}.`
      );
      await this.refreshAllData();
    } else if (event === 'INVENTORY_UPDATED' || event === 'TRANSFER_RECEIVED') {
      await this.refreshAllData();
    }
  }

  // Initial load
  async init() {
    if (this.state.isAuthenticated) {
      this.setState({ isLoading: true });
      await this.refreshAllData();
      this.setState({ isLoading: false });
    }
  }

  // Refresh all state from backend
  async refreshAllData() {
    if (!this.state.isAuthenticated) return;

    try {
      const targetStoreId = this.state.selectedStoreId || this.state.currentUser?.assigned_store_id || 'STORE_KA_MYS_01';
      const filtersWithStore = { ...this.state.inventoryFilters, storeId: targetStoreId };

      const results = await Promise.allSettled([
        inventoryService.getInventory(filtersWithStore),
        inventoryService.getSummary(targetStoreId),
        inventoryService.getAlerts(targetStoreId),
        inventoryService.getTransfers(targetStoreId),
        inventoryService.getHistory(this.state.historyFilters, targetStoreId)
      ]);

      const invRes = results[0].status === 'fulfilled' ? results[0].value : { items: [] };
      const summaryRes = results[1].status === 'fulfilled' ? results[1].value : this.state.summary;
      const alertsRes = results[2].status === 'fulfilled' ? results[2].value : { alerts: [] };
      const transfersRes = results[3].status === 'fulfilled' ? results[3].value : { transfers: [] };
      const histRes = results[4].status === 'fulfilled' ? results[4].value : { history: [] };

      const unreadAlerts = (alertsRes.alerts || []).filter(a => a.severity === 'critical' || a.severity === 'warning').length;

      this.setState({
        selectedStoreId: targetStoreId,
        inventory: invRes.items || [],
        summary: summaryRes || this.state.summary,
        alerts: alertsRes.alerts || [],
        transfers: transfersRes.transfers || [],
        history: histRes.history || [],
        unreadAlertsCount: unreadAlerts,
        lastSyncTimestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to load store data:', err);
    }
  }

  // Demo store selector for employee session
  async setSelectedStore(storeId) {
    this.setState({ selectedStoreId: storeId });
    await this.refreshAllData();
  }

  // Navigation
  setActiveView(view) {
    this.setState({ activeView: view });
  }

  // Inventory Filters
  setInventoryFilters(newFilters) {
    const updated = { ...this.state.inventoryFilters, ...newFilters };
    this.state.inventoryFilters = updated;
    this.refreshInventoryOnly();
  }

  async refreshInventoryOnly() {
    try {
      const targetStoreId = this.state.selectedStoreId || this.state.currentUser?.assigned_store_id || 'STORE_KA_BLR_01';
      const filtersWithStore = { ...this.state.inventoryFilters, storeId: targetStoreId };
      const invRes = await inventoryService.getInventory(filtersWithStore);
      this.setState({ inventory: invRes.items || [] });
    } catch (err) {
      console.error('Error refreshing inventory', err);
    }
  }

  // History Filters
  setHistoryFilters(newFilters) {
    const updated = { ...this.state.historyFilters, ...newFilters };
    this.state.historyFilters = updated;
    this.refreshHistoryOnly();
  }

  async refreshHistoryOnly() {
    try {
      const histRes = await inventoryService.getHistory(this.state.historyFilters);
      this.setState({ history: histRes.history || [] });
    } catch (err) {
      console.error('Error refreshing history', err);
    }
  }
}

export const store = new AppStore();

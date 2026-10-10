/**
 * ThreadIQ - Central Authoritative Inventory Data Provider
 *
 * Implements InventoryDataProvider by connecting directly to the central
 * FastAPI + SQLite backend with real-time Server-Sent Events (SSE) synchronization.
 *
 * Guarantees that the Manager Dashboard, Groq AI Stock Intelligence, and
 * Employee Inventory Portal operate on the exact same authoritative data store.
 */

import { InventoryDataProvider } from './inventoryDataProvider.js';
import { validateInventoryRecord, normalizeInventoryRecord } from './inventorySchema.js';

export class BackendInventoryProvider extends InventoryDataProvider {
  constructor() {
    super();
    this.records = [];
    this.subscribers = new Set();
    this.lastSync = null;
    this.isLive = false;
    this.eventSource = null;
    this.pollTimer = null;
    this.apiBase = '/api';

    // Auto-initiate live stream
    this.initRealtimeStream();
  }

  /**
   * Connects to Server-Sent Events (SSE) real-time stream from central backend.
   */
  initRealtimeStream() {
    if (typeof window === 'undefined') return;

    const connect = () => {
      try {
        const streamUrl = `${this.apiBase}/realtime/events`;
        this.eventSource = new EventSource(streamUrl);

        this.eventSource.onopen = () => {
          this.isLive = true;
        };

        this.eventSource.addEventListener('inventory_update', async (e) => {
          try {
            const updateData = JSON.parse(e.data);
            this.lastSync = new Date().toISOString();
            // Automatically refresh authoritative records
            await this.fetchInventory();
            this.notifySubscribers(updateData);
          } catch (err) {
            console.warn('[BackendInventoryProvider] SSE parse error:', err);
          }
        });

        this.eventSource.addEventListener('transfer_update', async (e) => {
          try {
            const updateData = JSON.parse(e.data);
            this.lastSync = new Date().toISOString();
            // Automatically refresh authoritative records
            await this.fetchInventory();
            this.notifySubscribers(updateData);
          } catch (err) {
            console.warn('[BackendInventoryProvider] SSE transfer_update parse error:', err);
          }
        });

        this.eventSource.onerror = () => {
          this.isLive = false;
          if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
          }
          // Reconnect attempt after 5 seconds
          setTimeout(connect, 5000);
        };
      } catch (err) {
        this.isLive = false;
        setTimeout(connect, 5000);
      }
    };

    connect();

    // Secondary short-poll fallback to guarantee near-real-time synchronization
    // in case SSE is blocked by proxy or browser background tab throttling
    if (!this.pollTimer) {
      this.pollTimer = setInterval(async () => {
        try {
          const prevCount = this.records.length;
          const fresh = await this.fetchInventory();
          if (fresh && fresh.length > 0 && prevCount > 0) {
            // Check if any record changed version or timestamp
            let hasChanged = false;
            for (let i = 0; i < fresh.length; i++) {
              const f = fresh[i];
              const p = this.records[i];
              if (p && (f.quantityAvailable !== p.quantityAvailable || f.version !== p.version)) {
                hasChanged = true;
                break;
              }
            }
            if (hasChanged) {
              this.notifySubscribers({ type: 'POLL_DETECTED_CHANGE' });
            }
          }
        } catch {}
      }, 5000);
    }
  }

  /**
   * Retrieves authoritative inventory records from the central database.
   * @param {Object} [filters] - { store, storeId, size, sku, search, status, category }
   * @returns {Promise<Array<Object>>}
   */
  async fetchInventory(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.storeId && filters.storeId !== 'ALL') queryParams.set('storeId', filters.storeId);
      if (filters.store && filters.store !== 'All Stores') queryParams.set('store', filters.store);
      if (filters.size && filters.size !== 'All Sizes' && filters.size !== 'ALL') queryParams.set('size', filters.size);
      if (filters.sku) queryParams.set('sku', filters.sku);
      if (filters.category && filters.category !== 'All Categories') queryParams.set('category', filters.category);
      if (filters.status && filters.status !== 'All Statuses' && filters.status !== 'ALL') queryParams.set('status', filters.status);
      if (filters.search) queryParams.set('search', filters.search);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const res = await fetch(`${this.apiBase}/inventory${qs}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch authoritative inventory`);
      }

      const data = await res.json();
      const rawItems = data.items || [];

      // Normalize records according to ThreadIQ data contract
      this.records = rawItems.map(item => normalizeInventoryRecord({
        ...item,
        quantityAvailable: item.availableQty ?? item.quantityAvailable ?? item.quantity ?? 0,
        minimumStockThreshold: item.minThreshold ?? item.minimumStockThreshold ?? 15,
        dailySalesVelocity: item.salesVelocityPerDay ?? item.dailySalesVelocity ?? 2.5
      }));

      this.lastSync = new Date().toISOString();
      this.isLive = true;
      return [...this.records];
    } catch (err) {
      console.warn('[BackendInventoryProvider] Central backend fetch failed, using cached records:', err.message);
      this.isLive = false;
      return [...this.records];
    }
  }

  /**
   * Submits an inventory count adjustment to the authoritative central backend.
   * @param {Object} updatePayload - { storeId, productId, sku, size, quantityAvailable, dailySalesVelocity, ... }
   * @returns {Promise<{ success: boolean, record: Object, error?: string }>}
   */
  async updateInventoryItem(updatePayload) {
    const {
      storeId,
      productId,
      sku,
      size,
      quantityAvailable,
      quantity,
      dailySalesVelocity,
      minimumStockThreshold,
      remarks,
      employeeId = 'EMP001',
      employeeName = 'Store Associate'
    } = updatePayload;

    const countQty = quantityAvailable !== undefined ? Number(quantityAvailable) : Number(quantity || 0);

    const validation = validateInventoryRecord({
      storeId: storeId || 'STORE_KA_BLR_01',
      productId: productId || sku || 'item',
      productName: updatePayload.productName || 'Apparel Item',
      size: size || '4XL',
      quantityAvailable: countQty,
      minimumStockThreshold,
      dailySalesVelocity
    });

    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const res = await fetch(`${this.apiBase}/inventory/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: storeId || 'STORE_KA_BLR_01',
          productId: productId || sku,
          sku: sku || productId,
          size: size || '4XL',
          quantity: countQty,
          newTargetQuantity: countQty,
          employeeId,
          employeeName,
          updateSource: 'MANAGER_SIMULATION',
          remarks: remarks || 'Stock verification via ThreadIQ manager intelligence'
        })
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.detail || `Server rejected stock update: HTTP ${res.status}`);
      }

      const resultData = await res.json();

      // Immediately refresh authoritative dataset
      await this.fetchInventory();

      const updatedItem = this.records.find(
        r => (r.storeId === resultData.storeId || r.storeName === resultData.storeName) &&
             (r.sku === resultData.sku || r.productId === resultData.productId)
      ) || resultData;

      this.notifySubscribers(resultData);

      return {
        success: true,
        record: updatedItem,
        previousQuantity: resultData.previousQuantity,
        newQuantity: resultData.newQuantity,
        delta: resultData.quantityChange,
        version: resultData.version,
        timestamp: resultData.timestamp
      };
    } catch (err) {
      console.error('[BackendInventoryProvider] updateInventoryItem failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Applies deterministic testing scenarios (Test A, Test B, Test C) by updating
   * the central authoritative database.
   */
  async applyScenario(scenarioName) {
    switch (scenarioName) {
      case 'TEST_A_LOW_STOCK':
        return await this.updateInventoryItem({
          storeId: 'STORE_KA_BLR_01',
          storeName: 'Bengaluru Central',
          productId: 'TSHIRT-4XL-BLK',
          sku: 'TSHIRT-4XL-BLK',
          productName: 'Vintage Washed Heavyweight Tee',
          size: '4XL',
          quantityAvailable: 12,
          minimumStockThreshold: 15,
          dailySalesVelocity: 8.0,
          remarks: 'Section 7 Benchmark Test A: Physical Count = 12 units'
        });

      case 'TEST_B_PREDICTED_STOCKOUT':
        return await this.updateInventoryItem({
          storeId: 'STORE_KA_BLR_01',
          storeName: 'Bengaluru Central',
          productId: 'TSHIRT-4XL-WHT',
          sku: 'TSHIRT-4XL-WHT',
          productName: 'Essential Heavyweight Crew Neck',
          size: '4XL',
          quantityAvailable: 24,
          minimumStockThreshold: 10,
          dailySalesVelocity: 12.0,
          remarks: 'Simulation Scenario B: Predicted stockout under rapid velocity'
        });

      case 'TEST_C_HEALTHY_STOCK':
        return await this.updateInventoryItem({
          storeId: 'STORE_KA_MYS_01',
          storeName: 'Mysuru Central',
          productId: 'TSHIRT-4XL-BLK',
          sku: 'TSHIRT-4XL-BLK',
          productName: 'Vintage Washed Heavyweight Tee',
          size: '4XL',
          quantityAvailable: 45,
          minimumStockThreshold: 15,
          dailySalesVelocity: 2.0,
          remarks: 'Simulation Scenario C: Healthy regional donor node holding 45 units'
        });

      case 'TEST_D_FESTIVAL_SURGE':
        return await this.updateInventoryItem({
          storeId: 'STORE_KA_BLR_01',
          storeName: 'Bengaluru Central',
          productId: 'TSHIRT-4XL-BLK',
          sku: 'TSHIRT-4XL-BLK',
          productName: 'Vintage Washed Heavyweight Tee',
          size: '4XL',
          quantityAvailable: 20,
          minimumStockThreshold: 15,
          dailySalesVelocity: 8.0,
          remarks: 'Section 7 Benchmark Step 5: Physical Recount = 20 units'
        });

      default:
        throw new Error(`Unknown scenario: ${scenarioName}`);
    }
  }

  subscribeToUpdates(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(change) {
    for (const callback of this.subscribers) {
      try {
        callback({
          type: 'INVENTORY_CHANGED',
          change,
          allRecords: [...this.records]
        });
      } catch (err) {
        console.error('[BackendInventoryProvider] Subscriber notification error:', err);
      }
    }
  }

  getProviderStatus() {
    return {
      mode: 'AUTHORITATIVE_SHARED_SQLITE',
      isLive: this.isLive,
      recordCount: this.records.length,
      lastSync: this.lastSync,
      description: 'Connected directly to centralized SQLite database & real-time SSE stream'
    };
  }
}

// Export singleton instance for direct consumption across manager dashboard
export const backendInventoryProvider = new BackendInventoryProvider();

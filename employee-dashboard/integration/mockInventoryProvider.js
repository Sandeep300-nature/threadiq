/**
 * ThreadIQ - Mock Inventory Provider (Simulated Employee Dashboard)
 *
 * Implements InventoryDataProvider using sample-inventory.json.
 * Provides testing hooks to simulate real-time stock counts submitted by
 * in-store retail associates before the employee dashboard UI is built.
 */

import sampleData from '../data/sample-inventory.json';
import { InventoryDataProvider } from './inventoryDataProvider.js';
import { validateInventoryRecord, normalizeInventoryRecord } from './inventorySchema.js';

export class MockInventoryProvider extends InventoryDataProvider {
  constructor(initialData = null) {
    super();
    const rawItems = initialData || sampleData;
    this.records = rawItems.map(item => normalizeInventoryRecord(item));
    this.subscribers = new Set();
    this.lastSync = new Date().toISOString();
  }

  /**
   * Retrieves all normalized inventory records matching criteria.
   */
  async fetchInventory(filters = {}) {
    let result = [...this.records];

    if (filters.storeId && filters.storeId !== 'ALL') {
      result = result.filter(r => r.storeId === filters.storeId || r.storeName === filters.storeId);
    }
    if (filters.size && filters.size !== 'ALL') {
      result = result.filter(r => r.size === filters.size);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(r =>
        r.productName.toLowerCase().includes(q) ||
        r.productId.toLowerCase().includes(q) ||
        r.storeName.toLowerCase().includes(q)
      );
    }

    return result;
  }

  /**
   * Simulates an in-store employee updating inventory quantity and velocity.
   */
  async updateInventoryItem(updatePayload) {
    const { storeId, productId, size, quantityAvailable, dailySalesVelocity, minimumStockThreshold } = updatePayload;

    const validation = validateInventoryRecord({
      storeId,
      productId,
      productName: updatePayload.productName || 'Apparel Item',
      size,
      quantityAvailable,
      minimumStockThreshold,
      dailySalesVelocity
    });

    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const index = this.records.findIndex(
      r => (r.storeId === storeId || r.storeName === storeId) &&
           (r.productId === productId || r.productName === productId) &&
           r.size === size
    );

    const nowIso = new Date().toISOString();
    let updatedRecord;

    if (index >= 0) {
      const existing = this.records[index];
      const merged = {
        ...existing,
        quantityAvailable: Number(quantityAvailable),
        ...(dailySalesVelocity !== undefined ? { dailySalesVelocity: Number(dailySalesVelocity) } : {}),
        ...(minimumStockThreshold !== undefined ? { minimumStockThreshold: Number(minimumStockThreshold) } : {}),
        lastUpdated: nowIso,
        _source: 'employee-simulation-update'
      };
      updatedRecord = normalizeInventoryRecord(merged);
      this.records[index] = updatedRecord;
    } else {
      const created = {
        storeId,
        storeName: updatePayload.storeName || storeId,
        productId,
        productName: updatePayload.productName || 'T-shirt',
        size,
        quantityAvailable: Number(quantityAvailable),
        minimumStockThreshold: minimumStockThreshold !== undefined ? Number(minimumStockThreshold) : 15,
        dailySalesVelocity: dailySalesVelocity !== undefined ? Number(dailySalesVelocity) : 5,
        lastUpdated: nowIso,
        _source: 'employee-simulation-created'
      };
      updatedRecord = normalizeInventoryRecord(created);
      this.records.push(updatedRecord);
    }

    this.lastSync = nowIso;
    this.notifySubscribers(updatedRecord);

    return {
      success: true,
      record: updatedRecord,
      warnings: validation.warnings
    };
  }

  /**
   * Applies deterministic testing scenarios (Test A, Test B, Test C).
   */
  applyScenario(scenarioName) {
    switch (scenarioName) {
      case 'TEST_A_LOW_STOCK':
        return this.updateInventoryItem({
          storeId: 'BLR-FLAG-01',
          storeName: 'Brigade Road Flagship',
          productId: 'TSHIRT-4XL-BLK',
          productName: 'T-shirt',
          size: '4XL',
          quantityAvailable: 12,
          minimumStockThreshold: 15,
          dailySalesVelocity: 8.0
        });

      case 'TEST_B_PREDICTED_STOCKOUT':
        return this.updateInventoryItem({
          storeId: 'BLR-FLAG-01',
          storeName: 'Brigade Road Flagship',
          productId: 'TSHIRT-4XL-WHT',
          productName: 'T-shirt',
          size: '4XL',
          quantityAvailable: 24,
          minimumStockThreshold: 10,
          dailySalesVelocity: 12.0
        });

      case 'TEST_C_HEALTHY_STOCK':
        return this.updateInventoryItem({
          storeId: 'MYS-CENTRAL-01',
          storeName: 'Mysuru Central',
          productId: 'TSHIRT-4XL-BLK',
          productName: 'T-shirt',
          size: '4XL',
          quantityAvailable: 100,
          minimumStockThreshold: 20,
          dailySalesVelocity: 2.0
        });

      case 'TEST_D_FESTIVAL_SURGE':
        return this.updateInventoryItem({
          storeId: 'BLR-FLAG-01',
          storeName: 'Brigade Road Flagship',
          productId: 'TSHIRT-4XL-BLK',
          productName: 'Vintage Washed Heavyweight Tee',
          size: '4XL',
          quantityAvailable: 18,
          minimumStockThreshold: 15,
          dailySalesVelocity: 6.0
        });

      default:
        throw new Error(`Unknown scenario: ${scenarioName}`);
    }
  }

  /**
   * Resets mock data back to sample-inventory.json defaults.
   */
  resetToSampleData() {
    this.records = sampleData.map(item => normalizeInventoryRecord(item));
    this.lastSync = new Date().toISOString();
    this.notifySubscribers(null);
  }

  subscribeToUpdates(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(change) {
    for (const callback of this.subscribers) {
      try {
        callback({ type: 'INVENTORY_CHANGED', change, allRecords: [...this.records] });
      } catch (err) {
        console.error('Subscriber notification error:', err);
      }
    }
  }

  getProviderStatus() {
    return {
      mode: 'MOCK_SIMULATION',
      isLive: false,
      recordCount: this.records.length,
      lastSync: this.lastSync,
      description: 'Controlled simulation environment for manager dashboard stock telemetry'
    };
  }
}

// Export singleton instance for direct consumption
export const mockInventoryProvider = new MockInventoryProvider();

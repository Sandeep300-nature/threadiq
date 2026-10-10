/**
 * ThreadIQ - Inventory Data Provider Interface
 *
 * Defines the standard contract for accessing store inventory records.
 * The Manager Dashboard consumes this interface exclusively.
 *
 * Today: Backed by MockInventoryProvider (with sample-inventory.json and simulation hooks).
 * Tomorrow: Backed by RemoteHttpInventoryProvider (talking to real Employee Dashboard backend)
 * without requiring any refactor of Manager Dashboard UI or stock analysis logic.
 */

export class InventoryDataProvider {
  /**
   * Retrieves all inventory records matching optional query criteria.
   * @param {Object} [filters] - { storeId, size, search }
   * @returns {Promise<Array<Object>>}
   */
  async fetchInventory(filters = {}) {
    throw new Error('InventoryDataProvider.fetchInventory() must be implemented by subclass');
  }

  /**
   * Submits an inventory count adjustment (simulated today, real API endpoint tomorrow).
   * @param {Object} updatePayload - { storeId, productId, size, quantityAvailable, dailySalesVelocity }
   * @returns {Promise<{ success: boolean, record: Object }>}
   */
  async updateInventoryItem(updatePayload) {
    throw new Error('InventoryDataProvider.updateInventoryItem() must be implemented by subclass');
  }

  /**
   * Subscribes to real-time or simulated inventory updates.
   * @param {Function} callback - Triggered when inventory changes
   * @returns {Function} Unsubscribe function
   */
  subscribeToUpdates(callback) {
    throw new Error('InventoryDataProvider.subscribeToUpdates() must be implemented by subclass');
  }

  /**
   * Retrieves the telemetry health of this data provider.
   * @returns {{ mode: string, isLive: boolean, recordCount: number, lastSync: string }}
   */
  getProviderStatus() {
    throw new Error('InventoryDataProvider.getProviderStatus() must be implemented by subclass');
  }
}

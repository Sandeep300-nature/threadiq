/**
 * ThreadIQ Initial Seed Data & Persistence Engine
 * Karnataka Retail Grid - Bengaluru Central (#KA-BLR-04)
 */

const STORAGE_KEYS = {
  INVENTORY: 'threadiq_inventory_data_v2',
  HISTORY: 'threadiq_history_data_v2',
  TRANSFERS: 'threadiq_transfers_data_v2',
  ALERTS: 'threadiq_alerts_data_v2',
  LAST_SYNC: 'threadiq_last_sync_v2',
  API_MODE: 'threadiq_api_mode_v2'
};

// Seed Products: 4 core styles across 4 colors (Black, White, Navy Blue, Grey) and sizes (S, M, L, XL, XXL)
const INITIAL_INVENTORY = [
  // 1. Essential Heavyweight Crew Neck Tee (240 GSM)
  {
    id: 'prod_tsh_blk_s',
    name: 'Essential Heavyweight Crew Neck',
    category: 'Heavyweight Cotton',
    colour: 'Black',
    colourHex: '#18181b',
    colourId: 'black',
    size: 'S',
    sku: 'TIQ-CRW-BLK-S',
    quantity: 18,
    minThreshold: 15,
    lastUpdated: '2026-10-09T18:30:00Z',
    unitPrice: 899
  },
  {
    id: 'prod_tsh_blk_m',
    name: 'Essential Heavyweight Crew Neck',
    category: 'Heavyweight Cotton',
    colour: 'Black',
    colourHex: '#18181b',
    colourId: 'black',
    size: 'M',
    sku: 'TIQ-CRW-BLK-M',
    quantity: 0, // OUT OF STOCK (Target test case)
    minThreshold: 20,
    lastUpdated: '2026-10-09T21:15:00Z',
    unitPrice: 899
  },
  {
    id: 'prod_tsh_blk_l',
    name: 'Essential Heavyweight Crew Neck',
    category: 'Heavyweight Cotton',
    colour: 'Black',
    colourHex: '#18181b',
    colourId: 'black',
    size: 'L',
    sku: 'TIQ-CRW-BLK-L',
    quantity: 26,
    minThreshold: 15,
    lastUpdated: '2026-10-09T14:20:00Z',
    unitPrice: 899
  },
  {
    id: 'prod_tsh_blk_xl',
    name: 'Essential Heavyweight Crew Neck',
    category: 'Heavyweight Cotton',
    colour: 'Black',
    colourHex: '#18181b',
    colourId: 'black',
    size: 'XL',
    sku: 'TIQ-CRW-BLK-XL',
    quantity: 14, // LOW STOCK
    minThreshold: 15,
    lastUpdated: '2026-10-09T16:00:00Z',
    unitPrice: 899
  },
  {
    id: 'prod_tsh_blk_xxl',
    name: 'Essential Heavyweight Crew Neck',
    category: 'Heavyweight Cotton',
    colour: 'Black',
    colourHex: '#18181b',
    colourId: 'black',
    size: 'XXL',
    sku: 'TIQ-CRW-BLK-XXL',
    quantity: 8, // LOW STOCK
    minThreshold: 10,
    lastUpdated: '2026-10-08T11:45:00Z',
    unitPrice: 949
  },

  // 2. White Crew Neck Variants
  {
    id: 'prod_tsh_wht_s',
    name: 'Essential Heavyweight Crew Neck',
    category: 'Heavyweight Cotton',
    colour: 'White',
    colourHex: '#ffffff',
    colourId: 'white',
    size: 'S',
    sku: 'TIQ-CRW-WHT-S',
    quantity: 32,
    minThreshold: 15,
    lastUpdated: '2026-10-09T12:00:00Z',
    unitPrice: 899
  },
  {
    id: 'prod_tsh_wht_m',
    name: 'Essential Heavyweight Crew Neck',
    category: 'Heavyweight Cotton',
    colour: 'White',
    colourHex: '#ffffff',
    colourId: 'white',
    size: 'M',
    sku: 'TIQ-CRW-WHT-M',
    quantity: 24,
    minThreshold: 20,
    lastUpdated: '2026-10-09T19:10:00Z',
    unitPrice: 899
  },
  {
    id: 'prod_tsh_wht_l',
    name: 'Essential Heavyweight Crew Neck',
    category: 'Heavyweight Cotton',
    colour: 'White',
    colourHex: '#ffffff',
    colourId: 'white',
    size: 'L',
    sku: 'TIQ-CRW-WHT-L',
    quantity: 4, // CRITICAL LOW STOCK (Target test case)
    minThreshold: 15,
    lastUpdated: '2026-10-09T22:05:00Z',
    unitPrice: 899
  },
  {
    id: 'prod_tsh_wht_xl',
    name: 'Essential Heavyweight Crew Neck',
    category: 'Heavyweight Cotton',
    colour: 'White',
    colourHex: '#ffffff',
    colourId: 'white',
    size: 'XL',
    sku: 'TIQ-CRW-WHT-XL',
    quantity: 19,
    minThreshold: 15,
    lastUpdated: '2026-10-08T15:30:00Z',
    unitPrice: 899
  },
  {
    id: 'prod_tsh_wht_xxl',
    name: 'Essential Heavyweight Crew Neck',
    category: 'Heavyweight Cotton',
    colour: 'White',
    colourHex: '#ffffff',
    colourId: 'white',
    size: 'XXL',
    sku: 'TIQ-CRW-WHT-XXL',
    quantity: 0, // OUT OF STOCK
    minThreshold: 10,
    lastUpdated: '2026-10-09T10:15:00Z',
    unitPrice: 949
  },

  // 3. Navy Blue Crew Neck Variants
  {
    id: 'prod_tsh_nvy_s',
    name: 'Supima Relaxed Fit Tee',
    category: 'Supima Cotton',
    colour: 'Navy Blue',
    colourHex: '#1e3a8a',
    colourId: 'navy',
    size: 'S',
    sku: 'TIQ-SPM-NVY-S',
    quantity: 21,
    minThreshold: 15,
    lastUpdated: '2026-10-09T17:20:00Z',
    unitPrice: 1099
  },
  {
    id: 'prod_tsh_nvy_m',
    name: 'Supima Relaxed Fit Tee',
    category: 'Supima Cotton',
    colour: 'Navy Blue',
    colourHex: '#1e3a8a',
    colourId: 'navy',
    size: 'M',
    sku: 'TIQ-SPM-NVY-M',
    quantity: 38,
    minThreshold: 20,
    lastUpdated: '2026-10-09T16:50:00Z',
    unitPrice: 1099
  },
  {
    id: 'prod_tsh_nvy_l',
    name: 'Supima Relaxed Fit Tee',
    category: 'Supima Cotton',
    colour: 'Navy Blue',
    colourHex: '#1e3a8a',
    colourId: 'navy',
    size: 'L',
    sku: 'TIQ-SPM-NVY-L',
    quantity: 29,
    minThreshold: 15,
    lastUpdated: '2026-10-09T13:10:00Z',
    unitPrice: 1099
  },
  {
    id: 'prod_tsh_nvy_xl',
    name: 'Supima Relaxed Fit Tee',
    category: 'Supima Cotton',
    colour: 'Navy Blue',
    colourHex: '#1e3a8a',
    colourId: 'navy',
    size: 'XL',
    sku: 'TIQ-SPM-NVY-XL',
    quantity: 12, // DISCREPANCY DETECTED / LOW (Target test case)
    minThreshold: 15,
    lastUpdated: '2026-10-09T20:45:00Z',
    unitPrice: 1099
  },
  {
    id: 'prod_tsh_nvy_xxl',
    name: 'Supima Relaxed Fit Tee',
    category: 'Supima Cotton',
    colour: 'Navy Blue',
    colourHex: '#1e3a8a',
    colourId: 'navy',
    size: 'XXL',
    sku: 'TIQ-SPM-NVY-XXL',
    quantity: 15,
    minThreshold: 10,
    lastUpdated: '2026-10-08T18:00:00Z',
    unitPrice: 1149
  },

  // 4. Grey Heather Variants
  {
    id: 'prod_tsh_gry_s',
    name: 'Performance Dry-Fit Athletic Tee',
    category: 'Activewear Dry-Fit',
    colour: 'Grey',
    colourHex: '#64748b',
    colourId: 'grey',
    size: 'S',
    sku: 'TIQ-PRF-GRY-S',
    quantity: 17,
    minThreshold: 15,
    lastUpdated: '2026-10-09T11:00:00Z',
    unitPrice: 799
  },
  {
    id: 'prod_tsh_gry_m',
    name: 'Performance Dry-Fit Athletic Tee',
    category: 'Activewear Dry-Fit',
    colour: 'Grey',
    colourHex: '#64748b',
    colourId: 'grey',
    size: 'M',
    sku: 'TIQ-PRF-GRY-M',
    quantity: 42,
    minThreshold: 20,
    lastUpdated: '2026-10-09T15:25:00Z',
    unitPrice: 799
  },
  {
    id: 'prod_tsh_gry_l',
    name: 'Performance Dry-Fit Athletic Tee',
    category: 'Activewear Dry-Fit',
    colour: 'Grey',
    colourHex: '#64748b',
    colourId: 'grey',
    size: 'L',
    sku: 'TIQ-PRF-GRY-L',
    quantity: 27,
    minThreshold: 15,
    lastUpdated: '2026-10-09T14:40:00Z',
    unitPrice: 799
  },
  {
    id: 'prod_tsh_gry_xl',
    name: 'Performance Dry-Fit Athletic Tee',
    category: 'Activewear Dry-Fit',
    colour: 'Grey',
    colourHex: '#64748b',
    colourId: 'grey',
    size: 'XL',
    sku: 'TIQ-PRF-GRY-XL',
    quantity: 11, // LOW STOCK
    minThreshold: 15,
    lastUpdated: '2026-10-08T17:15:00Z',
    unitPrice: 799
  },
  {
    id: 'prod_tsh_gry_xxl',
    name: 'Performance Dry-Fit Athletic Tee',
    category: 'Activewear Dry-Fit',
    colour: 'Grey',
    colourHex: '#64748b',
    colourId: 'grey',
    size: 'XXL',
    sku: 'TIQ-PRF-GRY-XXL',
    quantity: 35, // HIGH EXCESS STOCK (AI Optimization case)
    minThreshold: 10,
    lastUpdated: '2026-10-09T09:30:00Z',
    unitPrice: 849
  }
];

// Initial Stock Transfers (Inter-Store in Karnataka)
const INITIAL_TRANSFERS = [
  {
    id: 'TRF-KA-2026-0891',
    sourceStore: 'Indiranagar Flagship, Bengaluru',
    sourceStoreCode: 'KA-BLR-02',
    destinationStore: 'Bengaluru Central',
    destinationStoreCode: 'KA-BLR-04',
    productId: 'prod_tsh_blk_m',
    productName: 'Essential Heavyweight Crew Neck',
    colour: 'Black',
    size: 'M',
    sku: 'TIQ-CRW-BLK-M',
    quantity: 25,
    requestDate: '2026-10-09T14:00:00Z',
    estimatedArrival: 'Today, 4:30 PM (Via Karnataka Logistics Van #KA-04-E-1092)',
    status: 'In Transit', // Ready for employee to click Confirm Receipt!
    notes: 'Urgent redistribution to eliminate stockout before weekend peak footfall.'
  },
  {
    id: 'TRF-KA-2026-0884',
    sourceStore: 'Mysuru Central Hub',
    sourceStoreCode: 'KA-MYS-01',
    destinationStore: 'Bengaluru Central',
    destinationStoreCode: 'KA-BLR-04',
    productId: 'prod_tsh_wht_l',
    productName: 'Essential Heavyweight Crew Neck',
    colour: 'White',
    size: 'L',
    sku: 'TIQ-CRW-WHT-L',
    quantity: 20,
    requestDate: '2026-10-09T18:30:00Z',
    estimatedArrival: 'Tomorrow, 11:30 AM',
    status: 'Pending Approval', // Employee cannot approve (Manager role required)
    notes: 'Auto-triggered by ThreadIQ Redistribution Engine due to low stock alert.'
  },
  {
    id: 'TRF-KA-2026-0870',
    sourceStore: 'Bengaluru Central',
    sourceStoreCode: 'KA-BLR-04',
    destinationStore: 'Hubballi Commercial Hub',
    destinationStoreCode: 'KA-HUB-01',
    productId: 'prod_tsh_gry_xxl',
    productName: 'Performance Dry-Fit Athletic Tee',
    colour: 'Grey',
    size: 'XXL',
    sku: 'TIQ-PRF-GRY-XXL',
    quantity: 15,
    requestDate: '2026-10-08T10:15:00Z',
    estimatedArrival: '11 Oct 2026, 2:00 PM',
    status: 'Approved',
    notes: 'Outward redistribution of slow-moving inventory to high-demand zone.'
  },
  {
    id: 'TRF-KA-2026-0862',
    sourceStore: 'Mangaluru City Centre',
    sourceStoreCode: 'KA-MNG-01',
    destinationStore: 'Bengaluru Central',
    destinationStoreCode: 'KA-BLR-04',
    productId: 'prod_tsh_nvy_m',
    productName: 'Supima Relaxed Fit Tee',
    colour: 'Navy Blue',
    size: 'M',
    sku: 'TIQ-SPM-NVY-M',
    quantity: 18,
    requestDate: '2026-10-07T09:00:00Z',
    estimatedArrival: 'Delivered',
    status: 'Received',
    notes: 'Receipt verified and signed off by Rahul Sharma.'
  }
];

// Initial Auditable Inventory History Log
const INITIAL_HISTORY = [
  {
    id: 'LOG-8841-01',
    timestamp: '2026-10-09T22:05:00Z',
    employeeName: 'Rahul Sharma',
    employeeId: 'EMP-TIQ-8842',
    productId: 'prod_tsh_wht_l',
    productName: 'Essential Heavyweight Crew Neck',
    colour: 'White',
    size: 'L',
    sku: 'TIQ-CRW-WHT-L',
    previousQuantity: 10,
    quantityChanged: -6,
    newQuantity: 4,
    updateType: 'Sale / Stock Reduction',
    referenceId: 'POS-REC-99420',
    remarks: 'Evening batch sale reconciliation at counter 2.'
  },
  {
    id: 'LOG-8841-02',
    timestamp: '2026-10-09T21:15:00Z',
    employeeName: 'Rahul Sharma',
    employeeId: 'EMP-TIQ-8842',
    productId: 'prod_tsh_blk_m',
    productName: 'Essential Heavyweight Crew Neck',
    colour: 'Black',
    size: 'M',
    sku: 'TIQ-CRW-BLK-M',
    previousQuantity: 3,
    quantityChanged: -3,
    newQuantity: 0,
    updateType: 'Sale / Stock Reduction',
    referenceId: 'POS-REC-99388',
    remarks: 'In-store retail counter purchase.'
  },
  {
    id: 'LOG-8841-03',
    timestamp: '2026-10-09T18:30:00Z',
    employeeName: 'Rahul Sharma',
    employeeId: 'EMP-TIQ-8842',
    productId: 'prod_tsh_blk_s',
    productName: 'Essential Heavyweight Crew Neck',
    colour: 'Black',
    size: 'S',
    sku: 'TIQ-CRW-BLK-S',
    previousQuantity: 8,
    quantityChanged: 10,
    newQuantity: 18,
    updateType: 'Stock Received',
    referenceId: 'IN-SHIP-KA-4412',
    remarks: 'Morning replenishment batch from Peenya distribution hub.'
  },
  {
    id: 'LOG-8841-04',
    timestamp: '2026-10-08T16:20:00Z',
    employeeName: 'Rahul Sharma',
    employeeId: 'EMP-TIQ-8842',
    productId: 'prod_tsh_blk_l',
    productName: 'Essential Heavyweight Crew Neck',
    colour: 'Black',
    size: 'L',
    sku: 'TIQ-CRW-BLK-L',
    previousQuantity: 28,
    quantityChanged: -2,
    newQuantity: 26,
    updateType: 'Damaged Items',
    referenceId: 'DMG-BLR-019',
    remarks: 'Garment hanger snag causing fabric tear on display rack.'
  },
  {
    id: 'LOG-8841-05',
    timestamp: '2026-10-08T11:45:00Z',
    employeeName: 'Rahul Sharma',
    employeeId: 'EMP-TIQ-8842',
    productId: 'prod_tsh_nvy_xl',
    productName: 'Supima Relaxed Fit Tee',
    colour: 'Navy Blue',
    size: 'XL',
    sku: 'TIQ-SPM-NVY-XL',
    previousQuantity: 15,
    quantityChanged: -3,
    newQuantity: 12,
    updateType: 'Stock Correction',
    referenceId: 'AUD-CYC-8812',
    remarks: 'Physical cycle count correction. 3 units untracked shrinkage.'
  }
];

export const MockStorage = {
  getInventory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      return stored ? JSON.parse(stored) : INITIAL_INVENTORY;
    } catch {
      return INITIAL_INVENTORY;
    }
  },

  saveInventory(inventory) {
    try {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
      this.updateLastSync();
    } catch (e) {
      console.warn('Storage write failed', e);
    }
  },

  getHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return stored ? JSON.parse(stored) : INITIAL_HISTORY;
    } catch {
      return INITIAL_HISTORY;
    }
  },

  saveHistory(history) {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
      console.warn('History save failed', e);
    }
  },

  getTransfers() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRANSFERS);
      return stored ? JSON.parse(stored) : INITIAL_TRANSFERS;
    } catch {
      return INITIAL_TRANSFERS;
    }
  },

  saveTransfers(transfers) {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(transfers));
      this.updateLastSync();
    } catch (e) {
      console.warn('Transfers save failed', e);
    }
  },

  updateLastSync() {
    const now = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now);
    } catch {}
    return now;
  },

  getLastSync() {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || new Date().toISOString();
  },

  resetToDefault() {
    try {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(INITIAL_INVENTORY));
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(INITIAL_HISTORY));
      localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(INITIAL_TRANSFERS));
      this.updateLastSync();
    } catch (e) {
      console.warn('Reset failed', e);
    }
  }
};

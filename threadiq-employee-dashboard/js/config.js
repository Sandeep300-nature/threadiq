/**
 * ThreadIQ Employee Inventory Dashboard - Configuration & Constants
 * Karnataka Retail Grid Architecture
 */

export const APP_CONFIG = {
  APP_NAME: 'ThreadIQ',
  PLATFORM_TITLE: 'AI Retail Redistribution Grid',
  VERSION: '2.4.0-prod',
  API_BASE_URL: '/api', // Can be toggled to external FastAPI URL
  SYNC_INTERVAL_MS: 30000,
  
  // Current Store Context (Employee-facing constraint: single assigned store)
  CURRENT_STORE: {
    id: 'STORE_KA_MYS_01',
    code: 'KA-MYS-01',
    name: 'Mysuru Central',
    location: 'D. Devaraj Urs Road, Mysuru, Karnataka 570001',
    zone: 'Karnataka Heritage Zone',
    managerName: 'Priya Kulkarni',
    totalCapacityUnits: 5000,
  },

  // Active Authenticated Employee
  CURRENT_EMPLOYEE: {
    id: 'EMP001',
    name: 'Rahul Sharma',
    role: 'Store Associate / Inventory Specialist',
    email: 'rahul.sharma@threadiq.in',
    avatarInitials: 'RS',
    assignedStoreId: 'STORE_KA_MYS_01',
    permissions: {
      canAdjustInventory: true,
      canConfirmTransfers: true,
      canApproveTransfers: false, // Strict business rule: Only Store Manager can approve
      canModifyOtherStores: false,
    }
  },

  // T-Shirt Attributes
  COLOURS: [
    { id: 'black', name: 'Black', hex: '#18181b', border: 'rgba(0,0,0,0.2)' },
    { id: 'white', name: 'White', hex: '#ffffff', border: '#cbd5e1' },
    { id: 'navy',  name: 'Navy Blue', hex: '#1e3a8a', border: 'rgba(30,58,138,0.3)' },
    { id: 'grey',  name: 'Grey', hex: '#64748b', border: 'rgba(100,116,139,0.3)' }
  ],

  SIZES: ['S', 'M', 'L', 'XL', 'XXL'],

  // Update Inventory Categories
  UPDATE_TYPES: {
    STOCK_RECEIVED: {
      id: 'stock_received',
      name: 'Stock Received',
      direction: 'add',
      description: 'Incoming shipment, supplier delivery or central warehouse intake',
      badgeClass: 'stock-received'
    },
    SALE_REDUCTION: {
      id: 'sale_reduction',
      name: 'Sale / Stock Reduction',
      direction: 'subtract',
      description: 'In-store counter sales, offline POS sync or customer order fulfillment',
      badgeClass: 'sale'
    },
    DAMAGED_ITEMS: {
      id: 'damaged_items',
      name: 'Damaged Items',
      direction: 'subtract',
      description: 'Stained, torn, defective fabric or display write-off (requires remarks)',
      badgeClass: 'damaged'
    },
    STOCK_CORRECTION: {
      id: 'stock_correction',
      name: 'Stock Correction',
      direction: 'set_or_reconcile',
      description: 'Physical audit recount, barcode scan fix or inventory reconciliation',
      badgeClass: 'correction'
    }
  },

  // Stock Threshold Status Rules
  STOCK_STATUS: {
    OUT_OF_STOCK: 'out_of_stock',
    LOW_STOCK: 'low_stock',
    IN_STOCK: 'in_stock'
  },

  // Partner Karnataka Stores for Stock Transfers
  KARNATAKA_STORES: [
    { id: 'store_ka_blr_04', code: 'KA-BLR-04', name: 'Bengaluru Central (Current Store)' },
    { id: 'store_ka_blr_02', code: 'KA-BLR-02', name: 'Indiranagar Flagship, Bengaluru' },
    { id: 'store_ka_mys_01', code: 'KA-MYS-01', name: 'Mysuru Central Hub, Mysuru' },
    { id: 'store_ka_hub_01', code: 'KA-HUB-01', name: 'Hubballi Commercial Hub, Hubballi' },
    { id: 'store_ka_mng_01', code: 'KA-MNG-01', name: 'Mangaluru City Centre, Mangaluru' }
  ]
};

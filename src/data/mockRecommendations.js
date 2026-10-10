/**
 * ThreadIQ - Synthetic AI Recommendations Dataset
 * Supports Transfer, Reorder, Markdown, and Wait actions.
 * All actions are prototype simulations.
 */

export const MOCK_RECOMMENDATIONS = [
  {
    id: 'rec-101',
    skuId: 'sku-ts-001',
    productName: 'Vintage Washed Oversized Heavyweight Tee',
    size: '4XL',
    colour: 'Jet Black',
    action: 'Transfer', // Transfer, Reorder, Markdown, Wait
    priority: 'Critical',
    sourceStore: 'Heritage Mall Hub (MYS)',
    sourceStoreId: 'store-02',
    destStore: 'Brigade Road Flagship (BLR)',
    destStoreId: 'store-01',
    proposedQty: 45,
    estimatedImpactRevenue: '+$1,980 potential revenue saved',
    reasoning: 'Brigade Road Flagship stockout anticipated within 10 operating hours (3 units left, velocity 7.2 units/day). Heritage Mall Hub holds 168 units (3.4x overstocked target). Rebalancing balances customer demand without new procurement expense.',
    stockContext: {
      sourceCurrentStock: 168,
      sourceRunRate: '2.1 units/day',
      destCurrentStock: 3,
      destRunRate: '7.2 units/day',
      transitDaysEstimate: '2 days via Regional Ground Freight'
    },
    status: 'pending', // pending, approved, rejected
    createdAt: '15 mins ago',
    confidenceScore: 96
  },
  {
    id: 'rec-102',
    skuId: 'sku-ts-007',
    productName: 'Drop-Shoulder Boxy Pocket Tee',
    size: '5XL',
    colour: 'Sand Dune',
    action: 'Reorder',
    priority: 'High',
    sourceStore: 'Central Supplier / Supplier Mill',
    sourceStoreId: 'supplier-main',
    destStore: 'Brigade Road Flagship (BLR)',
    destStoreId: 'store-01',
    proposedQty: 60,
    estimatedImpactRevenue: '+$2,760 seasonal demand capture',
    reasoning: 'Network-wide availability for size 5XL in Sand Dune has dipped below 12 units. Lead time is 4 days. Supplier has stock in warehouse ready for fast shipment.',
    stockContext: {
      sourceCurrentStock: 450,
      sourceRunRate: 'Supplier Mill Inventory',
      destCurrentStock: 4,
      destRunRate: '3.8 units/day',
      transitDaysEstimate: '4 business days'
    },
    status: 'pending',
    createdAt: '42 mins ago',
    confidenceScore: 91
  },
  {
    id: 'rec-103',
    skuId: 'sku-ts-009',
    productName: 'Boxy Fit Minimalist Henley',
    size: 'XL',
    colour: 'Olive Drab',
    action: 'Markdown',
    priority: 'Medium',
    sourceStore: 'Coastal City Pavilion (IXE)',
    sourceStoreId: 'store-03',
    destStore: 'N/A (In-Store Promotional Display)',
    destStoreId: null,
    proposedQty: 110,
    estimatedImpactRevenue: '$5,720 inventory liquidity release',
    reasoning: 'Inventory ageing has reached 62 days with persistent low velocity (0.9 units/day). Recommended 15% markdown will accelerate turnaround before seasonal drop-off.',
    stockContext: {
      sourceCurrentStock: 124,
      sourceRunRate: '0.9 units/day',
      destCurrentStock: null,
      destRunRate: null,
      transitDaysEstimate: 'Immediate in-store POS tag update'
    },
    status: 'pending',
    createdAt: '2 hours ago',
    confidenceScore: 84
  },
  {
    id: 'rec-104',
    skuId: 'sku-ts-004',
    productName: 'Organic Supima Crew Neck Tee',
    size: 'XXL',
    colour: 'Navy Ink',
    action: 'Wait',
    priority: 'Low',
    sourceStore: 'North Karnataka Hub (HBX)',
    sourceStoreId: 'store-04',
    destStore: 'Coastal City Pavilion (IXE)',
    destStoreId: 'store-03',
    proposedQty: 0,
    estimatedImpactRevenue: 'Prevents $240 unnecessary shipping fees',
    reasoning: 'Stock at Metro Centre Mall is temporarily low (6 units), but 35 units are already en route on a scheduled delivery batch arriving tomorrow. Additional transfer is not required.',
    stockContext: {
      sourceCurrentStock: 84,
      sourceRunRate: '1.4 units/day',
      destCurrentStock: 6,
      destRunRate: '5.0 units/day',
      transitDaysEstimate: 'Batch shipment arrives in 18 hours'
    },
    status: 'pending',
    createdAt: '3 hours ago',
    confidenceScore: 88
  }
];

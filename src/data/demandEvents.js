/**
 * ThreadIQ - Demand Calendar & Retail Events Data
 *
 * Defines scheduled festivals, marketing campaigns, and regional retail events
 * across Karnataka that generate localized apparel demand uplifts.
 *
 * Each event provides:
 * - id, name, dates
 * - relevantStores: list of store IDs or 'ALL'
 * - relevantCategories: categories experiencing uplift
 * - relevantSizes: optional size filters (e.g. extended sizes promo)
 * - upliftPct: expected demand increase percentage (e.g. 45 for +45%)
 * - upliftSource: 'Historical Festival Data (2025)' | 'Configured Campaign Uplift' | 'Assumed Uplift - Needs Historical Validation'
 * - isAssumption: boolean indicating whether historical proof exists
 * - promotionDetails: description of offer or consumer rush
 */

export const DEMAND_EVENTS = [
  {
    id: 'evt-dasara-2026',
    name: 'Mysuru Dasara Grand Festive Season',
    startDate: '2026-10-10',
    endDate: '2026-10-22',
    relevantStores: ['store-02', 'store-01', 'MYS-HERI-02', 'BLR-FLAG-01', 'MYS-CENTRAL-01'],
    storeLabels: ['Mysuru (Heritage Mall & Central)', 'Bengaluru (Brigade Road)'],
    relevantCategories: ['T-shirts', 'Shirts'],
    relevantSizes: ['ALL'],
    upliftPct: 45,
    upliftSource: 'Historical Dasara Sales Data (Karnataka State Retail Board 2025)',
    isAssumption: false,
    promotionDetails: 'Annual state festival surge: High footfall in Mysuru & Bengaluru corridor for festive casual wear.'
  },
  {
    id: 'evt-tech-week-2026',
    name: 'Bengaluru Tech Mega Week & Q4 Summit',
    startDate: '2026-10-12',
    endDate: '2026-10-18',
    relevantStores: ['store-01', 'BLR-FLAG-01'],
    storeLabels: ['Bengaluru (Brigade Road Flagship)'],
    relevantCategories: ['Hoodies', 'T-shirts'],
    relevantSizes: ['ALL'],
    upliftPct: 30,
    upliftSource: 'Configured Campaign Uplift (Q4 Tech Park Marketing Partnership)',
    isAssumption: true,
    promotionDetails: 'Targeted tech worker campaign: Heavyweight hoodies and premium supima tees discount push.'
  },
  {
    id: 'evt-coastal-diwali-2026',
    name: 'Coastal & North Karnataka Deepavali Pre-Sale',
    startDate: '2026-10-18',
    endDate: '2026-11-04',
    relevantStores: ['store-03', 'store-04', 'store-05', 'IXE-CST-03', 'HBX-HUB-04', 'IXG-CAN-05'],
    storeLabels: ['Mangaluru (Coastal Pavilion)', 'Hubballi (North Hub)', 'Belagavi (Cantonment)'],
    relevantCategories: ['Shirts', 'Trousers'],
    relevantSizes: ['ALL'],
    upliftPct: 40,
    upliftSource: 'Historical Regional Festive Index (Deepavali 2024-2025 Trends)',
    isAssumption: false,
    promotionDetails: 'Pre-festival ethnic and formal shirting exhibition across tier-2 Karnataka centers.'
  },
  {
    id: 'evt-extended-sizes-flash-2026',
    name: 'Plus-Size Inclusivity Autumn Campaign (3XL-5XL)',
    startDate: '2026-10-10',
    endDate: '2026-10-16',
    relevantStores: ['ALL'],
    storeLabels: ['All Karnataka Network Stores'],
    relevantCategories: ['T-shirts', 'Hoodies'],
    relevantSizes: ['3XL', '4XL', '5XL'],
    upliftPct: 55,
    upliftSource: 'Assumed Promotional Surge (Targeted Extended-Size Ad Campaign — Assumption)',
    isAssumption: true,
    promotionDetails: 'Digital social-media ad campaign targeting 3XL-5XL oversized silhouettes across Karnataka.'
  }
];

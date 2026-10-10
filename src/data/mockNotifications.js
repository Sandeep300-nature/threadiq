/**
 * ThreadIQ - Synthetic Notifications Dataset
 * Prototype alerts for low stock, transfers, and AI recommendations.
 */

export const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'Urgent: 4XL Stock Depletion Alert',
    message: 'Brigade Road Flagship has only 3 units of Vintage Washed Oversized Tee (4XL Jet Black) remaining. Demand velocity is 7.2 units/day.',
    type: 'critical', // critical, warning, info, success
    category: 'stockout',
    timeAgo: '12m ago',
    read: false,
    link: '/inventory?approvalStatus=Pending'
  },
  {
    id: 'notif-2',
    title: 'AI Transfer Recommendation Generated',
    message: 'ThreadIQ suggests transferring 45 units of 4XL T-shirts from Heritage Mall Hub to Brigade Road Flagship.',
    type: 'info',
    category: 'approval',
    timeAgo: '24m ago',
    read: false,
    link: '/inventory?approvalStatus=Pending'
  },
  {
    id: 'notif-3',
    title: 'Overstock Threshold Exceeded',
    message: 'Boxy Fit Minimalist Henley at Metro Centre Mall exceeds 60-day shelf life. 124 units currently held in backroom.',
    type: 'warning',
    category: 'overstock',
    timeAgo: '1h ago',
    read: false,
    link: '/inventory'
  },
  {
    id: 'notif-4',
    title: 'Store Network Imbalance Detected',
    message: 'Severe size distribution mismatch identified between West Coast & East Coast retail outlets for extended sizes (XXXL-5XL).',
    type: 'warning',
    category: 'network',
    timeAgo: '3h ago',
    read: true,
    link: '/stores'
  }
];

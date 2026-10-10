import React from 'react';
import { Activity, Clock } from 'lucide-react';

export const StoreSummaryStrip = ({
  totalStores = 0,
  balancedCount = 0,
  excessCount = 0,
  lowStockCount = 0,
  lastSyncTime = 'Just now',
  isSimulating = false
}) => {
  return (
    <div className="store-summary-strip-container">
      {/* 1. Metric Counts Strip */}
      <div className="store-summary-metrics-group">
        {/* Total Stores */}
        <div className="store-summary-metric">
          <span className="summary-metric-label font-tech">TOTAL STORES</span>
          <span className="summary-metric-value font-tech" style={{ color: 'var(--text-white)' }}>
            {totalStores}
          </span>
        </div>

        {/* Balanced Stores */}
        <div className="store-summary-metric">
          <span className="summary-metric-label font-tech">
            <span className="summary-metric-dot dot-green" />
            BALANCED STORES
          </span>
          <span className="summary-metric-value font-tech" style={{ color: '#10b981' }}>
            {balancedCount}
          </span>
        </div>

        {/* Excess Stock Stores */}
        <div className="store-summary-metric">
          <span className="summary-metric-label font-tech">
            <span className="summary-metric-dot dot-yellow" />
            EXCESS STOCK STORES
          </span>
          <span className="summary-metric-value font-tech" style={{ color: '#eab308' }}>
            {excessCount}
          </span>
        </div>

        {/* Low Stock Stores */}
        <div className="store-summary-metric">
          <span className="summary-metric-label font-tech">
            <span className="summary-metric-dot dot-red" />
            LOW STOCK STORES
          </span>
          <span className="summary-metric-value font-tech" style={{ color: '#f43f5e' }}>
            {lowStockCount}
          </span>
        </div>
      </div>

      {/* 2. Live Telemetry Notice */}
      <div className="store-summary-telemetry-badge font-tech">
        <div className="telemetry-pulse-dot" />
        <span className="telemetry-label">SIMULATED LIVE RADAR</span>
        <span className="telemetry-divider">·</span>
        <div className="telemetry-sync-time">
          <Clock size={11} />
          <span>Last sync: {lastSyncTime}</span>
        </div>
      </div>
    </div>
  );
};

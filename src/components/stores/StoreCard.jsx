import React from 'react';
import { StatusBadge } from '../common/StatusBadge';
import { MapPin } from 'lucide-react';

export const StoreCard = ({ store, onInspect, isSelected }) => {
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        borderColor: isSelected ? '#ffffff' : 'var(--border-hairline)',
        backgroundColor: 'var(--bg-surface)',
        cursor: 'pointer'
      }}
      onClick={() => onInspect(store)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-white)' }}>
              {store.name}
            </h3>
            <span className="technical-index" style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '1px 5px' }}>
              {store.code}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '3px' }}>
            <MapPin size={12} />
            <span>{store.city}, {store.state}</span>
          </div>
        </div>

        <StatusBadge status={store.status} />
      </div>

      {/* Metrics Row (Monospace Telemetry) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          padding: '12px 0',
          borderTop: '1px solid var(--border-hairline)',
          borderBottom: '1px solid var(--border-hairline)'
        }}
      >
        <div>
          <div className="technical-index">UNITS ON HAND</div>
          <div className="font-tech" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-white)', marginTop: '2px' }}>
            {(store.totalUnits || 0).toLocaleString()}
          </div>
        </div>

        <div>
          <div className="technical-index">ACTIVE SKUS</div>
          <div className="font-tech" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-white)', marginTop: '2px' }}>
            {store.totalSkus || 0}
          </div>
        </div>

        <div>
          <div className="technical-index">CAPACITY</div>
          <div className="font-tech" style={{ fontSize: '1.15rem', fontWeight: 700, color: (store.capacityUsagePct || 70) > 90 ? 'var(--color-surplus)' : 'var(--text-white)', marginTop: '2px' }}>
            {store.capacityUsagePct || 70}%
          </div>
        </div>
      </div>

      {/* Shortage & Surplus Sizing Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="technical-index" style={{ width: '65px' }}>SHORTAGE:</span>
          {(store.shortageSizes?.length || 0) > 0 ? (
            <div style={{ display: 'flex', gap: '5px' }}>
              {store.shortageSizes.map(sz => (
                <span
                  key={sz}
                  className="font-tech"
                  style={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    color: 'var(--color-shortage)',
                    backgroundColor: 'var(--color-shortage-bg)',
                    border: '1px solid var(--color-shortage-border)',
                    padding: '1px 5px',
                    borderRadius: 'var(--radius-xs)'
                  }}
                >
                  {sz}
                </span>
              ))}
            </div>
          ) : (
            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>None</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="technical-index" style={{ width: '65px' }}>SURPLUS:</span>
          {(store.excessSizes?.length || 0) > 0 ? (
            <div style={{ display: 'flex', gap: '5px' }}>
              {store.excessSizes.map(sz => (
                <span
                  key={sz}
                  className="font-tech"
                  style={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    color: 'var(--color-surplus)',
                    backgroundColor: 'var(--color-surplus-bg)',
                    border: '1px solid var(--color-surplus-border)',
                    padding: '1px 5px',
                    borderRadius: 'var(--radius-xs)'
                  }}
                >
                  {sz}
                </span>
              ))}
            </div>
          ) : (
            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>None</span>
          )}
        </div>
      </div>

      {/* Diagnostic Context */}
      <div
        style={{
          fontSize: '0.75rem',
          color: 'var(--text-silver)',
          backgroundColor: 'var(--bg-canvas)',
          padding: '8px 10px',
          borderRadius: 'var(--radius-xs)',
          borderLeft: `2px solid ${store.statusType === 'danger' ? 'var(--color-shortage)' : store.statusType === 'warning' ? 'var(--color-surplus)' : 'var(--color-balanced)'}`,
          marginTop: 'auto'
        }}
      >
        {store.highlight || 'Node telemetry nominal.'}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px' }}>
        <span className="font-tech" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          [ {store.transferOpportunitiesCount ?? (store.lowStockCount ? Math.min(4, store.lowStockCount) : 0)} TRANSFER PAIRS ]
        </span>
        <button
          className="btn btn-secondary btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            onInspect(store);
          }}
          style={{ padding: '3px 8px' }}
        >
          Inspect Node
        </button>
      </div>
    </div>
  );
};

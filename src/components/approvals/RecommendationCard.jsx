import React from 'react';
import { StatusBadge } from '../common/StatusBadge';
import { ArrowRight, Check, X, ShieldCheck } from 'lucide-react';

export const RecommendationCard = ({
  recommendation,
  onInitiateApprove,
  onInitiateReject
}) => {
  const isDecided = recommendation.status !== 'pending';

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        borderLeft: recommendation.priority === 'Critical' ? '3px solid var(--color-shortage)' : '1px solid var(--border-hairline)',
        backgroundColor: 'var(--bg-surface)'
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="font-tech"
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--text-white)',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-hairline)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-xs)',
                letterSpacing: '0.04em'
              }}
            >
              {recommendation.action}
            </span>
            <span className="technical-index">
              PRIORITY: {recommendation.priority}
            </span>
          </div>

          <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-white)', marginTop: '4px' }}>
            {recommendation.productName}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-silver)', marginTop: '2px' }}>
            Size: <strong className="font-tech" style={{ color: 'var(--text-white)' }}>{recommendation.size}</strong> • Colour: {recommendation.colour}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <StatusBadge status={recommendation.status} />
          <span className="font-tech" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{recommendation.createdAt}</span>
        </div>
      </div>

      {/* Route & Proposed Quantity */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 14px',
          backgroundColor: 'var(--bg-canvas)',
          borderRadius: 'var(--radius-xs)',
          border: '1px solid var(--border-hairline)',
          fontSize: '0.825rem'
        }}
      >
        <div style={{ flex: 1 }}>
          <div className="technical-index">SOURCE NODE</div>
          <div style={{ fontWeight: 600, color: 'var(--text-white)', marginTop: '2px' }}>{recommendation.sourceStore}</div>
        </div>

        <div style={{ color: 'var(--text-dim)' }}>
          <ArrowRight size={14} />
        </div>

        <div style={{ flex: 1 }}>
          <div className="technical-index">DESTINATION</div>
          <div style={{ fontWeight: 600, color: 'var(--text-white)', marginTop: '2px' }}>
            {recommendation.destStore || 'In-Store Merchandising'}
          </div>
        </div>

        <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-hairline-subtle)', paddingLeft: '14px' }}>
          <div className="technical-index">UNITS</div>
          <div className="font-tech" style={{ fontWeight: 700, color: 'var(--text-white)', fontSize: '1.05rem', marginTop: '2px' }}>
            {recommendation.proposedQty}
          </div>
        </div>
      </div>

      {/* Evidence & Reasoning */}
      <div style={{ fontSize: '0.8rem', color: 'var(--text-silver)', lineHeight: 1.5 }}>
        <p>{recommendation.reasoning}</p>
      </div>

      {/* Stock Context Telemetry Row */}
      {recommendation.stockContext && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '0.72rem',
            color: 'var(--text-dim)',
            paddingTop: '6px',
            borderTop: '1px solid var(--border-hairline-subtle)',
            fontFamily: 'var(--font-tech)'
          }}
        >
          <span>Source Velocity: <strong style={{ color: 'var(--text-silver)' }}>{recommendation.stockContext.sourceRunRate}</strong></span>
          {recommendation.stockContext.destRunRate && (
            <span>Dest Velocity: <strong style={{ color: 'var(--text-silver)' }}>{recommendation.stockContext.destRunRate}</strong></span>
          )}
          <span>Transit: <strong style={{ color: 'var(--text-silver)' }}>{recommendation.stockContext.transitDaysEstimate}</strong></span>
        </div>
      )}

      {/* Decision Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '10px',
          borderTop: '1px solid var(--border-hairline)',
          marginTop: 'auto'
        }}
      >
        <div>
          {isDecided ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-silver)' }}>
              <ShieldCheck size={14} style={{ color: recommendation.status === 'approved' ? 'var(--color-balanced)' : 'var(--color-shortage)' }} />
              <span className="font-tech">
                DECISION: <strong style={{ textTransform: 'uppercase' }}>{recommendation.status}</strong>
              </span>
            </div>
          ) : (
            <span className="technical-index">ACTION REQUIRED // PROPOSAL ID: {recommendation.id}</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onInitiateReject(recommendation)}
            disabled={isDecided}
            className="btn btn-secondary btn-sm"
            style={{ color: isDecided ? 'var(--text-disabled)' : 'var(--color-shortage)' }}
            aria-label={`Reject recommendation for ${recommendation.productName}`}
          >
            <X size={13} />
            <span>Reject</span>
          </button>

          <button
            onClick={() => onInitiateApprove(recommendation)}
            disabled={isDecided}
            className="btn btn-primary btn-sm"
            aria-label={`Approve recommendation for ${recommendation.productName}`}
          >
            <Check size={13} />
            <span>Approve</span>
          </button>
        </div>
      </div>
    </div>
  );
};

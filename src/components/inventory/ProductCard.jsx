import React, { useState } from 'react';
import { getStockStatusInfo } from '../../utils/stockUtils';
import { MapPin, Tag, Check, X, CheckCircle2, XCircle } from 'lucide-react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

export const ProductCard = ({ product, index = 0, onApprove, onReject }) => {
  const [imageError, setImageError] = useState(false);
  const cardRef = useScrollReveal();

  // Compute stock status using the centralized utility
  const statusInfo = getStockStatusInfo(
    product.availableQty,
    product.minThreshold || 15,
    product.maxThreshold || 75
  );

  const delayClass = `scroll-reveal-delay-${(index % 4) + 1}`;

  return (
    <div
      ref={cardRef}
      className={`inventory-product-card scroll-reveal ${delayClass}`}
      data-status={statusInfo.type}
      aria-label={`${product.name}, Size ${product.size}, ${product.category}. Stock: ${product.availableQty} units (${statusInfo.label}). Store: ${product.storeName}`}
    >
      {/* 1. Product Image Section with Circular Status Indicator */}
      <div className="product-card-image-wrap">
        {!imageError && product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="product-card-image"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          /* Graceful SVG apparel fallback when offline or image load fails */
          <div className="product-card-fallback-image">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke={product.hexColour || '#71717a'}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 3L2 8L5 10L6.5 8.5V20H17.5V8.5L19 10L22 8L17 3C15.5 4.5 12.5 5 12 5C11.5 5 8.5 4.5 7 3Z" />
              <path d="M9.5 3C9.8 4.2 10.8 5 12 5C13.2 5 14.2 4.2 14.5 3" />
            </svg>
            <span className="font-tech text-dim" style={{ fontSize: '0.68rem', marginTop: '4px' }}>
              {product.category}
            </span>
          </div>
        )}

        {/* Circular Stock Quantity Indicator (Top-Right) */}
        <div
          className="stock-circular-indicator"
          style={{
            borderColor: statusInfo.color,
            backgroundColor: 'rgba(10, 11, 15, 0.88)',
            boxShadow: `0 0 0 3px ${statusInfo.ringColor}`
          }}
          title={statusInfo.accessibleDescription}
          aria-label={statusInfo.accessibleDescription}
        >
          <span
            className="stock-circular-qty font-tech"
            style={{ color: statusInfo.color }}
          >
            {product.availableQty}
          </span>
          <span className="stock-circular-label font-tech">
            QTY
          </span>
        </div>

        {/* Category Pill on Image Bottom-Left */}
        <div className="product-card-image-overlay-category font-tech">
          <Tag size={10} />
          <span>{product.category}</span>
        </div>
      </div>

      {/* 2. Product Details Body */}
      <div className="product-card-body">
        {/* Top Meta: Size Tag, Colour, SKU, and Inventory Ageing */}
        <div className="product-card-meta-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
          <span className="product-card-size-tag font-tech">
            SIZE: {product.size}
          </span>
          <span className="product-card-sku font-tech">
            {product.skuCode || product.sku}
          </span>
          {(product.ageing_days !== undefined || product.ageingDays !== undefined || product.ageDays !== undefined) && (
            <span
              className="product-card-size-tag font-tech"
              style={{
                backgroundColor: (product.ageing_days ?? product.ageingDays ?? product.ageDays) > 90 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                color: (product.ageing_days ?? product.ageingDays ?? product.ageDays) > 90 ? '#eab308' : '#d4d4d8',
                borderColor: (product.ageing_days ?? product.ageingDays ?? product.ageDays) > 90 ? 'rgba(234, 179, 8, 0.3)' : 'transparent'
              }}
              title="Inventory ageing duration in days"
            >
              AGE: {product.ageing_days ?? product.ageingDays ?? product.ageDays}d
            </span>
          )}
        </div>

        {/* Product Name */}
        <h3 className="product-card-title" title={product.name}>
          {product.name}
        </h3>

        {/* Store Location and Colour Swatch */}
        <div className="product-card-store-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={13} className="product-card-store-icon" />
            <span className="product-card-store-name">
              {product.storeName}
            </span>
          </div>
          {product.colour && (
            <span className="font-tech text-dim" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  backgroundColor: product.colourHex || product.hexColour || '#71717a',
                  display: 'inline-block',
                  border: '1px solid rgba(255,255,255,0.25)'
                }}
              />
              {product.colour}
            </span>
          )}
        </div>

        {/* Stock Status Label & Price Footer */}
        <div className="product-card-footer">
          <div className="product-card-status-badge font-tech" style={{ borderColor: statusInfo.borderColor, backgroundColor: statusInfo.bgColor }}>
            <span
              className="product-card-status-dot"
              style={{ backgroundColor: statusInfo.color }}
            />
            <span style={{ color: statusInfo.color }}>
              {statusInfo.label}
            </span>
          </div>

          <div className="product-card-price font-tech">
            ₹{Number(product.price || product.unitPrice || 0).toLocaleString()}
          </div>
        </div>

        {/* 3. Conditional Actionable Section: STRICTLY for low-stock items */}
        {statusInfo.type === 'low' || (Number(product.availableQty) < Number(product.minThreshold || 15)) ? (
          <div className="product-card-approval-section">
            {/* Deficit explanation banner */}
            <div
              className="card-proposal-info font-tech"
              style={{
                backgroundColor: 'rgba(244, 63, 94, 0.08)',
                borderColor: 'rgba(244, 63, 94, 0.28)'
              }}
              title={product.actionProposal?.title || `Shortage: ${product.availableQty} / ${product.minThreshold || 15} min threshold`}
            >
              <span
                className="proposal-type-tag"
                style={{
                  color: product.actionProposal?.type?.toLowerCase() === 'reorder' ? '#f59e0b' : '#f43f5e'
                }}
              >
                {product.actionProposal?.type?.toLowerCase() === 'reorder' ? '📦 REORDER REQUIRED' : '⚡ SHORTAGE ALERT'}
              </span>
              <span className="proposal-title-text" style={{ color: 'var(--text-silver)' }}>
                {product.availableQty} / {product.minThreshold || 15} min ({Math.max(1, (product.minThreshold || 15) - product.availableQty)} unit deficit)
              </span>
            </div>

            <div className="card-approval-actions-row">
              {/* Approval Status Badge */}
              {product.approvalStatus === 'Approved' ? (
                <div className="approval-status-badge badge-approved font-tech" title="Approved replenishment proposal">
                  <CheckCircle2 size={11} />
                  <span>APPROVED</span>
                </div>
              ) : product.approvalStatus === 'Rejected' ? (
                <div className="approval-status-badge badge-rejected font-tech" title="Rejected proposal">
                  <XCircle size={11} />
                  <span>REJECTED</span>
                </div>
              ) : (
                <div className="approval-status-badge badge-pending font-tech" title="Pending replenishment authorization">
                  <span className="approval-status-dot dot-pending" />
                  <span>ACTION REQUIRED</span>
                </div>
              )}

              {/* Action Buttons: Visible ONLY when Pending/Unapproved */}
              {product.approvalStatus !== 'Approved' && product.approvalStatus !== 'Rejected' && (
                <div className="card-actions-group">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onApprove?.(product);
                    }}
                    className="card-action-btn btn-card-approve font-tech"
                    title={
                      product.actionProposal?.type?.toLowerCase() === 'reorder'
                        ? `Approve supplier purchase reorder for ${product.name} (${product.size})`
                        : `Approve inter-store transfer for ${product.name} (${product.size})`
                    }
                    aria-label={
                      product.actionProposal?.type?.toLowerCase() === 'reorder'
                        ? `Approve Reorder for ${product.name}`
                        : `Approve Transfer for ${product.name}`
                    }
                  >
                    <Check size={12} />
                    <span>
                      {product.actionProposal?.type?.toLowerCase() === 'reorder' ? 'Approve Reorder' : 'Approve Transfer'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReject?.(product);
                    }}
                    className="card-action-btn btn-card-reject font-tech"
                    title={`Reject replenishment proposal for ${product.name}`}
                    aria-label={`Reject proposal for ${product.name}`}
                  >
                    <X size={12} />
                    <span>Reject</span>
                  </button>
                </div>
              )}

              {/* Locked status messages */}
              {product.approvalStatus === 'Approved' && (
                <span className="approval-locked-text font-tech">
                  Locked • Staged
                </span>
              )}
              {product.approvalStatus === 'Rejected' && (
                <span className="approval-locked-text font-tech">
                  Dismissed
                </span>
              )}
            </div>
          </div>
        ) : statusInfo.type === 'excess' ? (
          /* EXCESS STOCK: No low-stock approval button. Shows surplus donor telemetry instead */
          <div className="product-card-excess-note font-tech">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
              <span className="excess-donor-pill">
                SURPLUS BUFFER // DONOR NODE
              </span>
              <span className="font-tech text-dim" style={{ fontSize: '0.67rem' }}>
                +{product.availableQty - (product.maxThreshold || 75)} buffer
              </span>
            </div>
            <span className="excess-donor-desc">
              Available to replenish store shortages across Karnataka network.
            </span>
          </div>
        ) : (
          /* HEALTHY ITEMS: No approval button. Shows balanced status confirmation */
          <div className="product-card-healthy-note font-tech">
            <span className="healthy-status-text">
              ✓ BALANCED INVENTORY // HEALTHY RUN-RATE
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Truck,
  Zap,
  PackagePlus,
  ArrowRightLeft,
  Info,
  Clock,
  Layers,
  Building2
} from 'lucide-react';
import { findEligibleSourceStores } from '../../services/demandForecastService.js';
import { calculateDeliveryETA } from '../../utils/etaUtils.js';

export const InventoryApprovalDialog = ({
  isOpen,
  onClose,
  product,
  decisionType = 'approve', // 'approve' | 'reject'
  onConfirm,
  allInventory = [],
  storesList = []
}) => {
  const [notes, setNotes] = useState('');
  const [strategy, setStrategy] = useState('transfer'); // 'transfer' | 'reorder'
  const [selectedSourceStoreId, setSelectedSourceStoreId] = useState('');
  const [transferQty, setTransferQty] = useState(15);
  const [deliveryMode, setDeliveryMode] = useState('normal'); // 'normal' | 'express'
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [emergencyConfirmed, setEmergencyConfirmed] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [showSummaryView, setShowSummaryView] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute shortage metrics for destination product
  const minThreshold = Number(product?.minThreshold || 15);
  const currentAvailable = Number(product?.availableQty || 0);
  const initialDeficit = Math.max(1, minThreshold - currentAvailable);

  // Discover candidate source stores for the EXACT product and size
  const candidateStores = useMemo(() => {
    if (!product || !isOpen) return [];
    return findEligibleSourceStores(product, allInventory, storesList, transferQty);
  }, [product, allInventory, storesList, transferQty, isOpen]);

  // Determine best recommended source store
  const recommendedSource = useMemo(() => {
    return candidateStores.find(c => c.suitability === 'RECOMMENDED_OPTIMAL') ||
           candidateStores.find(c => c.transferableQty > 0) ||
           candidateStores[0] ||
           null;
  }, [candidateStores]);

  // Initialize or reset selections when modal opens with new product
  useEffect(() => {
    if (isOpen && product) {
      setShowSummaryView(false);
      setIsEmergencyMode(false);
      setEmergencyConfirmed(false);
      setEmergencyReason('');
      setNotes('');

      const isReorder = product.actionProposal?.type?.toLowerCase() === 'reorder';
      const initialQty = Number(product.actionProposal?.proposedQty) || initialDeficit;
      setTransferQty(Math.max(1, initialQty));

      if (isReorder || candidateStores.length === 0 || !candidateStores.some(c => c.transferableQty > 0)) {
        setStrategy('reorder');
      } else {
        setStrategy('transfer');
      }

      // Default to recommended source store or proposed source
      if (recommendedSource) {
        setSelectedSourceStoreId(recommendedSource.storeId);
      }
    }
  }, [isOpen, product, initialDeficit, recommendedSource, candidateStores]);

  if (!isOpen || !product) return null;

  const isApprove = decisionType === 'approve';
  const proposal = product.actionProposal;

  // Selected candidate source store object
  const activeSourceStore = candidateStores.find(
    c => c.storeId === selectedSourceStoreId
  ) || recommendedSource;

  // Real-time telemetry calculations
  const activeEta = activeSourceStore
    ? (deliveryMode === 'express' ? activeSourceStore.expressEta : activeSourceStore.standardEta)
    : calculateDeliveryETA(120, deliveryMode);

  const projectedSourceStock = activeSourceStore
    ? activeSourceStore.availableQty - Number(transferQty)
    : 0;

  const sourceSafetyThreshold = activeSourceStore?.safetyThreshold || 15;
  const sourceBreachesSafety = activeSourceStore
    ? projectedSourceStock < sourceSafetyThreshold
    : false;

  const projectedDestStock = currentAvailable + Number(transferQty);

  // Reorder calculation
  const reorderSupplier = 'ThreadIQ Primary Apparel Mills (Bengaluru Logistics Depot)';
  const reorderLeadTime = deliveryMode === 'express' ? '2-3 Business Days (Expedited Air)' : '5-7 Business Days (Standard Freight)';
  const recommendedReorderQty = Math.max(30, Number(transferQty));

  // Validation rules before approval
  const isTransferValid =
    strategy === 'transfer' &&
    activeSourceStore &&
    activeSourceStore.storeId !== product.storeId &&
    Number(transferQty) > 0 &&
    (!sourceBreachesSafety || (isEmergencyMode && emergencyConfirmed && emergencyReason.trim().length >= 5));

  const isReorderValid =
    strategy === 'reorder' &&
    Number(transferQty) > 0;

  const canConfirm = isApprove ? (isTransferValid || isReorderValid) : true;

  const handleConfirmAction = async () => {
    if (!canConfirm || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const decisionPayload = {
        strategy,
        transferQty: Number(transferQty),
        sourceStore: activeSourceStore,
        destStoreName: product.storeName,
        deliveryMode,
        isEmergencyMode,
        emergencyReason: isEmergencyMode ? emergencyReason : null,
        notes: notes.trim() || (strategy === 'transfer'
          ? `Inter-store transfer from ${activeSourceStore?.storeName} (${deliveryMode.toUpperCase()})`
          : `Supplier reorder for ${product.name} (${product.size})`)
      };

      await onConfirm(product.id, decisionPayload.notes, proposal?.id, decisionPayload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isApprove ? 'Resolve Low-Stock Shortage // Authorization' : 'Confirm Recommendation Rejection'}
      subtitle={`${product.name} • Size: ${product.size} • SKU: ${product.skuCode}`}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary font-tech"
            disabled={isSubmitting}
          >
            Cancel
          </button>

          {isApprove && !showSummaryView ? (
            <button
              type="button"
              onClick={() => setShowSummaryView(true)}
              className="btn btn-primary font-tech"
              disabled={!canConfirm || isSubmitting}
            >
              <span>Review Final Summary</span>
              <ArrowRight size={13} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmAction}
              className={`btn ${isApprove ? 'btn-success' : 'btn-danger'} font-tech`}
              disabled={!canConfirm || isSubmitting}
            >
              {isSubmitting ? (
                'Processing...'
              ) : isApprove ? (
                <>
                  <CheckCircle2 size={15} />
                  <span>Authorize & Commit {strategy === 'transfer' ? 'Transfer' : 'Reorder'}</span>
                </>
              ) : (
                <>
                  <XCircle size={15} />
                  <span>Confirm Rejection</span>
                </>
              )}
            </button>
          )}
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* REJECTION FLOW */}
        {!isApprove ? (
          <>
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'rgba(244, 63, 94, 0.08)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}
            >
              <AlertTriangle size={16} style={{ color: 'var(--color-shortage)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.82rem', color: 'var(--text-silver)', lineHeight: 1.45 }}>
                You are rejecting the proposed replenishment action for <strong>{product.name} ({product.size})</strong> at <strong>{product.storeName}</strong>.
                This proposal will be marked as Rejected and dismissed from active manager queues.
              </div>
            </div>

            <div>
              <label
                htmlFor="approval-rejection-notes"
                className="font-tech"
                style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-silver)', marginBottom: '6px' }}
              >
                Rejection Reason (Audit Log):
              </label>
              <textarea
                id="approval-rejection-notes"
                rows={3}
                placeholder="e.g. In-store recount indicates sufficient physical buffer; supplier shipment already scheduled."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="inventory-search-input font-tech"
                style={{ width: '100%', height: 'auto', padding: '10px 12px', resize: 'vertical' }}
              />
            </div>
          </>
        ) : showSummaryView ? (
          /* STEP 2: FINAL CONFIRMATION SUMMARY (Requirement 6) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--border-hairline)'
              }}
            >
              <span className="technical-index" style={{ color: 'var(--text-white)' }}>
                [ FINAL CONFIRMATION SUMMARY // STAGED DISPATCH ]
              </span>
              <button
                type="button"
                onClick={() => setShowSummaryView(false)}
                className="btn btn-secondary btn-sm font-tech"
              >
                ← Back to Edit
              </button>
            </div>

            {/* Summary Data Matrix */}
            <div
              className="font-tech"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.78rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-dim">ACTION STRATEGY:</span>
                <strong style={{ color: strategy === 'transfer' ? '#38bdf8' : '#f59e0b' }}>
                  {strategy === 'transfer' ? 'INTER-STORE TRANSFER' : 'SUPPLIER PURCHASE REORDER'}
                </strong>
              </div>

              {strategy === 'transfer' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-dim">SOURCE STORE:</span>
                    <strong style={{ color: 'var(--text-white)' }}>
                      {activeSourceStore?.storeName} ({activeSourceStore?.city})
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-dim">DESTINATION STORE:</span>
                    <strong style={{ color: 'var(--text-white)' }}>
                      {product.storeName}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-dim">PRODUCT & SIZE:</span>
                    <span style={{ color: 'var(--text-white)' }}>
                      {product.name} • <strong>Size {product.size} (Exact Match)</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-dim">TRANSFER QUANTITY:</span>
                    <strong style={{ color: '#10b981', fontSize: '0.85rem' }}>
                      {transferQty} Units
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-dim">SOURCE STOCK AFTER TRANSFER:</span>
                    <span style={{ color: sourceBreachesSafety ? '#f43f5e' : 'var(--text-white)' }}>
                      {projectedSourceStock} Units (Min Threshold: {sourceSafetyThreshold})
                      {sourceBreachesSafety && ' [EMERGENCY OVERRIDE]'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-dim">DESTINATION STOCK AFTER TRANSFER:</span>
                    <strong style={{ color: 'var(--text-white)' }}>
                      {projectedDestStock} Units (Satisfies {minThreshold} Threshold)
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-dim">DELIVERY METHOD:</span>
                    <strong style={{ color: deliveryMode === 'express' ? '#ffffff' : '#38bdf8' }}>
                      {deliveryMode.toUpperCase()} DELIVERY ({activeEta.modeConfig?.name})
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-dim">ESTIMATED ARRIVAL:</span>
                    <span style={{ color: 'var(--text-white)' }}>
                      {activeEta.formattedArrival} (~{activeEta.formattedDuration})
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-dim">HIGHWAY DISTANCE:</span>
                    <span style={{ color: 'var(--text-silver)' }}>
                      ~{activeSourceStore?.distanceKm || 145} km (Karnataka Regional Corridor)
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-dim">SUPPLIER DEPOT:</span>
                    <strong style={{ color: 'var(--text-white)' }}>{reorderSupplier}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-dim">DESTINATION STORE:</span>
                    <strong style={{ color: 'var(--text-white)' }}>{product.storeName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-dim">PRODUCT & SIZE:</span>
                    <span style={{ color: 'var(--text-white)' }}>
                      {product.name} • <strong>Size {product.size}</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-dim">PURCHASE ORDER QUANTITY:</span>
                    <strong style={{ color: '#10b981', fontSize: '0.85rem' }}>
                      {transferQty} Units
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-dim">SUPPLIER LEAD TIME:</span>
                    <span style={{ color: 'var(--text-white)' }}>{reorderLeadTime}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-dim">PROJECTED POST-FULFILLMENT:</span>
                    <span style={{ color: 'var(--text-white)' }}>{projectedDestStock} Units</span>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-hairline)', paddingTop: '6px', marginTop: '4px' }}>
                <span className="text-dim">REASON FOR ACTION:</span>
                <span style={{ color: 'var(--text-silver)', maxWidth: '60%', textAlign: 'right' }}>
                  {isEmergencyMode
                    ? `Emergency Override: ${emergencyReason}`
                    : (notes || 'Resolving critical shortage to sustain demand horizon.')}
                </span>
              </div>
            </div>

            {/* Simulation disclosure notice */}
            <div
              className="font-tech text-dim"
              style={{
                fontSize: '0.7rem',
                padding: '8px 10px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-xs)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Info size={13} style={{ flexShrink: 0 }} />
              <span>
                <strong>SIMULATION DISCLOSURE:</strong> Action approval records transfer staging in simulated memory. Physical freight dispatch requires enterprise warehouse WMS webhook.
              </span>
            </div>
          </div>
        ) : (
          /* STEP 1: CONFIGURE DYNAMIC SOURCE STORE & REPLENISHMENT */
          <>
            {/* Deficit telemetry strip */}
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'rgba(244, 63, 94, 0.08)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <span className="technical-index" style={{ color: '#f43f5e' }}>
                  CRITICAL SHORTAGE AT {product.storeName?.toUpperCase()}
                </span>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-silver)', marginTop: '2px' }}>
                  Current stock: <strong>{currentAvailable} units</strong> • Minimum safety threshold: <strong>{minThreshold} units</strong>
                </div>
              </div>
              <div className="font-tech" style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f43f5e' }}>
                  -{initialDeficit} Units
                </div>
                <div className="text-dim" style={{ fontSize: '0.67rem' }}>NET DEFICIT</div>
              </div>
            </div>

            {/* Strategy Selector: Transfer vs Reorder */}
            <div>
              <label className="font-tech text-dim" style={{ fontSize: '0.74rem', display: 'block', marginBottom: '6px' }}>
                SELECT RESOLUTION METHOD:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setStrategy('transfer')}
                  className={`btn ${strategy === 'transfer' ? 'btn-primary' : 'btn-secondary'} font-tech`}
                  style={{ justifyContent: 'center', height: '36px' }}
                >
                  <ArrowRightLeft size={13} />
                  <span>Inter-Store Transfer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStrategy('reorder')}
                  className={`btn ${strategy === 'reorder' ? 'btn-primary' : 'btn-secondary'} font-tech`}
                  style={{ justifyContent: 'center', height: '36px' }}
                >
                  <PackagePlus size={13} />
                  <span>Supplier Purchase Reorder</span>
                </button>
              </div>
            </div>

            {/* STRATEGY A: INTER-STORE TRANSFER */}
            {strategy === 'transfer' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* 1. Dynamic Source Store Selector */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label htmlFor="dynamic-source-store-select" className="font-tech text-dim" style={{ fontSize: '0.74rem' }}>
                      CHOOSE SOURCE STORE (EXACT SKU & SIZE: {product.size}):
                    </label>
                    <span className="font-tech text-dim" style={{ fontSize: '0.68rem' }}>
                      {candidateStores.length} stores found
                    </span>
                  </div>

                  {candidateStores.length === 0 ? (
                    <div
                      className="font-tech"
                      style={{
                        padding: '10px',
                        backgroundColor: 'rgba(234, 179, 8, 0.08)',
                        border: '1px solid rgba(234, 179, 8, 0.25)',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '0.75rem',
                        color: '#facc15'
                      }}
                    >
                      No other store currently carries size {product.size} in the Karnataka network. Consider switching to Supplier Purchase Reorder.
                    </div>
                  ) : (
                    <select
                      id="dynamic-source-store-select"
                      value={selectedSourceStoreId}
                      onChange={(e) => setSelectedSourceStoreId(e.target.value)}
                      className="inventory-filter-select font-tech"
                      style={{ width: '100%', height: '36px', padding: '0 10px' }}
                    >
                      {candidateStores.map(store => (
                        <option key={store.storeId} value={store.storeId}>
                          {store.isRecommended ? '★ [RECOMMENDED] ' : ''}
                          {store.storeName} ({store.city}) — {store.availableQty} on-hand ({store.transferableQty} transferable) • ~{store.distanceKm}km
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 2. Source Store Telemetry Breakdown */}
                {activeSourceStore && (
                  <div
                    className="font-tech"
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-white)' }}>
                        {activeSourceStore.storeName} ({activeSourceStore.city})
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: activeSourceStore.isRecommended ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                          color: activeSourceStore.isRecommended ? '#34d399' : 'var(--text-silver)',
                          border: '1px solid var(--border-hairline)'
                        }}
                      >
                        {activeSourceStore.suitabilityLabel}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '0.74rem' }}>
                      <div style={{ padding: '6px 8px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-xs)' }}>
                        <span className="text-dim" style={{ display: 'block', fontSize: '0.65rem' }}>ON-HAND STOCK</span>
                        <strong style={{ color: 'var(--text-white)' }}>{activeSourceStore.availableQty} units</strong>
                      </div>
                      <div style={{ padding: '6px 8px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-xs)' }}>
                        <span className="text-dim" style={{ display: 'block', fontSize: '0.65rem' }}>SAFETY LIMIT</span>
                        <strong style={{ color: 'var(--text-silver)' }}>{activeSourceStore.safetyThreshold} units</strong>
                      </div>
                      <div style={{ padding: '6px 8px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-xs)' }}>
                        <span className="text-dim" style={{ display: 'block', fontSize: '0.65rem' }}>TRANSFERABLE</span>
                        <strong style={{ color: activeSourceStore.transferableQty > 0 ? '#10b981' : '#f43f5e' }}>
                          {activeSourceStore.transferableQty} units
                        </strong>
                      </div>
                    </div>

                    {/* Stock Impact Preview */}
                    <div
                      style={{
                        fontSize: '0.72rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: '6px',
                        borderTop: '1px dashed var(--border-hairline)'
                      }}
                    >
                      <span>Projected Source Stock After Transfer:</span>
                      <strong style={{ color: sourceBreachesSafety ? '#f43f5e' : '#10b981' }}>
                        {projectedSourceStock} units {sourceBreachesSafety ? `(Under ${sourceSafetyThreshold} Limit)` : '(Safe Buffer)'}
                      </strong>
                    </div>
                  </div>
                )}

                {/* 3. Transfer Quantity and Delivery Option */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label htmlFor="approval-transfer-qty" className="font-tech text-dim" style={{ fontSize: '0.74rem', display: 'block', marginBottom: '6px' }}>
                      TRANSFER QUANTITY (UNITS):
                    </label>
                    <input
                      id="approval-transfer-qty"
                      type="number"
                      min={1}
                      max={activeSourceStore?.availableQty || 100}
                      value={transferQty}
                      onChange={(e) => setTransferQty(Math.max(1, Number(e.target.value) || 1))}
                      className="inventory-search-input font-tech"
                      style={{ width: '100%', height: '36px', padding: '0 10px' }}
                    />
                  </div>

                  <div>
                    <label className="font-tech text-dim" style={{ fontSize: '0.74rem', display: 'block', marginBottom: '6px' }}>
                      DELIVERY SPEED:
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setDeliveryMode('normal')}
                        className={`btn ${deliveryMode === 'normal' ? 'btn-primary' : 'btn-secondary'} btn-sm font-tech`}
                        style={{ flex: 1, height: '36px' }}
                      >
                        <Truck size={12} />
                        <span>Normal</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryMode('express')}
                        className={`btn ${deliveryMode === 'express' ? 'btn-primary' : 'btn-secondary'} btn-sm font-tech`}
                        style={{ flex: 1, height: '36px' }}
                      >
                        <Zap size={12} />
                        <span>Express</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delivery ETA Preview */}
                <div
                  className="font-tech"
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-xs)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem'
                  }}
                >
                  <span className="text-dim">ESTIMATED TRANSIT & ARRIVAL:</span>
                  <span style={{ color: 'var(--text-white)' }}>
                    {activeEta.formattedArrival} (~{activeEta.formattedDuration})
                  </span>
                </div>

                {/* 4. Source Store Safety Check & Emergency Transfer Mode */}
                {sourceBreachesSafety && (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: 'rgba(244, 63, 94, 0.08)',
                      border: '1px solid rgba(244, 63, 94, 0.35)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <ShieldAlert size={16} style={{ color: '#f43f5e', flexShrink: 0 }} />
                      <span className="font-tech" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f43f5e' }}>
                        SAFETY BUFFER VIOLATION BLOCKS NORMAL TRANSFER
                      </span>
                    </div>

                    <p className="font-tech text-dim" style={{ fontSize: '0.72rem', margin: 0, lineHeight: 1.4 }}>
                      Transferring {transferQty} units would leave {activeSourceStore?.storeName} with only {projectedSourceStock} units, pushing it below its required safety threshold ({sourceSafetyThreshold} units).
                    </p>

                    {/* Emergency Override Toggle */}
                    <label
                      className="font-tech"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        marginTop: '4px',
                        fontSize: '0.75rem',
                        color: 'var(--text-white)'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isEmergencyMode}
                        onChange={(e) => setIsEmergencyMode(e.target.checked)}
                      />
                      <span>Enable Authorized "Emergency Transfer" Mode</span>
                    </label>

                    {isEmergencyMode && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                        <div
                          className="font-tech"
                          style={{
                            padding: '8px 10px',
                            backgroundColor: 'rgba(244, 63, 94, 0.15)',
                            borderRadius: 'var(--radius-xs)',
                            fontSize: '0.7rem',
                            color: '#fca5a5'
                          }}
                        >
                          Notice: Overriding safety-stock buffers exposes {activeSourceStore?.storeName} to a resulting shortage risk of ~{Math.round(((sourceSafetyThreshold - projectedSourceStock) / sourceSafetyThreshold) * 100)}%. Requires explicit operational authorization.
                        </div>

                        <label
                          className="font-tech"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontSize: '0.73rem',
                            color: 'var(--text-white)'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={emergencyConfirmed}
                            onChange={(e) => setEmergencyConfirmed(e.target.checked)}
                          />
                          <span>I explicitly acknowledge and authorize this donor store safety drawdown.</span>
                        </label>

                        <div>
                          <label htmlFor="approval-emergency-reason" className="font-tech text-dim" style={{ fontSize: '0.7rem', display: 'block', marginBottom: '4px' }}>
                            MANDATORY AUDIT REASON FOR OVERRIDE:
                          </label>
                          <input
                            id="approval-emergency-reason"
                            type="text"
                            placeholder="e.g. VIP bulk order at destination; donor store receiving supplier shipment tomorrow."
                            value={emergencyReason}
                            onChange={(e) => setEmergencyReason(e.target.value)}
                            className="inventory-search-input font-tech"
                            style={{ width: '100%', height: '32px', fontSize: '0.74rem' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STRATEGY B: SUPPLIER PURCHASE REORDER */}
            {strategy === 'reorder' && (
              <div
                className="font-tech"
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PackagePlus size={16} style={{ color: '#f59e0b' }} />
                  <span style={{ fontWeight: 700, color: 'var(--text-white)' }}>
                    SUPPLIER PURCHASE REORDER SPECIFICATION
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.74rem' }}>
                  <div>
                    <span className="text-dim" style={{ display: 'block', fontSize: '0.65rem' }}>CENTRAL SUPPLIER</span>
                    <strong style={{ color: 'var(--text-white)' }}>{reorderSupplier}</strong>
                  </div>
                  <div>
                    <span className="text-dim" style={{ display: 'block', fontSize: '0.65rem' }}>TARGET VARIANT</span>
                    <strong style={{ color: 'var(--text-white)' }}>{product.name} ({product.size})</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label htmlFor="approval-reorder-batch-qty" className="text-dim" style={{ fontSize: '0.7rem', display: 'block', marginBottom: '4px' }}>
                      PURCHASE ORDER BATCH (UNITS):
                    </label>
                    <input
                      id="approval-reorder-batch-qty"
                      type="number"
                      min={10}
                      step={5}
                      value={transferQty}
                      onChange={(e) => setTransferQty(Math.max(10, Number(e.target.value) || 10))}
                      className="inventory-search-input font-tech"
                      style={{ width: '100%', height: '34px' }}
                    />
                  </div>

                  <div>
                    <span className="text-dim" style={{ fontSize: '0.7rem', display: 'block', marginBottom: '4px' }}>
                      SUPPLIER LEAD TIME:
                    </span>
                    <div style={{ padding: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-xs)', color: 'var(--text-white)', fontSize: '0.75rem' }}>
                      {reorderLeadTime}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Operational Notes */}
            <div>
              <label htmlFor="approval-general-notes" className="font-tech text-dim" style={{ display: 'block', fontSize: '0.74rem', marginBottom: '4px' }}>
                OPERATIONAL NOTES (OPTIONAL):
              </label>
              <textarea
                id="approval-general-notes"
                rows={2}
                placeholder="e.g. Authorized prioritized freight dispatch for weekend shopping rush."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="inventory-search-input font-tech"
                style={{ width: '100%', height: 'auto', padding: '8px 10px', resize: 'vertical' }}
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

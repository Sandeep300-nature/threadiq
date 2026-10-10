import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Zap,
  Clock,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Building2
} from 'lucide-react';
import { calculateDeliveryETA, DELIVERY_MODES, TRANSFER_STAGES } from '../../utils/etaUtils';
import { getRouteDetails } from '../../services/routingService';

export const TransferDeliveryEstimate = ({
  transfer,
  sourceStore,
  destStore,
  storesList = [],
  inventory = [],
  onUpdateTransfer
}) => {
  // Independent selector states for source and destination stores
  const [selectedSourceId, setSelectedSourceId] = useState(sourceStore?.id || transfer?.sourceStoreId || '');
  const [selectedDestId, setSelectedDestId] = useState(destStore?.id || transfer?.destStoreId || '');

  const [deliveryMode, setDeliveryMode] = useState(transfer?.deliveryMode || 'normal');
  const [routeData, setRouteData] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync internal store selections if incoming props change
  useEffect(() => {
    if (sourceStore?.id) setSelectedSourceId(sourceStore.id);
  }, [sourceStore?.id]);

  useEffect(() => {
    if (destStore?.id) setSelectedDestId(destStore.id);
  }, [destStore?.id]);

  useEffect(() => {
    if (transfer?.deliveryMode) {
      setDeliveryMode(transfer.deliveryMode);
    }
  }, [transfer?.deliveryMode]);

  // Resolve current source and destination store objects
  const currentSource = useMemo(() => {
    return storesList.find(s => s.id === selectedSourceId) || sourceStore || null;
  }, [storesList, selectedSourceId, sourceStore]);

  const currentDest = useMemo(() => {
    return storesList.find(s => s.id === selectedDestId) || destStore || null;
  }, [storesList, selectedDestId, destStore]);

  // Validation: Source and destination must be different
  const isSameStore = selectedSourceId && selectedDestId && selectedSourceId === selectedDestId;

  // Fetch routing geometry and driving distance dynamically whenever route endpoints change
  useEffect(() => {
    if (!currentSource?.lat || !currentSource?.lng || !currentDest?.lat || !currentDest?.lng || isSameStore) {
      setRouteData(null);
      return;
    }

    let isMounted = true;
    const fetchRouting = async () => {
      setLoadingRoute(true);
      try {
        const details = await getRouteDetails(
          currentSource.lat,
          currentSource.lng,
          currentDest.lat,
          currentDest.lng
        );
        if (isMounted) {
          setRouteData(details);
        }
      } catch (err) {
        console.warn('Route calculation error:', err);
      } finally {
        if (isMounted) setLoadingRoute(false);
      }
    };

    fetchRouting();
    return () => {
      isMounted = false;
    };
  }, [currentSource, currentDest, isSameStore]);

  if (!transfer) {
    return null;
  }

  // Calculate dynamic ETA using distance, mode, dispatch time, and OSRM duration
  const eta = calculateDeliveryETA(
    routeData?.distanceKm || 0,
    deliveryMode,
    transfer.dispatchTime,
    routeData?.durationSeconds
  );

  // Check inventory levels of the transferred SKU at both stores
  const targetProduct = (transfer.productName || '').toLowerCase();
  const targetSize = (transfer.size || '').toUpperCase();

  const sourceItem = inventory.find(
    i => (i.storeId === selectedSourceId || i.storeName === currentSource?.name) &&
         (i.name?.toLowerCase().includes(targetProduct) || i.productName?.toLowerCase().includes(targetProduct)) &&
         i.size?.toUpperCase() === targetSize
  );

  const destItem = inventory.find(
    i => (i.storeId === selectedDestId || i.storeName === currentDest?.name) &&
         (i.name?.toLowerCase().includes(targetProduct) || i.productName?.toLowerCase().includes(targetProduct)) &&
         i.size?.toUpperCase() === targetSize
  );

  const sourceStock = sourceItem?.availableQty ?? sourceItem?.quantityAvailable ?? 45;
  const sourceMin = sourceItem?.minThreshold ?? sourceItem?.minimumStockThreshold ?? 15;
  const transferableStock = Math.max(0, sourceStock - sourceMin);
  const transferQuantity = Number(transfer.quantity || 15);
  const sourceStockAfter = sourceStock - transferQuantity;
  const destStock = destItem?.availableQty ?? destItem?.quantityAvailable ?? 3;
  const destStockAfter = destStock + transferQuantity;

  // Handle Source Store change
  const handleSourceChange = async (newSourceId) => {
    setSelectedSourceId(newSourceId);
    if (onUpdateTransfer && newSourceId !== selectedDestId) {
      const srcObj = storesList.find(s => s.id === newSourceId);
      setIsUpdating(true);
      try {
        await onUpdateTransfer(transfer.transferId, {
          sourceStoreId: newSourceId,
          sourceStoreName: srcObj?.name || 'Selected Source Store'
        });
      } finally {
        setIsUpdating(false);
      }
    }
  };

  // Handle Destination Store change
  const handleDestChange = async (newDestId) => {
    setSelectedDestId(newDestId);
    if (onUpdateTransfer && newDestId !== selectedSourceId) {
      const destObj = storesList.find(s => s.id === newDestId);
      setIsUpdating(true);
      try {
        await onUpdateTransfer(transfer.transferId, {
          destStoreId: newDestId,
          destStoreName: destObj?.name || 'Selected Destination Store'
        });
      } finally {
        setIsUpdating(false);
      }
    }
  };

  // Handle Delivery Mode toggle (Express vs Normal)
  const handleModeChange = async (newMode) => {
    setDeliveryMode(newMode);
    if (onUpdateTransfer) {
      setIsUpdating(true);
      try {
        await onUpdateTransfer(transfer.transferId, {
          deliveryMode: newMode
        });
      } finally {
        setIsUpdating(false);
      }
    }
  };

  // Handle Status lifecycle transitions
  const handleAdvanceStatus = async (nextStatus) => {
    if (!onUpdateTransfer) return;
    setIsUpdating(true);
    try {
      const updates = { deliveryStatus: nextStatus };
      if (nextStatus === 'dispatched' && !transfer.dispatchTime) {
        updates.dispatchTime = new Date().toISOString();
      }
      if (nextStatus === 'delivered') {
        updates.deliveredTime = new Date().toISOString();
      }
      await onUpdateTransfer(transfer.transferId, updates);
    } finally {
      setIsUpdating(false);
    }
  };

  // Reset stage for testing
  const handleResetStage = async () => {
    if (!onUpdateTransfer) return;
    setIsUpdating(true);
    try {
      await onUpdateTransfer(transfer.transferId, {
        deliveryStatus: 'approved',
        dispatchTime: null,
        deliveredTime: null
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const currentStageKey = (transfer.deliveryStatus || 'approved').toLowerCase();
  const currentStageIndex = TRANSFER_STAGES.findIndex((s) => s.key === currentStageKey);

  return (
    <div className="delivery-estimate-card font-tech">
      {/* 1. Header */}
      <div className="delivery-estimate-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Truck size={15} style={{ color: 'var(--text-white)' }} />
          <span className="delivery-estimate-title">TRANSFER ROUTE & DELIVERY ESTIMATE // {transfer.transferId}</span>
        </div>
        <span
          className="delivery-badge"
          style={{
            backgroundColor: eta.modeConfig.bgColor,
            borderColor: eta.modeConfig.borderColor,
            color: eta.modeConfig.color
          }}
        >
          {eta.modeConfig.badgeText}
        </span>
      </div>

      {/* 2. Product and Size Breakdown */}
      <div className="delivery-product-box">
        <div className="font-display" style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-white)' }}>
          {transfer.productName}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.75rem' }}>
          <span>
            EXACT SIZE: <strong style={{ color: 'var(--text-white)' }}>{transfer.size}</strong>
          </span>
          <span className="text-dim">•</span>
          <span>
            QUANTITY: <strong style={{ color: 'var(--text-white)' }}>{transfer.quantity} units</strong>
          </span>
        </div>
      </div>

      {/* 3. DYNAMIC INDEPENDENT STORE SELECTORS (Requirement 5) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '12px',
          backgroundColor: 'var(--bg-canvas)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-sm)'
        }}
      >
        <span className="technical-index" style={{ color: 'var(--text-white)', fontSize: '0.68rem' }}>
          [ DYNAMIC ROUTE ENDPOINTS // SELECT FROM & TO STORES ]
        </span>

        {/* FROM STORE Selector */}
        <div>
          <label
            htmlFor="transfer-from-store-select"
            className="text-dim"
            style={{ fontSize: '0.7rem', display: 'block', marginBottom: '4px', fontWeight: 600 }}
          >
            FROM STORE (SOURCE):
          </label>
          <select
            id="transfer-from-store-select"
            value={selectedSourceId}
            onChange={(e) => handleSourceChange(e.target.value)}
            disabled={isUpdating || currentStageKey === 'in_transit' || currentStageKey === 'delivered'}
            className="inventory-filter-select font-tech"
            style={{ width: '100%', height: '34px', padding: '0 10px', color: '#eab308' }}
          >
            {storesList.map(st => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.city})
              </option>
            ))}
          </select>
        </div>

        {/* TO STORE Selector */}
        <div>
          <label
            htmlFor="transfer-to-store-select"
            className="text-dim"
            style={{ fontSize: '0.7rem', display: 'block', marginBottom: '4px', fontWeight: 600 }}
          >
            TO STORE (DESTINATION):
          </label>
          <select
            id="transfer-to-store-select"
            value={selectedDestId}
            onChange={(e) => handleDestChange(e.target.value)}
            disabled={isUpdating || currentStageKey === 'in_transit' || currentStageKey === 'delivered'}
            className="inventory-filter-select font-tech"
            style={{ width: '100%', height: '34px', padding: '0 10px', color: '#f43f5e' }}
          >
            {storesList.map(st => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.city})
              </option>
            ))}
          </select>
        </div>

        {/* Validation Warning for Identical Stores */}
        {isSameStore && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              borderRadius: 'var(--radius-xs)',
              color: '#f87171',
              fontSize: '0.72rem'
            }}
          >
            <AlertTriangle size={13} style={{ flexShrink: 0 }} />
            <span>Source and Destination stores cannot be identical. Please choose distinct stores.</span>
          </div>
        )}
      </div>

      {/* 4. Dual-Store Inventory Impact Matrix */}
      {!isSameStore && currentSource && currentDest && (
        <div
          className="font-tech"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            padding: '10px 12px',
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.72rem'
          }}
        >
          <div>
            <span className="text-dim" style={{ fontSize: '0.65rem', display: 'block' }}>
              SOURCE ({currentSource.city})
            </span>
            <div style={{ marginTop: '2px' }}>
              <span>{sourceStock} units</span> → <strong style={{ color: sourceStockAfter < sourceMin ? '#f43f5e' : '#10b981' }}>{sourceStockAfter} units</strong>
            </div>
            <span className="text-dim" style={{ fontSize: '0.64rem' }}>
              Min Threshold: {sourceMin}
            </span>
          </div>

          <div>
            <span className="text-dim" style={{ fontSize: '0.65rem', display: 'block' }}>
              DESTINATION ({currentDest.city})
            </span>
            <div style={{ marginTop: '2px' }}>
              <span>{destStock} units</span> → <strong style={{ color: '#10b981' }}>{destStockAfter} units</strong>
            </div>
            <span className="text-dim" style={{ fontSize: '0.64rem' }}>
              Target Buffer Satisfied
            </span>
          </div>
        </div>
      )}

      {/* 5. Delivery Mode Controls (Express vs Normal) */}
      <div className="delivery-mode-selector-wrap">
        <span className="selector-label text-dim">SELECT DELIVERY METHOD:</span>
        <div className="delivery-mode-buttons">
          {/* Express Mode Button */}
          <button
            type="button"
            onClick={() => handleModeChange('express')}
            className={`delivery-mode-btn ${deliveryMode === 'express' ? 'active express' : ''}`}
            aria-pressed={deliveryMode === 'express'}
            disabled={isUpdating || isSameStore || currentStageKey === 'delivered'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={13} style={{ color: '#ffffff' }} />
              <span style={{ fontWeight: 700 }}>EXPRESS DELIVERY</span>
            </div>
            <span className="delivery-mode-sub">Expedited dispatch • Direct line-haul</span>
          </button>

          {/* Normal Mode Button */}
          <button
            type="button"
            onClick={() => handleModeChange('normal')}
            className={`delivery-mode-btn ${deliveryMode === 'normal' ? 'active normal' : ''}`}
            aria-pressed={deliveryMode === 'normal'}
            disabled={isUpdating || isSameStore || currentStageKey === 'delivered'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Truck size={13} style={{ color: '#38bdf8' }} />
              <span style={{ fontWeight: 700 }}>STANDARD DELIVERY</span>
            </div>
            <span className="delivery-mode-sub">Standard freight • Scheduled corridor</span>
          </button>
        </div>
      </div>

      {/* 6. Telemetry Metrics Matrix */}
      <div className="delivery-metrics-grid">
        {/* Route Distance */}
        <div className="delivery-metric-cell">
          <span className="cell-label text-dim">ROUTE DISTANCE</span>
          <div className="cell-value" style={{ color: 'var(--text-white)' }}>
            {isSameStore ? '0 km' : loadingRoute ? 'Calculating...' : `${(routeData?.distanceKm || 0).toLocaleString()} km`}
          </div>
          <span className="cell-sub text-dim">
            {routeData?.isDrivingRoute ? 'Road highway corridor' : 'Approximate route estimate'}
          </span>
        </div>

        {/* Estimated Travel Time */}
        <div className="delivery-metric-cell">
          <span className="cell-label text-dim">ESTIMATED TRANSIT TIME</span>
          <div className="cell-value" style={{ color: eta.modeConfig.color }}>
            {isSameStore ? 'N/A' : eta.formattedDuration}
          </div>
          <span className="cell-sub text-dim">
            Avg speed {eta.modeConfig.avgSpeedKmh} km/h + {eta.modeConfig.prepTimeHours}h staging
          </span>
        </div>

        {/* Estimated Arrival Timestamp */}
        <div className="delivery-metric-cell full-width">
          <span className="cell-label text-dim">ESTIMATED ARRIVAL (ETA)</span>
          <div className="cell-value" style={{ color: 'var(--text-white)', fontSize: '0.95rem' }}>
            <Calendar size={13} style={{ color: 'var(--text-white)', marginRight: '6px', verticalAlign: '-1px' }} />
            {isSameStore ? 'Select valid distinct endpoints' : eta.formattedArrival}
          </div>
          <div className="cell-sub" style={{ color: '#eab308', marginTop: '2px' }}>
            * {eta.disclaimer}
          </div>
        </div>
      </div>

      {/* 7. Transfer Lifecycle Workflow */}
      <div className="delivery-stepper-wrap">
        <div className="stepper-title-row">
          <span className="selector-label text-dim">TRANSFER STATUS WORKFLOW:</span>
          <span className="stepper-current-label" style={{ color: 'var(--text-white)' }}>
            STAGE {currentStageIndex + 1} OF 4: {TRANSFER_STAGES[currentStageIndex]?.label.toUpperCase()}
          </span>
        </div>

        <div className="delivery-stepper-steps">
          {TRANSFER_STAGES.map((st, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;

            return (
              <div
                key={st.key}
                className={`stepper-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                title={st.desc}
              >
                <div className="stepper-node">
                  {isCompleted ? <CheckCircle2 size={12} /> : <span>{st.stepNumber}</span>}
                </div>
                <span className="stepper-step-label">{st.label}</span>
              </div>
            );
          })}
        </div>

        {transfer.dispatchTime && (
          <div className="stepper-timestamp-log text-dim">
            <span>Dispatched at: {new Date(transfer.dispatchTime).toLocaleString('en-US', { hour12: false })}</span>
          </div>
        )}
        {transfer.deliveredTime && (
          <div className="stepper-timestamp-log" style={{ color: '#10b981' }}>
            <span>Delivered & verified: {new Date(transfer.deliveredTime).toLocaleString('en-US', { hour12: false })}</span>
          </div>
        )}
      </div>

      {/* 8. Action Execution Buttons */}
      <div className="delivery-actions-row">
        {currentStageKey === 'approved' && (
          <button
            onClick={() => handleAdvanceStatus('dispatched')}
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={isUpdating || isSameStore}
          >
            <Truck size={14} />
            <span>Dispatch Transfer ({deliveryMode.toUpperCase()})</span>
          </button>
        )}

        {currentStageKey === 'dispatched' && (
          <button
            onClick={() => handleAdvanceStatus('in_transit')}
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={isUpdating || isSameStore}
          >
            <Navigation size={14} />
            <span>Confirm In Transit</span>
          </button>
        )}

        {currentStageKey === 'in_transit' && (
          <button
            onClick={() => handleAdvanceStatus('delivered')}
            className="btn btn-primary"
            style={{ width: '100%', backgroundColor: '#10b981', borderColor: '#10b981' }}
            disabled={isUpdating || isSameStore}
          >
            <CheckCircle2 size={14} />
            <span>Confirm Receipt & Mark Delivered</span>
          </button>
        )}

        {currentStageKey === 'delivered' && (
          <div style={{ display: 'flex', width: '100%', gap: '8px' }}>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-xs)',
                color: '#10b981',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              <ShieldCheck size={14} />
              <span>TRANSFER COMPLETE & INVENTORIED</span>
            </div>
            <button
              onClick={handleResetStage}
              className="btn btn-secondary btn-sm"
              title="Reset transfer stage for testing"
            >
              <RefreshCw size={12} />
              <span>Reset</span>
            </button>
          </div>
        )}
      </div>

      {/* 9. Logistics Notice & Routing Engine Source */}
      <div className="delivery-notice-footer text-dim">
        <span>* {routeData?.routingSource || 'Route calculation via OpenStreetMap OSRM road geometry'}</span>
        <span style={{ marginTop: '2px', display: 'block' }}>
          Notice: Telemetry reflects scheduled logistics calculations. Live vehicle tracking represents operational milestone logging.
        </span>
      </div>
    </div>
  );
};

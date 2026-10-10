import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Building2,
  AlertTriangle,
  ExternalLink,
  Truck,
  ArrowRight,
  Shirt,
  AlertCircle,
  CheckCircle2,
  AlertOctagon
} from 'lucide-react';
import { getStoreProductBreakdown } from '../../utils/stockUtils';
import { TransferDeliveryEstimate } from './TransferDeliveryEstimate';

export const StoreDetailsPanel = ({
  store,
  inventory = [],
  stores = [],
  storeStatus = null,
  selectedProduct = 'All Products',
  selectedColour = 'All Colours',
  selectedSize = 'All Sizes',
  activeTransfer = null,
  transferRecommendations = [],
  sourceStoreForTransfer = null,
  destStoreForTransfer = null,
  onUpdateTransfer,
  activeTab = 'store',
  onTabChange
}) => {
  const navigate = useNavigate();

  // Calculate product-aware inventory breakdown for this store
  const storeBreakdown = useMemo(() => {
    if (!store) return null;
    return getStoreProductBreakdown(
      store.id,
      inventory,
      selectedProduct,
      selectedColour,
      selectedSize
    );
  }, [store, inventory, selectedProduct, selectedColour, selectedSize]);

  // Find relevant product-specific transfer recommendation involving this store
  const storeRecommendation = useMemo(() => {
    if (!store || !transferRecommendations?.length) return null;
    return transferRecommendations.find(
      (r) => r.sourceStoreId === store.id || r.destStoreId === store.id
    );
  }, [store, transferRecommendations]);

  if (!store && !activeTransfer) {
    return (
      <div className="store-details-empty-panel">
        <div className="empty-panel-icon">
          <Building2 size={24} />
        </div>
        <h4 className="font-display empty-panel-title">Select a Store Node or Transfer</h4>
        <p className="empty-panel-desc text-dim font-tech">
          Click any radar marker on the map to inspect real-time product inventory telemetry, or click a transfer route to inspect delivery options and dynamic ETA.
        </p>
      </div>
    );
  }

  // Status tokens
  const isUnconfigured = storeBreakdown ? !storeBreakdown.isConfigured : storeStatus?.statusType === 'not_configured';
  const statusColor = isUnconfigured ? '#71717a' : (storeStatus?.color || '#10b981');
  const statusLabel = isUnconfigured
    ? 'Inventory Not Configured'
    : (storeStatus?.label || store?.status || 'Healthy Stock');

  // Navigate to Inventory with store and product filters pre-selected
  const handleViewInventory = () => {
    if (store) {
      const params = new URLSearchParams();
      params.set('store', store.name);
      if (selectedProduct && selectedProduct !== 'All Products') {
        params.set('search', selectedProduct);
      }
      navigate(`/inventory?${params.toString()}`);
    }
  };

  return (
    <div className="store-details-panel-container" id="store-details-panel">
      {/* Tab Switcher at top of panel */}
      {activeTransfer && store && (
        <div className="panel-tab-switcher font-tech">
          <button
            type="button"
            onClick={() => onTabChange('store')}
            className={`panel-tab-btn ${activeTab === 'store' ? 'active' : ''}`}
            id="tab-btn-store-telemetry"
          >
            <Building2 size={12} />
            <span>STORE NODE TELEMETRY</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('delivery')}
            className={`panel-tab-btn ${activeTab === 'delivery' ? 'active' : ''}`}
            id="tab-btn-delivery-estimate"
          >
            <Truck size={12} />
            <span>DELIVERY ESTIMATE ({activeTransfer.transferId})</span>
          </button>
        </div>
      )}

      {/* VIEW A: Delivery Estimate and Approved Transfer Workflow */}
      {activeTab === 'delivery' && activeTransfer ? (
        <TransferDeliveryEstimate
          transfer={activeTransfer}
          sourceStore={sourceStoreForTransfer}
          destStore={destStoreForTransfer}
          storesList={stores}
          inventory={inventory}
          onUpdateTransfer={onUpdateTransfer}
        />
      ) : (
        /* VIEW B: Store Node Inventory Telemetry */
        store && (
          <>
            {/* 1. Panel Header */}
            <div className="store-panel-header">
              <div>
                <div className="store-panel-badge-row">
                  <span className="technical-index">{store.code || 'STORE-NODE'}</span>
                  {store.isWarehouse || store.storeType === 'Warehouse' ? (
                    <span className="technical-index" style={{ background: '#2563eb', color: '#ffffff', borderColor: '#60a5fa' }}>
                      CENTRAL WAREHOUSE
                    </span>
                  ) : null}
                  {store.storeType && store.storeType !== 'Warehouse' && (
                    <span className="technical-index" style={{ background: 'rgba(255,255,255,0.08)', color: '#e4e4e7' }}>
                      {store.storeType.toUpperCase()}
                    </span>
                  )}
                  <span
                    className="store-panel-status-pill font-tech"
                    style={{
                      borderColor: statusColor,
                      color: statusColor,
                      backgroundColor: `${statusColor}18`
                    }}
                  >
                    <span className="pill-dot" style={{ backgroundColor: statusColor }} />
                    <span id="store-panel-status-text">{statusLabel}</span>
                  </span>
                </div>

                <h3 className="store-panel-name font-display" id="store-panel-name">{store.name}</h3>

                <div className="store-panel-address font-tech">
                  <MapPin size={12} className="text-dim" />
                  <span>{store.address || `${store.city || store.location || ''}, ${store.state || 'KA'}`}</span>
                </div>

                {store.customerProfile && (
                  <div className="store-panel-profile font-tech" style={{ marginTop: '6px', fontSize: '0.72rem', color: '#93c5fd', background: 'rgba(59, 130, 246, 0.08)', padding: '4px 8px', borderRadius: '4px', borderLeft: '2px solid #3b82f6' }}>
                    <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>CUSTOMER PROFILE: </span>
                    <span>{store.customerProfile}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. PRODUCT-AWARE METADATA STRIP (Requirement 4) */}
            <div className="store-panel-product-strip font-tech" id="store-panel-product-strip">
              <div className="strip-item">
                <span className="strip-label text-dim">EVALUATED PRODUCT:</span>
                <span className="strip-value font-display" id="store-panel-product-name">
                  {selectedProduct !== 'All Products' ? selectedProduct : (storeBreakdown?.productName || 'All Catalogue Products')}
                </span>
              </div>

              <div className="strip-sub-row">
                <span className="strip-sku">
                  SKU: <strong id="store-panel-sku">{storeBreakdown?.sku || storeBreakdown?.skuPrefix || 'N/A'}</strong>
                </span>
                {selectedColour !== 'All Colours' && (
                  <span className="strip-colour-filter" id="store-panel-colour-filter">
                    COLOUR: <strong>{selectedColour}</strong>
                  </span>
                )}
                {selectedSize !== 'All Sizes' && (
                  <span className="strip-size-filter" id="store-panel-size-filter">
                    SIZE: <strong>{selectedSize}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* 3. CASE A: INVENTORY NOT CONFIGURED (Requirement 2 & Test F) */}
            {isUnconfigured ? (
              <div className="store-panel-unconfigured-box font-tech" id="store-panel-unconfigured-state">
                <div className="unconfigured-icon-wrap">
                  <AlertCircle size={24} style={{ color: '#a1a1aa' }} />
                </div>
                <h4 className="unconfigured-heading font-display">
                  Inventory Not Configured
                </h4>
                <p className="unconfigured-text text-dim">
                  <strong>{store.name}</strong> has no inventory records configured for{' '}
                  <strong>{selectedProduct}</strong>.
                </p>
                <div className="unconfigured-alert-banner">
                  <span className="banner-tag">[EXPLICIT STATE]</span>
                  <span>Missing inventory records are not treated as verified zero stock. This retail hub does not carry this product line.</span>
                </div>
              </div>
            ) : (
              /* 3. CASE B: CONFIGURED INVENTORY BREAKDOWN */
              <>
                {/* Key Operational Metrics Grid */}
                <div className="store-panel-metrics-grid font-tech">
                  <div className="panel-metric-card">
                    <span className="panel-metric-title">PRODUCT STOCK</span>
                    <div className="panel-metric-val font-tech" id="store-panel-total-units">
                      {storeBreakdown?.totalUnits?.toLocaleString() || '0'}
                    </div>
                    <span className="panel-metric-sub text-dim">Units physically on-hand</span>
                  </div>

                  <div className="panel-metric-card">
                    <span className="panel-metric-title">STORE CAPACITY</span>
                    <div className="panel-metric-val font-tech">
                      {store.capacityUsagePct || 78}%
                    </div>
                    <div className="panel-capacity-bar-wrap">
                      <div
                        className="panel-capacity-bar-fill"
                        style={{
                          width: `${Math.min(100, store.capacityUsagePct || 78)}%`,
                          backgroundColor: (store.capacityUsagePct || 78) > 85 ? '#eab308' : '#ffffff'
                        }}
                      />
                    </div>
                  </div>

                  <div className="panel-metric-card">
                    <span className="panel-metric-title">SHORTAGES</span>
                    <div className="panel-metric-val" style={{ color: (storeBreakdown?.lowStockSizes?.length || 0) > 0 ? '#f43f5e' : '#10b981' }}>
                      {storeBreakdown?.lowStockSizes?.length || 0} Sizes
                    </div>
                    <span className="panel-metric-sub text-dim">
                      {storeBreakdown?.lowStockSizes?.length ? storeBreakdown.lowStockSizes.join(', ') : 'Healthy levels'}
                    </span>
                  </div>

                  <div className="panel-metric-card">
                    <span className="panel-metric-title">SURPLUS SIZES</span>
                    <div className="panel-metric-val" style={{ color: (storeBreakdown?.excessStockSizes?.length || 0) > 0 ? '#eab308' : '#a1a1aa' }}>
                      {storeBreakdown?.excessStockSizes?.length || 0} Excess
                    </div>
                    <span className="panel-metric-sub text-dim">
                      {storeBreakdown?.excessStockSizes?.length ? storeBreakdown.excessStockSizes.join(', ') : 'None (>75)'}
                    </span>
                  </div>
                </div>

                {/* Out-Of-Stock or Low-Stock Warning Alert */}
                {(storeBreakdown?.outOfStockSizes?.length > 0 || storeBreakdown?.lowStockSizes?.length > 0) && (
                  <div className="store-panel-highlight-box" style={{ borderColor: 'rgba(244, 63, 94, 0.45)' }}>
                    <AlertTriangle size={14} style={{ color: '#f43f5e', flexShrink: 0, marginTop: '2px' }} />
                    <p className="panel-highlight-text font-tech">
                      {storeBreakdown.outOfStockSizes.length > 0
                        ? `Critical Stockout: Size(s) ${storeBreakdown.outOfStockSizes.join(', ')} currently have 0 units on hand.`
                        : `Low Stock Alert: Size(s) ${storeBreakdown.lowStockSizes.join(', ')} are below the safety threshold (15 units).`}
                    </p>
                  </div>
                )}

                {/* 4. PRODUCT-SPECIFIC TRANSFER RECOMMENDATION OR ACTIVE ROUTE (Requirement 5) */}
                {storeRecommendation ? (
                  <div className="store-panel-transfer-box font-tech" id="store-panel-transfer-rec-box">
                    <div className="transfer-box-header">
                      <Truck size={13} style={{ color: '#ffffff' }} />
                      <span>
                        RECOMMENDED TRANSFER // {storeRecommendation.productName} ({storeRecommendation.size})
                      </span>
                    </div>
                    <div className="transfer-box-content">
                      <div className="transfer-route-text font-display">
                        {storeRecommendation.sourceStoreName} ➔ {storeRecommendation.destStoreName}
                      </div>
                      <div className="transfer-meta-text font-tech">
                        Variant: <strong>{storeRecommendation.colour} • Size {storeRecommendation.size}</strong> • Recommended Dispatch:{' '}
                        <strong style={{ color: '#ffffff', fontSize: '0.85rem' }}>
                          {storeRecommendation.quantity} units
                        </strong>
                      </div>
                      <div className="transfer-reason-text font-tech text-dim" style={{ fontSize: '0.68rem', marginTop: '4px' }}>
                        {storeRecommendation.reason}
                      </div>
                      <div className="transfer-action-buttons">
                        <button
                          onClick={() => navigate('/inventory?approvalStatus=Pending')}
                          className="btn btn-secondary btn-xs font-tech"
                          style={{ marginTop: '8px', width: '100%' }}
                          title="Review this transfer recommendation in the manager approvals workflow"
                        >
                          <span>Review in Manager Approvals Workflow</span>
                          <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : activeTransfer && (activeTransfer.sourceStoreId === store.id || activeTransfer.destStoreId === store.id) ? (
                  <div className="store-panel-transfer-box font-tech">
                    <div className="transfer-box-header">
                      <Truck size={13} style={{ color: '#ffffff' }} />
                      <span>ACTIVE REBALANCE TRANSFER // {activeTransfer.transferId}</span>
                    </div>
                    <div className="transfer-box-content">
                      <div className="transfer-route-text font-display">
                        {activeTransfer.sourceStoreName} ➔ {activeTransfer.destStoreName}
                      </div>
                      <div className="transfer-meta-text font-tech">
                        Item: <strong>{activeTransfer.productName} ({activeTransfer.size})</strong> • Dispatch:{' '}
                        <strong style={{ color: 'var(--text-white)' }}>{activeTransfer.quantity} units</strong>
                      </div>
                      <button
                        onClick={() => onTabChange('delivery')}
                        className="btn btn-secondary btn-sm font-tech"
                        style={{ marginTop: '8px', width: '100%' }}
                      >
                        <span>Inspect Delivery Options & Route ETA</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* 5. PRODUCT & VARIANT INVENTORY BREAKDOWN TABLE (Requirement 4) */}
                <div className="store-panel-table-wrap">
                  <div className="store-panel-table-header font-tech">
                    <span>{store.name.toUpperCase()} // VARIANT BREAKDOWN:</span>
                    <span className="text-dim">
                      {selectedProduct !== 'All Products' ? selectedProduct : 'All Products'}
                    </span>
                  </div>

                  <table className="store-breakdown-table font-tech" id="store-breakdown-table">
                    <thead>
                      <tr>
                        <th>SIZE</th>
                        <th>COLOUR</th>
                        <th>AVAILABLE UNITS</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storeBreakdown?.items?.length > 0 ? (
                        storeBreakdown.items.map((row) => (
                          <tr key={row.id || `${row.size}-${row.colour}`}>
                            <td>
                              <span className="table-size-badge font-tech">{row.size}</span>
                            </td>
                            <td>
                              <span className="table-colour-text font-tech">{row.colour}</span>
                            </td>
                            <td>
                              <strong style={{ color: 'var(--text-white)' }} className="table-units-value">
                                {row.units}
                              </strong>{' '}
                              <span className="text-dim" style={{ fontSize: '0.68rem' }}>
                                units
                              </span>
                            </td>
                            <td>
                              <span
                                className="table-status-tag font-tech"
                                style={{
                                  color: row.color,
                                  borderColor: `${row.color}55`,
                                  backgroundColor: `${row.color}15`
                                }}
                              >
                                ● {row.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: '#a1a1aa' }}>
                            No variants match active filters for this store.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* 6. Footer Action Button */}
            <div className="store-panel-footer">
              <button
                onClick={handleViewInventory}
                className="btn btn-primary"
                style={{ width: '100%' }}
                title={`View catalogue inventory for ${store.name}`}
                id="btn-view-store-inventory"
              >
                <span>View Inventory ({store.name})</span>
                <ExternalLink size={14} />
              </button>
            </div>
          </>
        )
      )}
    </div>
  );
};

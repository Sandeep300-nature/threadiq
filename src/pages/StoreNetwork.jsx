import React, { useState, useEffect, useMemo } from 'react';
import { StoreRadarMap } from '../components/stores/StoreRadarMap';
import { StoreSummaryStrip } from '../components/stores/StoreSummaryStrip';
import { StoreRadarFilters } from '../components/stores/StoreRadarFilters';
import { StoreDetailsPanel } from '../components/stores/StoreDetailsPanel';
import { SelectedProductOverviewBar } from '../components/stores/SelectedProductOverviewBar';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { api } from '../services/api';
import {
  calculateStoreStatus,
  getCatalogueProducts,
  calculateProductTransferRecommendations,
  SIZE_WEIGHTS
} from '../utils/stockUtils';
import { useNavigate } from 'react-router-dom';
import { Radio, ArrowRight, RefreshCw, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const StoreNetwork = () => {
  const { addToast } = useApp();
  const [stores, setStores] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [activePanelTab, setActivePanelTab] = useState('store');
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toLocaleTimeString());

  // 1. Product-Type & Multi-dimensional Filter States (Requirements 1 & 3)
  const [selectedProduct, setSelectedProduct] = useState('Supima Relaxed Fit Tee');
  const [selectedColour, setSelectedColour] = useState('All Colours');
  const [sizeFilter, setSizeFilter] = useState('All Sizes');
  const [statusFilter, setStatusFilter] = useState('All Stores');
  const [regionFilter, setRegionFilter] = useState('All Regions');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [showTransferRoutes, setShowTransferRoutes] = useState(true);

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedStores, fetchedInventory, fetchedTransfers, fetchedRecs] = await Promise.all([
        api.fetchStores(),
        api.fetchInventory(),
        api.fetchTransfers(),
        api.fetchRecommendations()
      ]);
      setStores(fetchedStores || []);
      setInventory(fetchedInventory || []);
      setTransfers(fetchedTransfers || []);
      setRecommendations(fetchedRecs || []);

      // Preserve currently selected store if still present in fresh store list
      setSelectedStore((prev) => {
        if (!fetchedStores?.length) return null;
        if (prev) {
          const matched = fetchedStores.find((s) => s.id === prev.id);
          if (matched) return matched;
        }
        return fetchedStores[0];
      });

      // Align selected transfer
      setSelectedTransfer((prev) => {
        if (!fetchedTransfers?.length) return null;
        if (prev) {
          const matched = fetchedTransfers.find((t) => t.transferId === prev.transferId);
          if (matched) return matched;
        }
        return fetchedTransfers[0];
      });

      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load store radar network data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleLiveSync = () => {
      loadData();
    };

    window.addEventListener('threadiq:transfer_update', handleLiveSync);
    window.addEventListener('threadiq:inventory_update', handleLiveSync);

    return () => {
      window.removeEventListener('threadiq:transfer_update', handleLiveSync);
      window.removeEventListener('threadiq:inventory_update', handleLiveSync);
    };
  }, []);

  // Periodic telemetry heartbeat update
  useEffect(() => {
    const timer = setInterval(() => {
      setLastSyncTime(new Date().toLocaleTimeString());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  // 2. Dynamically Extract Catalogue Products from Real Backend Inventory (Requirement 1 & 7)
  const catalogueProducts = useMemo(() => {
    return getCatalogueProducts(inventory);
  }, [inventory]);

  // Ensure selectedProduct is valid in current catalogue; fallback if necessary
  useEffect(() => {
    if (catalogueProducts.length > 0 && selectedProduct !== 'All Products') {
      const exists = catalogueProducts.some((p) => p.productName === selectedProduct);
      if (!exists) {
        setSelectedProduct(catalogueProducts[0].productName);
      }
    }
  }, [catalogueProducts, selectedProduct]);

  // Current product metadata
  const currentProductData = useMemo(() => {
    if (selectedProduct === 'All Products') return null;
    return catalogueProducts.find((p) => p.productName === selectedProduct) || null;
  }, [catalogueProducts, selectedProduct]);

  // Available colours for the currently selected product
  const availableColours = useMemo(() => {
    if (currentProductData) {
      return currentProductData.colours;
    }
    return [...new Set(inventory.map((i) => i.colour).filter(Boolean))].sort();
  }, [currentProductData, inventory]);

  // Available sizes for the currently selected product + colour
  const availableSizes = useMemo(() => {
    let items = inventory;
    if (selectedProduct !== 'All Products') {
      items = items.filter((it) => it.productName === selectedProduct || it.name === selectedProduct);
    }
    if (selectedColour !== 'All Colours') {
      items = items.filter((it) => it.colour?.toLowerCase() === selectedColour.toLowerCase());
    }
    const sizes = [...new Set(items.map((it) => it.size).filter(Boolean))];
    return sizes.sort((a, b) => (SIZE_WEIGHTS[a] || 99) - (SIZE_WEIGHTS[b] || 99));
  }, [selectedProduct, selectedColour, inventory]);

  // Auto-reset colour or size if no longer valid for new product
  const handleProductChange = (newProduct) => {
    setSelectedProduct(newProduct);
    setSelectedColour('All Colours');
    setSizeFilter('All Sizes');
  };

  const handleColourChange = (newColour) => {
    setSelectedColour(newColour);
  };

  const handleSizeFilterChange = (newSize) => {
    setSizeFilter(newSize);
  };

  const handleClearVariantFilters = () => {
    setSelectedColour('All Colours');
    setSizeFilter('All Sizes');
  };

  const handleResetFilters = () => {
    setSelectedProduct('All Products');
    setSelectedColour('All Colours');
    setSizeFilter('All Sizes');
    setStatusFilter('All Stores');
    setRegionFilter('All Regions');
    setCategoryFilter('All Categories');
  };

  // 3. Compute Product-Aware Status for Each Store (Requirement 2)
  const storeStatuses = useMemo(() => {
    const map = {};
    stores.forEach((st) => {
      map[st.id] = calculateStoreStatus(st, inventory, {
        productFilter: selectedProduct,
        colourFilter: selectedColour,
        sizeFilter,
        categoryFilter
      });
    });
    return map;
  }, [stores, inventory, selectedProduct, selectedColour, sizeFilter, categoryFilter]);

  // 4. Filter Stores based on region, status, and product configuration (Requirement 2 & 3)
  const filteredStores = useMemo(() => {
    return stores.filter((st) => {
      const statusObj = storeStatuses[st.id];

      // Region Filter
      if (regionFilter !== 'All Regions' && st.region !== regionFilter && st.city !== regionFilter) {
        return false;
      }

      // Stock Status Filter
      if (statusFilter !== 'All Stores') {
        if (statusFilter === 'Healthy Stock' || statusFilter === 'Balanced') {
          if (statusObj.statusType !== 'success') return false;
        } else if (statusFilter === 'Excess Stock') {
          if (statusObj.statusType !== 'warning') return false;
        } else if (statusFilter === 'Low Stock') {
          if (statusObj.statusType !== 'danger') return false;
        } else if (statusFilter === 'Not Configured') {
          if (statusObj.statusType !== 'not_configured') return false;
        }
      }

      // If user filtered by size or category, and store is configured but has no matching items
      if (
        (sizeFilter !== 'All Sizes' || categoryFilter !== 'All Categories' || selectedColour !== 'All Colours') &&
        statusObj.isConfigured &&
        !statusObj.hasMatches
      ) {
        return false;
      }

      return true;
    });
  }, [stores, storeStatuses, statusFilter, regionFilter, sizeFilter, categoryFilter, selectedColour]);

  // Keep selectedStore aligned
  useEffect(() => {
    if (filteredStores.length > 0) {
      const isSelectedStillVisible = filteredStores.some((s) => s.id === selectedStore?.id);
      if (!isSelectedStillVisible) {
        setSelectedStore(filteredStores[0]);
      }
    } else {
      setSelectedStore(null);
    }
  }, [filteredStores, selectedStore]);

  // 5. Calculate Product-Specific Transfer Recommendations (Requirement 5)
  const productRecommendations = useMemo(() => {
    return calculateProductTransferRecommendations({
      inventory,
      transfers,
      selectedProduct,
      selectedColour,
      selectedSize: sizeFilter,
      stores
    });
  }, [inventory, transfers, selectedProduct, selectedColour, sizeFilter, stores]);

  // 6. Filter Transfers Displayed on Map to Match Selected Product (Requirement 5)
  const productTransfers = useMemo(() => {
    if (selectedProduct === 'All Products') {
      return transfers;
    }

    // Match transfers for this specific product
    let matching = transfers.filter(
      (t) => t.productName === selectedProduct || t.productName?.toLowerCase().includes(selectedProduct.toLowerCase())
    );

    if (selectedColour !== 'All Colours') {
      matching = matching.filter(
        (t) => t.colour?.toLowerCase() === selectedColour.toLowerCase()
      );
    }

    if (sizeFilter !== 'All Sizes') {
      matching = matching.filter((t) => t.size === sizeFilter);
    }

    // If no existing transfer route exists for this product, but dynamic recommendation exists:
    // Synthesize a route so the map can render the proposed rebalance route!
    if (matching.length === 0 && productRecommendations.length > 0) {
      const topRec = productRecommendations[0];
      matching = [
        {
          transferId: topRec.transferId,
          recommendationId: topRec.id,
          productName: topRec.productName,
          category: 'T-shirts',
          size: topRec.size,
          colour: topRec.colour,
          sku: topRec.sku,
          quantity: topRec.quantity,
          sourceStoreId: topRec.sourceStoreId,
          sourceStoreName: topRec.sourceStoreName,
          destStoreId: topRec.destStoreId,
          destStoreName: topRec.destStoreName,
          deliveryMode: 'normal',
          deliveryStatus: 'proposed',
          status: 'Proposed Recommendation',
          dispatchTime: null,
          deliveredTime: null,
          notes: topRec.reason,
          lastUpdated: 'Grounded Recommendation'
        }
      ];
    }

    return matching;
  }, [transfers, selectedProduct, selectedColour, sizeFilter, productRecommendations]);

  // Summary counts across all loaded stores under current product/variant filters
  const summaryCounts = useMemo(() => {
    let balanced = 0;
    let excess = 0;
    let low = 0;

    stores.forEach((st) => {
      const s = storeStatuses[st.id];
      if (s.statusType === 'danger') low++;
      else if (s.statusType === 'warning') excess++;
      else if (s.statusType === 'success') balanced++;
    });

    return {
      total: stores.length,
      balanced,
      excess,
      low
    };
  }, [stores, storeStatuses]);

  // Handle transfer updates
  const handleUpdateTransfer = async (transferId, updates) => {
    try {
      const res = await api.updateTransfer(transferId, updates);
      if (res && res.success && res.transfer) {
        setTransfers((prev) =>
          prev.map((t) => (t.transferId === transferId ? res.transfer : t))
        );
        if (selectedTransfer?.transferId === transferId) {
          setSelectedTransfer(res.transfer);
        }
        if (updates.deliveryStatus) {
          addToast(`Transfer ${transferId} status updated: ${updates.deliveryStatus.toUpperCase()}`, 'success');
        } else if (updates.deliveryMode) {
          addToast(`Transfer ${transferId} mode updated to ${updates.deliveryMode.toUpperCase()}`, 'info');
        }
      }
    } catch (e) {
      console.error('Failed to update transfer state', e);
    }
  };

  // Find source and dest stores for currently selected transfer
  const sourceStoreForSelectedTransfer = useMemo(() => {
    if (!selectedTransfer) return null;
    return stores.find((s) => s.id === selectedTransfer.sourceStoreId);
  }, [stores, selectedTransfer]);

  const destStoreForSelectedTransfer = useMemo(() => {
    if (!selectedTransfer) return null;
    return stores.find((s) => s.id === selectedTransfer.destStoreId);
  }, [stores, selectedTransfer]);

  // Select transfer from map route click
  const handleSelectTransferFromMap = (tr) => {
    setSelectedTransfer(tr);
    setActivePanelTab('delivery');
  };

  // Select store from marker click
  const handleSelectStoreFromMap = (st) => {
    setSelectedStore(st);
    const matchingTr = productTransfers.find(
      (t) => t.sourceStoreId === st.id || t.destStoreId === st.id
    );
    if (matchingTr) {
      setSelectedTransfer(matchingTr);
    }
  };

  if (loading) {
    return <LoadingState message="Initialising Product-Aware Inventory Radar & Geospatial Route Engine..." />;
  }

  return (
    <div className="store-radar-page-container">
      {/* 1. Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className="technical-index">[ KARNATAKA RADAR // PRODUCT-AWARE INVENTORY & LOGISTICS ]</span>
            <span className="demo-tag">LIVE SQLITE DATA</span>
          </div>
          <h1 className="page-title">
            Karnataka Store Network Radar & Transfer Routing
          </h1>
          <p className="page-subtitle">
            Geographical inventory radar across Karnataka retail hubs, product-level stock status, multi-variant rebalancing, and live transfer routing.
          </p>
        </div>

        <div className="header-actions">
          {selectedTransfer && (
            <button
              onClick={() => {
                setActivePanelTab('delivery');
                if (sourceStoreForSelectedTransfer) setSelectedStore(sourceStoreForSelectedTransfer);
              }}
              className={`btn ${activePanelTab === 'delivery' ? 'btn-primary' : 'btn-secondary'} font-tech`}
              title="Inspect approved product transfer logistics and ETA"
              id="header-inspect-transfer-btn"
            >
              <Truck size={14} />
              <span>Inspect Transfer ({selectedTransfer.transferId})</span>
            </button>
          )}

          <button
            onClick={() => navigate('/inventory?approvalStatus=Pending')}
            className="btn btn-secondary btn-sm font-tech"
            title="Inspect active inventory requests and approvals"
            id="header-action-requests-btn"
          >
            <span>Action Requests</span>
            <ArrowRight size={13} />
          </button>

          <button
            onClick={loadData}
            className="btn btn-secondary btn-sm font-tech"
            title="Fetch fresh inventory data from SQLite backend"
            aria-label="Refresh telemetry data"
            id="header-sync-radar-btn"
          >
            <RefreshCw size={13} />
            <span>Sync Radar</span>
          </button>
        </div>
      </div>

      {/* 2. Map Operational Summary Strip */}
      <div className="scroll-reveal">
        <StoreSummaryStrip
          totalStores={summaryCounts.total}
          balancedCount={summaryCounts.balanced}
          excessCount={summaryCounts.excess}
          lowStockCount={summaryCounts.low}
          lastSyncTime={lastSyncTime}
          isSimulating={true}
        />
      </div>

      {/* 3. Product-Type & Multi-Filter Toolbar (Requirements 1 & 3) */}
      <StoreRadarFilters
        products={catalogueProducts}
        selectedProduct={selectedProduct}
        onProductChange={handleProductChange}
        availableColours={availableColours}
        selectedColour={selectedColour}
        onColourChange={handleColourChange}
        availableSizes={availableSizes}
        sizeFilter={sizeFilter}
        onSizeFilterChange={handleSizeFilterChange}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        regionFilter={regionFilter}
        onRegionFilterChange={setRegionFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        showTransferRoutes={showTransferRoutes}
        onToggleTransferRoutes={() => setShowTransferRoutes(!showTransferRoutes)}
        onResetFilters={handleResetFilters}
        onClearVariantFilters={handleClearVariantFilters}
      />

      {/* 4. Selected Product Context Strip (Requirement 1) */}
      {currentProductData && (
        <SelectedProductOverviewBar
          product={currentProductData}
          selectedColour={selectedColour}
          selectedSize={sizeFilter}
          onClearFilters={handleClearVariantFilters}
        />
      )}

      {/* 5. Core Interactive Radar Map Workspace */}
      {filteredStores.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No Store Nodes Match Radar Filters"
          description={`No stores currently meet the criteria (${selectedProduct}, ${selectedColour}, ${sizeFilter}, ${statusFilter}, ${regionFilter}). Reset filters to reveal all geographical nodes.`}
          actionLabel="Reset All Radar Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <div className="radar-workspace-layout scroll-reveal">
          {/* Main Map Viewport Area */}
          <div className="radar-map-column">
            <StoreRadarMap
              stores={filteredStores}
              selectedStore={selectedStore}
              onSelectStore={handleSelectStoreFromMap}
              showTransferRoutes={showTransferRoutes}
              transfers={productTransfers}
              selectedTransfer={selectedTransfer}
              onSelectTransfer={handleSelectTransferFromMap}
              storeStatuses={storeStatuses}
              selectedProduct={selectedProduct}
            />
          </div>

          {/* Selected Store Information & Delivery Estimate Panel */}
          <div className="radar-details-column">
            <StoreDetailsPanel
              store={selectedStore}
              inventory={inventory}
              storeStatus={selectedStore ? storeStatuses[selectedStore.id] : null}
              selectedProduct={selectedProduct}
              selectedColour={selectedColour}
              selectedSize={sizeFilter}
              activeTransfer={selectedTransfer}
              transferRecommendations={productRecommendations}
              sourceStoreForTransfer={sourceStoreForSelectedTransfer}
              destStoreForTransfer={destStoreForSelectedTransfer}
              onUpdateTransfer={handleUpdateTransfer}
              activeTab={activePanelTab}
              onTabChange={setActivePanelTab}
              stores={stores}
            />
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Filter, RotateCcw, Route, Shirt, Palette } from 'lucide-react';
import { REGIONS } from '../../data/mockStores';

export const STOCK_STATUS_FILTER_OPTIONS = [
  { value: 'All Stores', label: 'Status: All Stores' },
  { value: 'Healthy Stock', label: 'Healthy Stock' },
  { value: 'Balanced', label: 'Healthy Stock (Balanced)' },
  { value: 'Excess Stock', label: 'Excess Stock' },
  { value: 'Low Stock', label: 'Low Stock / Shortage' },
  { value: 'Not Configured', label: 'Inventory Not Configured' }
];

export const StoreRadarFilters = ({
  // Product Selector Props
  products = [],
  selectedProduct = 'All Products',
  onProductChange,

  // Colour & Size Props
  availableColours = [],
  selectedColour = 'All Colours',
  onColourChange,
  availableSizes = [],
  sizeFilter = 'All Sizes',
  onSizeFilterChange,

  // Store Status & Region Props
  statusFilter = 'All Stores',
  onStatusFilterChange,
  regionFilter = 'All Regions',
  onRegionFilterChange,
  categoryFilter = 'All Categories',
  onCategoryFilterChange,

  // Routes Toggle & Reset Props
  showTransferRoutes = true,
  onToggleTransferRoutes,
  onResetFilters,
  onClearVariantFilters
}) => {
  const isVariantFiltered =
    (selectedColour && selectedColour !== 'All Colours') ||
    (sizeFilter && sizeFilter !== 'All Sizes');

  const isAnyFiltered =
    selectedProduct !== 'All Products' ||
    isVariantFiltered ||
    statusFilter !== 'All Stores' ||
    regionFilter !== 'All Regions' ||
    categoryFilter !== 'All Categories';

  return (
    <div className="radar-filters-toolbar font-tech" role="search" aria-label="Store network filters">
      <div className="radar-filters-left">
        <div className="radar-filters-title">
          <Filter size={13} style={{ color: '#ffffff' }} />
          <span>RADAR FILTERS:</span>
        </div>

        {/* 1. PRODUCT-TYPE SELECTOR (Requirement 1 & 7) */}
        <div className="radar-select-wrap product-select-wrap">
          <Shirt size={12} className="select-inner-icon text-dim" />
          <select
            value={selectedProduct}
            onChange={(e) => onProductChange?.(e.target.value)}
            className="radar-filter-select font-tech product-filter-select"
            aria-label="Select catalogue product to evaluate on map"
            id="map-product-selector"
          >
            <option value="All Products">Product: All Catalogue Products</option>
            {products.map((p) => (
              <option key={p.productName} value={p.productName}>
                {p.productName} ({p.totalUnits.toLocaleString()} units)
              </option>
            ))}
          </select>
        </div>

        {/* 2. COLOUR FILTER (Requirement 3) */}
        <div className="radar-select-wrap colour-select-wrap">
          <Palette size={12} className="select-inner-icon text-dim" />
          <select
            value={selectedColour}
            onChange={(e) => onColourChange?.(e.target.value)}
            className="radar-filter-select font-tech"
            aria-label="Filter stores by product colour"
            id="map-colour-selector"
          >
            <option value="All Colours">Colour: All Colours</option>
            {availableColours.map((c) => (
              <option key={c} value={c}>
                Colour: {c}
              </option>
            ))}
          </select>
        </div>

        {/* 3. SIZE FILTER (Requirement 3) */}
        <div className="radar-select-wrap size-select-wrap">
          <select
            value={sizeFilter}
            onChange={(e) => onSizeFilterChange?.(e.target.value)}
            className="radar-filter-select font-tech"
            aria-label="Filter stores by product size"
            id="map-size-selector"
          >
            <option value="All Sizes">Size: All Sizes</option>
            {availableSizes.map((sz) => (
              <option key={sz} value={sz}>
                Size: {sz}
              </option>
            ))}
          </select>
        </div>

        {/* 4. STOCK STATUS FILTER */}
        <div className="radar-select-wrap">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange?.(e.target.value)}
            className="radar-filter-select font-tech"
            aria-label="Filter stores by stock status"
            id="map-status-selector"
          >
            {STOCK_STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 5. REGION / CITY FILTER */}
        <div className="radar-select-wrap">
          <select
            value={regionFilter}
            onChange={(e) => onRegionFilterChange?.(e.target.value)}
            className="radar-filter-select font-tech"
            aria-label="Filter stores by geographical region"
            id="map-region-selector"
          >
            {REGIONS.map((reg) => (
              <option key={reg} value={reg}>
                {reg === 'All Regions' ? 'Region: All' : `Region: ${reg}`}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Clear Variant Filters (Colour & Size) returning to full product overview */}
        {isVariantFiltered && (
          <button
            onClick={onClearVariantFilters}
            className="radar-reset-btn variant-clear-btn font-tech"
            title="Clear Colour and Size filters and return to full product overview"
            aria-label="Clear variant colour and size filters"
            id="map-clear-variant-btn"
          >
            <RotateCcw size={11} />
            <span>Clear Variant</span>
          </button>
        )}

        {/* Reset All Filters Action */}
        {isAnyFiltered && (
          <button
            onClick={onResetFilters}
            className="radar-reset-btn font-tech"
            title="Reset all radar filters"
            aria-label="Reset all radar filters"
            id="map-reset-all-filters-btn"
          >
            <RotateCcw size={12} />
            <span>Reset All</span>
          </button>
        )}
      </div>

      {/* 6. Transfer Routes Toggle Switch */}
      <div className="radar-filters-right">
        <button
          onClick={onToggleTransferRoutes}
          className={`radar-toggle-routes-btn font-tech ${showTransferRoutes ? 'active' : ''}`}
          title="Toggle display of inter-store transfer routes on map"
          aria-pressed={showTransferRoutes}
          id="map-toggle-routes-btn"
        >
          <Route size={13} />
          <span>Transfer Routes</span>
          <span className={`route-switch-indicator ${showTransferRoutes ? 'on' : 'off'}`} />
        </button>
      </div>
    </div>
  );
};

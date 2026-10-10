import React from 'react';
import { Shirt, CheckCircle2, AlertTriangle, AlertOctagon, RotateCcw } from 'lucide-react';

export const SelectedProductOverviewBar = ({
  product,
  selectedColour = 'All Colours',
  selectedSize = 'All Sizes',
  onClearFilters
}) => {
  if (!product) return null;

  const isFiltered =
    (selectedColour && selectedColour !== 'All Colours') ||
    (selectedSize && selectedSize !== 'All Sizes');

  return (
    <div className="product-overview-strip font-tech" id="selected-product-overview-strip">
      <div className="product-overview-header">
        <div className="product-title-row">
          <span className="technical-index">[ PRODUCT CONTEXT ]</span>
          <div className="product-name-and-icon">
            <Shirt size={15} style={{ color: '#ffffff' }} />
            <h3 className="product-title font-display">{product.productName}</h3>
          </div>
          <span className="product-sku-badge font-tech">
            SKU: <strong>{product.skuPrefix || product.productId}</strong>
          </span>
          <span className="product-category-tag font-tech">
            CAT: {product.category || 'T-shirts'}
          </span>
        </div>

        <div className="product-stat-pill">
          <span className="stat-label text-dim">NETWORK AVAILABLE STOCK:</span>
          <span className="stat-value font-display" style={{ color: '#ffffff' }}>
            {product.totalUnits?.toLocaleString()} units
          </span>
        </div>
      </div>

      <div className="product-overview-metrics-grid">
        {/* Available Colours */}
        <div className="product-metric-item">
          <span className="metric-label text-dim">AVAILABLE COLOURS:</span>
          <div className="metric-tags">
            {product.colours.map((c) => (
              <span
                key={c}
                className={`variant-tag colour-tag ${selectedColour === c ? 'active-filter' : ''}`}
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Available Sizes */}
        <div className="product-metric-item">
          <span className="metric-label text-dim">AVAILABLE SIZES:</span>
          <div className="metric-tags">
            {product.sizes.map((s) => (
              <span
                key={s}
                className={`variant-tag size-tag ${selectedSize === s ? 'active-filter' : ''}`}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Low-Stock Sizes (<15) */}
        <div className="product-metric-item">
          <span className="metric-label text-dim">LOW-STOCK SIZES:</span>
          <div className="metric-tags">
            {product.lowStockSizes.length > 0 ? (
              product.lowStockSizes.map((s) => (
                <span key={s} className="variant-tag danger-tag">
                  <AlertTriangle size={10} />
                  <span>{s} (&lt;15)</span>
                </span>
              ))
            ) : (
              <span className="variant-tag success-tag">
                <CheckCircle2 size={10} />
                <span>None (Healthy)</span>
              </span>
            )}
          </div>
        </div>

        {/* Out-Of-Stock Sizes (0 units) */}
        <div className="product-metric-item">
          <span className="metric-label text-dim">OUT-OF-STOCK SIZES:</span>
          <div className="metric-tags">
            {product.outOfStockSizes.length > 0 ? (
              product.outOfStockSizes.map((s) => (
                <span key={s} className="variant-tag out-tag">
                  <AlertOctagon size={10} />
                  <span>{s} (0 units)</span>
                </span>
              ))
            ) : (
              <span className="variant-tag success-tag">
                <CheckCircle2 size={10} />
                <span>None</span>
              </span>
            )}
          </div>
        </div>

        {/* Excess-Stock Sizes (>75) */}
        <div className="product-metric-item">
          <span className="metric-label text-dim">EXCESS-STOCK SIZES:</span>
          <div className="metric-tags">
            {product.excessStockSizes.length > 0 ? (
              product.excessStockSizes.map((s) => (
                <span key={s} className="variant-tag warning-tag">
                  <span>{s} (&gt;75)</span>
                </span>
              ))
            ) : (
              <span className="variant-tag text-dim">None</span>
            )}
          </div>
        </div>
      </div>

      {/* Active Filter Notice Banner if Colour or Size Filter is narrowing view */}
      {isFiltered && (
        <div className="product-active-filters-notice">
          <span className="notice-text">
            Filtering by{' '}
            {selectedColour !== 'All Colours' && (
              <strong>Colour: {selectedColour} </strong>
            )}
            {selectedColour !== 'All Colours' && selectedSize !== 'All Sizes' && '• '}
            {selectedSize !== 'All Sizes' && (
              <strong>Size: {selectedSize}</strong>
            )}
            . Map and store panels display exact availability for this variant only.
          </span>
          <button
            onClick={onClearFilters}
            className="btn btn-secondary btn-xs font-tech"
            title="Return to full product overview"
          >
            <RotateCcw size={11} />
            <span>Clear Filters</span>
          </button>
        </div>
      )}
    </div>
  );
};

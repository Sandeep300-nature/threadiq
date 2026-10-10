import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { CATEGORIES, SIZES, COLOURS, STOCK_STATUSES } from '../../data/mockInventory';

export const InventoryFilters = ({
  filters,
  onChange,
  onReset,
  storeOptions = [],
  productOptions = [],
  categoryOptions = CATEGORIES,
  colourOptions = COLOURS
}) => {
  const isFiltered =
    filters.store !== 'All Stores' ||
    filters.product !== 'All Products' ||
    filters.size !== 'All Sizes' ||
    filters.category !== 'All Categories' ||
    filters.colour !== 'All Colours' ||
    filters.status !== 'All Statuses';

  const categoriesToDisplay = categoryOptions?.length ? categoryOptions : CATEGORIES;
  const coloursToDisplay = colourOptions?.length ? colourOptions : COLOURS;

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-sm)',
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px',
        justifyContent: 'space-between'
      }}
      id="inventory-filters-toolbar"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Filter size={14} style={{ color: 'var(--text-white)' }} />
        <span className="technical-index">FILTER PARAMETERS</span>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          flex: 1,
          alignItems: 'center'
        }}
      >
        {/* Store Filter */}
        <select
          value={filters.store}
          onChange={(e) => onChange('store', e.target.value)}
          className="search-input font-tech"
          style={{ width: 'auto', minWidth: '150px', height: '34px', fontSize: '0.78rem' }}
          aria-label="Filter by store"
          id="filter-store-select"
        >
          <option value="All Stores">Store: All Locations</option>
          {storeOptions.map((st) => (
            <option key={st.id || st.name} value={st.name}>
              {st.name} {st.isWarehouse || st.is_warehouse ? '(Warehouse)' : ''}
            </option>
          ))}
        </select>

        {/* Product Filter (if productOptions provided) */}
        {productOptions?.length > 0 && (
          <select
            value={filters.product || 'All Products'}
            onChange={(e) => onChange('product', e.target.value)}
            className="search-input font-tech"
            style={{ width: 'auto', minWidth: '160px', height: '34px', fontSize: '0.78rem' }}
            aria-label="Filter by product"
            id="filter-product-select"
          >
            <option value="All Products">Product: All Lines</option>
            {productOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}

        {/* Category Filter */}
        <select
          value={filters.category}
          onChange={(e) => onChange('category', e.target.value)}
          className="search-input font-tech"
          style={{ width: 'auto', minWidth: '140px', height: '34px', fontSize: '0.78rem' }}
          aria-label="Filter by apparel category"
          id="filter-category-select"
        >
          {categoriesToDisplay.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'All Categories' ? 'Category: All' : cat}
            </option>
          ))}
        </select>

        {/* Colour Filter */}
        <select
          value={filters.colour || 'All Colours'}
          onChange={(e) => onChange('colour', e.target.value)}
          className="search-input font-tech"
          style={{ width: 'auto', minWidth: '130px', height: '34px', fontSize: '0.78rem' }}
          aria-label="Filter by colour"
          id="filter-colour-select"
        >
          {coloursToDisplay.map((col) => (
            <option key={col} value={col}>
              {col === 'All Colours' ? 'Colour: All' : col}
            </option>
          ))}
        </select>

        {/* Size Filter */}
        <select
          value={filters.size}
          onChange={(e) => onChange('size', e.target.value)}
          className="search-input font-tech"
          style={{ width: 'auto', minWidth: '110px', height: '34px', fontSize: '0.78rem' }}
          aria-label="Filter by clothing size"
          id="filter-size-select"
        >
          {SIZES.map((sz) => (
            <option key={sz} value={sz}>
              {sz === 'All Sizes' ? 'Size: All' : `Size: ${sz}`}
            </option>
          ))}
        </select>

        {/* Stock Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => onChange('status', e.target.value)}
          className="search-input font-tech"
          style={{ width: 'auto', minWidth: '130px', height: '34px', fontSize: '0.78rem' }}
          aria-label="Filter by stock status"
          id="filter-status-select"
        >
          {STOCK_STATUSES.map((st) => (
            <option key={st} value={st}>
              {st === 'All Statuses' ? 'Status: All' : `Status: ${st}`}
            </option>
          ))}
        </select>

        {/* Reset button */}
        {isFiltered && (
          <button
            onClick={onReset}
            className="btn btn-secondary btn-sm"
            style={{ height: '34px', padding: '0 10px' }}
            title="Reset filters to default"
            id="filter-reset-btn"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
};

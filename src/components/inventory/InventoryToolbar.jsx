import React from 'react';
import { Search, X, RotateCcw, ArrowUpDown } from 'lucide-react';
import { CATEGORIES, SIZES, COLOURS } from '../../data/mockInventory';

export const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Product Name: A–Z' },
  { value: 'qty-asc', label: 'Stock: Lowest first' },
  { value: 'qty-desc', label: 'Stock: Highest first' },
  { value: 'ageing-desc', label: 'Ageing: Oldest first' },
  { value: 'ageing-asc', label: 'Ageing: Newest first' },
  { value: 'size', label: 'Size (M → 5XL)' },
  { value: 'status', label: 'Stock Status' }
];

export const STATUS_FILTER_OPTIONS = [
  { value: 'All Statuses', label: 'All' },
  { value: 'Balanced', label: 'Balanced' },
  { value: 'Excess', label: 'Excess' },
  { value: 'Low', label: 'Low' }
];

export const APPROVAL_FILTER_OPTIONS = [
  { value: 'All', label: 'Approval: All' },
  { value: 'Pending', label: 'Approval: Pending' },
  { value: 'Approved', label: 'Approval: Approved' },
  { value: 'Rejected', label: 'Approval: Rejected' }
];

export const InventoryToolbar = ({
  searchQuery,
  onSearchChange,
  filters,
  onFilterChange,
  sortBy,
  onSortChange,
  onReset,
  storeOptions = [],
  productOptions = [],
  categoryOptions = CATEGORIES,
  colourOptions = COLOURS
}) => {
  const isFiltered =
    Boolean(searchQuery) ||
    filters.store !== 'All Stores' ||
    (filters.product && filters.product !== 'All Products') ||
    (filters.colour && filters.colour !== 'All Colours') ||
    filters.size !== 'All Sizes' ||
    filters.category !== 'All Categories' ||
    filters.status !== 'All Statuses' ||
    (filters.approvalStatus && filters.approvalStatus !== 'All') ||
    sortBy !== 'name-asc';

  const categoriesList = categoryOptions?.length ? categoryOptions : CATEGORIES;
  const coloursList = colourOptions?.length ? colourOptions : COLOURS;

  return (
    <div className="inventory-toolbar-wrapper">
      {/* 1. Primary Filter Controls Row */}
      <div className="inventory-toolbar-row">
        {/* Search Input */}
        <div className="inventory-search-box">
          <Search size={14} className="inventory-search-icon" />
          <input
            type="text"
            placeholder="Search by name, SKU (e.g. S105-BEI-M)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="inventory-search-input font-tech"
            aria-label="Search products by name or SKU identifier"
            id="inventory-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="inventory-search-clear"
              aria-label="Clear search query"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="inventory-filters-group">
          {/* Store Filter */}
          <div className="toolbar-select-wrap">
            <select
              value={filters.store}
              onChange={(e) => onFilterChange('store', e.target.value)}
              className="toolbar-select font-tech"
              aria-label="Filter by store"
              id="toolbar-store-select"
            >
              <option value="All Stores">Store: All Locations</option>
              {storeOptions.map((st) => (
                <option key={st.id || st.name} value={st.name}>
                  {st.name} {st.isWarehouse || st.is_warehouse ? '(Warehouse)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Product Filter (if productOptions available) */}
          {productOptions?.length > 0 && (
            <div className="toolbar-select-wrap">
              <select
                value={filters.product || 'All Products'}
                onChange={(e) => onFilterChange('product', e.target.value)}
                className="toolbar-select font-tech"
                aria-label="Filter by product"
                id="toolbar-product-select"
              >
                <option value="All Products">Product: All Lines</option>
                {productOptions.map((prod) => (
                  <option key={prod} value={prod}>
                    {prod}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category Filter */}
          <div className="toolbar-select-wrap">
            <select
              value={filters.category}
              onChange={(e) => onFilterChange('category', e.target.value)}
              className="toolbar-select font-tech"
              aria-label="Filter by category"
              id="toolbar-category-select"
            >
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All Categories' ? 'Category: All' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Colour Filter */}
          <div className="toolbar-select-wrap">
            <select
              value={filters.colour || 'All Colours'}
              onChange={(e) => onFilterChange('colour', e.target.value)}
              className="toolbar-select font-tech"
              aria-label="Filter by colour"
              id="toolbar-colour-select"
            >
              {coloursList.map((col) => (
                <option key={col} value={col}>
                  {col === 'All Colours' ? 'Colour: All' : col}
                </option>
              ))}
            </select>
          </div>

          {/* Size Filter */}
          <div className="toolbar-select-wrap">
            <select
              value={filters.size}
              onChange={(e) => onFilterChange('size', e.target.value)}
              className="toolbar-select font-tech"
              aria-label="Filter by size"
              id="toolbar-size-select"
            >
              {SIZES.map((sz) => (
                <option key={sz} value={sz}>
                  {sz === 'All Sizes' ? 'Size: All' : `Size: ${sz}`}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div className="toolbar-select-wrap">
            <select
              value={filters.status}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className="toolbar-select font-tech"
              aria-label="Filter by stock status"
              id="toolbar-status-select"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value === 'All Statuses' ? 'Stock: All' : `Stock: ${opt.label}`}
                </option>
              ))}
            </select>
          </div>

          {/* Approval Status Filter */}
          <div className="toolbar-select-wrap">
            <select
              value={filters.approvalStatus || 'All'}
              onChange={(e) => onFilterChange('approvalStatus', e.target.value)}
              className="toolbar-select font-tech"
              aria-label="Filter by approval status"
              id="toolbar-approval-select"
            >
              {APPROVAL_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Selector */}
          <div className="toolbar-select-wrap sort-select-wrap">
            <div className="sort-icon-tag font-tech">
              <ArrowUpDown size={12} />
              <span>Sort:</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="toolbar-select font-tech"
              aria-label="Sort products by"
              id="toolbar-sort-select"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              onClick={onReset}
              className="toolbar-reset-btn font-tech"
              title="Reset all active filters"
              aria-label="Reset all active filters"
              id="toolbar-reset-btn"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

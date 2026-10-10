import React from 'react';
import { Search, X, RotateCcw, ArrowUpDown } from 'lucide-react';
import { CATEGORIES, SIZES } from '../../data/mockInventory';

export const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Product Name: A–Z' },
  { value: 'qty-asc', label: 'Stock: Lowest first' },
  { value: 'qty-desc', label: 'Stock: Highest first' },
  { value: 'size', label: 'Size (XL → 5XL)' },
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
  storeOptions = []
}) => {
  const isFiltered =
    Boolean(searchQuery) ||
    filters.store !== 'All Stores' ||
    filters.size !== 'All Sizes' ||
    filters.category !== 'All Categories' ||
    filters.status !== 'All Statuses' ||
    (filters.approvalStatus && filters.approvalStatus !== 'All') ||
    sortBy !== 'name-asc';

  return (
    <div className="inventory-toolbar-wrapper">
      {/* 1. Primary Filter Controls Row */}
      <div className="inventory-toolbar-row">
        {/* Search Input */}
        <div className="inventory-search-box">
          <Search size={14} className="inventory-search-icon" />
          <input
            type="text"
            placeholder="Search by name, SKU (e.g. VWT-4XL)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="inventory-search-input font-tech"
            aria-label="Search products by name or SKU identifier"
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
            >
              <option value="All Stores">Store: All</option>
              {storeOptions.map((st) => (
                <option key={st.id || st.name} value={st.name}>
                  {st.name}
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
            >
              {SIZES.map((sz) => (
                <option key={sz} value={sz}>
                  {sz === 'All Sizes' ? 'Size: All' : `Size: ${sz}`}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="toolbar-select-wrap">
            <select
              value={filters.category}
              onChange={(e) => onFilterChange('category', e.target.value)}
              className="toolbar-select font-tech"
              aria-label="Filter by category"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All Categories' ? 'Category: All' : cat}
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
              title="Reset all search filters and sorting"
              aria-label="Reset all filters"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Secondary Info & Legend Bar */}
      <div className="inventory-legend-bar">
        <div className="inventory-legend-items font-tech">
          <span className="legend-title text-dim">STOCK STATUS INDICATORS:</span>
          
          <div className="legend-item" title="Healthy stock within configured 15–75 units range">
            <span className="legend-circle legend-circle-green font-tech">54</span>
            <span className="legend-text">
              <strong style={{ color: '#10b981' }}>Green:</strong> Balanced Stock (15–75)
            </span>
          </div>

          <div className="legend-item" title="Excess inventory exceeding 75 units threshold">
            <span className="legend-circle legend-circle-yellow font-tech">120</span>
            <span className="legend-text">
              <strong style={{ color: '#eab308' }}>Yellow:</strong> Excess Stock (&gt;75)
            </span>
          </div>

          <div className="legend-item" title="Low stock warning below 15 units threshold">
            <span className="legend-circle legend-circle-red font-tech">5</span>
            <span className="legend-text">
              <strong style={{ color: '#f43f5e' }}>Red:</strong> Low Stock (&lt;15)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

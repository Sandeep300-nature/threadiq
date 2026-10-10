import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { CATEGORIES, SIZES, STOCK_STATUSES } from '../../data/mockInventory';

export const InventoryFilters = ({
  filters,
  onChange,
  onReset,
  storeOptions = []
}) => {
  const isFiltered =
    filters.store !== 'All Stores' ||
    filters.size !== 'All Sizes' ||
    filters.category !== 'All Categories' ||
    filters.status !== 'All Statuses';

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
        >
          <option value="All Stores">Store: All Locations</option>
          {storeOptions.map((st) => (
            <option key={st.id} value={st.name}>
              {st.name}
            </option>
          ))}
        </select>

        {/* Size Filter */}
        <select
          value={filters.size}
          onChange={(e) => onChange('size', e.target.value)}
          className="search-input font-tech"
          style={{ width: 'auto', minWidth: '120px', height: '34px', fontSize: '0.78rem' }}
          aria-label="Filter by clothing size"
        >
          {SIZES.map((sz) => (
            <option key={sz} value={sz}>
              Size: {sz}
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={filters.category}
          onChange={(e) => onChange('category', e.target.value)}
          className="search-input font-tech"
          style={{ width: 'auto', minWidth: '150px', height: '34px', fontSize: '0.78rem' }}
          aria-label="Filter by apparel category"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Stock Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => onChange('status', e.target.value)}
          className="search-input font-tech"
          style={{ width: 'auto', minWidth: '140px', height: '34px', fontSize: '0.78rem' }}
          aria-label="Filter by stock status"
        >
          {STOCK_STATUSES.map((st) => (
            <option key={st} value={st}>
              Status: {st}
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
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
};

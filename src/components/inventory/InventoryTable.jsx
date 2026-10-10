import React from 'react';
import { StatusBadge } from '../common/StatusBadge';
import { ProductImage } from './ProductImage';
import { ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const InventoryTable = ({ items = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Product & SKU</th>
            <th>Colour</th>
            <th>Size</th>
            <th>Location</th>
            <th>Stock On-Hand</th>
            <th>Status</th>
            <th>Run Rate</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isLow = item.stockStatus.toLowerCase().includes('low');
            const isExcess = item.stockStatus.toLowerCase().includes('excess');

            return (
              <tr key={item.id}>
                {/* Product & SKU */}
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ProductImage colour={item.hexColour} size={36} label={item.name} />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-white)', fontSize: '0.85rem' }}>
                        {item.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                        <span className="font-tech" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          {item.skuCode}
                        </span>
                        <span className="font-tech" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          • ${item.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Colour */}
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '1px',
                        backgroundColor: item.hexColour,
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }}
                    />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-silver)' }}>
                      {item.colour}
                    </span>
                  </div>
                </td>

                {/* Size */}
                <td>
                  <span
                    className="font-tech"
                    style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-xs)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: 'var(--text-white)'
                    }}
                  >
                    {item.size}
                  </span>
                </td>

                {/* Store Location */}
                <td>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-silver)' }}>
                    {item.storeName}
                  </span>
                </td>

                {/* Available Qty */}
                <td>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span
                      className="font-tech"
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: isLow ? 'var(--color-shortage)' : isExcess ? 'var(--color-surplus)' : 'var(--text-white)'
                      }}
                    >
                      {item.availableQty}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      units
                    </span>
                  </div>
                </td>

                {/* Stock Status */}
                <td>
                  <StatusBadge status={item.stockStatus} />
                </td>

                {/* Run Rate */}
                <td>
                  <span className="font-tech" style={{ fontSize: '0.78rem', color: 'var(--text-silver)' }}>
                    {item.salesVelocityPerDay} /day
                  </span>
                </td>

                {/* Action button */}
                <td>
                  {isLow || isExcess ? (
                    <button
                      onClick={() => navigate('/inventory?approvalStatus=Pending')}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '3px 8px' }}
                      title="Inspect pending requests for this item"
                    >
                      <span>Proposals</span>
                      <ArrowUpRight size={12} />
                    </button>
                  ) : (
                    <span className="font-tech" style={{ fontSize: '0.7rem', color: 'var(--text-disabled)' }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

import React from 'react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { ProductImage } from '../inventory/ProductImage';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Info, AlertTriangle } from 'lucide-react';

export const StoreDetailModal = ({ store, isOpen, onClose, storeInventory = [] }) => {
  const navigate = useNavigate();
  if (!store) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={store.name}
      subtitle={`${store.address} • ${store.code}`}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Info size={13} />
            <span>Prototype preview • Simulated live connection</span>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            <span>Close Inspector</span>
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Banner if store has 4XL shortage/excess */}
        {store.code === 'NY-FLAG-01' && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                <strong>4XL Stockout Warning:</strong> Only 3 units remain in stock. AI recommends pulling 45 units from Westside Fashion Hub.
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                navigate('/inventory?approvalStatus=Pending');
              }}
              className="btn btn-primary btn-sm"
              style={{ flexShrink: 0 }}
            >
              <span>Review Transfer</span>
            </button>
          </div>
        )}

        {store.code === 'LA-WEST-02' && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Info size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                <strong>Excess Stock Available:</strong> 168 units of 4XL T-Shirts available to rebalance Eastern network shortage.
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                navigate('/inventory?approvalStatus=Pending');
              }}
              className="btn btn-primary btn-sm"
              style={{ flexShrink: 0 }}
            >
              <span>See Recommendation</span>
            </button>
          </div>
        )}

        {/* Store Inventory Items */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
            Store Inventory Breakdown ({storeInventory.length} items)
          </h4>

          <div
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: '#15161e'
            }}
          >
            {storeInventory.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No specific inventory logged for this branch.
              </div>
            ) : (
              <table className="data-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Size</th>
                    <th>Qty</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {storeInventory.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ProductImage colour={item.hexColour} size={32} label={item.name} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.colour}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{item.size}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{item.availableQty}</span>
                      </td>
                      <td>
                        <StatusBadge status={item.stockStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

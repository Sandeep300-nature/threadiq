import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Truck,
  Clock
} from 'lucide-react';
import { AiStockIntelligence } from '../components/intelligence/AiStockIntelligence';
import { backendInventoryProvider } from '../../employee-dashboard/integration/backendInventoryProvider.js';

export const Overview = () => {
  const { recommendations } = useApp();
  const [inventory, setInventory] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [inv, st] = await Promise.all([
          api.fetchInventory(),
          api.fetchStores()
        ]);
        setInventory(inv);
        setStores(st);
      } catch (err) {
        console.error('Failed to load overview data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const unsubscribe = backendInventoryProvider.subscribeToUpdates(() => {
      fetchData();
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingState message="Initializing store network telemetry..." />;
  }

  const lowStockCount = (inventory || []).filter(i => (i.stockStatus || '').toLowerCase().includes('low')).length;
  const overstockCount = (inventory || []).filter(i => (i.stockStatus || '').toLowerCase().includes('excess')).length;
  const pendingRecs = (recommendations || []).filter(r => r.status === 'pending');
  const totalUnits = (inventory || []).reduce((acc, curr) => acc + (curr.availableQty ?? curr.quantityAvailable ?? curr.quantity ?? 0), 0) + 12850;

  return (
    <div>
      {/* Header with Technical Metadata */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className="technical-index">[ OPS // TELEMETRY ]</span>
            <span className="demo-tag">Synthetic Dataset</span>
          </div>
          <h1 className="page-title">
            Network Stock Diagnostic
          </h1>
          <p className="page-subtitle">
            Multi-node inventory balance, critical extended-size bottlenecks, and inter-store rebalance authorizations.
          </p>
        </div>

        <div className="header-actions">
          <button onClick={() => navigate('/inventory?approvalStatus=Pending')} className="btn btn-primary font-tech">
            <span>Pending Approvals ({pendingRecs.length})</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* High-Density Network Telemetry Strip (Replaces Generic 4-Card Grid) */}
      <div
        className="scroll-reveal"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1px',
          backgroundColor: 'var(--border-hairline)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '28px',
          overflow: 'hidden'
        }}
      >
        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '16px 20px' }}>
          <div className="technical-index">NETWORK VOLUME</div>
          <div className="font-tech" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-white)', marginTop: '4px' }}>
            {totalUnits.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Units across 4 retail locations
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '16px 20px' }}>
          <div className="technical-index" style={{ color: 'var(--color-shortage)' }}>CRITICAL SHORTAGES</div>
          <div className="font-tech" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-shortage)', marginTop: '4px' }}>
            {lowStockCount} SKUs
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Below 15-unit safety stock target
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '16px 20px' }}>
          <div className="technical-index" style={{ color: 'var(--color-surplus)' }}>SURPLUS HOLDINGS</div>
          <div className="font-tech" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-surplus)', marginTop: '4px' }}>
            {overstockCount} SKUs
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Exceeding 60-day turnover buffer
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '16px 20px' }}>
          <div className="technical-index" style={{ color: 'var(--text-white)' }}>PENDING DISPATCHES</div>
          <div className="font-tech" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-white)', marginTop: '4px' }}>
            {pendingRecs.length} Proposals
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Awaiting planner sign-off
          </div>
        </div>
      </div>

      {/* PRIMARY FOCAL CANVAS: Critical 4XL T-Shirt Imbalance Terminal */}
      <div
        className="card scroll-reveal scroll-reveal-delay-1"
        style={{
          border: '1px solid var(--border-hairline)',
          borderLeft: '3px solid var(--color-shortage)',
          marginBottom: '28px',
          padding: '24px 28px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="badge badge-low-stock">CRITICAL OPERATIONAL BOTTLENECK</span>
            <span className="technical-index">SKU: VWT-4XL-BLK</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            <Clock size={13} />
            <span>Predicted Stockout: ~10 Operating Hours</span>
          </div>
        </div>

        <h2 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-white)', marginBottom: '8px' }}>
          Vintage Washed Heavyweight Tee — Extended Size 4XL Imbalance
        </h2>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-silver)', lineHeight: 1.55, maxWidth: '820px', marginBottom: '22px' }}>
          Significant stock asymmetry identified in extended fit sizing. <strong>Brigade Road Flagship (BLR)</strong> faces immediate depletion due to sustained velocity, while <strong>Heritage Mall Hub (MYS)</strong> holds an unabsorbed surplus. Intra-state expressway dispatch via NH 275 resolves the supply deficit in under 3 hours without manufacturer reorder lead-time.
        </p>

        {/* Side-by-Side Node Telemetry Comparison */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            padding: '18px'
          }}
        >
          {/* Destination Node: Brigade Road Flagship */}
          <div style={{ borderRight: '1px solid var(--border-hairline-subtle)', paddingRight: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="technical-index" style={{ color: 'var(--color-shortage)' }}>DESTINATION // SHORTAGE NODE</span>
              <span className="font-tech" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>BLR-FLAG-01</span>
            </div>
            <div className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-white)', marginTop: '4px' }}>
              Brigade Road Flagship (Bengaluru, KA)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>On-Hand Stock</span>
                <div className="font-tech" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-shortage)' }}>
                  3 Units
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Sell-Through Rate</span>
                <div className="font-tech" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-white)' }}>
                  7.2 / day
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-silver)', marginTop: '8px' }}>
              Safety buffer exhausted • Stockout predicted at 2:00 PM tomorrow
            </div>
          </div>

          {/* Transfer Dispatch Vector */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '10px 16px' }}>
            <span className="technical-index" style={{ color: 'var(--text-white)' }}>RECOMMENDED DISPATCH</span>
            <div className="font-tech" style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-white)', margin: '4px 0' }}>
              45 Units
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-silver)' }}>
              Size 4XL • Jet Black
            </span>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '10px',
                padding: '3px 8px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 'var(--radius-xs)',
                fontSize: '0.7rem',
                fontFamily: 'var(--font-tech)',
                color: 'var(--text-dim)'
              }}
            >
              <Truck size={12} />
              <span>NH 275 Expressway (~143 km, ~2h ETA)</span>
            </div>
          </div>

          {/* Source Node: Heritage Mall Hub */}
          <div style={{ borderLeft: '1px solid var(--border-hairline-subtle)', paddingLeft: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="technical-index" style={{ color: 'var(--color-surplus)' }}>SOURCE // SURPLUS NODE</span>
              <span className="font-tech" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>MYS-HERI-02</span>
            </div>
            <div className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-white)', marginTop: '4px' }}>
              Heritage Mall Hub (Mysuru, KA)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>On-Hand Stock</span>
                <div className="font-tech" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-surplus)' }}>
                  168 Units
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Sell-Through Rate</span>
                <div className="font-tech" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-white)' }}>
                  2.1 / day
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-silver)', marginTop: '8px' }}>
              80.0 days forward cover • 108 units available above buffer
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--border-hairline)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Preserves estimated <strong style={{ color: 'var(--color-balanced)' }}>+$1,980</strong> in gross margin without cannibalizing source store run-rate.
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => navigate('/stores')} className="btn btn-secondary btn-sm">
              <span>Inspect Network Map</span>
            </button>
            <button onClick={() => navigate('/inventory?approvalStatus=Pending')} className="btn btn-primary btn-sm font-tech">
              <span>Review in Inventory</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* GROQ AI STOCK INTELLIGENCE & REBALANCE RADAR */}
      <AiStockIntelligence />

      {/* Two-Column Section: Dispatch Ledger & Store Network Capacity Breakdown */}
      <div className="scroll-reveal scroll-reveal-delay-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px' }}>
        {/* Column 1: Active Dispatch Queue Ledger */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="technical-index">[ ACTION // QUEUE ]</div>
              <h3 className="card-title" style={{ marginTop: '2px' }}>
                Active Proposal Queue
              </h3>
            </div>
            <button
              onClick={() => navigate('/inventory?approvalStatus=Pending')}
              style={{ fontSize: '0.75rem', fontFamily: 'var(--font-tech)', color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>VIEW IN INVENTORY ({recommendations.length})</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recommendations.slice(0, 4).map((rec, i) => (
              <div
                key={rec.id}
                style={{
                  padding: '12px 0',
                  borderBottom: i < 3 ? '1px solid var(--border-hairline-subtle)' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="technical-index">{rec.action}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-white)' }}>
                      {rec.productName}
                    </span>
                    <span className="font-tech" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      [{rec.size}]
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '3px' }}>
                    {rec.sourceStore} ➔ {rec.destStore || 'In-Store'} • <strong style={{ color: 'var(--text-white)' }}>{rec.proposedQty} units</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <StatusBadge status={rec.status} />
                  <button
                    onClick={() => navigate('/inventory?approvalStatus=Pending')}
                    className="btn btn-secondary btn-sm font-tech"
                    style={{ padding: '3px 8px' }}
                  >
                    Inspect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Regional Store Hub Balance Status */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="technical-index">[ NODES // HEALTH ]</div>
              <h3 className="card-title" style={{ marginTop: '2px' }}>
                Store Hub Capacity Balance
              </h3>
            </div>
            <button
              onClick={() => navigate('/stores')}
              style={{ fontSize: '0.75rem', fontFamily: 'var(--font-tech)', color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>MANAGE STORES</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(stores || []).map((store) => {
              const shortageSizes = Array.isArray(store.shortageSizes) ? store.shortageSizes : [];
              const excessSizes = Array.isArray(store.excessSizes) ? store.excessSizes : [];
              const capacityPct = store.capacityUsagePct ?? Math.min(95, Math.max(50, Math.round(((store.totalUnits || 500) / 800) * 100)));
              const totalUnits = store.totalUnits || 0;
              const transferPairs = store.transferOpportunitiesCount ?? (shortageSizes.length > 0 ? shortageSizes.length + 1 : 1);

              return (
                <div
                  key={store.id || store.storeId}
                  style={{
                    padding: '12px 14px',
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-white)' }}>
                        {store.name || store.storeName}
                      </span>
                      <span className="font-tech" style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: '8px' }}>
                        {store.city}, {store.state || 'KA'}
                      </span>
                    </div>

                    <div className="font-tech" style={{ fontSize: '0.78rem', color: 'var(--text-silver)' }}>
                      <strong>{totalUnits.toLocaleString()}</strong> units / {capacityPct}% cap
                    </div>
                  </div>

                  {/* Minimalist Capacity Gauge */}
                  <div
                    style={{
                      height: '4px',
                      width: '100%',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                      marginBottom: '8px'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${capacityPct}%`,
                        backgroundColor: capacityPct > 90 ? 'var(--color-surplus)' : '#ffffff'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {shortageSizes.length > 0 && (
                        <span style={{ color: 'var(--color-shortage)' }}>
                          Shortage: <strong>{shortageSizes.join(', ')}</strong>
                        </span>
                      )}
                      {excessSizes.length > 0 && (
                        <span style={{ color: 'var(--color-surplus)' }}>
                          Surplus: <strong>{excessSizes.join(', ')}</strong>
                        </span>
                      )}
                    </div>

                    <span style={{ color: 'var(--text-dim)' }}>
                      {transferPairs} Transfer Pairs
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

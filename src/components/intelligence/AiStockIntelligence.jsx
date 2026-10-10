import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  TrendingDown,
  Store,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Info,
  ArrowRight,
  ShieldAlert,
  Zap,
  Layers,
  Calendar,
  ArrowRightLeft,
  PackagePlus,
  Truck
} from 'lucide-react';
import {
  analyzeStockIntelligence,
  requestGroqStockInsights,
  checkGroqStatus,
  DEFAULT_PREDICTION_HORIZON_DAYS
} from '../../services/stockAnalysisService.js';
import { DEMAND_EVENTS } from '../../data/demandEvents.js';
import { api } from '../../services/api.js';
import { backendInventoryProvider } from '../../../employee-dashboard/integration/backendInventoryProvider.js';
import { mockInventoryProvider } from '../../../employee-dashboard/integration/mockInventoryProvider.js';

export const AiStockIntelligence = () => {
  const navigate = useNavigate();

  // State management
  const [records, setRecords] = useState([]);
  const [stores, setStores] = useState([]);
  const [horizonDays, setHorizonDays] = useState(DEFAULT_PREDICTION_HORIZON_DAYS);
  const [activeEvents, setActiveEvents] = useState([...DEMAND_EVENTS]);
  const [showCalendarPanel, setShowCalendarPanel] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [aiModel, setAiModel] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [groqOnline, setGroqOnline] = useState(false);
  const [lastGeneratedTime, setLastGeneratedTime] = useState(null);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'LOW' | 'STOCKOUT' | 'CRITICAL' | 'HEALTHY'
  const [showSimPanel, setShowSimPanel] = useState(false);
  const [activeTestNotification, setActiveTestNotification] = useState(null);

  // Custom simulation inputs
  const [simStore, setSimStore] = useState('BLR-FLAG-01');
  const [simProduct, setSimProduct] = useState('TSHIRT-4XL-BLK');
  const [simSize, setSimSize] = useState('4XL');
  const [simQty, setSimQty] = useState(12);
  const [simVelocity, setSimVelocity] = useState(8);
  const [simThreshold, setSimThreshold] = useState(15);

  // Load inventory from authoritative backend provider
  const loadInventory = useCallback(async () => {
    try {
      const items = await backendInventoryProvider.fetchInventory();
      if (items && items.length > 0) {
        setRecords(items);
      } else {
        const fallback = await mockInventoryProvider.fetchInventory();
        setRecords(fallback);
      }
    } catch (err) {
      console.warn('Backend inventory fetch warning, using fallback:', err);
      const fallback = await mockInventoryProvider.fetchInventory();
      setRecords(fallback);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Check Groq status and load initial data & store network
  useEffect(() => {
    checkGroqStatus().then(status => {
      setGroqOnline(Boolean(status?.configured));
    });
    api.fetchStores().then(st => {
      if (st) setStores(st);
    });
    loadInventory();

    const unsubscribeBackend = backendInventoryProvider.subscribeToUpdates(() => {
      loadInventory();
      setAiInsights(null); // Clear previous insights to refresh with latest data
    });
    const unsubscribeMock = mockInventoryProvider.subscribeToUpdates(() => {
      loadInventory();
      setAiInsights(null);
    });
    return () => {
      unsubscribeBackend();
      unsubscribeMock();
    };
  }, [loadInventory]);

  // Compute deterministic stock intelligence whenever records, horizon, events, or stores change
  const analysisResult = useMemo(() => {
    if (!records || records.length === 0) return null;
    return analyzeStockIntelligence(records, {
      predictionHorizonDays: horizonDays,
      events: activeEvents,
      storesList: stores
    });
  }, [records, horizonDays, activeEvents, stores]);

  // Toggle demand event active state
  const handleToggleEvent = (eventId) => {
    setActiveEvents(prev => {
      const exists = prev.some(e => e.id === eventId);
      if (exists) {
        return prev.filter(e => e.id !== eventId);
      } else {
        const found = DEMAND_EVENTS.find(e => e.id === eventId);
        return found ? [...prev, found] : prev;
      }
    });
  };

  // Generate Groq AI Narrative Insights using current pre-calculated analysis
  const triggerAiInsights = useCallback(async (analysis) => {
    if (!analysis) return;
    setLoadingAi(true);
    setAiError(null);

    try {
      const res = await requestGroqStockInsights(analysis, activeEvents);
      if (res.success && res.insights) {
        setAiInsights(res.insights);
        setAiModel(res.model || 'Groq LPU');
        setLastGeneratedTime(new Date().toLocaleTimeString());
        setGroqOnline(true);
      } else {
        setAiError(res.error || 'Groq AI analysis could not be generated.');
        if (res.keyConfigured === false) {
          setGroqOnline(false);
        }
      }
    } catch (err) {
      setAiError(err.message || 'Network exception while connecting to Groq server.');
    } finally {
      setLoadingAi(false);
    }
  }, [activeEvents]);

  // Initial AI insights run once analysis is first computed
  useEffect(() => {
    if (analysisResult && !aiInsights && !aiError && !loadingAi) {
      triggerAiInsights(analysisResult);
    }
  }, [analysisResult, aiInsights, aiError, loadingAi, triggerAiInsights]);

  // Deterministic 1-Click Scenario Handlers
  const handleApplyScenario = async (scenarioKey, label) => {
    try {
      setLoadingData(true);
      await backendInventoryProvider.applyScenario(scenarioKey);
      const updated = await backendInventoryProvider.fetchInventory();
      setRecords(updated);

      const freshAnalysis = analyzeStockIntelligence(updated, { predictionHorizonDays: horizonDays, storesList: stores });
      setActiveTestNotification(`Persisted ${label} to central SQLite database — Recomputed telemetry.`);
      await triggerAiInsights(freshAnalysis);
    } catch (err) {
      console.error('Scenario execution error:', err);
    } finally {
      setLoadingData(false);
      setTimeout(() => setActiveTestNotification(null), 6000);
    }
  };

  // Custom simulation submission
  const handleCustomSimulationSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoadingData(true);
      await backendInventoryProvider.updateInventoryItem({
        storeId: simStore,
        productId: simProduct,
        sku: simProduct,
        size: simSize,
        quantityAvailable: Number(simQty),
        dailySalesVelocity: simVelocity !== '' ? Number(simVelocity) : null,
        minimumStockThreshold: simThreshold !== '' ? Number(simThreshold) : null
      });

      const updated = await backendInventoryProvider.fetchInventory();
      setRecords(updated);
      const freshAnalysis = analyzeStockIntelligence(updated, { predictionHorizonDays: horizonDays, storesList: stores });
      setActiveTestNotification(`Committed physical count of ${simQty} units for ${simStore} (${simSize}) to central DB.`);
      await triggerAiInsights(freshAnalysis);
    } catch (err) {
      console.error('Custom update error:', err);
    } finally {
      setLoadingData(false);
      setTimeout(() => setActiveTestNotification(null), 6000);
    }
  };

  // Reset to default sample records
  const handleResetSampleData = async () => {
    setLoadingData(true);
    try {
      await fetch('/api/inventory/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: 'STORE_KA_BLR_01',
          sku: 'TSHIRT-4XL-BLK',
          size: '4XL',
          quantity: 25,
          employeeId: 'MGR001',
          remarks: 'Reset to Section 7 baseline count: 25 units'
        })
      });
    } catch {}
    mockInventoryProvider.resetToSampleData();
    const updated = await backendInventoryProvider.fetchInventory();
    setRecords(updated);
    const freshAnalysis = analyzeStockIntelligence(updated, { predictionHorizonDays: horizonDays, storesList: stores });
    setActiveTestNotification('Reset stock dataset to baseline records (25 units in Bengaluru).');
    await triggerAiInsights(freshAnalysis);
    setLoadingData(false);
    setTimeout(() => setActiveTestNotification(null), 4000);
  };

  // Filtered items for display table
  const displayedItems = useMemo(() => {
    if (!analysisResult) return [];
    switch (filterMode) {
      case 'LOW':
        return analysisResult.currentLowStockItems;
      case 'STOCKOUT':
        return analysisResult.predictedStockoutItems;
      case 'CRITICAL':
        return analysisResult.criticalItems;
      case 'HEALTHY':
        return analysisResult.items.filter(i => !i.isCurrentLowStock && !i.isPredictedStockout && !i.isApproachingSafetyLimit);
      case 'ALL':
      default:
        return analysisResult.items;
    }
  }, [analysisResult, filterMode]);

  if (loadingData && !analysisResult) {
    return (
      <div className="card" style={{ padding: '30px', textAlign: 'center', marginBottom: '28px' }}>
        <RefreshCw size={24} className="spin" style={{ color: '#ffffff', margin: '0 auto 12px' }} />
        <div className="font-tech" style={{ color: 'var(--text-white)' }}>Evaluating Multi-Store Inventory Telemetry...</div>
      </div>
    );
  }

  const { summary, lowStockStores, predictedStockoutStores } = analysisResult;

  return (
    <div
      className="card scroll-reveal"
      style={{
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        marginBottom: '28px',
        backgroundColor: 'var(--bg-surface)',
        position: 'relative'
      }}
    >
      {/* SECTION HEADER & CONTROL BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className="technical-index" style={{ color: 'var(--text-white)' }}>
              [ GROQ AI // STOCK INTELLIGENCE & DEPLETION RADAR ]
            </span>
            {groqOnline ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-tech)',
                  backgroundColor: 'rgba(52, 211, 153, 0.12)',
                  color: 'var(--color-balanced)',
                  border: '1px solid rgba(52, 211, 153, 0.3)'
                }}
              >
                <Zap size={10} />
                GROQ LPU ONLINE {aiModel ? `(${aiModel})` : ''}
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-tech)',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: 'var(--color-shortage)',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                <AlertTriangle size={10} />
                GROQ KEY REQUIRED // NUMERICAL TELEMETRY ACTIVE
              </span>
            )}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-tech)',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              AUTHORITATIVE CENTRAL DB (SQLITE + REAL-TIME SSE)
            </span>
          </div>

          <h2 className="font-display" style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-white)', margin: '4px 0' }}>
            Network Stock Depletion & Predictive Bottleneck Intelligence
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-silver)', maxWidth: '780px', margin: 0 }}>
            Deterministic stockout velocity calculations paired with Groq AI narrative synthesis. Identifies active safety-limit breaches and forward stockout windows across Karnataka retail hubs.
          </p>
        </div>

        {/* Global Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Prediction Horizon Quick Selectors (Requirement 4) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-canvas)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)' }}>
            <Clock size={12} style={{ color: 'var(--text-dim)' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-tech)' }}>HORIZON:</span>
            <div style={{ display: 'flex', gap: '3px' }}>
              {[1, 3, 7, 14].map(days => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setHorizonDays(days)}
                  className={`btn btn-sm ${horizonDays === days ? 'btn-primary' : 'btn-secondary'} font-tech`}
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    height: '24px',
                    lineHeight: 1
                  }}
                  title={`Calculate ${days}-day lookahead demand and stockout risk`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Demand Calendar Panel (Requirement 4) */}
          <button
            onClick={() => setShowCalendarPanel(!showCalendarPanel)}
            className={`btn btn-sm ${showCalendarPanel ? 'btn-primary' : 'btn-secondary'} font-tech`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Inspect active festivals, seasonal uplifts and campaigns"
          >
            <Calendar size={13} />
            <span>Demand Calendar ({activeEvents.length} Active)</span>
          </button>

          {/* Toggle Employee Simulation Suite */}
          <button
            onClick={() => setShowSimPanel(!showSimPanel)}
            className={`btn btn-sm ${showSimPanel ? 'btn-primary' : 'btn-secondary'} font-tech`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Sliders size={13} />
            <span>Employee Feed Simulator</span>
          </button>

          {/* Regenerate AI Analysis */}
          <button
            onClick={() => triggerAiInsights(analysisResult)}
            disabled={loadingAi}
            className="btn btn-secondary btn-sm font-tech"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Re-run Groq AI narrative analysis"
          >
            <RefreshCw size={13} className={loadingAi ? 'spin' : ''} />
            <span>{loadingAi ? 'Synthesizing...' : 'Re-analyze'}</span>
          </button>
        </div>
      </div>

      {/* DEMAND CALENDAR & EVENT UPLIFT EXPANDABLE PANEL (Requirement 4) */}
      {showCalendarPanel && (
        <div
          style={{
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="technical-index" style={{ color: 'var(--text-white)' }}>
                  [ DEMAND CALENDAR // FESTIVALS, PROMOTIONS & UPLIFTS ]
                </span>
                <span className="demo-tag">Configurable Retail Events</span>
              </div>
              <h4 className="font-display" style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-white)', margin: '2px 0 0' }}>
                Scheduled Regional Events & Category Uplift Factors
              </h4>
            </div>
            <span className="font-tech text-dim" style={{ fontSize: '0.72rem' }}>
              Uplifts apply dynamically based on store location and apparel category
            </span>
          </div>

          <p className="font-tech text-dim" style={{ fontSize: '0.74rem', margin: '0 0 14px', lineHeight: 1.45 }}>
            Demand is calculated using daily sales velocity combined with scheduled event uplifts. Uncheck any event to recalculate baseline velocity without promotional assumptions.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {DEMAND_EVENTS.map(evt => {
              const isEnabled = activeEvents.some(e => e.id === evt.id);
              return (
                <div
                  key={evt.id}
                  style={{
                    padding: '12px 14px',
                    backgroundColor: isEnabled ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.25)',
                    border: `1px solid ${isEnabled ? 'var(--border-hairline)' : 'rgba(255, 255, 255, 0.05)'}`,
                    borderRadius: 'var(--radius-sm)',
                    opacity: isEnabled ? 1 : 0.55,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="font-tech" style={{ fontSize: '0.8rem', fontWeight: 700, color: isEnabled ? 'var(--text-white)' : 'var(--text-dim)' }}>
                      {evt.name}
                    </span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => handleToggleEvent(evt.id)}
                      />
                      <span className="font-tech text-dim" style={{ fontSize: '0.68rem' }}>
                        {isEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </label>
                  </div>

                  <div className="font-tech" style={{ fontSize: '0.72rem', display: 'flex', gap: '10px' }}>
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>+{evt.upliftPct}% Uplift</span>
                    <span className="text-dim">•</span>
                    <span className="text-dim">{evt.startDate} to {evt.endDate}</span>
                  </div>

                  <div className="font-tech text-dim" style={{ fontSize: '0.7rem' }}>
                    Categories: <strong style={{ color: 'var(--text-silver)' }}>{evt.relevantCategories.join(', ')}</strong> • Stores: <strong style={{ color: 'var(--text-silver)' }}>{evt.storeLabels.join(', ')}</strong>
                  </div>

                  <div
                    className="font-tech"
                    style={{
                      fontSize: '0.67rem',
                      padding: '4px 6px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: evt.isAssumption ? 'rgba(234, 179, 8, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: evt.isAssumption ? '#facc15' : '#34d399',
                      border: `1px solid ${evt.isAssumption ? 'rgba(234, 179, 8, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                      marginTop: '4px'
                    }}
                  >
                    {evt.isAssumption ? '⚠ ASSUMPTION: ' : '✓ VERIFIED DATA: '} {evt.upliftSource}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ACTIVE NOTIFICATION BANNER */}
      {activeTestNotification && (
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'var(--text-white)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-tech)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={14} style={{ color: '#ffffff' }} />
          <span>{activeTestNotification}</span>
        </div>
      )}

      {/* 4-KPI TELEMETRY STRIP */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        {/* KPI 1: Current Low-Stock Stores */}
        <div
          style={{
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-hairline)',
            borderLeft: summary.currentLowStockCount > 0 ? '3px solid var(--color-shortage)' : '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px 16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="technical-index" style={{ color: 'var(--color-shortage)' }}>CURRENT LOW STOCK</span>
            <AlertTriangle size={13} style={{ color: 'var(--color-shortage)' }} />
          </div>
          <div className="font-tech" style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--color-shortage)', margin: '4px 0 2px' }}>
            {summary.currentLowStockCount} SKUs
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Across {lowStockStores.length} retail stores: {lowStockStores.slice(0, 2).join(', ') || 'None below buffer'}
          </div>
        </div>

        {/* KPI 2: Predicted Stockouts */}
        <div
          style={{
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-hairline)',
            borderLeft: summary.predictedStockoutCount > 0 ? '3px solid #f59e0b' : '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px 16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="technical-index" style={{ color: '#f59e0b' }}>PREDICTED STOCKOUTS</span>
            <TrendingDown size={13} style={{ color: '#f59e0b' }} />
          </div>
          <div className="font-tech" style={{ fontSize: '1.65rem', fontWeight: 700, color: '#f59e0b', margin: '4px 0 2px' }}>
            {summary.predictedStockoutCount} SKUs
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Exhaustion projected within {horizonDays} days across {predictedStockoutStores.length} stores
          </div>
        </div>

        {/* KPI 3: Approaching Safety Threshold */}
        <div
          style={{
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px 16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="technical-index" style={{ color: 'var(--text-white)' }}>SAFETY BUFFER RISK</span>
            <ShieldAlert size={13} style={{ color: 'var(--text-white)' }} />
          </div>
          <div className="font-tech" style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-white)', margin: '4px 0 2px' }}>
            {summary.approachingLimitCount} SKUs
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Approaching safety stock minimums within {horizonDays}-day horizon
          </div>
        </div>

        {/* KPI 4: Evaluated Store Nodes */}
        <div
          style={{
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px 16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="technical-index">TELEMETRY COVERAGE</span>
            <Store size={13} style={{ color: 'var(--text-dim)' }} />
          </div>
          <div className="font-tech" style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-white)', margin: '4px 0 2px' }}>
            {summary.totalStoresEvaluated} Stores
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {summary.totalItemsEvaluated} inventory records monitored deterministically
          </div>
        </div>
      </div>

      {/* GROQ AI EXECUTIVE BRIEFING & RECOMMENDATION CANVAS */}
      <div
        style={{
          backgroundColor: 'rgba(24, 24, 27, 0.65)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-md)',
          padding: '20px 22px',
          marginBottom: '22px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} style={{ color: '#ffffff' }} />
            <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-white)', margin: 0 }}>
              Groq AI Operational Briefing & Rebalance Recommendations
            </h3>
          </div>
          {lastGeneratedTime && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-tech)' }}>
              Synthesized at {lastGeneratedTime} • Engine: {aiModel || 'Groq Cloud'}
            </span>
          )}
        </div>

        {/* AI Content / Loading / Error Display */}
        {loadingAi ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 0', color: 'var(--text-silver)' }}>
            <RefreshCw size={18} className="spin" style={{ color: '#ffffff' }} />
            <span style={{ fontSize: '0.85rem' }}>
              Groq LPU is synthesizing deterministic network telemetry and generating tactical rebalance recommendations...
            </span>
          </div>
        ) : aiError ? (
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              color: 'var(--text-silver)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-shortage)', fontWeight: 600, marginBottom: '4px' }}>
              <AlertTriangle size={14} />
              <span>Groq AI Narrative Unavailable</span>
            </div>
            <div>{aiError}</div>
            <div style={{ marginTop: '8px', fontSize: '0.74rem', color: 'var(--text-dim)' }}>
              Note: Full deterministic numerical calculations remain 100% active in the diagnostic table below. Configure <code>GROQ_API_KEY</code> in <code>.env</code> to enable AI narrative interpretations.
            </div>
          </div>
        ) : aiInsights ? (
          <div
            className="groq-markdown-briefing"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              padding: '18px 22px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)',
              overflowX: 'auto'
            }}
          >
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => (
                  <h3
                    className="font-display"
                    style={{
                      fontSize: '1.12rem',
                      fontWeight: 700,
                      color: 'var(--text-white)',
                      marginTop: '16px',
                      marginBottom: '8px',
                      borderBottom: '1px solid var(--border-hairline)',
                      paddingBottom: '6px'
                    }}
                    {...props}
                  />
                ),
                h2: ({ node, ...props }) => (
                  <h4
                    className="font-display"
                    style={{
                      fontSize: '1.02rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      marginTop: '16px',
                      marginBottom: '8px',
                      letterSpacing: '0.01em'
                    }}
                    {...props}
                  />
                ),
                h3: ({ node, ...props }) => (
                  <h5
                    className="font-display"
                    style={{
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      color: 'var(--text-white)',
                      marginTop: '12px',
                      marginBottom: '6px'
                    }}
                    {...props}
                  />
                ),
                p: ({ node, ...props }) => (
                  <p
                    style={{
                      fontSize: '0.86rem',
                      lineHeight: 1.65,
                      color: 'var(--text-silver)',
                      marginBottom: '10px'
                    }}
                    {...props}
                  />
                ),
                strong: ({ node, ...props }) => (
                  <strong
                    style={{
                      color: 'var(--text-white)',
                      fontWeight: 600
                    }}
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul
                    style={{
                      margin: '6px 0 12px 22px',
                      padding: 0,
                      listStyleType: 'disc',
                      color: 'var(--text-silver)',
                      fontSize: '0.85rem',
                      lineHeight: 1.6
                    }}
                    {...props}
                  />
                ),
                ol: ({ node, ...props }) => (
                  <ol
                    style={{
                      margin: '6px 0 14px 24px',
                      padding: 0,
                      listStyleType: 'decimal',
                      color: 'var(--text-silver)',
                      fontSize: '0.85rem',
                      lineHeight: 1.6
                    }}
                    {...props}
                  />
                ),
                li: ({ node, ...props }) => (
                  <li
                    style={{
                      marginBottom: '6px',
                      paddingLeft: '4px'
                    }}
                    {...props}
                  />
                ),
                code: ({ node, inline, ...props }) => (
                  <code
                    className="font-tech"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '0.78rem',
                      color: '#ffffff',
                      border: '1px solid var(--border-hairline-subtle)'
                    }}
                    {...props}
                  />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    style={{
                      borderLeft: '3px solid #ffffff',
                      margin: '10px 0',
                      padding: '6px 14px',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '0 var(--radius-xs) var(--radius-xs) 0',
                      color: 'var(--text-silver)',
                      fontSize: '0.84rem'
                    }}
                    {...props}
                  />
                )
              }}
            >
              {aiInsights}
            </ReactMarkdown>
          </div>
        ) : (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
            Click "Re-analyze" to prompt Groq AI to interpret the current telemetry snapshot.
          </div>
        )}

        {/* Safety Disclaimer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          <Info size={12} style={{ flexShrink: 0 }} />
          <span>
            OPERATIONAL POLICY: Groq AI generates decision-support recommendations only. No stock transfer, quantity adjustment, or dispatch is executed automatically. All actions require manager sign-off.
          </span>
        </div>
      </div>

      {/* EMPLOYEE DASHBOARD SIMULATION & DETERMINISTIC TEST CONTROLS PANEL */}
      {showSimPanel && (
        <div
          style={{
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '18px 20px',
            marginBottom: '22px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="technical-index" style={{ color: 'var(--text-white)' }}>
                  [ PHASE 6 // EMPLOYEE DASHBOARD SIMULATION SUITE ]
                </span>
                <span className="demo-tag">Controlled Test Mode</span>
              </div>
              <h4 className="font-display" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-white)', margin: '2px 0 0' }}>
                Simulate In-Store Stock Adjustments & Run Benchmark Tests
              </h4>
            </div>

            <button onClick={handleResetSampleData} className="btn btn-secondary btn-sm" style={{ fontSize: '0.74rem' }}>
              Reset to Baseline Data
            </button>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '0 0 14px' }}>
            The Employee Dashboard is not ready yet. Use these deterministic scenarios or custom adjustments to verify that ThreadIQ's deterministic stock math and Groq AI correctly classify low-stock and predicted stockout conditions.
          </p>

          {/* 3 DETERMINISTIC TEST SCENARIO BUTTONS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '18px' }}>
            {/* Scenario A */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-tech" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-shortage)' }}>
                    TEST A: CURRENT LOW STOCK
                  </span>
                  <span className="badge badge-low-stock" style={{ fontSize: '0.65rem' }}>12 &lt; 15 units</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-silver)', marginTop: '4px' }}>
                  <strong>Brigade Road Flagship</strong>: T-shirt (4XL) set to 12 available (below 15 threshold).
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Expected: Detected as Current Low Stock.
                </div>
              </div>
              <button
                onClick={() => handleApplyScenario('TEST_A_LOW_STOCK', 'Test A (Low Stock)')}
                className="btn btn-secondary btn-sm font-tech"
                style={{ marginTop: '10px', width: '100%' }}
              >
                Execute Test A
              </button>
            </div>

            {/* Scenario B */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-tech" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b' }}>
                    TEST B: PREDICTED STOCKOUT
                  </span>
                  <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.65rem' }}>
                    2.0 Days Duration
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-silver)', marginTop: '4px' }}>
                  <strong>Brigade Road Flagship</strong>: T-shirt (4XL) set to 24 available, 12/day sales, 10 threshold.
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Expected: Stock &gt; threshold, but flags stockout in 2.0 days (within 3-day horizon).
                </div>
              </div>
              <button
                onClick={() => handleApplyScenario('TEST_B_PREDICTED_STOCKOUT', 'Test B (Predicted Stockout)')}
                className="btn btn-secondary btn-sm font-tech"
                style={{ marginTop: '10px', width: '100%' }}
              >
                Execute Test B
              </button>
            </div>

            {/* Scenario C */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-tech" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-balanced)' }}>
                    TEST C: HEALTHY STOCK
                  </span>
                  <span className="badge badge-balanced" style={{ fontSize: '0.65rem' }}>50.0 Days Cover</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-silver)', marginTop: '4px' }}>
                  <strong>Mysuru Central</strong>: T-shirt (4XL) set to 100 available, 2/day sales, 20 threshold.
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Expected: Classified as Healthy (not low stock, no stockout risk).
                </div>
              </div>
              <button
                onClick={() => handleApplyScenario('TEST_C_HEALTHY_STOCK', 'Test C (Healthy Stock)')}
                className="btn btn-secondary btn-sm font-tech"
                style={{ marginTop: '10px', width: '100%' }}
              >
                Execute Test C
              </button>
            </div>

            {/* Scenario D: Festival Demand Surge (Requirement 4 & 9) */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-tech" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b' }}>
                    TEST D: FESTIVAL DEMAND SURGE
                  </span>
                  <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.65rem' }}>
                    +45% Uplift
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-silver)', marginTop: '4px' }}>
                  <strong>Brigade Road Flagship</strong>: T-shirt (4XL) set to 18 units, 6/day baseline velocity.
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Expected: 3-day buffer under normal demand, but active festival surge (+45%) forces stockout in &lt;2.1 days.
                </div>
              </div>
              <button
                onClick={() => handleApplyScenario('TEST_D_FESTIVAL_SURGE', 'Test D (Festival Demand Surge)')}
                className="btn btn-secondary btn-sm font-tech"
                style={{ marginTop: '10px', width: '100%' }}
              >
                Execute Test D
              </button>
            </div>
          </div>

          {/* CUSTOM SIMULATOR FORM */}
          <form onSubmit={handleCustomSimulationSubmit} style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '14px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-white)', marginBottom: '8px' }}>
              Custom Simulation Injection:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>Store</label>
                <select
                  value={simStore}
                  onChange={(e) => setSimStore(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius-xs)', backgroundColor: '#18181b', color: '#fff', border: '1px solid var(--border-hairline)', fontSize: '0.75rem' }}
                >
                  <option value="BLR-FLAG-01">Brigade Road Flagship</option>
                  <option value="MYS-HERI-02">Heritage Mall Hub</option>
                  <option value="MYS-CENTRAL-01">Mysuru Central</option>
                  <option value="IXE-CST-03">Coastal City Pavilion</option>
                  <option value="HBX-HUB-04">North Karnataka Hub</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>Product SKU</label>
                <select
                  value={simProduct}
                  onChange={(e) => setSimProduct(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius-xs)', backgroundColor: '#18181b', color: '#fff', border: '1px solid var(--border-hairline)', fontSize: '0.75rem' }}
                >
                  <option value="TSHIRT-4XL-BLK">Vintage Washed Tee (BLK)</option>
                  <option value="TSHIRT-4XL-WHT">Vintage Washed Tee (WHT)</option>
                  <option value="HOODIE-2XL-OAT">Boxy Fleece Hoodie</option>
                  <option value="SUPIMA-3XL-NAVY">Supima Crew Neck</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>Size</label>
                <select
                  value={simSize}
                  onChange={(e) => setSimSize(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius-xs)', backgroundColor: '#18181b', color: '#fff', border: '1px solid var(--border-hairline)', fontSize: '0.75rem' }}
                >
                  <option value="4XL">4XL</option>
                  <option value="3XL">3XL</option>
                  <option value="2XL">2XL</option>
                  <option value="XL">XL</option>
                  <option value="5XL">5XL</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>On-Hand Qty</label>
                <input
                  type="number"
                  value={simQty}
                  onChange={(e) => setSimQty(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius-xs)', backgroundColor: '#18181b', color: '#fff', border: '1px solid var(--border-hairline)', fontSize: '0.75rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>Min Threshold</label>
                <input
                  type="number"
                  value={simThreshold}
                  onChange={(e) => setSimThreshold(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius-xs)', backgroundColor: '#18181b', color: '#fff', border: '1px solid var(--border-hairline)', fontSize: '0.75rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>Daily Sales</label>
                <input
                  type="number"
                  step="0.5"
                  value={simVelocity}
                  onChange={(e) => setSimVelocity(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius-xs)', backgroundColor: '#18181b', color: '#fff', border: '1px solid var(--border-hairline)', fontSize: '0.75rem' }}
                />
              </div>

              <div>
                <button type="submit" className="btn btn-primary btn-sm font-tech" style={{ width: '100%', height: '32px' }}>
                  Apply Stock Count
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* AI DECISION: TRANSFER VS REORDER STRATEGIC COMPARISON MATRIX (Requirement 3) */}
      <div style={{ marginBottom: '26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={15} style={{ color: '#ffffff' }} />
            <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-white)', margin: 0 }}>
              AI Decision Matrix: Transfer vs Reorder Analysis ({analysisResult.criticalItems.length} Shortages in {horizonDays}d Horizon)
            </h3>
          </div>
          <span className="technical-index" style={{ color: 'var(--text-dim)' }}>
            DETERMINISTIC EVALUATION // GROQ REASONING ENGINE
          </span>
        </div>

        {analysisResult.criticalItems.length === 0 ? (
          <div
            className="font-tech"
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-canvas)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'center',
              color: 'var(--text-silver)',
              fontSize: '0.8rem'
            }}
          >
            ✓ All stores currently hold sufficient inventory forward cover for the active {horizonDays}-day horizon. No critical rebalance actions required.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '14px' }}>
            {analysisResult.criticalItems.slice(0, 6).map((item, idx) => {
              const rec = item.recommendedAction;
              const forecast = item.demandForecast;

              return (
                <div
                  key={`shortage-rec-${item.storeId}-${item.productId}-${item.size}-${idx}`}
                  className="font-tech"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-hairline)',
                    borderTop: `3px solid ${rec?.badgeColor || '#38bdf8'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  {/* Top Bar: Store and Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className="technical-index" style={{ color: 'var(--text-silver)', fontSize: '0.67rem' }}>
                        {item.storeName}
                      </span>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-white)', margin: '2px 0 0' }}>
                        {item.productName}
                      </h4>
                      <span className="text-dim" style={{ fontSize: '0.72rem' }}>
                        EXACT VARIANT: <strong style={{ color: 'var(--text-white)' }}>{item.size}</strong> • SKU: {item.productId}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: `${rec?.badgeColor || '#38bdf8'}18`,
                        color: rec?.badgeColor || '#38bdf8',
                        border: `1px solid ${rec?.badgeColor || '#38bdf8'}40`,
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {rec?.badgeText || 'EVALUATING'}
                    </span>
                  </div>

                  {/* Quantitative Metrics Matrix */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '6px',
                      padding: '8px',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '0.7rem'
                    }}
                  >
                    <div>
                      <span className="text-dim" style={{ fontSize: '0.62rem', display: 'block' }}>STOCK / SAFETY</span>
                      <strong style={{ color: item.isCurrentLowStock ? 'var(--color-shortage)' : 'var(--text-white)' }}>
                        {item.quantityAvailable} / {item.minimumStockThreshold ?? 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-dim" style={{ fontSize: '0.62rem', display: 'block' }}>VELOCITY / UPLIFT</span>
                      <span style={{ color: 'var(--text-white)' }}>
                        {item.dailySalesVelocity !== null ? `${item.dailySalesVelocity}/d` : 'Limited'}
                        {forecast?.totalUpliftPct > 0 && (
                          <span style={{ color: '#f59e0b', fontSize: '0.62rem', fontWeight: 700 }}> (+{forecast.totalUpliftPct}%)</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-dim" style={{ fontSize: '0.62rem', display: 'block' }}>EST. STOCKOUT</span>
                      <strong style={{ color: (item.estimatedDaysUntilStockout ?? 99) <= horizonDays ? '#f59e0b' : 'var(--color-balanced)' }}>
                        {item.estimatedDaysUntilStockout !== null ? `~${item.estimatedDaysUntilStockout} days` : 'N/A'}
                      </strong>
                    </div>
                  </div>

                  {/* Decision Details Breakdown (Requirement 3) */}
                  <div style={{ fontSize: '0.73rem', lineHeight: 1.45, color: 'var(--text-silver)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-dim">RECOMMENDED ACTION:</span>
                      <strong style={{ color: 'var(--text-white)', textAlign: 'right' }}>{rec?.actionTitle}</strong>
                    </div>

                    {rec?.recommendedStore && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-dim">RECOMMENDED SOURCE:</span>
                        <span style={{ color: '#eab308', textAlign: 'right' }}>
                          {rec.recommendedStore.storeName} ({rec.recommendedStore.city}) • {rec.recommendedStore.transferableQty} units surplus
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-dim">RECOMMENDED QUANTITY:</span>
                      <strong style={{ color: '#10b981' }}>{rec?.recommendedQty} Units</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-dim">REPLENISHMENT LEAD TIME:</span>
                      <span style={{ color: 'var(--text-white)' }}>
                        {rec?.transferLeadTime || rec?.reorderLeadTime || 'N/A'}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: '4px',
                        padding: '6px 8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: 'var(--radius-xs)',
                        borderLeft: '2px solid var(--border-hairline)',
                        fontSize: '0.71rem',
                        color: 'var(--text-silver)'
                      }}
                    >
                      {rec?.explanation}
                    </div>
                  </div>

                  {/* Footer with Confidence and Action */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px dashed var(--border-hairline)',
                      paddingTop: '8px',
                      marginTop: 'auto'
                    }}
                  >
                    <span className="text-dim" style={{ fontSize: '0.64rem' }}>
                      {forecast?.confidenceLabel || 'CONFIDENCE: HIGH'}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/inventory?approvalStatus=Pending')}
                      className="btn btn-secondary btn-sm font-tech"
                      style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                    >
                      Resolve in Inventory →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FILTER TABS & RISK DETAILS TABLE */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={14} style={{ color: 'var(--text-white)' }} />
            <h4 className="font-display" style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-white)', margin: 0 }}>
              Deterministic Stock Risk Ledger ({displayedItems.length} records)
            </h4>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: `All (${analysisResult.items.length})` },
              { id: 'LOW', label: `Low Stock (${summary.currentLowStockCount})` },
              { id: 'STOCKOUT', label: `Predicted Stockout (${summary.predictedStockoutCount})` },
              { id: 'CRITICAL', label: `All Critical (${summary.criticalCount})` },
              { id: 'HEALTHY', label: 'Balanced / Surplus' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterMode(tab.id)}
                className="font-tech"
                style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  border: '1px solid',
                  cursor: 'pointer',
                  backgroundColor: filterMode === tab.id ? '#ffffff' : 'transparent',
                  color: filterMode === tab.id ? '#000000' : 'var(--text-dim)',
                  borderColor: filterMode === tab.id ? '#ffffff' : 'var(--border-hairline)'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dense Telemetry Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-hairline)', textAlign: 'left', color: 'var(--text-dim)' }}>
                <th style={{ padding: '8px 10px', fontFamily: 'var(--font-tech)' }}>RETAIL STORE</th>
                <th style={{ padding: '8px 10px', fontFamily: 'var(--font-tech)' }}>PRODUCT & SIZE</th>
                <th style={{ padding: '8px 10px', fontFamily: 'var(--font-tech)', textAlign: 'right' }}>AVAILABLE</th>
                <th style={{ padding: '8px 10px', fontFamily: 'var(--font-tech)', textAlign: 'right' }}>MIN THRESHOLD</th>
                <th style={{ padding: '8px 10px', fontFamily: 'var(--font-tech)', textAlign: 'right' }}>SALES VELOCITY</th>
                <th style={{ padding: '8px 10px', fontFamily: 'var(--font-tech)', textAlign: 'right' }}>EST. STOCKOUT</th>
                <th style={{ padding: '8px 10px', fontFamily: 'var(--font-tech)' }}>RISK CLASSIFICATION</th>
                <th style={{ padding: '8px 10px', fontFamily: 'var(--font-tech)' }}>ARITHMETIC EXPLANATION</th>
                <th style={{ padding: '8px 10px', fontFamily: 'var(--font-tech)', textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {displayedItems.map((item, idx) => {
                // Determine Badge Style
                let badgeClass = 'badge badge-balanced';
                let badgeLabel = 'Healthy';
                if (item.riskClassification === 'CRITICAL_DEPLETION') {
                  badgeClass = 'badge badge-low-stock';
                  badgeLabel = 'Critical Depletion';
                } else if (item.riskClassification === 'CURRENT_LOW_STOCK') {
                  badgeClass = 'badge badge-low-stock';
                  badgeLabel = 'Low Stock';
                } else if (item.riskClassification === 'PREDICTED_STOCKOUT') {
                  badgeClass = 'badge';
                  badgeLabel = `Stockout in ${item.estimatedDaysUntilStockout}d`;
                } else if (item.riskClassification === 'APPROACHING_LIMIT') {
                  badgeClass = 'badge';
                  badgeLabel = 'Approaching Buffer';
                } else if (item.riskClassification === 'SURPLUS') {
                  badgeClass = 'badge badge-excess-stock';
                  badgeLabel = 'Surplus (Donor)';
                }

                return (
                  <tr
                    key={`${item.storeId}-${item.productId}-${item.size}-${idx}`}
                    style={{
                      borderBottom: '1px solid var(--border-hairline-subtle)',
                      backgroundColor: item.isCurrentLowStock ? 'rgba(239, 68, 68, 0.03)' : (item.isPredictedStockout ? 'rgba(245, 158, 11, 0.03)' : 'transparent')
                    }}
                  >
                    <td style={{ padding: '10px 10px', fontWeight: 600, color: 'var(--text-white)' }}>
                      <div>{item.storeName}</div>
                      <div className="font-tech" style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                        {item.storeId}
                      </div>
                    </td>

                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ color: 'var(--text-white)' }}>{item.productName}</div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                        <span className="font-tech" style={{ fontSize: '0.68rem', color: 'var(--text-silver)' }}>
                          [{item.size}]
                        </span>
                        <span className="font-tech" style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                          {item.productId}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-tech)', fontWeight: 700, color: item.isCurrentLowStock ? 'var(--color-shortage)' : 'var(--text-white)' }}>
                      {item.quantityAvailable}
                    </td>

                    <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-tech)', color: 'var(--text-dim)' }}>
                      {item.minimumStockThreshold !== null ? `${item.minimumStockThreshold}` : 'N/A'}
                    </td>

                    <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-tech)', color: 'var(--text-silver)' }}>
                      {item.dailySalesVelocity !== null ? `${item.dailySalesVelocity}/day` : <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Limited</span>}
                    </td>

                    <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-tech)' }}>
                      {item.estimatedDaysUntilStockout !== null ? (
                        <span
                          style={{
                            color: item.estimatedDaysUntilStockout <= horizonDays ? '#f59e0b' : 'var(--color-balanced)',
                            fontWeight: 700
                          }}
                        >
                          ~{item.estimatedDaysUntilStockout} days
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '10px 10px' }}>
                      <span className={badgeClass} style={{ fontSize: '0.68rem' }}>
                        {badgeLabel}
                      </span>
                    </td>

                    <td style={{ padding: '10px 10px', color: 'var(--text-silver)', fontSize: '0.73rem', maxWidth: '280px', lineHeight: 1.4 }}>
                      {item.riskDescription}
                    </td>

                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                      {item.isCurrentLowStock || item.isPredictedStockout ? (
                        <button
                          onClick={() => navigate('/inventory?approvalStatus=Pending')}
                          className="btn btn-secondary btn-sm font-tech"
                          style={{ padding: '2px 8px', fontSize: '0.68rem' }}
                        >
                          Review
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>Stable</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

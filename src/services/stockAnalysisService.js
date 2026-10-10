/**
 * ThreadIQ - Deterministic Stock Analysis Service
 *
 * Computes deterministic inventory risk metrics strictly in application code.
 * Groq AI is used exclusively to interpret the mathematical findings and propose
 * strategic operational recommendations — never for raw arithmetic.
 */

import { normalizeInventoryRecord } from '../../employee-dashboard/integration/inventorySchema.js';
import {
  calculateItemDemandForecast,
  evaluateTransferVsReorder,
  findEligibleSourceStores
} from './demandForecastService.js';
import { DEMAND_EVENTS } from '../data/demandEvents.js';

export const DEFAULT_PREDICTION_HORIZON_DAYS = 3;

/**
 * Deterministically analyzes inventory records to detect current low stock,
 * predicted stockouts, festival demand uplifts, and transfer vs reorder trade-offs.
 *
 * @param {Array<Object>} records - Raw or normalized inventory records
 * @param {Object} [options] - Configuration options
 * @param {number} [options.predictionHorizonDays=3] - Lookahead window in days (1, 3, 7, 14)
 * @param {Array<Object>} [options.events] - Demand calendar events
 * @param {Array<Object>} [options.storesList] - Store network nodes
 * @returns {Object} Comprehensive deterministic stock analysis result
 */
export function analyzeStockIntelligence(records = [], options = {}) {
  const horizon = options.predictionHorizonDays ?? DEFAULT_PREDICTION_HORIZON_DAYS;
  const events = options.events || DEMAND_EVENTS;
  const storesList = options.storesList || [];

  const analyzedItems = [];
  const lowStockStoreSet = new Set();
  const predictedStockoutStoreSet = new Set();
  const allStoreSet = new Set();

  for (const raw of records) {
    const item = normalizeInventoryRecord(raw);
    allStoreSet.add(item.storeName);

    const qty = item.quantityAvailable;
    const threshold = item.minimumStockThreshold;
    const velocity = item.dailySalesVelocity;

    let isCurrentLowStock = false;
    let isPredictedStockout = false;
    let isApproachingSafetyLimit = false;
    let daysUntilStockout = null;
    let forecastConfidence = 'HIGH';
    let riskClassification = 'HEALTHY';
    let riskDescription = '';

    // A. CURRENT LOW STOCK CHECK
    if (threshold !== null && !isNaN(threshold)) {
      if (qty < threshold) {
        isCurrentLowStock = true;
        lowStockStoreSet.add(item.storeName);
      }
    } else {
      forecastConfidence = 'LIMITED_NO_THRESHOLD';
    }

    // B. PREDICTED STOCKOUT CALCULATION
    if (velocity !== null && !isNaN(velocity) && velocity > 0) {
      // Basic deterministic estimate: quantityAvailable / dailySalesVelocity
      const rawDays = qty / velocity;
      daysUntilStockout = Number(Math.max(0, rawDays).toFixed(1));

      // Items likely to run out of stock soon (within prediction horizon)
      if (daysUntilStockout <= horizon) {
        isPredictedStockout = true;
        predictedStockoutStoreSet.add(item.storeName);
      }

      // Check if item is currently above threshold, but will fall below threshold within horizon
      if (!isCurrentLowStock && threshold !== null) {
        const remainingAfterHorizon = qty - (velocity * horizon);
        if (remainingAfterHorizon < threshold) {
          isApproachingSafetyLimit = true;
        }
      }
    } else if (velocity === 0) {
      forecastConfidence = 'QUIESCENT_ZERO_SALES';
    } else {
      forecastConfidence = 'LIMITED_NO_VELOCITY';
    }

    // C. RISK CLASSIFICATION & DESCRIPTIONS
    if (qty < 0) {
      riskClassification = 'ANOMALY_NEGATIVE';
      riskDescription = `Corrupted count anomaly: negative quantity (${qty} units) detected.`;
    } else if (isCurrentLowStock && isPredictedStockout && daysUntilStockout !== null) {
      riskClassification = 'CRITICAL_DEPLETION';
      riskDescription = `Available (${qty} units) is below minimum threshold (${threshold} units). At ${velocity} units/day, stock will be completely exhausted in ~${daysUntilStockout} days.`;
    } else if (isCurrentLowStock) {
      riskClassification = 'CURRENT_LOW_STOCK';
      const velNote = daysUntilStockout !== null
        ? `At ${velocity} units/day, stockout in ~${daysUntilStockout} days.`
        : 'Sales velocity unavailable to project exact stockout duration.';
      riskDescription = `Available (${qty} units) is below minimum threshold (${threshold} units). ${velNote}`;
    } else if (isPredictedStockout && daysUntilStockout !== null) {
      riskClassification = 'PREDICTED_STOCKOUT';
      riskDescription = `Current stock (${qty} units) is above safety threshold (${threshold ?? 'N/A'}), but velocity (${velocity} units/day) projects total stockout in ~${daysUntilStockout} days (within ${horizon}-day horizon).`;
    } else if (isApproachingSafetyLimit) {
      riskClassification = 'APPROACHING_LIMIT';
      riskDescription = `Stock (${qty} units) will drop below safety threshold (${threshold} units) within ${horizon} days at current velocity (${velocity} units/day).`;
    } else if (threshold !== null && qty > threshold * 4) {
      riskClassification = 'SURPLUS';
      riskDescription = `Healthy surplus holding (${qty} units vs ${threshold} min threshold). Available buffer for network rebalancing.`;
    } else {
      riskClassification = 'HEALTHY';
      const durationNote = daysUntilStockout !== null ? `~${daysUntilStockout} days forward cover.` : 'Stock levels balanced.';
      riskDescription = `Inventory balanced (${qty} units on-hand, threshold ${threshold ?? 'N/A'}). ${durationNote}`;
    }

    // Compute demand forecast across horizon including festival/promotion uplifts
    const demandForecast = calculateItemDemandForecast(item, { horizonDays: horizon, events });

    // Compute deterministic Transfer vs Reorder recommendation
    const recommendedAction = evaluateTransferVsReorder(item, demandForecast, records, storesList);

    analyzedItems.push({
      ...item,
      isCurrentLowStock,
      isPredictedStockout,
      isApproachingSafetyLimit,
      estimatedDaysUntilStockout: daysUntilStockout,
      forecastConfidence,
      riskClassification,
      riskDescription,
      demandForecast,
      recommendedAction
    });
  }

  const currentLowStockItems = analyzedItems.filter(i => i.isCurrentLowStock);
  const predictedStockoutItems = analyzedItems.filter(i => i.isPredictedStockout);
  const approachingLimitItems = analyzedItems.filter(i => i.isApproachingSafetyLimit);
  const criticalItems = analyzedItems.filter(i =>
    i.isCurrentLowStock || i.isPredictedStockout || i.isApproachingSafetyLimit
  );

  return {
    items: analyzedItems,
    currentLowStockItems,
    predictedStockoutItems,
    approachingLimitItems,
    criticalItems,
    lowStockStores: Array.from(lowStockStoreSet),
    predictedStockoutStores: Array.from(predictedStockoutStoreSet),
    allStores: Array.from(allStoreSet),
    activeEvents: events,
    summary: {
      totalItemsEvaluated: analyzedItems.length,
      totalStoresEvaluated: allStoreSet.size,
      currentLowStockCount: currentLowStockItems.length,
      predictedStockoutCount: predictedStockoutItems.length,
      approachingLimitCount: approachingLimitItems.length,
      criticalCount: criticalItems.length,
      predictionHorizonDays: horizon,
      evaluatedAt: new Date().toISOString()
    }
  };
}

/**
 * Requests Groq AI narrative interpretation of pre-calculated stock intelligence.
 * Does not send raw PII or secret credentials.
 *
 * @param {Object} analysisResult - Result from analyzeStockIntelligence
 * @param {Array<Object>} [activeEvents] - Active demand calendar events
 * @returns {Promise<{ success: boolean, insights?: string, error?: string, model?: string }>}
 */
export async function requestGroqStockInsights(analysisResult, activeEvents = DEMAND_EVENTS) {
  try {
    const payload = {
      currentLowStockCount: analysisResult.summary.currentLowStockCount,
      predictedStockoutCount: analysisResult.summary.predictedStockoutCount,
      predictionHorizonDays: analysisResult.summary.predictionHorizonDays,
      totalStoresEvaluated: analysisResult.summary.totalStoresEvaluated,
      activeEvents: analysisResult.activeEvents || activeEvents,
      criticalRisks: analysisResult.criticalItems.map(item => ({
        storeName: item.storeName,
        productName: item.productName,
        size: item.size,
        quantityAvailable: item.quantityAvailable,
        minimumStockThreshold: item.minimumStockThreshold,
        dailySalesVelocity: item.dailySalesVelocity,
        estimatedDaysUntilStockout: item.estimatedDaysUntilStockout,
        riskClassification: item.riskClassification,
        riskDescription: item.riskDescription,
        demandForecast: item.demandForecast,
        recommendedAction: item.recommendedAction
      }))
    };

    const response = await fetch('/api/groq/stock-intelligence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to reach Groq intelligence endpoint`);
    }

    return await response.json();
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Network error reaching Groq intelligence server',
      keyConfigured: false
    };
  }
}

/**
 * Queries server to verify whether GROQ_API_KEY is configured.
 */
export async function checkGroqStatus() {
  try {
    const res = await fetch('/api/groq/status');
    if (res.ok) {
      return await res.json();
    }
    return { configured: false, provider: 'groq-cloud' };
  } catch (err) {
    return { configured: false, provider: 'groq-cloud', error: err.message };
  }
}

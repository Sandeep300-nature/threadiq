/**
 * ThreadIQ - Demand Forecasting & Transfer vs Reorder Intelligence Engine
 *
 * Deterministic calculation module for:
 * 1. Historical sales velocity extrapolation across configurable horizons (1, 3, 7, 14 days).
 * 2. Festival, promotion, and seasonal uplift indexing by category, store, and size.
 * 3. Exact SKU and size matching across regional store networks.
 * 4. Source store safety-stock protection and suitability ranking.
 * 5. Deterministic Transfer vs Reorder decision matrices.
 */

import { DEMAND_EVENTS } from '../data/demandEvents.js';
export { DEMAND_EVENTS };
import { calculateStraightLineKm } from './routingService.js';
import { calculateDeliveryETA } from '../utils/etaUtils.js';

export const FORECAST_HORIZONS = [1, 3, 7, 14];
export const DEFAULT_SUPPLIER_LEAD_DAYS = 5;

/**
 * Finds all active scheduled events applicable to a specific inventory item.
 */
export function getApplicableEventsForItem(item, events = DEMAND_EVENTS) {
  if (!item || !Array.isArray(events)) return [];

  const itemStoreId = String(item.storeId || '');
  const itemStoreName = String(item.storeName || '');
  const itemCategory = String(item.category || item.productCategory || '').toLowerCase();
  const itemSize = String(item.size || '');

  return events.filter(evt => {
    // 1. Store matching
    const storeMatches =
      evt.relevantStores.includes('ALL') ||
      evt.relevantStores.some(
        s => s.toLowerCase() === itemStoreId.toLowerCase() ||
             itemStoreName.toLowerCase().includes(s.toLowerCase())
      );
    if (!storeMatches) return false;

    // 2. Category matching
    const categoryMatches =
      !evt.relevantCategories ||
      evt.relevantCategories.includes('ALL') ||
      evt.relevantCategories.some(c => c.toLowerCase() === itemCategory);
    if (!categoryMatches) return false;

    // 3. Size matching (if event targets specific sizes, e.g. plus sizes)
    if (evt.relevantSizes && !evt.relevantSizes.includes('ALL')) {
      if (!evt.relevantSizes.includes(itemSize)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Computes deterministic demand forecast for a single inventory item across a specified horizon.
 *
 * @param {Object} item - Normalized or raw inventory record
 * @param {Object} [options]
 * @param {number} [options.horizonDays=3] - Lookahead horizon in days (1, 3, 7, 14)
 * @param {Array<Object>} [options.events=DEMAND_EVENTS] - Active demand calendar events
 * @returns {Object} Deterministic forecast metrics
 */
export function calculateItemDemandForecast(item, options = {}) {
  const horizonDays = Number(options.horizonDays) || 3;
  const events = options.events || DEMAND_EVENTS;

  const currentQty = Math.max(0, Number(item.quantityAvailable ?? item.availableQty ?? 0));
  const safetyStock = Number(item.minimumStockThreshold ?? item.minThreshold ?? 15);
  const baseDailyVelocity = Math.max(0, Number(item.dailySalesVelocity ?? item.salesVelocityPerDay ?? 0));

  // Determine applicable events and total promotion/festival uplift percentage
  const matchingEvents = getApplicableEventsForItem(item, events);
  const totalUpliftPct = matchingEvents.reduce((sum, evt) => sum + (evt.upliftPct || 0), 0);
  const hasAssumption = matchingEvents.some(evt => evt.isAssumption);

  // Base expected demand over the horizon
  const baseDemand = baseDailyVelocity * horizonDays;

  // Demand uplift from scheduled festivals or promotions
  const eventUpliftUnits = Math.round(baseDemand * (totalUpliftPct / 100));

  // Total forecast demand over the horizon
  const totalForecastDemand = Math.round(baseDemand + eventUpliftUnits);

  // Effective daily velocity under active horizon demand
  const effectiveDailyVelocity = horizonDays > 0
    ? Number((totalForecastDemand / horizonDays).toFixed(2))
    : baseDailyVelocity;

  // Projected ending inventory at end of horizon
  const projectedEndingStock = currentQty - totalForecastDemand;

  // Days until complete stock exhaustion
  const daysUntilStockout = effectiveDailyVelocity > 0
    ? Number((currentQty / effectiveDailyVelocity).toFixed(1))
    : null;

  // Required replenishment to finish horizon at or above minimum safety stock
  const requiredReplenishment = Math.max(
    0,
    (safetyStock + totalForecastDemand) - currentQty
  );

  // Projected stockout timestamp
  let estimatedStockoutDate = null;
  if (daysUntilStockout !== null) {
    const d = new Date();
    d.setDate(d.getDate() + Math.floor(daysUntilStockout));
    estimatedStockoutDate = d.toISOString().split('T')[0];
  }

  return {
    horizonDays,
    currentQty,
    safetyStock,
    baseDailyVelocity,
    baseDemand: Number(baseDemand.toFixed(1)),
    matchingEvents,
    totalUpliftPct,
    eventUpliftUnits,
    totalForecastDemand,
    effectiveDailyVelocity,
    projectedEndingStock,
    daysUntilStockout,
    estimatedStockoutDate,
    requiredReplenishment,
    isCurrentShortage: currentQty < safetyStock,
    isProjectedShortage: projectedEndingStock < safetyStock,
    hasAssumption,
    confidenceLabel: baseDailyVelocity > 0
      ? (hasAssumption ? 'FORECAST WITH CONFIGURED ASSUMPTIONS' : 'HIGH CONFIDENCE (HISTORICAL DATA)')
      : 'LIMITED (NO HISTORICAL VELOCITY)'
  };
}

/**
 * Searches the store network for candidate source stores carrying the EXACT product and size.
 * Evaluates whether each store can spare stock without violating its own safety stock.
 *
 * @param {Object} destItem - Target inventory item facing shortage
 * @param {Array<Object>} allInventory - Complete network inventory records
 * @param {Array<Object>} storesList - List of all stores with coordinates
 * @param {number} [targetQuantity=1] - Quantity requested to be transferred
 * @returns {Array<Object>} Ranked candidate source stores
 */
export function findEligibleSourceStores(destItem, allInventory = [], storesList = [], targetQuantity = 1) {
  if (!destItem || !Array.isArray(allInventory)) return [];

  const destStoreId = String(destItem.storeId || '').toLowerCase();
  const destStoreName = String(destItem.storeName || '').toLowerCase();
  const targetProduct = String(destItem.productName || destItem.name || '').toLowerCase();
  const targetSku = String(destItem.productId || destItem.skuCode || '').toLowerCase();
  const targetSize = String(destItem.size || '').toUpperCase();

  // Find destination store coordinates
  const destStoreNode = storesList.find(
    s => s.id?.toLowerCase() === destStoreId ||
         s.code?.toLowerCase() === destStoreId ||
         s.name?.toLowerCase() === destStoreName
  );

  const candidates = [];

  for (const inv of allInventory) {
    const invStoreId = String(inv.storeId || '').toLowerCase();
    const invStoreName = String(inv.storeName || '').toLowerCase();

    // Must be a different store
    if (invStoreId === destStoreId || invStoreName === destStoreName) {
      continue;
    }

    // Must match EXACT product and EXACT size (Never substitute sizes!)
    const invProduct = String(inv.productName || inv.name || '').toLowerCase();
    const invSku = String(inv.productId || inv.skuCode || '').toLowerCase();
    const invSize = String(inv.size || '').toUpperCase();

    const productMatches =
      (invSku && targetSku && invSku === targetSku) ||
      invProduct.includes(targetProduct) ||
      targetProduct.includes(invProduct);

    if (!productMatches || invSize !== targetSize) {
      continue;
    }

    const availableQty = Math.max(0, Number(inv.quantityAvailable ?? inv.availableQty ?? 0));
    const safetyThreshold = Math.max(0, Number(inv.minimumStockThreshold ?? inv.minThreshold ?? 15));

    // Transferable stock strictly respecting the source store's required safety stock
    const transferableQty = Math.max(0, availableQty - safetyThreshold);

    // Find source store node for location and telemetry
    const sourceStoreNode = storesList.find(
      s => s.id?.toLowerCase() === invStoreId ||
           s.code?.toLowerCase() === invStoreId ||
           s.name?.toLowerCase() === invStoreName
    ) || {
      id: inv.storeId,
      name: inv.storeName || 'Karnataka Partner Hub',
      city: 'Karnataka',
      lat: 12.9716,
      lng: 77.5946
    };

    // Calculate approximate road distance & delivery ETA
    let distanceKm = 145; // Default Karnataka intercity fallback
    if (sourceStoreNode?.lat && destStoreNode?.lat) {
      distanceKm = calculateStraightLineKm(
        sourceStoreNode.lat,
        sourceStoreNode.lng,
        destStoreNode.lat,
        destStoreNode.lng
      ) || 145;
    }

    // Delivery ETAs
    const standardEta = calculateDeliveryETA(distanceKm, 'normal');
    const expressEta = calculateDeliveryETA(distanceKm, 'express');

    // Categorize eligibility
    let suitability = 'UNSUITABLE_NO_STOCK';
    let suitabilityLabel = 'Unsuitable — Zero Stock';
    let isRecommended = false;

    if (transferableQty >= targetQuantity && targetQuantity > 0) {
      suitability = 'RECOMMENDED_OPTIMAL';
      suitabilityLabel = 'Recommended Source (Full Stock Available)';
      isRecommended = true;
    } else if (transferableQty > 0) {
      suitability = 'PARTIAL_COVERAGE';
      suitabilityLabel = `Partial Stock (${transferableQty} units transferable)`;
    } else if (availableQty > 0) {
      suitability = 'SAFETY_STOCK_LOCKED';
      suitabilityLabel = `Safety Buffer Locked (${availableQty} units on-hand, min threshold ${safetyThreshold})`;
    }

    candidates.push({
      storeId: sourceStoreNode.id || inv.storeId,
      storeName: sourceStoreNode.name || inv.storeName,
      city: sourceStoreNode.city || 'Karnataka',
      productName: inv.productName || inv.name,
      size: invSize,
      availableQty,
      safetyThreshold,
      transferableQty,
      distanceKm,
      standardEta,
      expressEta,
      suitability,
      suitabilityLabel,
      isRecommended,
      // Projected state if full target quantity were transferred
      projectedSourceStock: availableQty - targetQuantity,
      resultingDeficitAtSource: Math.max(0, safetyThreshold - (availableQty - targetQuantity))
    });
  }

  // Sort candidates:
  // 1. RECOMMENDED_OPTIMAL first
  // 2. Highest transferable quantity
  // 3. Shortest distance (closest store)
  candidates.sort((a, b) => {
    const rank = {
      RECOMMENDED_OPTIMAL: 1,
      PARTIAL_COVERAGE: 2,
      SAFETY_STOCK_LOCKED: 3,
      UNSUITABLE_NO_STOCK: 4
    };
    if (rank[a.suitability] !== rank[b.suitability]) {
      return rank[a.suitability] - rank[b.suitability];
    }
    if (b.transferableQty !== a.transferableQty) {
      return b.transferableQty - a.transferableQty;
    }
    return a.distanceKm - b.distanceKm;
  });

  return candidates;
}

/**
 * Evaluates whether a shortage situation should be resolved via:
 * 1. Inter-store Transfer
 * 2. Supplier Purchase Reorder
 * 3. Split Transfer + Reorder
 * 4. Monitoring without immediate action
 *
 * @param {Object} item - Low stock inventory item
 * @param {Object} forecast - Demand forecast result from calculateItemDemandForecast
 * @param {Array<Object>} allInventory - All inventory items in network
 * @param {Array<Object>} storesList - All store nodes
 * @returns {Object} Comprehensive decision recommendation
 */
export function evaluateTransferVsReorder(item, forecast, allInventory = [], storesList = []) {
  const neededQty = forecast.requiredReplenishment;

  // Case A: No replenishment needed
  if (neededQty <= 0 && !forecast.isCurrentShortage) {
    return {
      actionType: 'MONITOR',
      badgeText: 'MONITOR ONLY',
      badgeColor: '#10b981',
      actionTitle: 'Sufficient Forward Cover — No Immediate Rebalance',
      recommendedQty: 0,
      recommendedStore: null,
      transferLeadTime: null,
      reorderLeadTime: null,
      explanation: `Current stock (${forecast.currentQty} units) covers expected demand (${forecast.totalForecastDemand} units over ${forecast.horizonDays} days) while maintaining the ${forecast.safetyStock}-unit safety threshold.`,
      candidateStores: []
    };
  }

  // Find candidate source stores for the EXACT product and size
  const candidateStores = findEligibleSourceStores(item, allInventory, storesList, neededQty);
  const bestSource = candidateStores.find(c => c.suitability === 'RECOMMENDED_OPTIMAL');
  const partialSource = candidateStores.find(c => c.suitability === 'PARTIAL_COVERAGE');

  // Case B: Clean Inter-Store Transfer available
  if (bestSource && bestSource.transferableQty >= neededQty) {
    const daysUntilStockout = forecast.daysUntilStockout ?? 99;
    const standardDurationDays = bestSource.standardEta.durationHours / 24;

    const useExpress = standardDurationDays >= daysUntilStockout;
    const selectedEta = useExpress ? bestSource.expressEta : bestSource.standardEta;

    return {
      actionType: 'TRANSFER',
      badgeText: useExpress ? 'EXPEDITED TRANSFER' : 'INTER-STORE TRANSFER',
      badgeColor: '#38bdf8',
      actionTitle: `Transfer ${neededQty} units from ${bestSource.storeName}`,
      recommendedQty: neededQty,
      recommendedStore: bestSource,
      deliveryMode: useExpress ? 'express' : 'normal',
      estimatedArrival: selectedEta.formattedArrival,
      estimatedDuration: selectedEta.formattedDuration,
      transferLeadTime: selectedEta.formattedDuration,
      reorderLeadTime: '5-7 business days',
      explanation: `Optimal transfer source identified: ${bestSource.storeName} (${bestSource.city}) has ${bestSource.transferableQty} units available above its ${bestSource.safetyThreshold} safety threshold. Cargo arrives in ~${selectedEta.formattedDuration} to replenish stock without creating a donor deficit.`,
      candidateStores
    };
  }

  // Case C: Partial transfer possible, but insufficient for total horizon demand
  if (partialSource && partialSource.transferableQty > 0) {
    const transferQty = partialSource.transferableQty;
    const reorderRemainder = neededQty - transferQty;

    return {
      actionType: 'SPLIT_TRANSFER_REORDER',
      badgeText: 'TRANSFER + REORDER',
      badgeColor: '#eab308',
      actionTitle: `Transfer ${transferQty} units from ${partialSource.storeName} & Reorder ${reorderRemainder} units`,
      recommendedQty: transferQty,
      recommendedStore: partialSource,
      reorderRemainderQty: reorderRemainder,
      deliveryMode: 'express',
      estimatedArrival: partialSource.expressEta.formattedArrival,
      estimatedDuration: partialSource.expressEta.formattedDuration,
      transferLeadTime: partialSource.expressEta.formattedDuration,
      reorderLeadTime: '5-7 business days',
      explanation: `${partialSource.storeName} can immediately spare ${transferQty} units to prevent near-term stockout, but network surplus cannot cover total projected demand (${neededQty} units). Recommended dual strategy: transfer immediate stock and issue purchase reorder for remainder.`,
      candidateStores
    };
  }

  // Case D: Network-wide stock exhaustion — Reorder required
  const isCriticalStockout = forecast.daysUntilStockout !== null && forecast.daysUntilStockout <= 2;

  return {
    actionType: isCriticalStockout ? 'EXPEDITED_REORDER' : 'REORDER',
    badgeText: isCriticalStockout ? 'EXPEDITED REORDER' : 'APPROVE REORDER',
    badgeColor: '#f43f5e',
    actionTitle: `${isCriticalStockout ? 'Expedited' : 'Standard'} Supplier Purchase Reorder (${neededQty} units)`,
    recommendedQty: Math.max(neededQty, 30),
    recommendedStore: null,
    supplierName: 'ThreadIQ Central Apparel Mills (Bengaluru Logistics Depot)',
    reorderLeadTime: isCriticalStockout ? '2-3 business days (Air Freight)' : '5-7 business days (Standard Line-haul)',
    transferLeadTime: 'No eligible store available',
    explanation: `No stores across Karnataka have transferable surplus for size ${item.size} without breaching safety limits. Reorder from supplier required to replenish inventory for sustained demand.`,
    candidateStores
  };
}

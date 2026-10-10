/**
 * ThreadIQ - Inventory Data Contract & Schema Validator
 *
 * Defines the contract expected from the future Employee Dashboard when it
 * submits store inventory counts, adjustments, and telemetry.
 *
 * Features:
 * - Deterministic record validation
 * - Graceful fallback for missing fields (threshold, velocity)
 * - ISO-8601 timestamp validation and staleness detection
 * - Flexible schema normalization
 */

export const INVENTORY_REQUIRED_FIELDS = [
  'storeId',
  'productId',
  'productName',
  'size',
  'quantityAvailable'
];

/**
 * Validates a single inventory record from any provider or employee dashboard.
 * @param {Object} record - Raw inventory record
 * @returns {{ isValid: boolean, errors: string[], warnings: string[] }}
 */
export function validateInventoryRecord(record) {
  const errors = [];
  const warnings = [];

  if (!record || typeof record !== 'object') {
    return { isValid: false, errors: ['Record must be a non-null object'], warnings: [] };
  }

  // Required core fields
  if (!record.storeId || typeof record.storeId !== 'string') {
    errors.push('Missing or invalid "storeId" (expected non-empty string)');
  }
  if (!record.productId || typeof record.productId !== 'string') {
    errors.push('Missing or invalid "productId" (expected non-empty string)');
  }
  if (!record.productName || typeof record.productName !== 'string') {
    errors.push('Missing or invalid "productName" (expected non-empty string)');
  }
  if (!record.size || typeof record.size !== 'string') {
    errors.push('Missing or invalid "size" (expected non-empty string)');
  }

  // Quantity Available check
  if (record.quantityAvailable === undefined || record.quantityAvailable === null || isNaN(Number(record.quantityAvailable))) {
    errors.push('"quantityAvailable" is required and must be a valid number');
  } else if (Number(record.quantityAvailable) < 0) {
    warnings.push('"quantityAvailable" is negative. Flagged as potential count anomaly.');
  }

  // Minimum Stock Threshold check (optional in early integration, but needed for low stock checks)
  if (record.minimumStockThreshold !== undefined && record.minimumStockThreshold !== null) {
    if (isNaN(Number(record.minimumStockThreshold)) || Number(record.minimumStockThreshold) < 0) {
      warnings.push('"minimumStockThreshold" is non-numeric or negative. Threshold checks disabled for this item.');
    }
  } else {
    warnings.push('"minimumStockThreshold" is omitted. Low-stock classification cannot be evaluated.');
  }

  // Daily Sales Velocity check (optional, needed for stockout forecasts)
  if (record.dailySalesVelocity !== undefined && record.dailySalesVelocity !== null) {
    if (isNaN(Number(record.dailySalesVelocity)) || Number(record.dailySalesVelocity) < 0) {
      warnings.push('"dailySalesVelocity" is non-numeric or negative. Stockout forecast cannot be calculated.');
    }
  } else {
    warnings.push('"dailySalesVelocity" is omitted. Stockout forecast will be flagged as limited data.');
  }

  // Timestamp check
  if (record.lastUpdated) {
    const timestamp = new Date(record.lastUpdated).getTime();
    if (isNaN(timestamp)) {
      warnings.push('"lastUpdated" is not a valid ISO-8601 date string. Using system ingest timestamp.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Normalizes an inventory record to enforce standard types and metadata flags.
 * @param {Object} raw - Raw input record
 * @returns {Object} Normalized record conforming to ThreadIQ contract
 */
export function normalizeInventoryRecord(raw) {
  const quantity = Number(raw.quantityAvailable) || 0;
  const threshold = raw.minimumStockThreshold !== undefined && raw.minimumStockThreshold !== null
    ? Number(raw.minimumStockThreshold)
    : null;
  const velocity = raw.dailySalesVelocity !== undefined && raw.dailySalesVelocity !== null
    ? Number(raw.dailySalesVelocity)
    : null;

  const lastUpdated = raw.lastUpdated && !isNaN(new Date(raw.lastUpdated).getTime())
    ? new Date(raw.lastUpdated).toISOString()
    : new Date().toISOString();

  // Staleness detection (> 24 hours without sync)
  const ageHours = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60);
  const isStale = ageHours > 24;

  return {
    storeId: String(raw.storeId || 'UNKNOWN-STORE'),
    storeName: String(raw.storeName || raw.storeId || 'Retail Node'),
    productId: String(raw.productId || 'UNKNOWN-SKU'),
    productName: String(raw.productName || 'Apparel Item'),
    size: String(raw.size || 'STD'),
    quantityAvailable: quantity,
    minimumStockThreshold: threshold,
    dailySalesVelocity: velocity,
    lastUpdated,
    metadata: {
      hasThreshold: threshold !== null && !isNaN(threshold),
      hasSalesVelocity: velocity !== null && !isNaN(velocity) && velocity > 0,
      isZeroVelocity: velocity === 0,
      isNegativeStock: quantity < 0,
      isStale,
      ageHours: Number(ageHours.toFixed(1)),
      source: raw._source || 'employee-dashboard-integration'
    }
  };
}

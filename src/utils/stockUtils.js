/**
 * ThreadIQ - Centralized Stock Status and Inventory Utilities
 * Provides reusable threshold evaluation, status color tokens, and sorting helpers.
 */

export const DEFAULT_MIN_THRESHOLD = 3;
export const DEFAULT_MAX_THRESHOLD = 8;

/**
 * Calculates stock status classification, colors, and badge metadata.
 *
 * GREEN  (#10b981) — Balanced stock (within configured healthy threshold range)
 * YELLOW (#eab308) — Excess stock (exceeds maximum threshold)
 * RED    (#f43f5e) — Low stock (falls below minimum threshold)
 *
 * @param {number} quantity - Current units in stock
 * @param {number} [minThreshold=15] - Minimum required threshold
 * @param {number} [maxThreshold=75] - Maximum healthy threshold
 */
export function getStockStatusInfo(quantity, minThreshold = DEFAULT_MIN_THRESHOLD, maxThreshold = DEFAULT_MAX_THRESHOLD) {
  const qty = Number(quantity) || 0;
  const min = Number(minThreshold) || DEFAULT_MIN_THRESHOLD;
  const max = Number(maxThreshold) || DEFAULT_MAX_THRESHOLD;

  if (qty < min) {
    return {
      status: 'Low stock',
      type: 'low',
      label: 'Low stock',
      color: '#f43f5e',
      bgColor: 'rgba(244, 63, 94, 0.15)',
      borderColor: 'rgba(244, 63, 94, 0.45)',
      ringColor: 'rgba(244, 63, 94, 0.25)',
      accessibleDescription: `${qty} units — Low stock alert (below ${min} units threshold)`
    };
  }

  if (qty > max) {
    return {
      status: 'Excess stock',
      type: 'excess',
      label: 'Excess stock',
      color: '#eab308',
      bgColor: 'rgba(234, 179, 8, 0.15)',
      borderColor: 'rgba(234, 179, 8, 0.45)',
      ringColor: 'rgba(234, 179, 8, 0.25)',
      accessibleDescription: `${qty} units — Excess stock (exceeds ${max} units threshold)`
    };
  }

  return {
    status: 'Balanced stock',
    type: 'balanced',
    label: 'Balanced stock',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.45)',
    ringColor: 'rgba(16, 185, 129, 0.25)',
    accessibleDescription: `${qty} units — Healthy balanced stock level`
  };
}

/**
 * Normalized size weight for sorting sizes (XL, 2XL, 3XL, 4XL, 5XL)
 */
export const SIZE_WEIGHTS = {
  'XS': 1,
  'S': 2,
  'M': 3,
  'L': 4,
  'XL': 5,
  'XXL': 6,
  '2XL': 6,
  'XXXL': 7,
  '3XL': 7,
  '4XL': 8,
  '5XL': 9
};

/**
 * Normalized status weight for sorting
 */
export const STATUS_WEIGHTS = {
  'low': 1,
  'balanced': 2,
  'excess': 3
};

/**
 * Calculates store-level stock status based on its inventory items and active filters.
 * Supports product, colour, size, and category filters.
 *
 * Rules:
 * 1. If product is filtered and store has no inventory record for that product:
 *    Returns explicit 'Inventory not configured' state (NOT zero stock!).
 * 2. If any matching variant has 0 units:
 *    Status: 'Stockout' / 'Low Stock' (RED, pulsing)
 * 3. Else if any matching variant has units < minThreshold:
 *    Status: 'Low Stock' (RED, pulsing)
 * 4. Else if any matching variant has units > maxThreshold:
 *    Status: 'Excess Stock' (YELLOW)
 * 5. Else:
 *    Status: 'Healthy Stock' (GREEN)
 */
export function calculateStoreStatus(
  store,
  inventoryItems = [],
  sizeFilterOrOptions = 'All Sizes',
  categoryFilterArg = 'All Categories',
  productFilterArg = 'All Products',
  colourFilterArg = 'All Colours'
) {
  // Support both options object and positional arguments
  let sizeFilter = 'All Sizes';
  let categoryFilter = 'All Categories';
  let productFilter = 'All Products';
  let colourFilter = 'All Colours';

  if (typeof sizeFilterOrOptions === 'object' && sizeFilterOrOptions !== null) {
    sizeFilter = sizeFilterOrOptions.sizeFilter || 'All Sizes';
    categoryFilter = sizeFilterOrOptions.categoryFilter || 'All Categories';
    productFilter = sizeFilterOrOptions.productFilter || 'All Products';
    colourFilter = sizeFilterOrOptions.colourFilter || 'All Colours';
  } else {
    sizeFilter = sizeFilterOrOptions || 'All Sizes';
    categoryFilter = categoryFilterArg || 'All Categories';
    productFilter = productFilterArg || 'All Products';
    colourFilter = colourFilterArg || 'All Colours';
  }

  // Filter inventory items belonging to this store
  const storeItems = inventoryItems.filter(
    (item) => item.storeId === store.id || item.storeName === store.name
  );

  // 1. PRODUCT-AWARE CHECK:
  // If user selected a specific product, check if this store has any records for it
  let productItems = storeItems;
  if (productFilter && productFilter !== 'All Products') {
    productItems = storeItems.filter(
      (item) => item.productName === productFilter || item.name === productFilter
    );

    // If store has NO inventory record for this product, return explicit unconfigured state
    if (productItems.length === 0) {
      return {
        status: 'Inventory not configured',
        statusType: 'not_configured',
        color: '#71717a',
        bgColor: 'rgba(113, 113, 122, 0.12)',
        borderColor: 'rgba(113, 113, 122, 0.45)',
        label: 'Inventory Not Configured',
        hasMatches: false,
        isConfigured: false,
        notConfigured: true,
        itemCount: 0,
        totalUnits: null, // explicit null: do not treat as verified zero stock!
        lowStockCount: 0,
        outOfStockCount: 0,
        excessStockCount: 0,
        balancedStockCount: 0,
        lowStockSizes: [],
        outOfStockSizes: [],
        excessStockSizes: [],
        balancedSizes: [],
        isPulsing: false,
        accessibleDescription: `${store.name}: Inventory not configured for ${productFilter}`
      };
    }
  }

  let items = productItems;

  // 2. COLOUR FILTER
  if (colourFilter && colourFilter !== 'All Colours') {
    items = items.filter(
      (item) => item.colour?.toLowerCase() === colourFilter.toLowerCase()
    );
  }

  // 3. SIZE FILTER
  if (sizeFilter && sizeFilter !== 'All Sizes') {
    items = items.filter((item) => item.size === sizeFilter);
  }

  // 4. CATEGORY FILTER
  if (categoryFilter && categoryFilter !== 'All Categories') {
    items = items.filter(
      (item) => item.category?.toLowerCase() === categoryFilter.toLowerCase()
    );
  }

  // If store carries product but this specific colour/size combination has no items
  if (items.length === 0) {
    return {
      status: 'No matching stock',
      statusType: 'neutral',
      color: '#71717a',
      bgColor: 'rgba(113, 113, 122, 0.15)',
      borderColor: 'rgba(113, 113, 122, 0.4)',
      label: 'No Data for Filter',
      hasMatches: false,
      isConfigured: true,
      notConfigured: false,
      itemCount: 0,
      totalUnits: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      excessStockCount: 0,
      balancedStockCount: 0,
      lowStockSizes: [],
      outOfStockSizes: [],
      excessStockSizes: [],
      balancedSizes: [],
      isPulsing: false,
      accessibleDescription: `${store.name}: No stock matching variant filters`
    };
  }

  let lowStockCount = 0;
  let outOfStockCount = 0;
  let excessStockCount = 0;
  let balancedStockCount = 0;
  let totalUnits = 0;
  const lowStockSizes = [];
  const outOfStockSizes = [];
  const excessStockSizes = [];
  const balancedSizes = [];

  items.forEach((item) => {
    const qty = Number(item.availableQty ?? item.quantityAvailable ?? item.quantity ?? 0);
    totalUnits += qty;
    const min = item.minThreshold || item.minimumStockThreshold || DEFAULT_MIN_THRESHOLD;
    const max = item.maxThreshold || DEFAULT_MAX_THRESHOLD;

    if (qty === 0) {
      outOfStockCount++;
      lowStockCount++;
      if (!outOfStockSizes.includes(item.size)) outOfStockSizes.push(item.size);
      if (!lowStockSizes.includes(item.size)) lowStockSizes.push(item.size);
    } else if (qty < min) {
      lowStockCount++;
      if (!lowStockSizes.includes(item.size)) lowStockSizes.push(item.size);
    } else if (qty > max) {
      excessStockCount++;
      if (!excessStockSizes.includes(item.size)) excessStockSizes.push(item.size);
    } else {
      balancedStockCount++;
      if (!balancedSizes.includes(item.size)) balancedSizes.push(item.size);
    }
  });

  if (outOfStockCount > 0) {
    return {
      status: 'Stockout',
      statusType: 'danger',
      color: '#f43f5e',
      bgColor: 'rgba(244, 63, 94, 0.15)',
      borderColor: '#f43f5e',
      label: `Stockout (${outOfStockSizes.join(', ')})`,
      hasMatches: true,
      isConfigured: true,
      notConfigured: false,
      itemCount: items.length,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      excessStockCount,
      balancedStockCount,
      lowStockSizes,
      outOfStockSizes,
      excessStockSizes,
      balancedSizes,
      isPulsing: true,
      accessibleDescription: `${store.name}: Stockout alert for sizes ${outOfStockSizes.join(', ')}`
    };
  }

  if (lowStockCount > 0) {
    return {
      status: 'Low Stock',
      statusType: 'danger',
      color: '#f43f5e',
      bgColor: 'rgba(244, 63, 94, 0.15)',
      borderColor: '#f43f5e',
      label: `Low Stock (${lowStockSizes.join(', ')})`,
      hasMatches: true,
      isConfigured: true,
      notConfigured: false,
      itemCount: items.length,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      excessStockCount,
      balancedStockCount,
      lowStockSizes,
      outOfStockSizes,
      excessStockSizes,
      balancedSizes,
      isPulsing: true,
      accessibleDescription: `${store.name}: Low stock alert for sizes ${lowStockSizes.join(', ')}`
    };
  }

  if (excessStockCount > 0) {
    return {
      status: 'Excess Stock',
      statusType: 'warning',
      color: '#eab308',
      bgColor: 'rgba(234, 179, 8, 0.15)',
      borderColor: '#eab308',
      label: `Excess Stock (${excessStockSizes.join(', ')})`,
      hasMatches: true,
      isConfigured: true,
      notConfigured: false,
      itemCount: items.length,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      excessStockCount,
      balancedStockCount,
      lowStockSizes,
      outOfStockSizes,
      excessStockSizes,
      balancedSizes,
      isPulsing: false,
      accessibleDescription: `${store.name}: Excess stock in sizes ${excessStockSizes.join(', ')}`
    };
  }

  return {
    status: 'Healthy Stock',
    statusType: 'success',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    label: 'Healthy Stock',
    hasMatches: true,
    isConfigured: true,
    notConfigured: false,
    itemCount: items.length,
    totalUnits,
    lowStockCount,
    outOfStockCount,
    excessStockCount,
    balancedStockCount,
    lowStockSizes,
    outOfStockSizes,
    excessStockSizes,
    balancedSizes,
    isPulsing: false,
    accessibleDescription: `${store.name}: Healthy balanced inventory`
  };
}

/**
 * Calculates store-specific inventory breakdown for the selected product, colour, and size.
 * Returns { isConfigured: boolean, totalUnits: number, items: Array, ... }
 */
export function getStoreProductBreakdown(
  storeId,
  inventoryItems = [],
  productFilter = 'All Products',
  colourFilter = 'All Colours',
  sizeFilter = 'All Sizes'
) {
  const storeItems = inventoryItems.filter(
    (item) => item.storeId === storeId || item.storeName === storeId
  );

  let items = storeItems;
  if (productFilter && productFilter !== 'All Products') {
    items = items.filter(
      (item) => item.productName === productFilter || item.name === productFilter
    );

    if (items.length === 0) {
      return {
        isConfigured: false,
        productName: productFilter,
        skuPrefix: 'N/A',
        totalUnits: null,
        items: [],
        colours: [],
        lowStockSizes: [],
        outOfStockSizes: [],
        excessStockSizes: [],
        balancedSizes: []
      };
    }
  }

  const allColoursForStoreProduct = [...new Set(items.map((it) => it.colour).filter(Boolean))].sort();

  if (colourFilter && colourFilter !== 'All Colours') {
    items = items.filter(
      (it) => it.colour?.toLowerCase() === colourFilter.toLowerCase()
    );
  }

  if (sizeFilter && sizeFilter !== 'All Sizes') {
    items = items.filter((it) => it.size === sizeFilter);
  }

  const sorted = [...items].sort(
    (a, b) => (SIZE_WEIGHTS[a.size] || 99) - (SIZE_WEIGHTS[b.size] || 99)
  );

  const rows = sorted.map((it) => {
    const qty = Number(it.availableQty ?? it.quantityAvailable ?? it.quantity ?? 0);
    const min = it.minThreshold || it.minimumStockThreshold || DEFAULT_MIN_THRESHOLD;
    const max = it.maxThreshold || DEFAULT_MAX_THRESHOLD;

    let status = 'Healthy';
    let statusType = 'balanced';
    let color = '#10b981';

    if (qty === 0) {
      status = 'Out of Stock';
      statusType = 'low';
      color = '#f43f5e';
    } else if (qty < min) {
      status = 'Low Stock';
      statusType = 'low';
      color = '#f43f5e';
    } else if (qty > max) {
      status = 'Excess Stock';
      statusType = 'excess';
      color = '#eab308';
    }

    return {
      id: it.id,
      size: it.size,
      colour: it.colour,
      sku: it.sku || it.skuCode || 'N/A',
      productName: it.productName || it.name,
      units: qty,
      minThreshold: min,
      maxThreshold: max,
      status,
      statusType,
      color,
      item: it
    };
  });

  const totalUnits = rows.reduce((acc, r) => acc + r.units, 0);
  const lowStockSizes = [...new Set(rows.filter((r) => r.units > 0 && r.units < r.minThreshold).map((r) => r.size))];
  const outOfStockSizes = [...new Set(rows.filter((r) => r.units === 0).map((r) => r.size))];
  const excessStockSizes = [...new Set(rows.filter((r) => r.units > r.maxThreshold).map((r) => r.size))];
  const balancedSizes = [...new Set(rows.filter((r) => r.units >= r.minThreshold && r.units <= r.maxThreshold).map((r) => r.size))];

  const primarySku = rows[0]?.sku || (items[0]?.sku || items[0]?.skuCode) || 'N/A';
  // Common SKU prefix (e.g., TIQ-SPM-NVY)
  const skuPrefix = primarySku.includes('-')
    ? primarySku.substring(0, primarySku.lastIndexOf('-'))
    : primarySku;

  return {
    isConfigured: true,
    productName: productFilter !== 'All Products' ? productFilter : (rows[0]?.productName || 'All Products'),
    sku: primarySku,
    skuPrefix,
    totalUnits,
    items: rows,
    colours: allColoursForStoreProduct,
    lowStockSizes,
    outOfStockSizes,
    excessStockSizes,
    balancedSizes
  };
}

/**
 * Extracts unique catalogue products dynamically from real inventory records.
 */
export function getCatalogueProducts(inventoryItems = []) {
  const map = new Map();

  inventoryItems.forEach((item) => {
    const name = item.productName || item.name;
    if (!name) return;

    if (!map.has(name)) {
      map.set(name, {
        productName: name,
        category: item.category || 'T-shirts',
        skus: new Set(),
        colours: new Set(),
        sizes: new Set(),
        totalUnits: 0,
        storesWithStock: new Set(),
        configuredStoreIds: new Set(),
        lowStockSizes: new Set(),
        outOfStockSizes: new Set(),
        excessStockSizes: new Set(),
        productId: item.productId || item.id,
        sampleSku: item.sku || item.skuCode || ''
      });
    }

    const entry = map.get(name);
    if (item.sku || item.skuCode) entry.skus.add(item.sku || item.skuCode);
    if (item.colour) entry.colours.add(item.colour);
    if (item.size) entry.sizes.add(item.size);
    if (item.storeId) entry.configuredStoreIds.add(item.storeId);

    const qty = Number(item.availableQty ?? item.quantityAvailable ?? item.quantity ?? 0);
    entry.totalUnits += qty;
    if (qty > 0 && item.storeId) entry.storesWithStock.add(item.storeId);

    const min = item.minThreshold || item.minimumStockThreshold || DEFAULT_MIN_THRESHOLD;
    const max = item.maxThreshold || DEFAULT_MAX_THRESHOLD;

    if (qty === 0) {
      entry.outOfStockSizes.add(item.size);
      entry.lowStockSizes.add(item.size);
    } else if (qty < min) {
      entry.lowStockSizes.add(item.size);
    } else if (qty > max) {
      entry.excessStockSizes.add(item.size);
    }
  });

  return Array.from(map.values()).map((p) => {
    const sampleSku = p.sampleSku || Array.from(p.skus)[0] || '';
    const skuPrefix = sampleSku.includes('-')
      ? sampleSku.substring(0, sampleSku.lastIndexOf('-'))
      : sampleSku;

    return {
      ...p,
      skuPrefix: skuPrefix || p.productId,
      skus: Array.from(p.skus),
      colours: Array.from(p.colours).sort(),
      sizes: Array.from(p.sizes).sort((a, b) => (SIZE_WEIGHTS[a] || 99) - (SIZE_WEIGHTS[b] || 99)),
      lowStockSizes: Array.from(p.lowStockSizes).sort((a, b) => (SIZE_WEIGHTS[a] || 99) - (SIZE_WEIGHTS[b] || 99)),
      outOfStockSizes: Array.from(p.outOfStockSizes).sort((a, b) => (SIZE_WEIGHTS[a] || 99) - (SIZE_WEIGHTS[b] || 99)),
      excessStockSizes: Array.from(p.excessStockSizes).sort((a, b) => (SIZE_WEIGHTS[a] || 99) - (SIZE_WEIGHTS[b] || 99)),
      configuredStoreIds: Array.from(p.configuredStoreIds),
      storesWithStock: Array.from(p.storesWithStock)
    };
  });
}

/**
 * Calculates product-specific transfer recommendations grounded in backend inventory.
 * Enforces:
 * 1. Exact match of product, colour, and size (never cross-mixes SKUs).
 * 2. Source store must have transferable surplus above safety minimum threshold.
 * 3. Deducts committed quantities from pending/approved transfers so surplus isn't double-allocated.
 * 4. Destination store must have genuine deficit below minimum threshold.
 */
export function calculateProductTransferRecommendations({
  inventory = [],
  transfers = [],
  selectedProduct = 'All Products',
  selectedColour = 'All Colours',
  selectedSize = 'All Sizes',
  stores = []
}) {
  if (!inventory || inventory.length === 0) return [];

  // Filter items matching selected product
  let targetItems = inventory;
  if (selectedProduct && selectedProduct !== 'All Products') {
    targetItems = targetItems.filter(
      (it) => it.productName === selectedProduct || it.name === selectedProduct
    );
  }
  if (selectedColour && selectedColour !== 'All Colours') {
    targetItems = targetItems.filter(
      (it) => it.colour?.toLowerCase() === selectedColour.toLowerCase()
    );
  }
  if (selectedSize && selectedSize !== 'All Sizes') {
    targetItems = targetItems.filter((it) => it.size === selectedSize);
  }

  // Calculate committed stock from active / pending / in-transit transfers
  // Key: `${sourceStoreId}__${productName}__${colour}__${size}`
  const committedMap = new Map();
  transfers.forEach((tr) => {
    const status = (tr.status || tr.deliveryStatus || '').toLowerCase();
    if (status === 'approved' || status === 'in_transit' || status === 'in transit' || status === 'dispatched' || status === 'pending') {
      const key = `${tr.sourceStoreId}__${tr.productName}__${tr.colour}__${tr.size}`;
      const prev = committedMap.get(key) || 0;
      committedMap.set(key, prev + Number(tr.quantity || 0));
    }
  });

  // Group items by unique variant: `${productName}__${colour}__${size}`
  const variantMap = new Map();
  targetItems.forEach((it) => {
    const pName = it.productName || it.name;
    const key = `${pName}__${it.colour}__${it.size}`;
    if (!variantMap.has(key)) {
      variantMap.set(key, {
        productName: pName,
        colour: it.colour,
        size: it.size,
        sku: it.sku || it.skuCode || '',
        category: it.category || 'T-shirts',
        storeItems: []
      });
    }
    variantMap.get(key).storeItems.push(it);
  });

  const recommendations = [];

  variantMap.forEach((v) => {
    const shortages = [];
    const surpluses = [];

    v.storeItems.forEach((it) => {
      const storeId = it.storeId;
      const storeName = it.storeName || (stores.find((s) => s.id === storeId)?.name) || storeId;
      const currentQty = Number(it.availableQty ?? it.quantityAvailable ?? it.quantity ?? 0);
      const minThreshold = it.minThreshold || it.minimumStockThreshold || DEFAULT_MIN_THRESHOLD;
      const maxThreshold = it.maxThreshold || DEFAULT_MAX_THRESHOLD;

      // Committed stock check
      const committedKey = `${storeId}__${v.productName}__${v.colour}__${v.size}`;
      const committed = committedMap.get(committedKey) || 0;
      const effectiveQty = Math.max(0, currentQty - committed);

      if (effectiveQty < minThreshold) {
        shortages.push({
          storeId,
          storeName,
          currentQty,
          effectiveQty,
          minThreshold,
          deficit: minThreshold - effectiveQty
        });
      } else if (effectiveQty > minThreshold) {
        // Transferable surplus is whatever is above the min safety threshold
        const transferableSurplus = effectiveQty - minThreshold;
        if (transferableSurplus > 0) {
          surpluses.push({
            storeId,
            storeName,
            currentQty,
            effectiveQty,
            minThreshold,
            maxThreshold,
            surplus: transferableSurplus
          });
        }
      }
    });

    // Sort shortages by deficit descending (most critical first)
    shortages.sort((a, b) => b.deficit - a.deficit);
    // Sort surpluses by surplus descending (largest surplus first)
    surpluses.sort((a, b) => b.surplus - a.surplus);

    // Rebalance matching
    shortages.forEach((shortage) => {
      let needed = shortage.deficit;

      for (let i = 0; i < surpluses.length && needed > 0; i++) {
        const surplusStore = surpluses[i];
        if (surplusStore.storeId === shortage.storeId || surplusStore.surplus <= 0) continue;

        const moveQty = Math.min(needed, surplusStore.surplus);
        if (moveQty > 0) {
          surplusStore.surplus -= moveQty;
          needed -= moveQty;

          const recId = `REC-OPT-${v.sku || 'SKU'}-${surplusStore.storeId}-${shortage.storeId}`;
          recommendations.push({
            id: recId,
            transferId: `PROP-${v.sku}-${shortage.storeId.substring(shortage.storeId.length - 4)}`,
            productName: v.productName,
            colour: v.colour,
            size: v.size,
            sku: v.sku,
            quantity: moveQty,
            sourceStoreId: surplusStore.storeId,
            sourceStoreName: surplusStore.storeName,
            destStoreId: shortage.storeId,
            destStoreName: shortage.storeName,
            sourceStockAvailable: surplusStore.currentQty,
            destStockAvailable: shortage.currentQty,
            sourceThreshold: surplusStore.minThreshold,
            destThreshold: shortage.minThreshold,
            status: 'Proposed Recommendation',
            reason: `Transferable surplus of ${moveQty} units from ${surplusStore.storeName} (has ${surplusStore.currentQty} units) rebalances shortage at ${shortage.storeName} (has ${shortage.currentQty} units, safety minimum: ${shortage.minThreshold}).`,
            action: 'Transfer'
          });
        }
      }
    });
  });

  return recommendations;
}

/**
 * Calculates size-level breakdown table for a given store.
 * Retained for legacy compatibility.
 */
export function getStoreSizeBreakdown(storeId, inventoryItems = []) {
  const SIZES_LIST = ['XL', '2XL', '3XL', '4XL', '5XL'];
  const storeItems = inventoryItems.filter(item => item.storeId === storeId);

  return SIZES_LIST.map(size => {
    const matching = storeItems.filter(item => item.size === size);
    const units = matching.reduce((sum, it) => sum + (it.availableQty || 0), 0);

    let status = 'Balanced';
    let statusType = 'balanced';
    let color = '#10b981';

    if (units === 0) {
      status = 'Stockout';
      statusType = 'low';
      color = '#f43f5e';
    } else if (units < 15) {
      status = 'Low Stock';
      statusType = 'low';
      color = '#f43f5e';
    } else if (units > 75) {
      status = 'Excess Stock';
      statusType = 'excess';
      color = '#eab308';
    }

    return {
      size,
      units,
      status,
      statusType,
      color,
      itemCount: matching.length
    };
  });
}

/**
 * Calculate Great-Circle Distance between two coordinates in statute miles (Haversine formula).
 */
export function calculateDistanceMiles(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 3958.8; // Radius of the Earth in miles
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}


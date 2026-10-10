/**
 * ThreadIQ Summary Cards Component
 * Displays 4 KPI metrics: Total Stock Units, Available Products, Low-Stock Variants, Out-of-Stock Variants.
 */

import { getIcon } from './icons.js';

export function renderSummaryCards(summary) {
  const container = document.getElementById('summary-cards-container');
  if (!container) return;

  const {
    totalStockUnits = 0,
    availableProducts = 0,
    lowStockVariants = 0,
    outOfStockVariants = 0,
    totalTrackedVariants = 20
  } = summary;

  const lowStockTrend = lowStockVariants > 0 ? 'warning' : 'positive';
  const outOfStockTrend = outOfStockVariants > 0 ? 'danger' : 'positive';

  container.innerHTML = `
    <!-- Card 1: Total Stock Units -->
    <div class="summary-card" id="card-total-stock">
      <div class="summary-card-header">
        <span class="card-title-text">Total Stock Units</span>
        <div class="card-icon-pill blue">
          ${getIcon('box', '', 20)}
        </div>
      </div>
      <div class="summary-card-value">${totalStockUnits.toLocaleString()}</div>
      <div class="summary-card-footer">
        <span>Recorded inventory in store</span>
        <span class="trend-badge neutral">
          ${getIcon('layers', '', 12)} Bengaluru Central
        </span>
      </div>
    </div>

    <!-- Card 2: Available Products -->
    <div class="summary-card" id="card-available-products">
      <div class="summary-card-header">
        <span class="card-title-text">Available Products</span>
        <div class="card-icon-pill green">
          ${getIcon('check-circle', '', 20)}
        </div>
      </div>
      <div class="summary-card-value">${availableProducts} <span style="font-size: 1rem; font-weight: 500; color: var(--color-text-subtle);">/ ${totalTrackedVariants}</span></div>
      <div class="summary-card-footer">
        <span>Variants with stock &gt; 0</span>
        <span class="trend-badge positive">
          ${Math.round((availableProducts / (totalTrackedVariants || 1)) * 100)}% Available
        </span>
      </div>
    </div>

    <!-- Card 3: Low-Stock Variants -->
    <div class="summary-card" id="card-low-stock">
      <div class="summary-card-header">
        <span class="card-title-text">Low-Stock Variants</span>
        <div class="card-icon-pill amber">
          ${getIcon('alert-triangle', '', 20)}
        </div>
      </div>
      <div class="summary-card-value" style="color: ${lowStockVariants > 0 ? 'var(--color-warning)' : 'inherit'};">${lowStockVariants}</div>
      <div class="summary-card-footer">
        <span>Below minimum threshold</span>
        <span class="trend-badge ${lowStockTrend}">
          ${lowStockVariants > 0 ? 'Restock Soon' : 'Optimal'}
        </span>
      </div>
    </div>

    <!-- Card 4: Out-of-Stock Variants -->
    <div class="summary-card" id="card-out-of-stock">
      <div class="summary-card-header">
        <span class="card-title-text">Out-of-Stock Variants</span>
        <div class="card-icon-pill red">
          ${getIcon('x-circle', '', 20)}
        </div>
      </div>
      <div class="summary-card-value" style="color: ${outOfStockVariants > 0 ? 'var(--color-danger)' : 'inherit'};">${outOfStockVariants}</div>
      <div class="summary-card-footer">
        <span>Zero available quantity</span>
        <span class="trend-badge ${outOfStockTrend}">
          ${outOfStockVariants > 0 ? 'Critical Attention' : 'All In Stock'}
        </span>
      </div>
    </div>
  `;
}

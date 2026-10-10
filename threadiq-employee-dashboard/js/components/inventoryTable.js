/**
 * ThreadIQ T-Shirt Inventory Table & Product Matrix Component
 * Displays store-specific T-shirt inventory grouped by product style
 * with high-res garment image, base SKU, total stock across sizes,
 * safety thresholds, status indicators, and one-click "Update Stock" actions.
 */

import { getIcon } from './icons.js';
import { store } from '../state/store.js';
import { openUpdateModal } from './updateModal.js';

let activeViewMode = 'matrix'; // 'matrix' (grouped product cards) | 'table' (flat table)

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', '4XL', '5XL'];

function getSizeWeight(size) {
  const idx = SIZE_ORDER.indexOf(String(size).toUpperCase());
  return idx !== -1 ? idx : 99;
}

export function renderInventoryTable(items = [], options = {}) {
  const container = document.getElementById(options.targetContainerId || 'inventory-table-container');
  if (!container) return;

  const isMainInventoryView = (options.targetContainerId || 'inventory-table-container') === 'inventory-table-container';

  if (items.length === 0) {
    container.innerHTML = `
      <div style="padding: 48px 24px; text-align: center; color: var(--color-text-subtle);">
        <div style="margin: 0 auto 12px; width: 48px; height: 48px; border-radius: 50%; background: var(--color-bg-subtle); display: flex; align-items: center; justify-content: center; color: var(--color-text-light);">
          ${getIcon('package', '', 24)}
        </div>
        <h4 style="font-size: 1rem; font-weight: 600; color: var(--color-text-main); margin-bottom: 4px;">No matching T-shirts found</h4>
        <p style="font-size: 0.82rem;">Try adjusting your filters or search keywords.</p>
        <button class="btn btn-secondary btn-sm" id="btn-clear-filters" style="margin-top: 12px;">Reset Filters</button>
      </div>
    `;

    const clearBtn = container.querySelector('#btn-clear-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        store.setInventoryFilters({ search: '', colour: 'all', size: 'all', status: 'all' });
        const searchInput = document.getElementById('inventory-search-input');
        if (searchInput) searchInput.value = '';
        const colorSel = document.getElementById('filter-colour');
        if (colorSel) colorSel.value = 'all';
        const sizeSel = document.getElementById('filter-size');
        if (sizeSel) sizeSel.value = 'all';
        const statusSel = document.getElementById('filter-status');
        if (statusSel) statusSel.value = 'all';
      });
    }
    return;
  }

  // If on main inventory view, render toolbar toggle header
  let viewToolbarHtml = '';
  if (isMainInventoryView) {
    viewToolbarHtml = `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #ffffff; border-bottom: 1px solid var(--color-border); margin-bottom: 16px; border-radius: var(--radius-md);">
        <div style="font-size: 0.82rem; font-weight: 600; color: var(--color-text-muted);">
          Displaying Store T-Shirt Styles &amp; Sizing Breakdown
        </div>
        <div class="view-toggle-btn-group">
          <button class="view-toggle-btn ${activeViewMode === 'matrix' ? 'active' : ''}" id="btn-toggle-matrix">
            ${getIcon('layers', '', 14)} Product Matrix View
          </button>
          <button class="view-toggle-btn ${activeViewMode === 'table' ? 'active' : ''}" id="btn-toggle-flat">
            ${getIcon('box', '', 14)} Flat Table View
          </button>
        </div>
      </div>
    `;
  }

  if (activeViewMode === 'matrix' && isMainInventoryView) {
    renderGroupedProductMatrix(container, items, viewToolbarHtml);
  } else {
    renderFlatTableView(container, items, viewToolbarHtml);
  }

  // Attach view toggle listeners if present
  if (isMainInventoryView) {
    const matrixBtn = container.querySelector('#btn-toggle-matrix');
    const flatBtn = container.querySelector('#btn-toggle-flat');
    if (matrixBtn) {
      matrixBtn.addEventListener('click', () => {
        activeViewMode = 'matrix';
        renderInventoryTable(items, options);
      });
    }
    if (flatBtn) {
      flatBtn.addEventListener('click', () => {
        activeViewMode = 'table';
        renderInventoryTable(items, options);
      });
    }
  }

  // Bind Update Stock button clicks
  container.querySelectorAll('.btn-update-stock').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = btn.getAttribute('data-product-id');
      const sku = btn.getAttribute('data-sku');
      const size = btn.getAttribute('data-size');
      openUpdateModal({
        selectedProductId: productId,
        selectedSku: sku,
        selectedSize: size
      });
    });
  });
}

/**
 * Renders inventory grouped by T-shirt product style as sleek cards
 */
function renderGroupedProductMatrix(container, items, headerHtml = '') {
  // Group items by product name
  const groups = {};
  items.forEach(item => {
    const key = item.name || 'T-Shirt';
    if (!groups[key]) {
      // Derive clean base SKU
      let baseSku = item.sku || 'TIQ-SHIRT';
      if (typeof baseSku === 'string' && baseSku.includes('-')) {
        const parts = baseSku.split('-');
        baseSku = parts.slice(0, parts.length - 1).join('-');
      }
      groups[key] = {
        name: key,
        category: item.category || 'Casual Wear',
        imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
        baseSku: baseSku || item.sku || 'TIQ-SHIRT',
        minThreshold: item.minThreshold || 15,
        items: []
      };
    }
    groups[key].items.push(item);
  });

  const cardsHtml = Object.values(groups).map(group => {
    // Sort group items by size
    group.items.sort((a, b) => getSizeWeight(a.size) - getSizeWeight(b.size));

    const totalStock = group.items.reduce((s, i) => s + (i.quantity ?? i.availableQty ?? 0), 0);
    const latestTimestamp = group.items.reduce((max, i) => (!max || new Date(i.lastUpdated) > new Date(max) ? i.lastUpdated : max), null);
    const formattedLastUpdate = latestTimestamp ? new Date(latestTimestamp).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Just now';

    const rowsHtml = group.items.map(item => {
      const qty = item.quantity ?? item.availableQty ?? 0;
      const thold = item.minThreshold || 15;

      let statusBadge = '';
      let fillClass = '';
      let percent = Math.min(100, Math.round((qty / (thold * 1.5)) * 100));

      if (qty === 0) {
        statusBadge = `<span class="stock-status-badge critical"><span class="status-dot"></span>Critical (0)</span>`;
        fillClass = 'out-of-stock';
        percent = 0;
      } else if (qty < thold) {
        statusBadge = `<span class="stock-status-badge low"><span class="status-dot"></span>Low Stock</span>`;
        fillClass = 'low-stock';
      } else if (qty > thold * 2.5) {
        statusBadge = `<span class="stock-status-badge excess"><span class="status-dot"></span>Excess</span>`;
        fillClass = 'in-stock';
      } else {
        statusBadge = `<span class="stock-status-badge healthy"><span class="status-dot"></span>Healthy</span>`;
        fillClass = 'in-stock';
      }

      let colorClass = 'black';
      const cLower = (item.colour || '').toLowerCase();
      if (cLower.includes('white')) colorClass = 'white';
      else if (cLower.includes('navy')) colorClass = 'navy';
      else if (cLower.includes('grey')) colorClass = 'grey';

      const rowUpdateDate = item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'Recent';

      return `
        <tr data-product-id="${item.id}" data-sku="${item.sku}">
          <!-- Size -->
          <td>
            <span class="size-badge">${item.size}</span>
          </td>

          <!-- Colour -->
          <td>
            <div class="colour-chip">
              <span class="colour-dot ${colorClass}"></span>
              <span>${item.colour}</span>
            </div>
          </td>

          <!-- SKU -->
          <td>
            <code class="sku-code">${item.sku}</code>
          </td>

          <!-- Available Stock with Meter -->
          <td>
            <div class="quantity-cell-wrapper">
              <div class="quantity-value-row">
                <span class="quantity-bold" style="${qty === 0 ? 'color: var(--color-danger);' : ''}">${qty}</span>
                <span class="quantity-threshold-sub">units</span>
              </div>
              <div class="stock-meter-bar">
                <div class="stock-meter-fill ${fillClass}" style="width: ${percent}%;"></div>
              </div>
            </div>
          </td>

          <!-- Safety-Stock Threshold -->
          <td>
            <span style="font-weight: 600; color: var(--color-text-muted);">${thold}</span>
            <span style="font-size: 0.72rem; color: var(--color-text-subtle);"> min</span>
          </td>

          <!-- Stock Status -->
          <td>
            ${statusBadge}
          </td>

          <!-- Last Verified Time -->
          <td>
            <span style="font-size: 0.78rem; color: var(--color-text-subtle);">${rowUpdateDate}</span>
          </td>

          <!-- Action -->
          <td style="text-align: right; padding-right: 20px;">
            <button class="btn btn-primary btn-sm btn-update-stock" data-product-id="${item.id}" data-sku="${item.sku}" data-size="${item.size}" data-name="${item.name}">
              ${getIcon('edit', '', 14)} Update Stock
            </button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="tshirt-product-card" data-product-name="${group.name}">
        <div class="tshirt-card-header">
          <div class="tshirt-card-left">
            <img src="${group.imageUrl}" alt="${group.name}" class="tshirt-card-thumbnail" onerror="this.src='https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80'" />
            <div class="tshirt-card-title-group">
              <h4 class="tshirt-card-title">${group.name}</h4>
              <div class="tshirt-card-sku-meta">
                <span>Base SKU: <strong class="tshirt-card-sku-badge">${group.baseSku}</strong></span>
                <span>·</span>
                <span>${group.category}</span>
                <span>·</span>
                <span>${group.items.length} size variants</span>
              </div>
            </div>
          </div>

          <div class="tshirt-card-right-stats">
            <div class="stat-pill">
              <span class="stat-pill-label" style="font-size: 0.7rem; color: var(--color-text-subtle); text-transform: uppercase;">Total Stock</span>
              <span class="stat-pill-val">${totalStock} units</span>
            </div>
            <div class="stat-pill">
              <span class="stat-pill-label" style="font-size: 0.7rem; color: var(--color-text-subtle); text-transform: uppercase;">Safety Buffer</span>
              <span class="stat-pill-val">${group.minThreshold} min</span>
            </div>
            <div class="stat-pill">
              <span class="stat-pill-label" style="font-size: 0.7rem; color: var(--color-text-subtle); text-transform: uppercase;">Last Update</span>
              <span class="stat-pill-val" style="font-size: 0.78rem;">${formattedLastUpdate}</span>
            </div>
          </div>
        </div>

        <div class="table-responsive">
          <table class="tshirt-sizes-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Colour</th>
                <th>SKU</th>
                <th>Available Stock</th>
                <th>Safety Threshold</th>
                <th>Status</th>
                <th>Last Verified</th>
                <th style="text-align: right; padding-right: 20px;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    ${headerHtml}
    <div class="tshirt-matrix-container">
      ${cardsHtml}
    </div>
  `;
}

/**
 * Fallback / Alternative flat table view
 */
function renderFlatTableView(container, items, headerHtml = '') {
  const rowsHtml = items.map(item => {
    const qty = item.quantity ?? item.availableQty ?? 0;
    const thold = item.minThreshold || 15;

    let statusBadge = '';
    let fillClass = '';
    let percent = Math.min(100, Math.round((qty / (thold * 1.5)) * 100));

    if (qty === 0) {
      statusBadge = `<span class="stock-status-badge critical"><span class="status-dot"></span>Critical (0)</span>`;
      fillClass = 'out-of-stock';
      percent = 0;
    } else if (qty < thold) {
      statusBadge = `<span class="stock-status-badge low"><span class="status-dot"></span>Low Stock</span>`;
      fillClass = 'low-stock';
    } else if (qty > thold * 2.5) {
      statusBadge = `<span class="stock-status-badge excess"><span class="status-dot"></span>Excess</span>`;
      fillClass = 'in-stock';
    } else {
      statusBadge = `<span class="stock-status-badge healthy"><span class="status-dot"></span>Healthy</span>`;
      fillClass = 'in-stock';
    }

    let colorClass = 'black';
    const cLower = (item.colour || '').toLowerCase();
    if (cLower.includes('white')) colorClass = 'white';
    else if (cLower.includes('navy')) colorClass = 'navy';
    else if (cLower.includes('grey')) colorClass = 'grey';

    const dateFormatted = item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Recent';

    return `
      <tr data-product-id="${item.id}">
        <td>
          <div class="product-cell">
            <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80'}" style="width: 36px; height: 36px; border-radius: var(--radius-sm); object-fit: cover; border: 1px solid var(--color-border);" alt="${item.name}" />
            <div class="product-info-text">
              <span class="product-title">${item.name}</span>
              <span class="product-subtitle">${item.category || 'Casual Wear'}</span>
            </div>
          </div>
        </td>

        <td>
          <div class="colour-chip">
            <span class="colour-dot ${colorClass}"></span>
            <span>${item.colour}</span>
          </div>
        </td>

        <td>
          <span class="size-badge">${item.size}</span>
        </td>

        <td>
          <code class="sku-code">${item.sku}</code>
        </td>

        <td>
          <div class="quantity-cell-wrapper">
            <div class="quantity-value-row">
              <span class="quantity-bold" style="${qty === 0 ? 'color: var(--color-danger);' : ''}">${qty}</span>
              <span class="quantity-threshold-sub">units</span>
            </div>
            <div class="stock-meter-bar">
              <div class="stock-meter-fill ${fillClass}" style="width: ${percent}%;"></div>
            </div>
          </div>
        </td>

        <td>
          <span style="font-weight: 600; color: var(--color-text-muted);">${thold}</span>
          <span style="font-size: 0.72rem; color: var(--color-text-subtle);"> min</span>
        </td>

        <td>
          ${statusBadge}
        </td>

        <td>
          <span style="font-size: 0.78rem; color: var(--color-text-subtle);">${dateFormatted}</span>
        </td>

        <td style="text-align: right; padding-right: 20px;">
          <button class="btn btn-primary btn-sm btn-update-stock" data-sku="${item.sku}" data-product-id="${item.id}" data-size="${item.size}" data-name="${item.name}" title="Update stock quantity">
            ${getIcon('edit', '', 14)} Update Stock
          </button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    ${headerHtml}
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Product Variant</th>
            <th>Colour</th>
            <th>Size</th>
            <th>SKU</th>
            <th>Available Qty</th>
            <th>Min Threshold</th>
            <th>Stock Status</th>
            <th>Last Updated</th>
            <th style="text-align: right; padding-right: 20px;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

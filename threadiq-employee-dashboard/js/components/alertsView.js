/**
 * ThreadIQ AI-Generated Inventory Alerts Panel
 * Displays high-priority intelligence alerts for stockouts, low-stock risks, and audit discrepancies.
 */

import { getIcon } from './icons.js';
import { openUpdateModal } from './updateModal.js';
import { store } from '../state/store.js';

export function renderAlertsView(alerts = [], containerId = 'alerts-view-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (alerts.length === 0) {
    container.innerHTML = `
      <div style="padding: 48px 24px; text-align: center; color: var(--color-text-subtle); background: #ffffff; border-radius: var(--radius-lg); border: 1px solid var(--color-border);">
        <div style="margin: 0 auto 12px; width: 48px; height: 48px; border-radius: 50%; background: var(--color-success-bg); display: flex; align-items: center; justify-content: center; color: var(--color-success);">
          ${getIcon('check-circle', '', 24)}
        </div>
        <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--color-text-main); margin-bottom: 4px;">All Inventory Healthy!</h4>
        <p style="font-size: 0.85rem;">No active stockouts, low-stock warnings, or discrepancies detected in Bengaluru Central.</p>
      </div>
    `;
    return;
  }

  const alertCardsHtml = alerts.map(alert => {
    let iconName = 'alert-triangle';
    if (alert.severity === 'critical') iconName = 'x-circle';
    else if (alert.severity === 'optimization') iconName = 'sparkles';

    const severityLabel = alert.severity === 'critical' ? 'Critical Action Required' : (alert.severity === 'warning' ? 'Attention Warning' : 'AI Optimization');

    return `
      <div class="alert-item-card ${alert.severity}" data-product-id="${alert.productId}">
        <div class="alert-icon-col">
          ${getIcon(iconName, '', 22)}
        </div>

        <div class="alert-content-col">
          <div class="alert-top-row">
            <div class="alert-product-title">
              <span>${alert.title}</span>
              <code class="alert-sku-pill">${alert.sku}</code>
            </div>
            <span class="alert-severity-badge ${alert.severity}">${severityLabel}</span>
          </div>

          <div class="alert-stats-row">
            <div class="stat-metric-pill">
              <span>Current stock:</span>
              <strong style="${alert.currentQuantity === 0 ? 'color: var(--color-danger); font-size: 0.95rem;' : ''}">${alert.currentQuantity} units</strong>
            </div>
            <span>•</span>
            <div class="stat-metric-pill">
              <span>Configured minimum threshold:</span>
              <strong>${alert.minThreshold} units</strong>
            </div>
            <span>•</span>
            <div class="stat-metric-pill">
              <span>Assigned Store:</span>
              <span>Bengaluru Central</span>
            </div>
          </div>

          <!-- AI Recommendation Box -->
          <div class="alert-ai-recommendation-box">
            <div class="ai-sparkle-icon">
              ${getIcon('sparkles', '', 16)}
            </div>
            <div class="ai-recommendation-text">
              <strong>ThreadIQ AI Engine:</strong> ${alert.recommendation}
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="alert-actions-row">
            ${alert.actionType === 'VIEW_TRANSFERS' ? `
              <button class="btn btn-secondary btn-sm btn-alert-goto-transfers">
                ${getIcon('truck', '', 14)} View Karnataka Transfer Grid
              </button>
            ` : `
              <button class="btn btn-primary btn-sm btn-alert-action" data-product-id="${alert.productId}">
                ${getIcon('edit', '', 14)} ${alert.actionLabel || 'Update Stock'}
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="ai-alerts-grid">
      ${alertCardsHtml}
    </div>
  `;

  // Attach action triggers
  container.querySelectorAll('.btn-alert-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const pId = btn.getAttribute('data-product-id');
      openUpdateModal({ selectedProductId: pId });
    });
  });

  container.querySelectorAll('.btn-alert-goto-transfers').forEach(btn => {
    btn.addEventListener('click', () => {
      store.setActiveView('transfers');
    });
  });
}

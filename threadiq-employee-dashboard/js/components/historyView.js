/**
 * ThreadIQ Auditable Inventory History Component
 * Full activity trail recording every adjustment, delta, reference code, and employee attribution.
 */

import { getIcon } from './icons.js';
import { store } from '../state/store.js';

export function renderHistoryView(history = [], containerId = 'history-view-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (history.length === 0) {
    container.innerHTML = `
      <div style="padding: 48px 24px; text-align: center; color: var(--color-text-subtle);">
        <div style="margin: 0 auto 12px; width: 48px; height: 48px; border-radius: 50%; background: var(--color-bg-subtle); display: flex; align-items: center; justify-content: center; color: var(--color-text-light);">
          ${getIcon('history', '', 24)}
        </div>
        <h4 style="font-size: 1rem; font-weight: 600; color: var(--color-text-main); margin-bottom: 4px;">No adjustments recorded</h4>
        <p style="font-size: 0.82rem;">Adjustments made in this session will show in this audit log.</p>
      </div>
    `;
    return;
  }

  const rowsHtml = history.map(item => {
    // Delta styling
    const isPlus = item.quantityChanged > 0;
    const deltaSign = isPlus ? `+${item.quantityChanged}` : `${item.quantityChanged}`;
    const deltaClass = isPlus ? 'plus' : 'minus';

    // Type badge class
    let typeClass = 'stock-received';
    const typeLower = (item.updateType || '').toLowerCase();
    if (typeLower.includes('sale') || typeLower.includes('reduction')) typeClass = 'sale';
    else if (typeLower.includes('damage')) typeClass = 'damaged';
    else if (typeLower.includes('correction')) typeClass = 'correction';

    const timestampDate = new Date(item.timestamp);
    const dateFormatted = timestampDate.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <tr>
        <!-- Timestamp -->
        <td>
          <span style="font-size: 0.8rem; font-weight: 500; color: var(--color-text-main);">${dateFormatted}</span>
        </td>

        <!-- Employee -->
        <td>
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 600; font-size: 0.85rem; color: var(--color-text-main);">${item.employeeName}</span>
            <span style="font-size: 0.72rem; color: var(--color-text-subtle);">${item.employeeId || 'TIQ-8842'}</span>
          </div>
        </td>

        <!-- Product & Size -->
        <td>
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 600; color: var(--color-text-main);">${item.productName}</span>
            <span style="font-size: 0.75rem; color: var(--color-text-subtle);">${item.colour} · Size ${item.size} (<code>${item.sku}</code>)</span>
          </div>
        </td>

        <!-- Previous Qty -->
        <td>
          <span style="font-weight: 600; color: var(--color-text-muted);">${item.previousQuantity}</span>
        </td>

        <!-- Delta -->
        <td>
          <span class="qty-delta-chip ${deltaClass}">
            ${deltaSign}
          </span>
        </td>

        <!-- New Qty -->
        <td>
          <span style="font-weight: 700; color: var(--color-text-main);">${item.newQuantity}</span>
        </td>

        <!-- Update Type -->
        <td>
          <span class="history-type-badge ${typeClass}">
            ${item.updateType}
          </span>
        </td>

        <!-- Reference ID -->
        <td>
          <code class="sku-code">${item.referenceId || 'N/A'}</code>
        </td>

        <!-- Remarks -->
        <td>
          <span style="font-size: 0.78rem; color: var(--color-text-muted); max-width: 220px; display: inline-block;" class="truncate" title="${item.remarks || ''}">
            ${item.remarks || 'Routine adjustment'}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Employee</th>
            <th>Product & Size</th>
            <th>Prev Qty</th>
            <th>Change</th>
            <th>New Qty</th>
            <th>Update Type</th>
            <th>Reference ID</th>
            <th>Remarks / Reason</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Export history as CSV file
 */
export function exportHistoryCsv(history = []) {
  if (history.length === 0) return;

  const headers = ['Timestamp', 'Employee', 'Employee ID', 'Product', 'Colour', 'Size', 'SKU', 'Previous Qty', 'Delta', 'New Qty', 'Update Type', 'Reference ID', 'Remarks'];
  const rows = history.map(item => [
    item.timestamp,
    `"${item.employeeName}"`,
    item.employeeId,
    `"${item.productName}"`,
    item.colour,
    item.size,
    item.sku,
    item.previousQuantity,
    item.quantityChanged,
    item.newQuantity,
    `"${item.updateType}"`,
    item.referenceId,
    `"${(item.remarks || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `ThreadIQ_Bengaluru_Central_Inventory_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

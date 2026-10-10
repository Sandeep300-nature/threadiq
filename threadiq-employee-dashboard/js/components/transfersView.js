/**
 * ThreadIQ Read-Only Manager-Approved Stock Transfers Component
 * Authoritative read-only view of transfers approved by Store Managers in the central database.
 * Employees cannot edit, approve, cancel, or alter transfer records.
 */

import { getIcon } from './icons.js';
import { store } from '../state/store.js';

/**
 * Renders the read-only Manager-Approved Stock Transfers table
 * @param {Array} transfers - Array of transfer records from GET /api/stores/me/transfers/approved
 * @param {string} containerId - Target DOM container ID
 * @param {Object} options - Optional filters (search, status) and UI state
 */
export function renderTransfersView(transfers = [], containerId = 'transfers-view-container', options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { search = '', statusFilter = 'all', isLoading = false, isOffline = false, errorMessage = null } = options;

  // 1. Loading State
  if (isLoading) {
    container.innerHTML = `
      <div style="padding: 48px 24px; text-align: center; color: var(--color-text-subtle);">
        <div style="margin: 0 auto 12px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; animation: spin 1s linear infinite; color: var(--color-primary-600);">
          ${getIcon('refresh-cw', '', 28)}
        </div>
        <h4 style="font-size: 0.95rem; font-weight: 600; color: var(--color-text-main); margin-bottom: 4px;">Loading Approved Transfers...</h4>
        <p style="font-size: 0.8rem; color: var(--color-text-subtle);">Connecting to central manager database across Karnataka retail grid.</p>
      </div>
    `;
    return;
  }

  // 2. Error State
  if (errorMessage) {
    container.innerHTML = `
      <div style="padding: 42px 24px; text-align: center; color: var(--color-danger);">
        <div style="margin: 0 auto 12px; width: 44px; height: 44px; border-radius: 50%; background: var(--color-danger-bg); display: flex; align-items: center; justify-content: center; color: var(--color-danger);">
          ${getIcon('x-circle', '', 24)}
        </div>
        <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 4px;">Unable to load approved transfers</h4>
        <p style="font-size: 0.8rem; color: var(--color-text-subtle);">${errorMessage}</p>
      </div>
    `;
    return;
  }

  // 3. Filter displayable transfers
  const displayable = transfers.filter(t => {
    const s = (t.status || '').toLowerCase();
    return s === 'approved' || s === 'in transit' || s === 'received' || s === 'pending approval' || s === 'pending' || s === 'rejected';
  });

  // Apply optional search filter
  let filtered = displayable;
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(t =>
      (t.id && t.id.toLowerCase().includes(q)) ||
      (t.productName && t.productName.toLowerCase().includes(q)) ||
      (t.sku && t.sku.toLowerCase().includes(q)) ||
      (t.colour && t.colour.toLowerCase().includes(q)) ||
      (t.sourceStore && t.sourceStore.toLowerCase().includes(q)) ||
      (t.destinationStore && t.destinationStore.toLowerCase().includes(q))
    );
  }

  // Apply optional status filter
  if (statusFilter && statusFilter !== 'all') {
    filtered = filtered.filter(t => t.status.toLowerCase() === statusFilter.toLowerCase());
  }

  // 4. Empty State
  if (filtered.length === 0) {
    const hasSearchActive = Boolean(search && search.trim()) || (statusFilter !== 'all');
    container.innerHTML = `
      <div style="padding: 56px 24px; text-align: center; color: var(--color-text-subtle);">
        <div style="margin: 0 auto 14px; width: 52px; height: 52px; border-radius: 50%; background: #f0f7ff; border: 1px solid #dbeafe; display: flex; align-items: center; justify-content: center; color: var(--color-primary-600);">
          ${getIcon('shield-check', '', 26)}
        </div>
        <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--color-text-main); margin-bottom: 6px;">
          ${hasSearchActive ? 'No matching stock transfers found' : 'No stock transfers yet.'}
        </h4>
        <p style="font-size: 0.85rem; max-width: 440px; margin: 0 auto; line-height: 1.5; color: var(--color-text-muted);">
          ${hasSearchActive ? 'Try adjusting your search query or status filter.' : 'Transfers created or approved by managers will appear here.'}
        </p>
        <div style="margin-top: 14px; display: inline-flex; align-items: center; gap: 6px; font-size: 0.76rem; color: var(--color-text-light); background: #f8fafc; padding: 4px 12px; border-radius: var(--radius-full); border: 1px solid var(--color-border);">
          ${getIcon('lock', '', 12)} Read-only · Managed by your store manager
        </div>
      </div>
    `;
    return;
  }

  // 5. Build Table Rows
  const rowsHtml = filtered.map(t => {
    let badgeClass = 'approved';
    let iconName = 'check-circle';

    if (t.status === 'In Transit') {
      badgeClass = 'in-transit';
      iconName = 'truck';
    } else if (t.status === 'Received') {
      badgeClass = 'received';
      iconName = 'check-circle';
    } else if (t.status === 'Approved') {
      badgeClass = 'approved';
      iconName = 'check-circle';
    } else if (t.status === 'Pending Approval' || t.status === 'Pending') {
      badgeClass = 'pending-approval';
      iconName = 'clock';
    } else if (t.status === 'Rejected') {
      badgeClass = 'rejected';
      iconName = 'x-circle';
    }

    // Format Approval Date
    let approvalFormatted = 'Pending Manager Timestamp';
    if (t.approvedDate) {
      const appDate = new Date(t.approvedDate);
      approvalFormatted = isNaN(appDate.getTime()) ? t.approvedDate : appDate.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // Format Received Date (if applicable)
    let receiptFormatted = '—';
    if (t.receivedDate && t.status === 'Received') {
      const recDate = new Date(t.receivedDate);
      receiptFormatted = isNaN(recDate.getTime()) ? t.receivedDate : recDate.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // Determine transfer direction relative to current store
    const state = store.getState();
    const currentStoreId = state.selectedStoreId || state.currentUser?.assigned_store_id || '';
    const isOutgoing = (t.sourceStoreId === currentStoreId) || (t.direction === 'Outgoing');
    const isIncoming = (t.destinationStoreId === currentStoreId) || (t.direction === 'Incoming');
    const dirClass = isOutgoing ? 'outgoing' : 'incoming';
    const dirText = isOutgoing ? '↑ Outgoing' : (isIncoming ? '↓ Incoming' : 'Network');

    return `
      <tr data-transfer-id="${t.id}">
        <!-- 1. Transfer ID -->
        <td>
          <code class="sku-code" style="font-weight: 700; color: var(--color-primary-800); font-size: 0.82rem;">${t.id}</code>
        </td>

        <!-- 2. Product Name, Colour, Size, SKU -->
        <td>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <span style="font-weight: 600; color: var(--color-text-main); font-size: 0.88rem;">${t.productName}</span>
            <span style="font-size: 0.76rem; color: var(--color-text-subtle);">
              ${t.colour} · Size <strong>${t.size}</strong> · <code style="font-size: 0.72rem;">${t.sku}</code>
            </span>
          </div>
        </td>

        <!-- 3. Approved Quantity -->
        <td style="text-align: center;">
          <span style="font-size: 1.05rem; font-weight: 700; color: var(--color-primary-600);">${t.quantity}</span>
          <span style="font-size: 0.74rem; color: var(--color-text-subtle);"> units</span>
        </td>

        <!-- 4. Direction & Route -->
        <td>
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <div>
              <span class="transfer-direction-badge ${dirClass}">${dirText}</span>
            </div>
            <div class="store-route-pill">
              <span class="store-name-tag" style="background: ${isOutgoing ? '#0f172a; color: #fff;' : '#f1f5f9; color: var(--color-text-main);'} padding: 3px 8px; border-radius: 4px; font-size: 0.78rem;">${t.sourceStore}</span>
              <span class="arrow-icon" style="color: var(--color-text-light); display: inline-flex; align-items: center;">${getIcon('arrow-right', '', 12)}</span>
              <span class="store-name-tag destination" style="background: ${isIncoming ? '#0f172a; color: #fff;' : '#eff6ff; color: var(--color-primary-700);'} border: 1px solid #bfdbfe; padding: 3px 8px; border-radius: 4px; font-size: 0.78rem; font-weight: 600;">${t.destinationStore}</span>
            </div>
          </div>
        </td>

        <!-- 5. Manager Approval Timestamp & Approver -->
        <td>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--color-text-main);">${approvalFormatted}</span>
            <span style="font-size: 0.72rem; color: var(--color-text-subtle); display: inline-flex; align-items: center; gap: 3px;">
              ${getIcon('shield-check', '', 11)} ${t.approvedByManager || 'Store Manager'}
            </span>
          </div>
        </td>

        <!-- 6. Current Transfer Status -->
        <td>
          <span class="transfer-status-badge ${badgeClass}">
            ${getIcon(iconName, '', 12)}
            ${t.status}
          </span>
        </td>

        <!-- 7. Estimated Arrival Time -->
        <td>
          <span style="font-size: 0.78rem; color: var(--color-text-muted);">
            ${t.estimatedArrival || 'Scheduled by Manager'}
          </span>
        </td>

        <!-- 8. Actual Receipt Timestamp -->
        <td>
          ${t.status === 'Received' ? `
            <span style="font-size: 0.78rem; font-weight: 600; color: var(--color-success); display: inline-flex; align-items: center; gap: 4px;">
              ${getIcon('check-circle', '', 12)} ${receiptFormatted}
            </span>
          ` : `
            <span style="font-size: 0.74rem; color: var(--color-text-light); font-style: italic;">
              Pending Arrival
            </span>
          `}
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Transfer ID</th>
            <th>Product & Variant</th>
            <th style="text-align: center;">Approved Qty</th>
            <th>Direction & Route</th>
            <th>Manager Approval</th>
            <th>Status</th>
            <th>Estimated Arrival</th>
            <th>Actual Receipt</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
    <div style="padding: 12px 18px; background: #fafbfc; border-top: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem; color: var(--color-text-subtle);">
      <span style="display: inline-flex; align-items: center; gap: 6px;">
        ${getIcon('lock', '', 12)}
        <strong>Read-only interface:</strong> Transfers are authorized and dispatched exclusively by Store Managers.
      </span>
      <span>Showing ${filtered.length} authoritative transfer record${filtered.length === 1 ? '' : 's'}</span>
    </div>
  `;
}

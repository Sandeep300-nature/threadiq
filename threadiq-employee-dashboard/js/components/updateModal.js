/**
 * ThreadIQ Update Stock Count Modal Workflow
 * Authoritative stock update modal: Physical stock count replaces recorded balance.
 * Validates non-negative integers, prevents duplicate submissions, displays live discrepancy math,
 * and synchronizes with central SQLite database, SSE broadcasts, and Groq AI intelligence.
 */

import { getIcon } from './icons.js';
import { store } from '../state/store.js';
import { inventoryService } from '../api/inventoryService.js';
import { toast } from './toast.js';
import { APP_CONFIG } from '../config.js';

let activeModalOverlay = null;

export function openUpdateModal(options = {}) {
  const { selectedProductId, selectedSku, selectedSize } = options;
  const state = store.getState();
  const inventory = state.inventory;

  // Resolve target product variant
  let selectedProduct = null;
  if (selectedSku) {
    selectedProduct = inventory.find(p => p.sku === selectedSku);
  }
  if (!selectedProduct && selectedProductId) {
    selectedProduct = inventory.find(p => p.id === selectedProductId);
  }
  if (!selectedProduct && selectedSize) {
    selectedProduct = inventory.find(p => p.size === selectedSize);
  }
  if (!selectedProduct) {
    selectedProduct = inventory[0];
  }

  if (!selectedProduct) {
    toast.warning('No inventory item available', 'Please verify your inventory data first.');
    return;
  }

  // Create or reuse modal container
  if (!activeModalOverlay) {
    activeModalOverlay = document.createElement('div');
    activeModalOverlay.id = 'update-stock-modal-overlay';
    activeModalOverlay.className = 'modal-overlay';
    document.body.appendChild(activeModalOverlay);
  }

  renderModalContent(selectedProduct, inventory);
  activeModalOverlay.classList.add('active');

  // Auto-focus input
  setTimeout(() => {
    const input = activeModalOverlay.querySelector('#input-quantity-delta');
    if (input) input.focus();
  }, 100);
}

export function closeUpdateModal() {
  if (activeModalOverlay) {
    activeModalOverlay.classList.remove('active');
  }
}

function renderModalContent(currentProduct, allInventory) {
  const state = store.getState();
  const currentUser = state.currentUser || APP_CONFIG.CURRENT_EMPLOYEE;
  const storeId = state.selectedStoreId || currentUser?.assigned_store_id || currentProduct.storeId || 'STORE_KA_BLR_01';
  
  // Format readable store name
  let storeName = 'Brigade Road Flagship';
  if (storeId === 'STORE_KA_BLR_01') storeName = 'Brigade Road Flagship';
  else if (storeId === 'STORE_KA_MYS_01') storeName = 'Mysuru Central';
  else if (storeId === 'STORE_KA_MNG_01') storeName = 'Coastal City Pavilion (Mangaluru)';
  else if (storeId === 'STORE_KA_HUB_01') storeName = 'North Karnataka Hub (Hubballi)';
  else if (currentProduct.storeName) storeName = currentProduct.storeName;

  // Build product options
  const productOptionsHtml = allInventory.map(p => `
    <option value="${p.id}" ${p.id === currentProduct.id || p.sku === currentProduct.sku ? 'selected' : ''}>
      ${p.name} — Size ${p.size} (${p.colour}) [${p.sku}]
    </option>
  `).join('');

  activeModalOverlay.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <div class="modal-title-group">
          <h3 class="modal-title" style="display: flex; align-items: center; gap: 8px;">
            ${getIcon('edit', 'text-primary', 20)}
            Update Stock Count
          </h3>
          <p class="modal-subtitle">
            Store-Specific T-Shirt Physical Count Audit
          </p>
        </div>
        <button class="modal-close-btn" id="modal-close-x" aria-label="Close modal">
          ${getIcon('x', '', 18)}
        </button>
      </div>

      <form id="update-stock-form" class="modal-body" novalidate>
        <!-- 1. Store & Variant Verification Summary Card -->
        <div style="background: var(--color-bg-subtle); padding: 14px 16px; border-radius: var(--radius-md); border: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 0.72rem; color: var(--color-text-subtle); text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em;">Product</div>
              <div id="display-product-name" style="font-size: 1.05rem; font-weight: 800; color: var(--color-text-main);">${currentProduct.name}</div>
            </div>
            <span style="font-size: 0.72rem; padding: 2px 8px; background: #e2e8f0; border-radius: 4px; font-weight: 600; color: #334155;">Authoritative Store Sync</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; border-top: 1px solid var(--color-border-subtle); padding-top: 10px;">
            <div>
              <div style="font-size: 0.72rem; color: var(--color-text-subtle);">Size &amp; Colour</div>
              <div id="display-spec" style="font-size: 0.92rem; font-weight: 700; color: var(--color-text-main);">
                <span class="size-badge" id="display-size-badge" style="font-size: 0.85rem;">${currentProduct.size}</span>
                <span id="display-colour-text" style="margin-left: 4px; font-weight: 600; font-size: 0.82rem; color: var(--color-text-muted);">${currentProduct.colour}</span>
              </div>
            </div>
            <div>
              <div style="font-size: 0.72rem; color: var(--color-text-subtle);">SKU Code</div>
              <code id="display-sku" style="font-size: 0.82rem; font-weight: 600; color: var(--color-text-main);">${currentProduct.sku}</code>
            </div>
            <div>
              <div style="font-size: 0.72rem; color: var(--color-text-subtle);">Assigned Store</div>
              <div id="display-store-name" style="font-size: 0.82rem; font-weight: 700; color: var(--color-text-main);">${storeName}</div>
            </div>
          </div>

          <div style="border-top: 1px solid var(--color-border-subtle); padding-top: 10px; display: flex; align-items: baseline; justify-content: space-between;">
            <div style="font-size: 0.78rem; font-weight: 600; color: var(--color-text-subtle);">Currently Recorded Stock:</div>
            <div id="display-current-qty" style="font-size: 1.25rem; font-weight: 800; color: ${currentProduct.quantity === 0 ? 'var(--color-danger)' : 'var(--color-primary-600)'};">
              ${currentProduct.quantity} units
            </div>
          </div>
        </div>

        <!-- Variant Switcher (Optional, if user needs to switch size within modal) -->
        <div class="form-group" style="margin-top: -6px;">
          <label class="form-label" for="select-product-variant" style="font-size: 0.76rem; color: var(--color-text-subtle);">
            Switch Product / Size Variant
          </label>
          <select id="select-product-variant" class="form-control" style="font-size: 0.82rem; padding: 6px 10px;">
            ${productOptionsHtml}
          </select>
        </div>

        <!-- 2. Quantity Input Field -->
        <div class="form-group">
          <label class="form-label" for="input-quantity-delta" style="font-size: 0.9rem; font-weight: 700;">
            <span>New Physical Stock Count <span class="required-star">*</span></span>
          </label>
          <input
            type="number"
            id="input-quantity-delta"
            class="form-control"
            min="0"
            step="1"
            placeholder="Enter quantity"
            style="font-size: 1.15rem; font-weight: 700; padding: 12px 14px;"
            required
          />
          <div style="font-size: 0.76rem; color: var(--color-text-subtle); margin-top: 4px; line-height: 1.4;">
            <strong>Important:</strong> Enter the physical count on shelf. The entered quantity replaces the recorded balance directly (e.g. if previously recorded was 12 and count is 18, result will be 18; it does not calculate 12 + 18 = 30).
          </div>
          <div id="quantity-error-msg" class="form-error-msg" style="display: none; font-weight: 600; margin-top: 6px;"></div>
        </div>

        <!-- 3. Live Discrepancy Preview Math Box -->
        <div class="quantity-preview-box">
          <div class="preview-step">
            <span class="preview-step-label">Recorded</span>
            <span class="preview-step-val" id="math-current-val">${currentProduct.quantity}</span>
          </div>
          <span class="preview-operator">→</span>
          <div class="preview-step">
            <span class="preview-step-label">Physical Count</span>
            <span class="preview-step-val" id="math-delta-val">—</span>
          </div>
          <span class="preview-operator">=</span>
          <div class="preview-step result">
            <span class="preview-step-label">Updated Balance</span>
            <span class="preview-step-val" id="math-projected-val">${currentProduct.quantity}</span>
          </div>
        </div>

        <!-- Discrepancy Tag -->
        <div id="discrepancy-indicator" style="font-size: 0.78rem; text-align: center; color: var(--color-text-subtle);">
          No discrepancy recorded
        </div>

        <!-- Remarks (Audit Trail) -->
        <div class="form-group">
          <label class="form-label" for="input-remarks" style="font-size: 0.78rem;">
            Audit Remarks / Notes (Optional)
          </label>
          <input type="text" id="input-remarks" class="form-control" placeholder="e.g. Physical inventory verification, cycle count audit" />
        </div>
      </form>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="modal-btn-cancel">Cancel</button>
        <button type="submit" form="update-stock-form" class="btn btn-primary" id="modal-btn-submit">
          ${getIcon('check-circle', '', 16)} Save Stock Update
        </button>
      </div>
    </div>
  `;

  // Dynamic references
  let targetProduct = currentProduct;
  const selectElem = activeModalOverlay.querySelector('#select-product-variant');
  const nameDisplay = activeModalOverlay.querySelector('#display-product-name');
  const sizeBadgeDisplay = activeModalOverlay.querySelector('#display-size-badge');
  const colourTextDisplay = activeModalOverlay.querySelector('#display-colour-text');
  const skuDisplay = activeModalOverlay.querySelector('#display-sku');
  const currentQtyDisplay = activeModalOverlay.querySelector('#display-current-qty');
  const inputQty = activeModalOverlay.querySelector('#input-quantity-delta');
  const remarksInput = activeModalOverlay.querySelector('#input-remarks');
  const errorMsg = activeModalOverlay.querySelector('#quantity-error-msg');
  const discrepancyIndicator = activeModalOverlay.querySelector('#discrepancy-indicator');

  // Math preview elements
  const mathCurrent = activeModalOverlay.querySelector('#math-current-val');
  const mathDelta = activeModalOverlay.querySelector('#math-delta-val');
  const mathProjected = activeModalOverlay.querySelector('#math-projected-val');

  // Variant change handler
  selectElem.addEventListener('change', (e) => {
    const newId = e.target.value;
    targetProduct = allInventory.find(p => p.id === newId) || currentProduct;
    nameDisplay.textContent = targetProduct.name;
    sizeBadgeDisplay.textContent = targetProduct.size;
    colourTextDisplay.textContent = targetProduct.colour;
    skuDisplay.textContent = targetProduct.sku;
    currentQtyDisplay.textContent = `${targetProduct.quantity} units`;
    currentQtyDisplay.style.color = targetProduct.quantity === 0 ? 'var(--color-danger)' : 'var(--color-primary-600)';
    mathCurrent.textContent = targetProduct.quantity;
    updateMathPreview();
  });

  // Math recalculation
  function updateMathPreview() {
    const rawValStr = inputQty.value.trim();

    if (rawValStr === '') {
      mathDelta.textContent = '—';
      mathProjected.textContent = targetProduct.quantity;
      discrepancyIndicator.textContent = 'Enter new physical count above';
      discrepancyIndicator.style.color = 'var(--color-text-subtle)';
      errorMsg.style.display = 'none';
      return;
    }

    const rawVal = Number(rawValStr);
    if (isNaN(rawVal) || !Number.isInteger(rawVal) || rawVal < 0) {
      errorMsg.textContent = 'Quantity must be a valid non-negative integer (e.g. 0, 1, 2...).';
      errorMsg.style.display = 'block';
      mathDelta.textContent = 'Invalid';
      mathProjected.textContent = '—';
      return;
    }

    errorMsg.style.display = 'none';
    mathDelta.textContent = rawVal;
    mathProjected.textContent = rawVal;

    const diff = rawVal - targetProduct.quantity;
    if (diff === 0) {
      discrepancyIndicator.textContent = 'Count matches previously recorded stock balance (0 discrepancy).';
      discrepancyIndicator.style.color = 'var(--color-success)';
    } else if (diff > 0) {
      discrepancyIndicator.innerHTML = `Discrepancy: <strong style="color:var(--color-primary-600);">+${diff} units</strong> (Physical count exceeds recorded balance)`;
      discrepancyIndicator.style.color = 'var(--color-primary-700)';
    } else {
      discrepancyIndicator.innerHTML = `Discrepancy: <strong style="color:var(--color-danger);">${diff} units</strong> (Physical count is lower than recorded balance)`;
      discrepancyIndicator.style.color = 'var(--color-danger)';
    }
  }

  inputQty.addEventListener('input', updateMathPreview);

  // Form submission handler
  const form = activeModalOverlay.querySelector('#update-stock-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const valStr = inputQty.value.trim();
    if (valStr === '') {
      errorMsg.textContent = 'Please enter a physical stock count.';
      errorMsg.style.display = 'block';
      inputQty.focus();
      return;
    }

    const newCount = Number(valStr);
    if (isNaN(newCount) || !Number.isInteger(newCount) || newCount < 0) {
      errorMsg.textContent = 'Quantity must be a valid non-negative integer (0 or greater).';
      errorMsg.style.display = 'block';
      inputQty.focus();
      return;
    }

    // Prevent duplicate submissions
    const submitBtn = activeModalOverlay.querySelector('#modal-btn-submit');
    const cancelBtn = activeModalOverlay.querySelector('#modal-btn-cancel');
    submitBtn.disabled = true;
    cancelBtn.disabled = true;
    submitBtn.innerHTML = `${getIcon('refresh-cw', '', 16)} Saving Stock Update...`;

    try {
      const payload = {
        storeId: storeId,
        productId: targetProduct.id,
        sku: targetProduct.sku,
        size: targetProduct.size,
        quantity: newCount,
        newTargetQuantity: newCount,
        quantityDelta: newCount,
        updateType: 'physical_count',
        updateSource: 'EMPLOYEE_PORTAL',
        remarks: remarksInput.value.trim() || `Physical stock count verified by ${currentUser.name}`,
        expectedVersion: targetProduct.version,
        employeeId: currentUser.employee_id,
        employeeName: currentUser.name
      };

      const result = await inventoryService.submitAdjustment(payload);

      closeUpdateModal();

      // Show clear success confirmation
      const formattedTime = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      toast.success(
        'Stock Update Saved!',
        `${targetProduct.name} (Size ${targetProduct.size}) stock updated to ${result.newQuantity} units at ${formattedTime}. Authoritative database updated.`
      );

      // Refresh employee dashboard inventory state immediately
      await store.refreshAllData();

    } catch (err) {
      submitBtn.disabled = false;
      cancelBtn.disabled = false;
      submitBtn.innerHTML = `${getIcon('check-circle', '', 16)} Save Stock Update`;

      errorMsg.textContent = err.message || 'Failed to save stock update. Please check backend connection.';
      errorMsg.style.display = 'block';
      toast.danger('Stock Update Failed', err.message);
    }
  });

  // Close triggers
  activeModalOverlay.querySelector('#modal-close-x').onclick = closeUpdateModal;
  activeModalOverlay.querySelector('#modal-btn-cancel').onclick = closeUpdateModal;
}

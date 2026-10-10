/**
 * Reusable Confirmation Dialog Modal
 */

import { getIcon } from './icons.js';

export function showConfirmDialog({
  title = 'Confirm Action',
  description = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  detailsHtml = ''
}) {
  return new Promise((resolve) => {
    let overlay = document.getElementById('confirm-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'confirm-modal-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    const iconType = isDanger ? 'alert-triangle' : 'info';
    const btnClass = isDanger ? 'btn-danger' : 'btn-primary';

    overlay.innerHTML = `
      <div class="modal-card" style="max-width: 460px;">
        <div class="modal-header">
          <div class="modal-title-group">
            <h3 class="modal-title" style="display:flex; align-items:center; gap:8px;">
              ${getIcon(iconType, isDanger ? 'text-danger' : 'text-primary', 20)}
              ${title}
            </h3>
            <p class="modal-subtitle">${description}</p>
          </div>
          <button class="modal-close-btn" id="confirm-btn-close">${getIcon('x', '', 18)}</button>
        </div>
        ${detailsHtml ? `<div class="modal-body" style="padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid var(--color-border);">${detailsHtml}</div>` : ''}
        <div class="modal-footer">
          <button class="btn btn-secondary" id="confirm-btn-cancel">${cancelText}</button>
          <button class="btn ${btnClass}" id="confirm-btn-ok">${confirmText}</button>
        </div>
      </div>
    `;

    overlay.classList.add('active');

    const cleanup = () => {
      overlay.classList.remove('active');
      setTimeout(() => {
        overlay.innerHTML = '';
      }, 200);
    };

    const handleOk = () => {
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    overlay.querySelector('#confirm-btn-ok').onclick = handleOk;
    overlay.querySelector('#confirm-btn-cancel').onclick = handleCancel;
    overlay.querySelector('#confirm-btn-close').onclick = handleCancel;
  });
}

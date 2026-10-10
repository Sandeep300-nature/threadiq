/**
 * ThreadIQ Employee Inventory Dashboard - Application Bootstrap
 * Supports two independent employee login accounts (EMP001 - Rahul Sharma / EMP002 - Priya Kumar),
 * real-time SSE synchronization, role-based store isolation, and optimistic concurrency control.
 */

import { getIcon } from './components/icons.js';
import { store } from './state/store.js';
import { renderSummaryCards } from './components/summaryCards.js';
import { renderInventoryTable } from './components/inventoryTable.js';
import { renderTransfersView } from './components/transfersView.js';
import { renderHistoryView, exportHistoryCsv } from './components/historyView.js';
import { toast } from './components/toast.js';
import { showConfirmDialog } from './components/confirmModal.js';
import { inventoryService } from './api/inventoryService.js';

// Initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  setupIcons();
  setupAuthControls();
  setupNavigation();
  setupFilters();
  setupTopbarControls();
  setupNotificationPopover();
  setupSettingsControls();
  setupTransfersControls();
  setupDemoStoreSelector();

  // Subscribe UI to store state changes
  store.subscribe((state) => {
    updateUI(state);
  });

  // Check authentication session on initial load
  checkAuthAndInit();

  // Setup periodic relative time sync updater
  setupSyncTimer();
});

/**
 * Checks authentication status on startup
 */
async function checkAuthAndInit() {
  const loginScreen = document.getElementById('login-screen');
  const authApp = document.getElementById('authenticated-app');

  if (inventoryService.isAuthenticated()) {
    if (loginScreen) loginScreen.style.display = 'none';
    if (authApp) authApp.style.display = 'block';
    await store.init();
    updateEmployeeContext(inventoryService.getCurrentUser());
  } else {
    if (loginScreen) loginScreen.style.display = 'flex';
    if (authApp) authApp.style.display = 'none';
  }
}

/**
 * Updates UI labels based on the authenticated employee (Rahul or Priya)
 */
function updateEmployeeContext(user) {
  if (!user) return;

  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();

  // Topbar
  const topbarUser = document.getElementById('topbar-user-name');
  const topbarAvatar = document.getElementById('topbar-user-avatar');
  const topbarStore = document.getElementById('topbar-store-name');
  const breadcrumbStore = document.getElementById('breadcrumb-current-view');

  if (topbarUser) topbarUser.textContent = user.name;
  if (topbarAvatar) topbarAvatar.textContent = initials;
  if (topbarStore) topbarStore.textContent = user.store_name || 'Assigned Store';

  // Sidebar
  const sidebarUser = document.getElementById('sidebar-user-name');
  const sidebarAvatar = document.getElementById('sidebar-user-avatar');
  const sidebarStoreTitle = document.getElementById('sidebar-store-title');
  const sidebarStoreRegion = document.getElementById('sidebar-store-region');

  if (sidebarUser) sidebarUser.textContent = user.name;
  if (sidebarAvatar) sidebarAvatar.textContent = initials;
  if (sidebarStoreTitle) sidebarStoreTitle.textContent = user.store_name || 'Assigned Store';
  if (sidebarStoreRegion) sidebarStoreRegion.textContent = `Store #${user.store_code || 'KA'}`;
}

/**
 * Injects Lucide vector icons into static icon placeholders
 */
function setupIcons() {
  const iconMappings = {
    'btn-login-icon': 'lock',
    'password-toggle-icon': 'eye',
    'nav-icon-dashboard': 'layers',
    'nav-icon-inventory': 'box',
    'nav-icon-transfers': 'truck',
    'nav-icon-history': 'history',
    'nav-icon-settings': 'settings',
    'logout-icon-span': 'log-out',
    'topbar-store-icon': 'store',
    'sync-icon-span': 'refresh-cw',
    'btn-sync-icon-span': 'refresh-cw',
    'topbar-bell-icon': 'bell',
    'banner-sparkle-icon': 'sparkles',
    'banner-box-icon': 'box',
    'panel-inventory-icon': 'alert-triangle',
    'panel-catalog-icon': 'box',
    'search-icon-span': 'search',
    'panel-transfer-icon': 'truck',
    'transfer-info-icon': 'info',
    'transfer-lock-icon': 'lock',
    'refresh-transfers-icon': 'refresh-cw',
    'transfers-search-icon': 'search',
    'panel-history-icon': 'history',
    'history-download-icon': 'download',
    'history-search-icon': 'search',
    'settings-user-icon': 'user',
    'settings-db-icon': 'box'
  };

  Object.entries(iconMappings).forEach(([elemId, iconName]) => {
    const el = document.getElementById(elemId);
    if (el) {
      el.innerHTML = getIcon(iconName, '', 16);
    }
  });
}

/**
 * Authentication controls: Login form, Demo autofill, Show/Hide Password, Logout
 */
function setupAuthControls() {
  const loginForm = document.getElementById('login-form');
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  const errorBanner = document.getElementById('login-error-banner');
  const errorText = document.getElementById('login-error-text');
  const submitBtn = document.getElementById('btn-login-submit');
  const togglePassBtn = document.getElementById('btn-toggle-password');
  const togglePassIcon = document.getElementById('password-toggle-icon');

  // Show/Hide password toggle
  if (togglePassBtn && passwordInput) {
    let showPassword = false;
    togglePassBtn.addEventListener('click', () => {
      showPassword = !showPassword;
      passwordInput.type = showPassword ? 'text' : 'password';
      if (togglePassIcon) {
        togglePassIcon.innerHTML = getIcon(showPassword ? 'eye-off' : 'eye', '', 16);
      }
    });
  }

  // Quick Demo Account Autofills
  const demoRahulBtn = document.getElementById('btn-demo-rahul');
  const demoPriyaBtn = document.getElementById('btn-demo-priya');

  if (demoRahulBtn && usernameInput && passwordInput) {
    demoRahulBtn.addEventListener('click', () => {
      usernameInput.value = 'EMP001';
      passwordInput.value = 'ThreadIQ@2026';
      if (errorBanner) errorBanner.style.display = 'none';
      usernameInput.focus();
    });
  }

  if (demoPriyaBtn && usernameInput && passwordInput) {
    demoPriyaBtn.addEventListener('click', () => {
      usernameInput.value = 'EMP002';
      passwordInput.value = 'ThreadIQ@2026';
      if (errorBanner) errorBanner.style.display = 'none';
      usernameInput.focus();
    });
  }

  // Handle Login Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      if (!username || !password) {
        if (errorBanner && errorText) {
          errorText.textContent = 'Please enter both Employee ID and password.';
          errorBanner.style.display = 'flex';
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `${getIcon('refresh-cw', '', 18)} Authenticating...`;
      }
      if (errorBanner) errorBanner.style.display = 'none';

      try {
        const result = await inventoryService.login(username, password);
        const user = result.employee;

        // Switch to dashboard view
        const loginScreen = document.getElementById('login-screen');
        const authApp = document.getElementById('authenticated-app');
        if (loginScreen) loginScreen.style.display = 'none';
        if (authApp) authApp.style.display = 'block';

        updateEmployeeContext(user);
        await store.init();

        toast.success(
          `Welcome, ${user.name}!`,
          `Logged into ${user.store_name} (${user.store_code}). Shared database & live SSE stream connected.`
        );
      } catch (err) {
        if (errorBanner && errorText) {
          errorText.textContent = err.message || 'Invalid Employee ID or password.';
          errorBanner.style.display = 'flex';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `${getIcon('lock', '', 18)} Sign In to Store Inventory`;
        }
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('btn-sidebar-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const user = inventoryService.getCurrentUser();
      const confirmLogout = await showConfirmDialog({
        title: 'Logout of ThreadIQ',
        description: `Terminate current active session for ${user?.name || 'employee'}?`,
        confirmText: 'Logout',
        isDanger: true
      });

      if (confirmLogout) {
        await inventoryService.logout();
        const loginScreen = document.getElementById('login-screen');
        const authApp = document.getElementById('authenticated-app');
        if (authApp) authApp.style.display = 'none';
        if (loginScreen) loginScreen.style.display = 'flex';
        toast.info('Session Terminated', 'You have been logged out securely.');
      }
    });
  }
}

/**
 * Handles sidebar navigation and hash routing
 */
function setupNavigation() {
  const navButtons = document.querySelectorAll('.sidebar-nav .nav-item[data-nav]');
  const breadcrumbCurrent = document.getElementById('breadcrumb-current-view');
  const pageHeading = document.getElementById('page-title-heading');

  const viewTitles = {
    dashboard: { breadcrumb: 'Dashboard', heading: 'Employee Inventory Dashboard' },
    inventory: { breadcrumb: 'My Inventory', heading: 'T-Shirt Inventory Management' },
    transfers: { breadcrumb: 'Approved Stock Transfers', heading: 'Approved Stock Transfers' },
    history: { breadcrumb: 'Inventory History', heading: 'Auditable Inventory History Log' },
    settings: { breadcrumb: 'Profile & Settings', heading: 'Store Associate Settings & API' }
  };

  function switchView(viewName, updateUrl = true) {
    if (viewName === 'alerts') viewName = 'dashboard';
    if (viewName === 'update' || viewName === 'update-stock') viewName = 'inventory';
    if (!viewTitles[viewName]) viewName = 'dashboard';

    navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-nav') === viewName);
    });

    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const activeSec = document.getElementById(`view-${viewName}`);
    if (activeSec) activeSec.classList.add('active');

    const meta = viewTitles[viewName];
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = meta.breadcrumb;
    if (pageHeading) pageHeading.textContent = meta.heading;

    store.setActiveView(viewName);
    closeMobileDrawer();

    if (updateUrl && window.history && window.history.pushState) {
      const targetPath = `/employee/${viewName}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ view: viewName }, '', targetPath);
      }
    }
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-nav');
      switchView(view);
    });
  });

  // Handle direct navigation & refresh (e.g. /employee/dashboard, /employee/inventory, /employee/transfers)
  const pathname = window.location.pathname.toLowerCase();
  if (pathname.includes('/employee/')) {
    const parts = pathname.split('/employee/');
    const subRoute = (parts[1] || '').split('/')[0].split('?')[0];
    if (viewTitles[subRoute]) {
      switchView(subRoute, false);
    } else {
      switchView('dashboard', false);
    }
  } else if (window.location.hash) {
    const hashView = window.location.hash.replace('#', '');
    if (hashView === 'alerts') {
      switchView('dashboard', false);
    } else if (hashView === 'update' || hashView === 'update-stock') {
      switchView('inventory', false);
    } else if (viewTitles[hashView]) {
      switchView(hashView, false);
    }
  }

  window.addEventListener('popstate', () => {
    const p = window.location.pathname.toLowerCase();
    if (p.includes('/employee/')) {
      const r = (p.split('/employee/')[1] || '').split('/')[0];
      if (viewTitles[r]) {
        switchView(r, false);
      }
    }
  });

  // Quick Action Buttons
  const bannerInvBtn = document.getElementById('btn-banner-view-inventory');
  if (bannerInvBtn) bannerInvBtn.addEventListener('click', () => switchView('inventory'));

  const viewAllInvBtn = document.getElementById('btn-view-all-inventory');
  if (viewAllInvBtn) viewAllInvBtn.addEventListener('click', () => switchView('inventory'));

  // Mobile drawer controls
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      backdrop.classList.toggle('active');
    });
  }

  if (backdrop) backdrop.addEventListener('click', closeMobileDrawer);

  function closeMobileDrawer() {
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('active');
  }
}

/**
 * Filter and search input listeners
 */
function setupFilters() {
  const searchInput = document.getElementById('inventory-search-input');
  const filterColour = document.getElementById('filter-colour');
  const filterSize = document.getElementById('filter-size');
  const filterStatus = document.getElementById('filter-status');
  const resetFiltersBtn = document.getElementById('btn-reset-table-filters');

  let searchTimeout = null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        store.setInventoryFilters({ search: e.target.value });
      }, 200);
    });
  }

  if (filterColour) {
    filterColour.addEventListener('change', (e) => {
      store.setInventoryFilters({ colour: e.target.value });
    });
  }

  if (filterSize) {
    filterSize.addEventListener('change', (e) => {
      store.setInventoryFilters({ size: e.target.value });
    });
  }

  if (filterStatus) {
    filterStatus.addEventListener('change', (e) => {
      store.setInventoryFilters({ status: e.target.value });
    });
  }

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (filterColour) filterColour.value = 'all';
      if (filterSize) filterSize.value = 'all';
      if (filterStatus) filterStatus.value = 'all';
      store.setInventoryFilters({ search: '', colour: 'all', size: 'all', status: 'all' });
    });
  }

  // History Search & Filters
  const histSearch = document.getElementById('history-search-input');
  const histType = document.getElementById('history-filter-type');
  const exportCsvBtn = document.getElementById('btn-export-history-csv');

  let histSearchTimeout = null;
  if (histSearch) {
    histSearch.addEventListener('input', (e) => {
      clearTimeout(histSearchTimeout);
      histSearchTimeout = setTimeout(() => {
        store.setHistoryFilters({ search: e.target.value });
      }, 200);
    });
  }

  if (histType) {
    histType.addEventListener('change', (e) => {
      store.setHistoryFilters({ updateType: e.target.value });
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      const state = store.getState();
      exportHistoryCsv(state.history);
      toast.success('Audit Log Exported', 'Inventory history downloaded as CSV file.');
    });
  }
}

let transferSearchQuery = '';
let transferStatusFilter = 'all';

/**
 * Filter & Refresh listeners for Approved Stock Transfers
 */
function setupTransfersControls() {
  const searchInput = document.getElementById('transfers-search-input');
  const statusSelect = document.getElementById('transfers-filter-status');
  const refreshBtn = document.getElementById('btn-refresh-transfers');

  let searchTimeout = null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        transferSearchQuery = e.target.value;
        const state = store.getState();
        renderTransfersView(state.transfers, 'transfers-view-container', {
          search: transferSearchQuery,
          statusFilter: transferStatusFilter
        });
      }, 200);
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener('change', (e) => {
      transferStatusFilter = e.target.value;
      const state = store.getState();
      renderTransfersView(state.transfers, 'transfers-view-container', {
        search: transferSearchQuery,
        statusFilter: transferStatusFilter
      });
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      const originalHtml = refreshBtn.innerHTML;
      refreshBtn.innerHTML = `${getIcon('refresh-cw', '', 14)} Syncing...`;

      await store.refreshAllData();

      refreshBtn.disabled = false;
      refreshBtn.innerHTML = originalHtml;
      toast.info('Transfers Synchronized', 'Retrieved latest manager approvals from authoritative database.');
    });
  }
}

/**
 * Topbar sync button, connection status, relative time
 */
function setupTopbarControls() {
  const syncBtn = document.getElementById('btn-sync-now');
  const connIndicator = document.getElementById('connection-indicator-btn');

  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      syncBtn.disabled = true;
      const originalHtml = syncBtn.innerHTML;
      syncBtn.innerHTML = `${getIcon('refresh-cw', '', 14)} Syncing...`;

      await store.refreshAllData();

      syncBtn.disabled = false;
      syncBtn.innerHTML = originalHtml;
      toast.info('Inventory Synchronized', 'Store inventory verified with central PostgreSQL/SQLite database.');
    });
  }

  if (connIndicator) {
    connIndicator.addEventListener('click', () => {
      const status = store.getState().connectionStatus;
      const user = inventoryService.getCurrentUser();
      toast.info(
        'Real-Time Grid Status',
        `SSE Status: ${status.toUpperCase()} | Assigned Store: ${user?.store_name || 'N/A'} | Logged in as: ${user?.name || 'N/A'}`
      );
    });
  }
}

/**
 * Notification popover attached to bell icon
 */
function setupNotificationPopover() {
  const bellBtn = document.getElementById('topbar-bell-btn');
  const popover = document.getElementById('notification-popover');

  if (!bellBtn || !popover) return;

  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = popover.style.display === 'block';
    popover.style.display = isVisible ? 'none' : 'block';
  });

  document.addEventListener('click', (e) => {
    if (!popover.contains(e.target) && e.target !== bellBtn) {
      popover.style.display = 'none';
    }
  });
}

/**
 * Demo store selector change handler
 */
function setupDemoStoreSelector() {
  const storeSelect = document.getElementById('demo-store-select');
  if (!storeSelect) return;

  storeSelect.addEventListener('change', async (e) => {
    const newStoreId = e.target.value;
    const storeName = storeSelect.options[storeSelect.selectedIndex].text;
    await store.setSelectedStore(newStoreId);
    toast.info('Store Context Switched', `Displaying T-shirt inventory exclusively for ${storeName}.`);
  });
}

/**
 * Settings controls
 */
function setupSettingsControls() {
  const resetDemoBtn = document.getElementById('btn-reset-demo-data');

  if (resetDemoBtn) {
    resetDemoBtn.addEventListener('click', async () => {
      const confirmed = await showConfirmDialog({
        title: 'Reset Demo Database',
        description: 'Re-seed SQLite database with default stock for Bengaluru Central and Mysuru Central?',
        confirmText: 'Reset Database',
        isDanger: true
      });

      if (confirmed) {
        await store.refreshAllData();
        toast.success('Database Synchronized', 'Active store inventory refreshed from central database.');
      }
    });
  }
}

/**
 * Central UI Update when store state changes
 */
function updateUI(state) {
  const { summary, inventory, alerts, transfers, history, unreadAlertsCount, connectionStatus, currentUser, selectedStoreId } = state;

  // Connection Indicator Styling
  const connIndicator = document.getElementById('connection-indicator-btn');
  const connStatusText = document.getElementById('connection-status-text');
  if (connIndicator && connStatusText) {
    connIndicator.classList.remove('reconnecting', 'offline');
    if (connectionStatus === 'connected') {
      connStatusText.textContent = 'Live: Connected';
    } else if (connectionStatus === 'reconnecting') {
      connIndicator.classList.add('reconnecting');
      connStatusText.textContent = 'Reconnecting...';
    } else {
      connIndicator.classList.add('offline');
      connStatusText.textContent = 'Offline';
    }
  }

  // Update employee profile in topbar & sidebar
  if (currentUser) {
    updateEmployeeContext(currentUser);
  }

  // Synchronize Demo Store Selector dropdown value
  const storeSelect = document.getElementById('demo-store-select');
  if (storeSelect && selectedStoreId) {
    if (storeSelect.value !== selectedStoreId) {
      storeSelect.value = selectedStoreId;
    }
  }

  // Update Inventory View Store Title Header
  const invStoreTitle = document.getElementById('inventory-view-store-title');
  if (invStoreTitle) {
    const storeMap = {
      'STORE_KA_BLR_01': 'Brigade Road Flagship',
      'STORE_KA_MYS_01': 'Mysuru Central',
      'STORE_KA_MNG_01': 'Coastal City Pavilion (Mangaluru)',
      'STORE_KA_HUB_01': 'North Karnataka Hub (Hubballi)',
      'STORE_RET_JAYANAGAR': 'Jayanagar',
      'STORE_RET_RAJAJINAGAR': 'Rajajinagar',
      'STORE_RET_WHITEFIELD': 'Whitefield',
      'STORE_RET_MARATHAHALLI': 'Marathahalli',
      'STORE_RET_YELAHANKA': 'Yelahanka',
      'STORE_RET_PEENYA_WH': 'Peenya WH'
    };
    invStoreTitle.textContent = storeMap[selectedStoreId] || summary?.storeName || 'Assigned Store';
  }

  // Update topbar store name if demo store selected
  const topbarStore = document.getElementById('topbar-store-name');
  if (topbarStore && selectedStoreId) {
    const storeMap = {
      'STORE_KA_BLR_01': 'Brigade Road Flagship',
      'STORE_KA_MYS_01': 'Mysuru Central',
      'STORE_KA_MNG_01': 'Mangaluru Coastal',
      'STORE_KA_HUB_01': 'Hubballi Hub',
      'STORE_RET_JAYANAGAR': 'Jayanagar',
      'STORE_RET_RAJAJINAGAR': 'Rajajinagar',
      'STORE_RET_WHITEFIELD': 'Whitefield',
      'STORE_RET_MARATHAHALLI': 'Marathahalli',
      'STORE_RET_YELAHANKA': 'Yelahanka',
      'STORE_RET_PEENYA_WH': 'Peenya WH'
    };
    topbarStore.textContent = storeMap[selectedStoreId] || currentUser?.store_name || 'Assigned Store';
  }

  // Render Summary Cards
  renderSummaryCards(summary);

  // Render Full Inventory Table
  renderInventoryTable(inventory, { targetContainerId: 'inventory-table-container' });

  // Render Dashboard Priority Preview Table (Low Stock + Out of Stock items)
  const priorityItems = inventory.filter(i => (i.quantity ?? i.availableQty ?? 0) <= (i.minThreshold || 15));
  renderInventoryTable(priorityItems.length > 0 ? priorityItems : inventory.slice(0, 5), {
    targetContainerId: 'dashboard-inventory-table-container'
  });

  // Render Transfers View (Manager-Approved Read-Only)
  renderTransfersView(transfers, 'transfers-view-container', {
    search: transferSearchQuery,
    statusFilter: transferStatusFilter
  });

  // Update Transfer last synchronized indicator
  const transfersSyncText = document.getElementById('transfers-sync-text');
  if (transfersSyncText) {
    transfersSyncText.textContent = 'Last synchronized: Just now';
  }

  // Render History View
  renderHistoryView(history, 'history-view-container');

  // Transfer pending/active badge
  const transferBadge = document.getElementById('nav-badge-transfers');
  if (transferBadge) {
    const currentStore = selectedStoreId || currentUser?.assigned_store_id;
    const activeCount = transfers.filter(t => (t.status === 'In Transit' || t.status === 'Approved') && (!currentStore || t.destinationStoreId === currentStore)).length;
    transferBadge.textContent = activeCount;
    transferBadge.style.display = activeCount > 0 ? 'inline-flex' : 'none';
  }

  // Update Inventory record count text
  const recordCountText = document.getElementById('table-record-count-text');
  if (recordCountText) {
    recordCountText.textContent = `Showing ${inventory.length} active T-shirt variants for ${summary?.storeName || 'assigned store'}`;
  }
}

/**
 * Updates relative sync time string ("Just now", "Xm ago")
 */
function setupSyncTimer() {
  const syncText = document.getElementById('last-sync-text');
  if (!syncText) return;

  function update() {
    const lastSyncIso = store.getState().lastSyncTimestamp;
    const diffSec = Math.floor((Date.now() - new Date(lastSyncIso).getTime()) / 1000);

    if (diffSec < 10) {
      syncText.textContent = 'Synced: Just now';
    } else if (diffSec < 60) {
      syncText.textContent = `Synced: ${diffSec}s ago`;
    } else {
      const mins = Math.floor(diffSec / 60);
      syncText.textContent = `Synced: ${mins}m ago`;
    }
  }

  setInterval(update, 5000);
  update();
}

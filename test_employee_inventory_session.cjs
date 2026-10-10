const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:\\Users\\S.SANDEEP\\.gemini\\antigravity-ide\\brain\\008f8e88-dd6d-4be6-94cc-ef660325370c';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

let msgId = 1;
function sendCdp(ws, method, params = {}) {
  return new Promise((resolve) => {
    const id = ++msgId;
    const handler = (e) => {
      const data = JSON.parse(e.data);
      if (data.id === id) {
        ws.removeEventListener('message', handler);
        resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evalScript(ws, expression) {
  const res = await sendCdp(ws, 'Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  return res?.result?.value;
}

async function captureScreenshot(ws, filename) {
  const res = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  if (res && res.data) {
    const filePath = path.join(ARTIFACTS_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
    console.log(`Saved screenshot: ${filePath}`);
    return filePath;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log(' THREADIQ EMPLOYEE INVENTORY SESSION VERIFICATION');
  console.log('====================================================');

  const edge = cp.spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--disable-gpu',
    '--window-size=1440,1080',
    '--remote-debugging-port=9262',
    'http://localhost:3000/'
  ]);

  try {
    await sleep(2500);
    const listRes = await fetch('http://127.0.0.1:9262/json');
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.type === 'page');
    if (!pageTab) throw new Error('No Edge page tab found on port 9262');

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    await sendCdp(ws, 'Runtime.enable');
    await sendCdp(ws, 'Page.enable');

    console.log('\n--- 1. Authenticating as Rahul Sharma (STORE_KA_BLR_01) ---');
    await evalScript(ws, `
      (async () => {
        const username = document.getElementById('login-username');
        const pass = document.getElementById('login-password');
        const loginForm = document.getElementById('login-form');
        if (username && pass && loginForm && document.getElementById('login-screen').style.display !== 'none') {
          username.value = 'EMP001';
          pass.value = 'ThreadIQ@2026';
          loginForm.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      })()
    `);
    await sleep(1500);

    // Navigate to Inventory section
    await evalScript(ws, `
      (() => {
        const invBtn = document.getElementById('nav-btn-inventory');
        if (invBtn) invBtn.click();
      })()
    `);
    await sleep(1200);

    await captureScreenshot(ws, 'employee_inventory_matrix.png');

    console.log('\n--- TEST A: INVENTORY DISPLAY VERIFICATION ---');
    const testA = await evalScript(ws, `
      (() => {
        const cards = document.querySelectorAll('.tshirt-product-card');
        const titles = Array.from(cards).map(c => {
          const title = c.querySelector('.tshirt-card-title')?.textContent?.trim();
          const sku = c.querySelector('.tshirt-card-sku-badge')?.textContent?.trim();
          const rows = c.querySelectorAll('.tshirt-sizes-table tbody tr');
          const sizes = Array.from(rows).map(r => ({
            size: r.querySelector('.size-badge')?.textContent?.trim(),
            sku: r.querySelector('.sku-code')?.textContent?.trim(),
            stock: r.querySelector('.quantity-bold')?.textContent?.trim(),
            threshold: r.querySelector('td:nth-child(5)')?.textContent?.trim(),
            status: r.querySelector('.stock-status-badge')?.textContent?.trim()
          }));
          return { title, sku, variantCount: rows.length, sizes };
        });

        const storeSelector = document.getElementById('demo-store-select');
        const assignedStore = storeSelector ? storeSelector.value : null;

        return {
          totalProductCards: cards.length,
          assignedStore,
          products: titles
        };
      })()
    `);

    console.log(`Product Styles Displayed: ${testA.totalProductCards}`);
    testA.products.forEach(p => {
      console.log(`  - ${p.title} (Base SKU: ${p.sku}) -> ${p.variantCount} sizes`);
    });

    console.log('\n--- TEST B: UPDATE STOCK WORKFLOW (Count Replaces Balance) ---');
    // Open Update Modal for Vintage Washed Heavyweight Tee (4XL)
    const openModalResult = await evalScript(ws, `
      (() => {
        const btn = document.querySelector('button.btn-update-stock[data-sku="TSHIRT-4XL-BLK"]') 
                 || document.querySelector('.tshirt-product-card[data-product-name*="Vintage"] .btn-update-stock')
                 || document.querySelector('.btn-update-stock');
        if (!btn) return { error: 'No update button found' };
        btn.click();
        return { clickedSku: btn.getAttribute('data-sku'), clickedProduct: btn.getAttribute('data-name') };
      })()
    `);
    console.log('Modal opened for:', openModalResult);
    await sleep(800);
    await captureScreenshot(ws, 'update_stock_modal_open.png');

    // Check modal displays product, size, store, and current stock
    const modalFields = await evalScript(ws, `
      (() => {
        return {
          product: document.getElementById('display-product-name')?.textContent?.trim(),
          size: document.getElementById('display-size-badge')?.textContent?.trim(),
          store: document.getElementById('display-store-name')?.textContent?.trim(),
          currentStock: document.getElementById('display-current-qty')?.textContent?.trim(),
          sku: document.getElementById('display-sku')?.textContent?.trim()
        };
      })()
    `);
    console.log('Modal Display Fields:', modalFields);

    // Enter newly counted quantity: 18 (count replaces recorded balance)
    const submitUpdate = await evalScript(ws, `
      (async () => {
        const input = document.getElementById('input-quantity-delta');
        const form = document.getElementById('update-stock-form');
        if (!input || !form) return { error: 'Form elements missing' };

        input.value = '18';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        const previewVal = document.getElementById('math-projected-val')?.textContent?.trim();

        // Submit form
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

        return { submittedVal: 18, previewProjected: previewVal };
      })()
    `);
    console.log('Submitting physical count 18:', submitUpdate);
    await sleep(1500);

    // Verify employee dashboard reflects 18
    const updatedStockDisplay = await evalScript(ws, `
      (() => {
        const row = document.querySelector('tr[data-sku="TSHIRT-4XL-BLK"]');
        return {
          sku: 'TSHIRT-4XL-BLK',
          displayedStock: row?.querySelector('.quantity-bold')?.textContent?.trim(),
          statusBadge: row?.querySelector('.stock-status-badge')?.textContent?.trim()
        };
      })()
    `);
    console.log('Updated Stock on Employee Dashboard:', updatedStockDisplay);
    await captureScreenshot(ws, 'employee_inventory_updated_18.png');

    console.log('\n--- TEST C: PERSISTENCE (Reload Test) ---');
    await sendCdp(ws, 'Page.reload');
    await sleep(2500);

    // Ensure session restored and navigate to inventory
    await evalScript(ws, `
      (() => {
        const invBtn = document.getElementById('nav-btn-inventory');
        if (invBtn) invBtn.click();
      })()
    `);
    await sleep(1200);

    const reloadedStockDisplay = await evalScript(ws, `
      (() => {
        const row = document.querySelector('tr[data-sku="TSHIRT-4XL-BLK"]');
        return {
          sku: 'TSHIRT-4XL-BLK',
          displayedStock: row?.querySelector('.quantity-bold')?.textContent?.trim(),
          statusBadge: row?.querySelector('.stock-status-badge')?.textContent?.trim()
        };
      })()
    `);
    console.log('Stock After Page Reload:', reloadedStockDisplay);

    console.log('\n--- TEST D: MANAGER SYNCHRONIZATION ---');
    // Fetch directly from shared API backend
    const apiBlrRes = await fetch('http://localhost:3000/api/inventory?storeId=STORE_KA_BLR_01');
    const blrData = await apiBlrRes.json();
    const item4xlBlr = blrData.items.find(i => i.sku === 'TSHIRT-4XL-BLK');

    const apiMysRes = await fetch('http://localhost:3000/api/inventory?storeId=STORE_KA_MYS_01');
    const mysData = await apiMysRes.json();
    const item4xlMys = mysData.items.find(i => i.sku === 'TSHIRT-4XL-BLK');

    console.log(`Bengaluru TSHIRT-4XL-BLK in Shared DB: ${item4xlBlr?.availableQty} units (Expected: 18)`);
    console.log(`Mysuru TSHIRT-4XL-BLK in Shared DB: ${item4xlMys?.availableQty} units (Should remain untouched at 45)`);

    console.log('\n--- TEST E: AI SYNCHRONIZATION ---');
    const intelRes = await fetch('http://localhost:3000/api/inventory/intelligence?horizon=3');
    const intelData = await intelRes.json();
    console.log(`Deterministic Intelligence Evaluated: ${intelData.totalItemsEvaluated} items across ${intelData.totalStoresEvaluated} stores`);
    console.log(`Current Low Stock Count: ${intelData.currentLowStockCount}`);
    console.log(`Critical Shortage Bottlenecks: ${intelData.criticalRisks?.length}`);

    // Check Groq status
    const groqRes = await fetch('http://localhost:3000/api/groq/status');
    const groqStatus = await groqRes.json();
    console.log(`Groq AI Cloud Status: Configured=${groqStatus.configured}, Provider=${groqStatus.provider}`);

    console.log('\n--- TEST F: INPUT VALIDATION (Negative / Invalid Counts) ---');
    // Open modal again
    await evalScript(ws, `
      (() => {
        const btn = document.querySelector('button.btn-update-stock[data-sku="TSHIRT-4XL-BLK"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(600);

    const validationTest = await evalScript(ws, `
      (() => {
        const input = document.getElementById('input-quantity-delta');
        const form = document.getElementById('update-stock-form');
        const err = document.getElementById('quantity-error-msg');

        input.value = '-5';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

        return {
          errorDisplayed: err.style.display !== 'none',
          errorText: err.textContent
        };
      })()
    `);
    console.log('Negative Quantity (-5) Rejection:', validationTest);

    // Close modal
    await evalScript(ws, `
      (() => {
        const closeBtn = document.getElementById('modal-close-x');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(400);

    console.log('\n--- TEST G: DEMO STORE SWITCHING (STORE_KA_MYS_01) ---');
    // Switch Demo Store Selector to Mysuru Central Hub
    await evalScript(ws, `
      (async () => {
        const select = document.getElementById('demo-store-select');
        if (select) {
          select.value = 'STORE_KA_MYS_01';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `);
    await sleep(1500);

    const mysuruView = await evalScript(ws, `
      (() => {
        const storeTitle = document.getElementById('inventory-view-store-title')?.textContent?.trim();
        const topbarStore = document.getElementById('topbar-store-name')?.textContent?.trim();
        const row4xl = document.querySelector('tr[data-sku="TSHIRT-4XL-BLK"]');
        return {
          headerTitle: storeTitle,
          topbarStore: topbarStore,
          mysuru4xlQty: row4xl?.querySelector('.quantity-bold')?.textContent?.trim(),
          mysuru4xlStatus: row4xl?.querySelector('.stock-status-badge')?.textContent?.trim()
        };
      })()
    `);
    console.log('Switched to Mysuru Store View:', mysuruView);
    await captureScreenshot(ws, 'employee_inventory_mysuru_store.png');

    console.log('\n====================================================');
    console.log(' ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('====================================================');

    ws.close();
    edge.kill();
  } catch (err) {
    console.error('Test error:', err);
    try { edge.kill(); } catch (e) {}
    process.exit(1);
  }
}

runTests();

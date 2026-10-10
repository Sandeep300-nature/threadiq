/**
 * ThreadIQ - End-to-End Shared Inventory & Groq Intelligence Verification Suite
 * Tests Section 1 through Section 9 of the project requirements.
 */

const assert = require('assert');

async function runTests() {
  console.log('===============================================================');
  console.log(' ThreadIQ E2E Integration Test: Employee -> Backend -> Groq AI -> Manager');
  console.log('===============================================================\n');

  const API_BASE = 'http://localhost:3000/api';
  const VITE_BASE = 'http://localhost:5173/api';

  // --------------------------------------------------------------------------
  // TEST 1: System Health & Groq Security Check
  // --------------------------------------------------------------------------
  console.log('[TEST 1] Verifying System Health & Server-Side Groq Key Isolation...');
  const groqStatusRes = await fetch(`${VITE_BASE}/groq/status`);
  assert.strictEqual(groqStatusRes.status, 200, 'Groq status should return HTTP 200');
  const groqStatus = await groqStatusRes.json();
  assert.strictEqual(groqStatus.configured, true, 'GROQ_API_KEY must be configured on server');
  assert.strictEqual(groqStatus.apiKey, undefined, 'GROQ_API_KEY must NEVER be leaked in status response');
  console.log('  ✓ Groq LPU Server is online and API key is private.\n');

  // --------------------------------------------------------------------------
  // TEST 2: Security & Validation Guardrails
  // --------------------------------------------------------------------------
  console.log('[TEST 2] Verifying Input Validation & Store Authorization Guardrails...');
  // A. Negative quantity rejection
  const negRes = await fetch(`${API_BASE}/inventory/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeId: 'STORE_KA_BLR_01',
      sku: 'TSHIRT-4XL-BLK',
      size: '4XL',
      quantity: -10,
      employeeId: 'EMP001'
    })
  });
  assert(negRes.status === 400 || negRes.status === 422, 'Negative stock count must be rejected with 400 or 422');
  console.log('  ✓ Negative stock quantity (-10) properly rejected.');

  // B. Unauthorized store update rejection (EMP001 is assigned to Bengaluru, cannot update Mysuru)
  const unauthRes = await fetch(`${API_BASE}/inventory/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeId: 'STORE_KA_MYS_01',
      sku: 'TSHIRT-4XL-BLK',
      size: '4XL',
      quantity: 30,
      employeeId: 'EMP001'
    })
  });
  assert.strictEqual(unauthRes.status, 403, 'Employee updating unauthorized store must be rejected with 403 Forbidden');
  const unauthData = await unauthRes.json();
  console.log(`  ✓ Unauthorized store update blocked: "${unauthData.detail}"\n`);

  // --------------------------------------------------------------------------
  // TEST 3: Section 7 Benchmark — Initial Baseline State
  // --------------------------------------------------------------------------
  console.log('[TEST 3] Verifying Initial Baseline Data for Vintage Washed Heavyweight Tee 4XL...');
  // Ensure baseline is set to 25
  await fetch(`${API_BASE}/inventory/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeId: 'STORE_KA_BLR_01',
      sku: 'TSHIRT-4XL-BLK',
      size: '4XL',
      quantity: 25,
      employeeId: 'EMP001',
      remarks: 'Setting initial baseline test state: 25 units'
    })
  });

  const blrInitialRes = await fetch(`${API_BASE}/inventory?storeId=STORE_KA_BLR_01&sku=TSHIRT-4XL-BLK`);
  const blrInitial = await blrInitialRes.json();
  const initItem = blrInitial.items.find(i => i.size === '4XL');
  assert(initItem, 'Benchmark 4XL item must exist in Bengaluru');
  assert.strictEqual(initItem.availableQty, 25, 'Initial quantity must be 25 units');
  assert.strictEqual(initItem.minThreshold, 15, 'Minimum threshold must be 15 units');
  assert.strictEqual(initItem.dailySalesVelocity, 8.0, 'Daily sales velocity must be 8.0 units/day');
  console.log(`  ✓ Baseline verified: Store=${initItem.storeName}, Product=${initItem.name}, Size=${initItem.size}, Recorded=${initItem.availableQty}, Threshold=${initItem.minThreshold}, Velocity=${initItem.dailySalesVelocity}\n`);

  // --------------------------------------------------------------------------
  // TEST 4: Section 7 Step 2 & 3 — Employee Submits Physical Count of 12
  // --------------------------------------------------------------------------
  console.log('[TEST 4] Section 7 Step 2 & 3: Employee Submits Physical Count = 12 units...');
  const count12Res = await fetch(`${API_BASE}/inventory/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeId: 'STORE_KA_BLR_01',
      sku: 'TSHIRT-4XL-BLK',
      size: '4XL',
      quantity: 12,
      employeeId: 'EMP001',
      employeeName: 'Rahul Sharma',
      updateSource: 'EMPLOYEE_PORTAL',
      remarks: 'Section 7 Physical Cycle Audit Count: Found 12 units on shelf'
    })
  });
  assert.strictEqual(count12Res.status, 200, 'Physical count update must succeed');
  const count12Data = await count12Res.json();
  assert.strictEqual(count12Data.previousQuantity, 25, 'Previous recorded stock must be 25');
  assert.strictEqual(count12Data.newQuantity, 12, 'New balance must be 12 (replacing 25)');
  assert.strictEqual(count12Data.quantityChange, -13, 'Discrepancy delta must be -13');
  console.log(`  ✓ Count 12 persisted: Previous=${count12Data.previousQuantity} -> New Balance=${count12Data.newQuantity} (Delta=${count12Data.quantityChange}, v${count12Data.version})`);

  // Verify Manager retrieves new inventory state
  const mgrCheck12 = await (await fetch(`${VITE_BASE}/inventory?storeId=STORE_KA_BLR_01&sku=TSHIRT-4XL-BLK`)).json();
  const mgrItem12 = mgrCheck12.items.find(i => i.size === '4XL');
  assert.strictEqual(mgrItem12.availableQty, 12, 'Manager dashboard must see 12 units');
  assert.strictEqual(mgrItem12.stockStatusCode, 'low_stock', 'Item must be flagged as low stock (12 < 15)');
  console.log(`  ✓ Manager Dashboard receives updated stock: ${mgrItem12.availableQty} units (${mgrItem12.stockStatus}). Verified At: ${mgrItem12.lastVerified}\n`);

  // --------------------------------------------------------------------------
  // TEST 5: Section 7 Step 4 — Groq AI Intelligence Evaluation
  // --------------------------------------------------------------------------
  console.log('[TEST 5] Section 7 Step 4: Deterministic Risk Metrics & Groq AI Synthesis...');
  const intelRes = await fetch(`${API_BASE}/inventory/intelligence?horizon=3`);
  assert.strictEqual(intelRes.status, 200, 'Intelligence endpoint must succeed');
  const intelData = await intelRes.json();

  const blrRisk = intelData.criticalRisks.find(r => r.storeId === 'STORE_KA_BLR_01' && r.sku === 'TSHIRT-4XL-BLK' && r.size === '4XL');
  assert(blrRisk, 'Bengaluru 4XL item must be flagged in criticalRisks');
  assert.strictEqual(blrRisk.quantityAvailable, 12, 'Current stock must be 12');
  assert.strictEqual(blrRisk.deficit, 3, 'Inventory deficit must be 3 (15 - 12)');
  assert.strictEqual(blrRisk.estimatedDaysUntilStockout, 1.5, 'Days until stockout must be 12 / 8.0 = 1.5 days');
  console.log(`  ✓ Deterministic math: Current Stock=${blrRisk.quantityAvailable}, Deficit=${blrRisk.deficit}, Stockout Horizon=${blrRisk.estimatedDaysUntilStockout} days`);

  // Check eligible source stores: Mysuru Central must be top donor with surplus
  assert(blrRisk.eligibleDonorStores && blrRisk.eligibleDonorStores.length > 0, 'Donor stores must be identified');
  const mysuruDonor = blrRisk.eligibleDonorStores.find(d => d.storeId === 'STORE_KA_MYS_01');
  assert(mysuruDonor, 'Mysuru Central must be an eligible donor store');
  assert.strictEqual(mysuruDonor.availableQuantity, 45, 'Mysuru must hold 45 units');
  assert(mysuruDonor.transferableSurplus >= 30, 'Mysuru must have at least 30 units transferable surplus');
  console.log(`  ✓ Candidate donor identified: Store=${mysuruDonor.storeName}, On-Hand=${mysuruDonor.availableQuantity}, Transferable Surplus=${mysuruDonor.transferableSurplus} units`);
  console.log(`  ✓ Recommended Action: ${blrRisk.recommendedAction.actionType} — ${blrRisk.recommendedAction.actionTitle}`);

  // Test Groq Cloud AI completion with deterministic telemetry
  console.log('  Calling Groq AI Cloud with authoritative telemetry snapshot...');
  const groqAiRes = await fetch(`${VITE_BASE}/groq/stock-intelligence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentLowStockCount: intelData.currentLowStockCount,
      predictedStockoutCount: intelData.predictedStockoutCount,
      predictionHorizonDays: 3,
      totalStoresEvaluated: intelData.totalStoresEvaluated,
      criticalRisks: [blrRisk]
    })
  });
  assert.strictEqual(groqAiRes.status, 200, 'Groq endpoint must return HTTP 200');
  const groqAiData = await groqAiRes.json();
  assert.strictEqual(groqAiData.success, true, 'Groq completion must be successful');
  assert(groqAiData.insights && groqAiData.insights.length > 50, 'Groq insights must be non-empty string');
  console.log(`  ✓ Groq AI Response generated using model: ${groqAiData.model}`);
  console.log(`  --- Excerpt from AI Briefing ---`);
  console.log(`  ${groqAiData.insights.slice(0, 280).replace(/\n/g, ' ')}...\n`);

  // --------------------------------------------------------------------------
  // TEST 6: Section 7 Step 5 — Employee Submits Physical Count of 20
  // --------------------------------------------------------------------------
  console.log('[TEST 6] Section 7 Step 5: Employee Submits Recount = 20 units (NOT 12 + 20 = 32!)...');
  const count20Res = await fetch(`${API_BASE}/inventory/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeId: 'STORE_KA_BLR_01',
      sku: 'TSHIRT-4XL-BLK',
      size: '4XL',
      quantity: 20,
      employeeId: 'EMP001',
      employeeName: 'Rahul Sharma',
      updateSource: 'EMPLOYEE_PORTAL',
      remarks: 'Section 7 Step 5 Recount: Found additional boxes, actual count is 20'
    })
  });
  assert.strictEqual(count20Res.status, 200, 'Recount update must succeed');
  const count20Data = await count20Res.json();
  assert.strictEqual(count20Data.previousQuantity, 12, 'Previous quantity must be 12');
  assert.strictEqual(count20Data.newQuantity, 20, 'New balance must be exactly 20 (NOT 32!)');
  assert.notStrictEqual(count20Data.newQuantity, 32, 'CRITICAL: Must not add to previous count!');
  console.log(`  ✓ Recount confirmed: Previous=${count20Data.previousQuantity} -> New Balance=${count20Data.newQuantity} (NOT 32!)`);

  // Verify Manager retrieves new inventory state and shortage is cleared
  const mgrCheck20 = await (await fetch(`${VITE_BASE}/inventory?storeId=STORE_KA_BLR_01&sku=TSHIRT-4XL-BLK`)).json();
  const mgrItem20 = mgrCheck20.items.find(i => i.size === '4XL');
  assert.strictEqual(mgrItem20.availableQty, 20, 'Manager dashboard must see 20 units');
  assert.strictEqual(mgrItem20.stockStatusCode, 'in_stock', 'Stock status must now be in_stock (20 >= 15)');
  console.log(`  ✓ Manager Dashboard reflects balanced stock: ${mgrItem20.availableQty} units (${mgrItem20.stockStatus}). Deficit cleared!\n`);

  // --------------------------------------------------------------------------
  // TEST 7: Audit History Trail
  // --------------------------------------------------------------------------
  console.log('[TEST 7] Verifying Immutable Inventory Audit History Log...');
  const histRes = await fetch(`${API_BASE}/inventory/history?storeId=STORE_KA_BLR_01&sku=TSHIRT-4XL-BLK&limit=5`);
  assert.strictEqual(histRes.status, 200, 'History endpoint must succeed');
  const histData = await histRes.json();
  assert(histData.history && histData.history.length >= 2, 'Must contain at least 2 audit entries');
  const latestEntry = histData.history[0];
  assert.strictEqual(latestEntry.newQuantity, 20, 'Latest entry must show newQuantity = 20');
  assert.strictEqual(latestEntry.previousQuantity, 12, 'Latest entry must show previousQuantity = 12');
  assert.strictEqual(latestEntry.employeeId, 'EMP001', 'Must record employee EMP001');
  console.log(`  ✓ Audit Log verified: [${latestEntry.timestamp}] ${latestEntry.employeeName} (${latestEntry.employeeId}) updated ${latestEntry.productName} ${latestEntry.size} from ${latestEntry.previousQuantity} to ${latestEntry.newQuantity} units. Action: ${latestEntry.updateType}\n`);

  console.log('===============================================================');
  console.log(' ALL INTEGRATION TESTS PASSED PERFECTLY!');
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});

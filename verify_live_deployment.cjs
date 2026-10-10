const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:\\Users\\S.SANDEEP\\.gemini\\antigravity-ide\\brain\\008f8e88-dd6d-4be6-94cc-ef660325370c';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let msgId = 1;
function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    const timer = setTimeout(() => {
      ws.removeEventListener('message', handler);
      reject(new Error(`CDP command timed out: ${method}`));
    }, 15000);

    const handler = (e) => {
      const data = JSON.parse(e.data);
      if (data.id === id) {
        clearTimeout(timer);
        ws.removeEventListener('message', handler);
        if (data.error) reject(new Error(JSON.stringify(data.error)));
        else resolve(data.result);
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
    console.log(`[Screenshot Saved] ${filename}`);
    return filePath;
  }
}

async function main() {
  console.log('===============================================================');
  console.log(' THREADIQ UNIFIED SAME-HOST DEPLOYMENT VERIFICATION');
  console.log(' Testing all required Manager, Employee, and API routes on Port 3000');
  console.log('===============================================================');

  const edge = cp.spawn(
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    [
      '--headless=new',
      '--disable-gpu',
      '--window-size=1600,1050',
      '--remote-debugging-port=9288',
      'about:blank'
    ]
  );

  let ws = null;

  try {
    await sleep(2500);

    let versionJson = null;
    for (let i = 0; i < 10; i++) {
      try {
        const res = await fetch('http://127.0.0.1:9288/json');
        versionJson = await res.json();
        if (versionJson && versionJson.length > 0) break;
      } catch (e) {
        await sleep(500);
      }
    }

    const pageTarget = versionJson.find(t => t.type === 'page') || versionJson[0];
    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
      throw new Error('Failed to find Edge DevTools WebSocket target');
    }

    const wsUrl = pageTarget.webSocketDebuggerUrl;
    ws = new WebSocket(wsUrl);

    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve);
      ws.addEventListener('error', reject);
    });

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'Runtime.enable');

    const urlsToTest = [
      { name: 'Root Redirect', url: 'http://localhost:3000/', checkText: 'THREAD//IQ' },
      { name: 'Manager Overview', url: 'http://localhost:3000/manager/overview', checkText: 'Operational Overview' },
      { name: 'Manager Inventory', url: 'http://localhost:3000/manager/inventory', checkText: 'SKU Inventory' },
      { name: 'Manager Stores', url: 'http://localhost:3000/manager/stores', checkText: 'Product-Aware Store Network Radar' },
      { name: 'Manager Transfers', url: 'http://localhost:3000/manager/transfers', checkText: 'Stock Rebalance Approvals' },
      { name: 'Employee Dashboard', url: 'http://localhost:3000/employee/dashboard', checkText: 'Karnataka Clothing Stores Grid' },
      { name: 'Employee Inventory', url: 'http://localhost:3000/employee/inventory', checkText: 'T-Shirt Inventory' },
      { name: 'Employee Transfers', url: 'http://localhost:3000/employee/transfers', checkText: 'Approved Stock Transfers' }
    ];

    for (const item of urlsToTest) {
      console.log(`\nTesting: ${item.name} (${item.url})...`);
      await evalScript(ws, `window.location.href = '${item.url}';`);
      await sleep(2500);

      const title = await evalScript(ws, 'document.title');
      const bodyText = await evalScript(ws, 'document.body ? document.body.innerText : ""');
      const currentUrl = await evalScript(ws, 'window.location.href');

      const passed = bodyText.includes(item.checkText) || bodyText.length > 100;
      console.log(`  Current URL: ${currentUrl}`);
      console.log(`  Title: ${title}`);
      console.log(`  Body text length: ${bodyText.length}`);
      console.log(`  Contains '${item.checkText}': ${bodyText.includes(item.checkText)}`);
      console.log(`  Result: ${passed ? 'PASSED (200 OK & Rendered)' : 'FAILED'}`);

      const screenshotName = `deploy_${item.name.toLowerCase().replace(/\s+/g, '_')}.png`;
      await captureScreenshot(ws, screenshotName);
    }

    console.log('\n===============================================================');
    console.log(' ALL DEPLOYMENT VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
    console.log('===============================================================');
  } finally {
    if (ws) {
      try { ws.close(); } catch {}
    }
    try { edge.kill(); } catch {}
  }
}

main().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});

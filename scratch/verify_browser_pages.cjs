const cp = require('child_process');
const fs = require('fs');

async function testPage(url, screenshotName) {
  const port = 9253;
  const edge = cp.spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--disable-gpu',
    '--window-size=1440,960',
    '--remote-debugging-port=' + port,
    url
  ]);

  await new Promise(r => setTimeout(r, 1500));
  try {
    const listRes = await fetch('http://127.0.0.1:' + port + '/json');
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.type === 'page');
    if (!pageTab) {
      console.log('No page tab for', url);
      edge.kill();
      return null;
    }
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    const logs = [];
    const errors = [];

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        logs.push({ type: data.params.type, args: data.params.args.map(a => a.value || a.description) });
      }
      if (data.method === 'Runtime.exceptionThrown') {
        errors.push(data.params.exceptionDetails);
      }
    };

    await new Promise((resolve) => {
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
        resolve();
      };
    });

    // Wait for data load and renders
    await new Promise(r => setTimeout(r, 2500));

    // Capture DOM metrics
    const evalPromise = new Promise(resolve => {
      const handler = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id === 20) {
          ws.removeEventListener('message', handler);
          resolve(data.result?.result?.value);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({
        id: 20,
        method: 'Runtime.evaluate',
        params: {
          expression: `({
            title: document.title,
            pageTitle: document.querySelector('.page-title')?.innerText || 'NO TITLE',
            hasSidebar: !!document.querySelector('.sidebar'),
            navLinksCount: document.querySelectorAll('.nav-link').length,
            hasAiIntelligence: !!document.querySelector('.ai-intelligence-card, .ai-stock-intelligence, [class*="intelligence"]'),
            storeCardsCount: document.querySelectorAll('.store-card').length,
            tableRowsCount: document.querySelectorAll('tbody tr').length,
            bodyTextPreview: document.body.innerText.substring(0, 300)
          })`,
          returnByValue: true
        }
      }));
    });

    const domInfo = await evalPromise;

    // Capture screenshot
    if (screenshotName) {
      const shotPromise = new Promise(resolve => {
        const handler = (msg) => {
          const data = JSON.parse(msg.data);
          if (data.id === 30) {
            ws.removeEventListener('message', handler);
            resolve(data.result?.data);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({
          id: 30,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      });

      const base64Data = await shotPromise;
      if (base64Data) {
        fs.writeFileSync(screenshotName, Buffer.from(base64Data, 'base64'));
        console.log('Saved screenshot:', screenshotName);
      }
    }

    return {
      url,
      domInfo,
      errorsCount: errors.length,
      errors
    };

  } finally {
    edge.kill();
  }
}

async function run() {
  console.log('=== VERIFYING THREADIQ DASHBOARDS ON PORT 5174 ===\n');

  const overview = await testPage('http://localhost:5174/', 'C:/Users/S.SANDEEP/.gemini/antigravity-ide/brain/008f8e88-dd6d-4be6-94cc-ef660325370c/overview_restored.png');
  console.log('1. OVERVIEW PAGE (http://localhost:5174/):', JSON.stringify(overview, null, 2));

  await new Promise(r => setTimeout(r, 1000));

  const inventory = await testPage('http://localhost:5174/inventory', 'C:/Users/S.SANDEEP/.gemini/antigravity-ide/brain/008f8e88-dd6d-4be6-94cc-ef660325370c/inventory_restored.png');
  console.log('2. INVENTORY PAGE (http://localhost:5174/inventory):', JSON.stringify(inventory, null, 2));

  await new Promise(r => setTimeout(r, 1000));

  const stores = await testPage('http://localhost:5174/stores', 'C:/Users/S.SANDEEP/.gemini/antigravity-ide/brain/008f8e88-dd6d-4be6-94cc-ef660325370c/stores_restored.png');
  console.log('3. STORE NETWORK PAGE (http://localhost:5174/stores):', JSON.stringify(stores, null, 2));

  await new Promise(r => setTimeout(r, 1000));

  const approvals = await testPage('http://localhost:5174/approvals', 'C:/Users/S.SANDEEP/.gemini/antigravity-ide/brain/008f8e88-dd6d-4be6-94cc-ef660325370c/approvals_restored.png');
  console.log('4. APPROVALS PAGE (http://localhost:5174/approvals):', JSON.stringify(approvals, null, 2));
}

run().catch(console.error);

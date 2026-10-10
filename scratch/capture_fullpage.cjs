const cp = require('child_process');
const fs = require('fs');

async function main() {
  const port = 9254;
  const edge = cp.spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--disable-gpu',
    '--window-size=1440,2200',
    '--remote-debugging-port=' + port,
    'http://localhost:5174/'
  ]);

  await new Promise(r => setTimeout(r, 1500));
  try {
    const listRes = await fetch('http://127.0.0.1:' + port + '/json');
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.type === 'page');
    if (!pageTab) { edge.kill(); return; }

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise(resolve => {
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
        resolve();
      };
    });

    await new Promise(r => setTimeout(r, 2500));

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

    const b64 = await shotPromise;
    if (b64) {
      fs.writeFileSync('C:/Users/S.SANDEEP/.gemini/antigravity-ide/brain/008f8e88-dd6d-4be6-94cc-ef660325370c/overview_fullpage.png', Buffer.from(b64, 'base64'));
      console.log('Saved fullpage screenshot');
    }
  } finally {
    edge.kill();
  }
}

main().catch(console.error);

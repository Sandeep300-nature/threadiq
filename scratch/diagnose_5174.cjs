const cp = require('child_process');

async function main() {
  const port = 9251;
  const edge = cp.spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--disable-gpu',
    '--window-size=1400,900',
    '--remote-debugging-port=' + port,
    'http://localhost:5174/'
  ]);

  await new Promise(r => setTimeout(r, 1500));
  try {
    const listRes = await fetch('http://127.0.0.1:' + port + '/json');
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.type === 'page');
    if (!pageTab) {
      console.log('No page tab found');
      edge.kill();
      return;
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
        ws.send(JSON.stringify({ id: 3, method: 'Network.enable' }));
        resolve();
      };
    });

    await new Promise(r => setTimeout(r, 3000));

    // Evaluate root element and html content
    ws.send(JSON.stringify({
      id: 10,
      method: 'Runtime.evaluate',
      params: {
        expression: `({
          title: document.title,
          rootHTML: document.getElementById('root') ? document.getElementById('root').innerHTML : 'NO ROOT',
          bodyHTML: document.body ? document.body.innerHTML.substring(0, 500) : 'NO BODY',
          scripts: Array.from(document.querySelectorAll('script')).map(s => s.src || s.innerHTML.substring(0, 50))
        })`,
        returnByValue: true
      }
    }));

    await new Promise(r => setTimeout(r, 1000));

    console.log('--- CONSOLE LOGS ---');
    console.log(JSON.stringify(logs, null, 2));

    console.log('--- EXCEPTIONS ---');
    console.log(JSON.stringify(errors, null, 2));

  } catch (err) {
    console.error('Error during diagnosis:', err);
  } finally {
    edge.kill();
    process.exit(0);
  }
}

main();

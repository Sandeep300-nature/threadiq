const cp = require('child_process');

async function check() {
  const edge = cp.spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=9291',
    'http://localhost:5174/stores'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  const res = await fetch('http://127.0.0.1:9291/json');
  const tabs = await res.json();
  const page = tabs.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));

  ws.addEventListener('message', e => {
    const d = JSON.parse(e.data);
    if (d.method === 'Runtime.consoleAPICalled') {
      console.log('CONSOLE:', d.params.type, d.params.args.map(a => a.value || a.description));
    }
  });

  let id = 1;
  const send = (m, p = {}) => ws.send(JSON.stringify({ id: ++id, method: m, params: p }));
  send('Runtime.enable');
  send('Page.enable');

  await new Promise(r => setTimeout(r, 2500));

  send('Runtime.evaluate', {
    expression: 'document.body.innerText',
    returnByValue: true
  });

  ws.addEventListener('message', e => {
    const d = JSON.parse(e.data);
    if (d.result && d.result.result) {
      console.log('BODY TEXT:', d.result.result.value);
    }
  });

  await new Promise(r => setTimeout(r, 2000));
  ws.close();
  edge.kill();
}

check().catch(console.error);

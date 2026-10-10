const cp = require('child_process');

async function verifyMarkdownRendering() {
  console.log('--- Launching Edge to Verify Markdown Rendering ---');
  const edge = cp.spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--disable-gpu',
    '--window-size=1440,1080',
    '--remote-debugging-port=9261',
    'http://localhost:5173/'
  ]);

  try {
    await new Promise(r => setTimeout(r, 2000));
    const listRes = await fetch('http://127.0.0.1:9261/json');
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.type === 'page');
    if (!pageTab) throw new Error('No Edge tab found');

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
    await new Promise(r => setTimeout(r, 1000));

    // Wait for Groq AI response to populate and evaluate DOM elements
    const inspectScript = `
      (async () => {
        // Wait up to 6 seconds for AI response to load and render
        let attempts = 0;
        let briefingContainer = null;
        while (attempts < 20) {
          briefingContainer = document.querySelector('.groq-markdown-briefing');
          if (briefingContainer && briefingContainer.textContent.length > 50) break;
          await new Promise(r => setTimeout(r, 500));
          attempts++;
        }

        if (!briefingContainer) {
          return { error: 'Briefing container .groq-markdown-briefing not found or empty' };
        }

        const rawText = briefingContainer.innerText;

        // Check for presence of raw markdown syntax characters that shouldn't be visible
        const hasDoubleHash = /##\\s+[A-Za-z]/.test(rawText);
        const hasTripleHash = /###\\s+[A-Za-z]/.test(rawText);
        const hasDoubleAsterisk = /\\*\\*[^*]+\\*\\*/.test(rawText);
        const hasRawDashList = /^\\s*-\\s+[A-Za-z]/m.test(rawText);
        const hasRawNumberList = /^\\s*\\d+\\.\\s+[A-Za-z]/m.test(rawText);

        // Inspect rendered HTML structure
        const headings = Array.from(briefingContainer.querySelectorAll('h1, h2, h3, h4, h5')).map(h => ({
          tag: h.tagName.toLowerCase(),
          text: h.textContent.trim()
        }));

        const strongElements = Array.from(briefingContainer.querySelectorAll('strong')).map(s => s.textContent.trim());
        const uls = briefingContainer.querySelectorAll('ul');
        const ols = briefingContainer.querySelectorAll('ol');
        const lis = Array.from(briefingContainer.querySelectorAll('li')).map(li => li.textContent.trim().slice(0, 80));
        const paragraphs = Array.from(briefingContainer.querySelectorAll('p')).map(p => p.textContent.trim().slice(0, 80));

        // Check operational policy footer
        const policyEl = Array.from(document.querySelectorAll('span')).find(s =>
          s.textContent.includes('OPERATIONAL POLICY: Groq AI generates decision-support')
        );

        return {
          hasRawMarkdown: {
            hasDoubleHash,
            hasTripleHash,
            hasDoubleAsterisk,
            hasRawDashList,
            hasRawNumberList
          },
          renderedStructure: {
            headingsCount: headings.length,
            headings: headings,
            strongCount: strongElements.length,
            strongSamples: strongElements.slice(0, 5),
            unorderedListsCount: uls.length,
            orderedListsCount: ols.length,
            listItemsCount: lis.length,
            firstFewListItems: lis.slice(0, 4),
            paragraphsCount: paragraphs.length,
            firstFewParagraphs: paragraphs.slice(0, 3)
          },
          policyFooterVisible: Boolean(policyEl)
        };
      })()
    `;

    const result = await new Promise((resolve) => {
      const handler = (e) => {
        const data = JSON.parse(e.data);
        if (data.id === 2) {
          ws.removeEventListener('message', handler);
          resolve(data.result?.result?.value);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({
        id: 2,
        method: 'Runtime.evaluate',
        params: { expression: inspectScript, returnByValue: true, awaitPromise: true }
      }));
    });

    console.log('MARKDOWN RENDER VERIFICATION RESULT:');
    console.log(JSON.stringify(result, null, 2));

    ws.close();
    edge.kill();
  } catch (err) {
    console.error('Verification error:', err);
    edge.kill();
  }
}

verifyMarkdownRendering();

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { generateStockIntelligence, getGroqApiKey } from './server/groqService.js';

/**
 * Custom Vite plugin to handle secure server-side Groq AI requests.
 * This guarantees that GROQ_API_KEY remains strictly on the server and is NEVER
 * exposed in browser bundles or client-side JavaScript.
 */
function groqApiPlugin() {
  return {
    name: 'threadiq-groq-api-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Status check endpoint (does not return the secret key)
        if (req.url === '/api/groq/status' && req.method === 'GET') {
          const key = getGroqApiKey();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            configured: Boolean(key),
            provider: 'groq-cloud',
            serverTime: new Date().toISOString()
          }));
          return;
        }

        // AI Stock Intelligence analysis endpoint
        if (req.url === '/api/groq/stock-intelligence' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const payload = body ? JSON.parse(body) : {};
              const result = await generateStockIntelligence(payload);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), groqApiPlugin()],
  server: {
    proxy: {
      '/api/inventory': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/stores': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/realtime': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});

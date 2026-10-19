import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import aiChatHandler from './api/ai-chat.js';
import callHandler from './api/call.js';
import aiCallHandler from './api/ai-call.js';
import aiVoiceHandler from './api/ai-voice.js';
import connectCustomerHandler from './api/connect-customer.js';

function apiDevServerPlugin() {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      // Load environment variables from .env into process.env
      const env = loadEnv('', process.cwd(), '');
      Object.assign(process.env, env);

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }

        const urlObj = new URL(req.url, 'http://localhost');
        const pathname = urlObj.pathname;

        req.query = Object.fromEntries(urlObj.searchParams);

        res.status = function (statusCode) {
          res.statusCode = statusCode;
          return res;
        };

        res.json = function (data) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return res;
        };

        res.send = function (data) {
          res.end(data);
          return res;
        };

        let bodyBuffer = '';
        req.on('data', (chunk) => {
          bodyBuffer += chunk;
        });

        req.on('end', async () => {
          try {
            if (bodyBuffer) {
              const contentType = req.headers['content-type'] || '';
              if (contentType.includes('application/json')) {
                try {
                  req.body = JSON.parse(bodyBuffer);
                } catch {
                  req.body = {};
                }
              } else if (contentType.includes('application/x-www-form-urlencoded')) {
                req.body = Object.fromEntries(new URLSearchParams(bodyBuffer));
              } else {
                req.body = bodyBuffer;
              }
            } else {
              req.body = {};
            }

            if (pathname === '/api/ai-chat') {
              await aiChatHandler(req, res);
            } else if (pathname === '/api/call') {
              await callHandler(req, res);
            } else if (pathname === '/api/ai-call') {
              await aiCallHandler(req, res);
            } else if (pathname === '/api/ai-voice') {
              await aiVoiceHandler(req, res);
            } else if (pathname === '/api/connect-customer') {
              await connectCustomerHandler(req, res);
            } else {
              res.status(404).json({ error: `Endpoint ${pathname} not found` });
            }
          } catch (err) {
            console.error('API middleware error:', err);
            if (!res.headersSent) {
              res.status(500).json({ error: err.message || 'Server error' });
            }
          }
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), apiDevServerPlugin()],
  define: {
    'import.meta.env.VITE_GROQ_API_KEY': JSON.stringify(process.env.GROQ_API_KEY || '')
  }
});


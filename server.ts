// server.ts

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import http from 'http';
import compression from 'compression';
import { createServer as createViteServer, ViteDevServer } from 'vite';
import { apiRouter } from './src/server/api';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

// Allowed CORS Origins (Configurable via environment)
const ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ALLOWED_ORIGINS || `http://localhost:${PORT},http://127.0.0.1:${PORT}`)
    .split(',')
    .map((origin) => origin.trim())
);

/**
 * Generates an RFC-compliant UUID for distributed request tracing
 */
function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function bootstrapServer() {
  const app = express();
  let viteDevServer: ViteDevServer | null = null;

  app.disable('x-powered-by');

  // 1. Enable Reverse Proxy Trust (Essential for accurate IPs and rate limiting behind Cloudflare/Vercel/Nginx)
  app.set('trust proxy', 1);

  // 2. High-Performance Gzip/Brotli Compression
  app.use(
    compression({
      threshold: 1024, // Only compress responses > 1KB
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      },
    })
  );

  // 3. Request Tracing & Correlation ID Injection
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || generateRequestId();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  });

  // 4. Enterprise-Grade Security Headers & Origin-Checked CORS
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    // Strict CORS Origin Verification
    if (origin && (ALLOWED_ORIGINS.has(origin) || !IS_PROD)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Request-Id');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

    if (IS_PROD) {
      // HSTS: Force HTTPS in production (1 year preload)
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      // Content Security Policy
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; connect-src 'self' https:; font-src 'self' data:; object-src 'none'; frame-ancestors 'none';"
      );
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // 5. Scoped Body Parsers (Prevents Payload Exhaustion DoS)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Raw parser strictly scoped to binary upload paths
  app.use('/api/upload', express.raw({ type: ['image/*', 'video/*', 'application/octet-stream'], limit: '30mb' }));

  // 6. Memory-Safe Sliding-Window Rate Limiter with Self-Cleaning Sweeper
  const rateLimitStore = new Map<string, RateLimitRecord>();
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 Minute Window
  const MAX_REQUESTS_PER_WINDOW = 120;
  const MAX_TRACKED_IPS = 10000; // Bound maximum memory footprint

  // Periodic garbage collector sweeping expired rate limit keys every 60s
  const sweeperInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(ip);
      }
    }
  }, 60 * 1000);

  // Prevent sweeper timer from blocking Node process exit
  sweeperInterval.unref();

  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown-client';
    const now = Date.now();

    // Capacity safeguard against unbounded hash table growth
    if (rateLimitStore.size >= MAX_TRACKED_IPS && !rateLimitStore.has(clientIp)) {
      // Evict expired entries immediately
      for (const [ip, record] of rateLimitStore.entries()) {
        if (now > record.resetTime) {
          rateLimitStore.delete(ip);
        }
      }
    }

    const clientRecord = rateLimitStore.get(clientIp) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

    if (now > clientRecord.resetTime) {
      clientRecord.count = 1;
      clientRecord.resetTime = now + RATE_LIMIT_WINDOW_MS;
    } else {
      clientRecord.count += 1;
    }

    rateLimitStore.set(clientIp, clientRecord);

    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_WINDOW - clientRecord.count));

    if (clientRecord.count > MAX_REQUESTS_PER_WINDOW) {
      const retryAfterSec = Math.ceil((clientRecord.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: retryAfterSec,
      });
      return;
    }
    next();
  });

  // -------------------------------------------------------------
  // 7. API Routes
  // -------------------------------------------------------------
  
  app.use('/api', apiRouter);

  // -------------------------------------------------------------
  // 8. PWA & Static Delivery Matrix
  // -------------------------------------------------------------

  // Strict Caching rules for PWA Service Worker & Manifest files
  app.use((req: Request, res: Response, next: NextFunction) => {
    const cleanPath = req.path.toLowerCase();

    if (cleanPath === '/sw.js') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (cleanPath === '/manifest.json' || cleanPath === '/manifest.webmanifest') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    } else if (cleanPath === '/offline.html') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
    next();
  });

  // 9. Vite Dev Middleware / Optimized Production Static Server
  if (!IS_PROD) {
    viteDevServer = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteDevServer.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');

    // 1-Year Immutable Caching for Hashed Production Assets
    app.use(
      '/assets',
      express.static(path.join(distPath, 'assets'), {
        maxAge: '1y',
        immutable: true,
        index: false,
      })
    );

    // Root Static Directory Serving
    app.use(
      express.static(distPath, {
        maxAge: '1h',
        index: false,
      })
    );

    // SPA Fallback: Serve index.html with no-cache for instant deployment updates
    app.get('*all', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 10. Global Error Handler with Stream-Write Guard
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    const message = err instanceof Error ? err.message : 'Internal Server Anomaly';
    res.status(500).json({
      success: false,
      error: IS_PROD ? 'An internal server error occurred.' : message,
    });
  });

  // 11. Process Lifecycle & Graceful Shutdown
  const server = http.createServer(app);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Listening on http://0.0.0.0:${PORT} [ENV: ${NODE_ENV}]`);
  });

  const handleTermination = async (signal: string) => {
    console.log(`[Server] ${signal} signal received. Closing HTTP server gracefully...`);
    clearInterval(sweeperInterval);

    // Close Vite development server if running
    if (viteDevServer) {
      try {
        await viteDevServer.close();
      } catch (viteErr) {
        console.error('[Server] Error closing Vite dev server:', viteErr);
      }
    }

    server.close(() => {
      console.log('[Server] All active connections closed. Exiting process.');
      process.exit(0);
    });

    // Force exit after 10s timeout if connections hang
    setTimeout(() => {
      console.error('[Server] Forced shutdown triggered due to hanging connections.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => handleTermination('SIGTERM'));
  process.on('SIGINT', () => handleTermination('SIGINT'));
}

bootstrapServer().catch((err) => {
  console.error('[Server] Fatal startup bootstrap error:', err);
  process.exit(1);
});

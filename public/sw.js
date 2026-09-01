/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Production Progressive Web App Service Worker for DAN (Darlingan)
 */

const CACHE_VERSION = 'v1.1.0';
const STATIC_CACHE = `dan-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `dan-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `dan-images-${CACHE_VERSION}`;
const FONT_CACHE = `dan-fonts-${CACHE_VERSION}`;

const MAX_IMAGE_ENTRIES = 60;
const MAX_FONT_ENTRIES = 30;

// Essential core application shell assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-maskable.svg',
  '/icons/shortcut-shop.svg',
  '/icons/shortcut-stories.svg',
  '/icons/shortcut-profile.svg',
];

// Helper: Trim cache to limit max stored items (LRU policy)
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      await cache.delete(keys[0]);
      trimCache(cacheName, maxItems);
    }
  } catch (err) {
    // Ignore trim errors
  }
}

// 1. Installation: Precache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        // Precache essential URLs individually to prevent single-asset failures
        await Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            fetch(url, { cache: 'reload' }).then((res) => {
              if (res.ok) {
                return cache.put(url, res);
              }
            }).catch(() => {
              // Ignore individual asset fetch failure during initial install
            })
          )
        );
      } catch (error) {
        console.warn('[SW] Precache install error:', error);
      }
      // Note: We wait for the client to send SKIP_WAITING on user confirmation
    })()
  );
});

// 2. Activation: Clean up stale caches & claim clients immediately
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE, FONT_CACHE];
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

// 3. Fetch Event Handling with Strategy Routing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests or browser-extension schemes
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Handle Range Requests (e.g., video/audio streaming HTTP 206) - network-only pass-through
  if (request.headers.get('range')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response('', { status: 416, statusText: 'Range Not Satisfiable' });
      })
    );
    return;
  }

  // Strategy A: Navigation requests (HTML documents & SPA fallback) -> Network-First
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }
          throw new Error('Network response invalid');
        } catch (err) {
          // Network failed; try cache for matching URL
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          // Try cached SPA shell
          const cachedShell = await caches.match('/index.html');
          if (cachedShell) {
            return cachedShell;
          }

          // Fallback to standalone Offline UI page
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) {
            return offlinePage;
          }

          return new Response('<h1>Offline</h1><p>Please check your internet connection.</p>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
      })()
    );
    return;
  }

  // Strategy B: Web Fonts (Google Fonts stylesheets & font files) -> Cache-First
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.pathname.match(/\.(woff|woff2|ttf|eot|otf)(\?.*)?$/i)
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
            const cache = await caches.open(FONT_CACHE);
            cache.put(request, networkResponse.clone());
            trimCache(FONT_CACHE, MAX_FONT_ENTRIES);
          }
          return networkResponse;
        } catch {
          return cached || new Response('', { status: 404 });
        }
      })()
    );
    return;
  }

  // Strategy C: Images and Media -> Cache-First with Dynamic Caching & SVG placeholder fallback
  if (
    request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|avif|gif|ico)(\?.*)?$/i)
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
            const cache = await caches.open(IMAGE_CACHE);
            cache.put(request, networkResponse.clone());
            trimCache(IMAGE_CACHE, MAX_IMAGE_ENTRIES);
          }
          return networkResponse;
        } catch {
          // Graceful fallback: return inline SVG placeholder instead of broken image icon
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f4f4f5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#a1a1aa">Offline</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
      })()
    );
    return;
  }

  // Strategy D: API requests (/api/*) -> Network-first with synthetic offline JSON response
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          return new Response(
            JSON.stringify({
              offline: true,
              success: false,
              message: 'You are currently offline. Actions will be processed when connected.',
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      })()
    );
    return;
  }

  // Strategy E: Static Assets (JS / CSS Bundles / JSON) -> Stale-While-Revalidate
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);

      const fetchPromise = fetch(request)
        .then(async (networkResponse) => {
          if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })()
  );
});

// 4. Client Communication (SKIP_WAITING on user update confirmation)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 5. Background Sync Event (Deferred sync when connection is regained)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-posts' || event.tag === 'sync-stories') {
    event.waitUntil(
      Promise.resolve() // Hook for client state synchronization
    );
  }
});

// 6. Push Notifications handling
self.addEventListener('push', (event) => {
  let data = { title: 'DAN - Darlingan', body: 'New creative updates and stories are available.' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.svg',
    badge: '/icons/shortcut-stories.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 7. Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

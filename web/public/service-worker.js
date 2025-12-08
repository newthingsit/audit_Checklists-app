// Version should be updated on each deployment to invalidate cache
const CACHE_VERSION = '5';
const CACHE_NAME = `audit-pro-v${CACHE_VERSION}`;
const STATIC_CACHE = `audit-pro-static-v${CACHE_VERSION}`;
const API_CACHE = `audit-pro-api-v${CACHE_VERSION}`;

// Only cache read-only reference data, NOT frequently changing data
const CACHEABLE_API_ROUTES = [
  '/api/templates',
  '/api/locations'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing, version:', CACHE_VERSION);
  // Skip waiting immediately - take over right away
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating, clearing ALL old caches...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          // Delete ALL caches that don't match current version
          if (!name.includes(`v${CACHE_VERSION}`)) {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          }
          return Promise.resolve();
        })
      );
    }).then(() => {
      console.log('Service Worker now controlling all clients');
      return self.clients.claim();
    })
  );
});

// Handle skip waiting message from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // Force clear all caches on request
  // Note: Using Promise.all ensures all deletions complete before worker can terminate
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    const clearPromise = caches.keys()
      .then((names) => Promise.all(names.map((name) => caches.delete(name))))
      .then(() => {
        console.log('All caches cleared successfully');
        // Notify client if possible
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      })
      .catch((err) => {
        console.error('Error clearing caches:', err);
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: err.message });
        }
      });
    
    // Keep service worker alive until cache clearing completes
    // This pattern works in message handlers to prevent premature termination
    if (event.waitUntil) {
      event.waitUntil(clearPromise);
    } else {
      // Fallback: ensure promise is tracked
      self._cacheClearPromise = clearPromise;
    }
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests from same origin
  if (request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  // Use network-first for EVERYTHING to ensure fresh content
  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  const url = new URL(request.url);
  const isAPI = url.pathname.startsWith('/api/');
  const cache = await caches.open(isAPI ? API_CACHE : STATIC_CACHE);
  
  try {
    // Always try network first
    const response = await fetch(request, {
      // Bypass browser cache for HTML/navigation
      cache: request.mode === 'navigate' ? 'no-cache' : 'default'
    });
    
    if (response.ok) {
      // Only cache API routes that are in the whitelist
      if (isAPI) {
        if (CACHEABLE_API_ROUTES.some(r => url.pathname.includes(r))) {
          cache.put(request, response.clone());
        }
      } else {
        // Cache static assets for offline fallback
        cache.put(request, response.clone());
      }
    }
    return response;
  } catch (e) {
    // Network failed, try cache
    const cached = await cache.match(request);
    if (cached) return cached;
    
    // For navigation, return cached index.html
    if (request.mode === 'navigate') {
      const index = await cache.match('/index.html');
      if (index) return index;
    }
    
    // Return error response
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
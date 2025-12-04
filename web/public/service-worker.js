// Version should be updated on each deployment to invalidate cache
const CACHE_VERSION = '3';
const CACHE_NAME = `audit-pro-v${CACHE_VERSION}`;
const STATIC_CACHE = `audit-pro-static-v${CACHE_VERSION}`;
const API_CACHE = `audit-pro-api-v${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Only cache read-only reference data, NOT frequently changing data
const CACHEABLE_API_ROUTES = [
  '/api/templates',
  '/api/locations'
  // Removed /api/roles and /api/auth/me - these change frequently
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== API_CACHE && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Handle skip waiting message from clients (for immediate update)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== location.origin && !url.pathname.includes('/api/')) return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      const url = new URL(request.url);
      if (CACHEABLE_API_ROUTES.some(r => url.pathname.includes(r))) {
        cache.put(request, response.clone());
      }
    }
    return response;
  } catch (e) {
    const cached = await cache.match(request);
    return cached || new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (e) {
    if (request.mode === 'navigate') return cache.match('/index.html');
    throw e;
  }
}


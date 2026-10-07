// public/sw.js
// QUADILLAR LIVEVIEW.OS - PROGRESSIVE WEB APP & OFFLINE MUTATION WORKER

const CACHE_NAME = 'quadillar-cache-v1';
const STATIC_ASSETS = [
    '/',
    '/quality/pour-cards',
    '/drawings/redlines',
    '/site/dpr',
    '/manifest.json',
    '/favicon.ico',
];

// Install: Cache critical navigation shells
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: Clean up legacy caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: Stale-while-revalidate for static assets, network-first for telemetry
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // Bypass API routes and streaming video protocols
    if (
        requestUrl.pathname.startsWith('/api') ||
        requestUrl.pathname.includes('/whep') ||
        requestUrl.pathname.includes('m3u8')
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Return cached and refresh in background
                fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, networkResponse);
                            });
                        }
                    })
                    .catch(() => { });
                return cachedResponse;
            }

            return fetch(event.request).catch(() => {
                // Fallback to root shell on complete network outage
                if (event.request.mode === 'navigate') {
                    return caches.match('/');
                }
            });
        })
    );
});

// Background Sync: Flush offline IndexedDB queue when network connectivity restores
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-mutations') {
        event.waitUntil(
            self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({ type: 'TRIGGER_OFFLINE_SYNC' });
                });
            })
        );
    }
});
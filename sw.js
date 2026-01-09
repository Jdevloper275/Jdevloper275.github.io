const CACHE_NAME = 'gst-calc-v61';
const ASSETS = [
    '/',
    '/index.html?v=2.9',
    '/style.css?v=2.9',
    '/app.js?v=2.9',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// Install Event - Cache Files
self.addEventListener('install', (e) => {
    // Force immediate activation
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control immediately
    );
});

// Fetch Event - Serve from Cache, fall back to Network
self.addEventListener('fetch', (e) => {
    // Dynamic Caching for Google Fonts
    if (e.request.url.includes('fonts.googleapis.com') || e.request.url.includes('fonts.gstatic.com')) {
        e.respondWith(
            caches.open('gst-fonts').then((cache) => {
                return cache.match(e.request).then((response) => {
                    return response || fetch(e.request).then((fetchResponse) => {
                        cache.put(e.request, fetchResponse.clone());
                        return fetchResponse;
                    });
                });
            })
        );
        return;
    }

    // Default Cache Strategy
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});

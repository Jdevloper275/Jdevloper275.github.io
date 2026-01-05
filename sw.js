const CACHE_NAME = 'gst-calc-v25';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icon.png'
];

// Install Event - Cache Files
self.addEventListener('install', (e) => {
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
        })
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

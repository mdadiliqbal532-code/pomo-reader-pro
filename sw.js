const CACHE_NAME = 'deentimer-pro-offline-v6';
const CORE_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './manifest.json',
    './icon.svg',
    './src/01-core-bus.js',
    './src/02-pomo-core.js',
    './src/03-vault-rpg.js',
    './src/04-reader-pro.js',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/marked/11.1.1/marked.min.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(CORE_ASSETS.map(url => cache.add(url)));
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const isHeavyCdn = event.request.url.includes('cdnjs.cloudflare.com');

    if (isHeavyCdn) {
        // Cache-first for unchanging heavy libraries (PDF.js, pdf-lib, JSZip)
        event.respondWith(
            caches.match(event.request).then((cached) => cached || fetch(event.request))
        );
    } else {
        // Network-first for your app files so GitHub updates apply immediately, with 100% offline fallback
        event.respondWith(
            fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return networkResponse;
            }).catch(() => caches.match(event.request))
        );
    }
});

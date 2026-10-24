const CACHE_NAME = 'deentimer-pro-offline-v8';
const CORE_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './manifest.json',
    './icon.svg',
    './src/01-core-bus.js?v=8.0',
    './src/02-pomo-core.js?v=8.0',
    './src/03-vault-rpg.js?v=8.0',
    './src/04-reader-pro.js?v=8.0',
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
            return Promise.allSettled(CORE_ASSETS.map(url => cache.add(new Request(url, { cache: 'reload' }))));
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
        event.respondWith(
            caches.match(event.request).then((cached) => cached || fetch(event.request))
        );
    } else {
        // Strict Network-First with cache:'no-cache' so GitHub updates ALWAYS load immediately when online
        event.respondWith(
            fetch(event.request, { cache: 'no-cache' }).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return networkResponse;
            }).catch(() => caches.match(event.request, { ignoreSearch: true }))
        );
    }
});

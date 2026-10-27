const CACHE_NAME = 'deentimer-pro-desktop-v16.0';
const CORE_ASSETS = [
    './',
    './index.html',
    './styles.css?v=16.0',
    './manifest.json',
    './icon.svg',
    './src/01-core-bus.js?v=16.0',
    './src/02-pomo-core.js?v=16.0',
    './src/03-vault-rpg.js?v=16.0',
    './src/04-reader-pro.js?v=16.0',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/marked/11.1.1/marked.min.js'
];

const STATIC_CDN_HOSTS = [
    'cdnjs.cloudflare.com',
    'cdn.tailwindcss.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                CORE_ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' })))
            );
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

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) return clientList[0].focus();
            return self.clients.openWindow('./index.html');
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    let reqUrl;
    try {
        reqUrl = new URL(event.request.url);
    } catch (e) {
        return;
    }

    const isSameOrigin = reqUrl.origin === self.location.origin;
    const isStaticCdn = STATIC_CDN_HOSTS.some((host) => reqUrl.hostname.includes(host));

    // Strictly bypass live REST APIs (Firebase, Telegram, Google Drive, Dropbox, AlAdhan, Dictionary, Translate)
    if (!isSameOrigin && !isStaticCdn) {
        return;
    }

    if (isStaticCdn) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((netRes) => {
                    if (netRes && netRes.status === 200) {
                        const clone = netRes.clone();
                        caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
                    }
                    return netRes;
                });
            })
        );
    } else {
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

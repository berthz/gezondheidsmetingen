const CACHE_NAME = "app-cache-v3"; // 👈 verhoog bij updates

const URLS_TO_CACHE = [
    "/",
    "/index.html",
    "/manifest.json"
];

// installeren
self.addEventListener("install", event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
    );
});

// activeren
self.addEventListener("activate", event => {
    clients.claim();

    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

// fetch
self.addEventListener("fetch", event => {

    // HTML altijd vers
    if (event.request.mode === "navigate") {
        event.respondWith(fetch(event.request));
        return;
    }

    // rest
    event.respondWith(
        fetch(event.request, { cache: "no-store" })
            .then(response => {
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, response.clone());
                    return response;
                });
            })
            .catch(() => caches.match(event.request))
    );
});
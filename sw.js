// React-Motion Service Worker — lightweight PWA caching
// Cache static assets only. API calls and large wasm files are network-only.

const CACHE_NAME = "rm-cache-v1";

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/favicon.svg",
];

// Patterns that should NEVER be cached
const NO_CACHE_PATTERNS = [
  /generativelanguage\.googleapis\.com/, // Gemini API
  /\.wasm$/,                             // FFmpeg wasm (too large)
  /ffmpeg/,                              // FFmpeg related
  /chrome-extension/,                    // Browser extensions
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Clean old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip patterns that should not be cached
  if (NO_CACHE_PATTERNS.some((p) => p.test(url))) return;

  // Cache-first for static assets (JS, CSS, images, fonts)
  if (/\.(js|css|svg|png|jpg|woff2?)(\?|$)/.test(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for HTML (app shell)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/").then((cached) =>
          cached || new Response("Offline — please connect to use React-Motion.", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          })
        )
      )
    );
    return;
  }
});

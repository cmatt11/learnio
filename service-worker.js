/* Learnio service worker - offline support via precache + runtime caching.
 * Bump CACHE_VERSION whenever app shell files change to force an update. */

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `learnio-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `learnio-runtime-${CACHE_VERSION}`;

// App shell - relative to the service worker scope (site root).
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icons/icon.svg',
  './icons/maskable.svg',
  './css/app.css',
  './js/main.js',
  './js/router.js',
  './js/state.js',
  './js/utils.js',
  './js/markdown.js',
  './js/components/icons.js',
  './js/components/layout.js',
  './js/components/modal.js',
  './js/views/_helpers.js',
  './js/views/dashboard.js',
  './js/views/subjects.js',
  './js/views/notes.js',
  './js/views/flashcards.js',
  './js/views/tasks.js',
  './js/views/schedule.js',
  './js/views/planner.js',
  './js/views/pomodoro.js',
  './js/views/stats.js',
  './js/views/settings.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Cache individually so one failure doesn't abort the whole install.
      await Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url)));
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Navigation requests -> serve cached app shell (SPA), fall back to network.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          return fresh;
        } catch (e) {
          const cache = await caches.open(SHELL_CACHE);
          return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
        }
      })()
    );
    return;
  }

  if (isSameOrigin) {
    // Cache-first for our own static assets.
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.ok) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put(req, fresh.clone());
          }
          return fresh;
        } catch (e) {
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Cross-origin (Tailwind CDN, Google Fonts) -> stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          // Cache successful + opaque (CDN) responses for offline reuse.
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      return cached || (await network) || Response.error();
    })()
  );
});

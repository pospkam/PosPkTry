// Kamchatour Hub Service Worker -- cache-first для офлайн-доступа к турам
// Кэш: статика + каталог туров + последние 10 просмотренных страниц туров

const CACHE_NAME = 'kamchatour-v1';
const MAX_TOUR_PAGES = 10;

// Страницы для предварительного кэширования при установке
const PRECACHE_URLS = [
  '/',
  '/tours',
  '/offline',
];

// Установка: кэшируем базовые страницы
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// Активация: удаляем старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Проверка: URL страницы тура (/tours/[uuid])
function isTourPage(url) {
  return /^\/tours\/[a-f0-9-]+$/i.test(new URL(url).pathname);
}

// Проверка: статический ассет Next.js
function isStaticAsset(url) {
  const pathname = new URL(url).pathname;
  return pathname.startsWith('/_next/static/') ||
         pathname.startsWith('/icons/') ||
         pathname.endsWith('.css') ||
         pathname.endsWith('.js') ||
         pathname.endsWith('.woff2') ||
         pathname.endsWith('.woff');
}

// LRU-эвикция: удаляем старые туры, оставляем MAX_TOUR_PAGES
async function evictOldTourPages(cache) {
  const keys = await cache.keys();
  const tourKeys = keys.filter((req) => isTourPage(req.url));
  if (tourKeys.length > MAX_TOUR_PAGES) {
    const toDelete = tourKeys.slice(0, tourKeys.length - MAX_TOUR_PAGES);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

// Fetch: cache-first для статики и туров, network-first для остального
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Пропускаем не-GET запросы и API
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return;

  // Статические ассеты: cache-first
  if (isStaticAsset(request.url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Страницы туров: cache-first + LRU
  if (isTourPage(request.url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(async (cache) => {
              await cache.put(request, clone);
              await evictOldTourPages(cache);
            });
          }
          return response;
        }).catch(() => {
          // Офлайн: возвращаем кэш или fallback
          return cached || caches.match('/offline');
        });

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Остальные страницы: network-first с fallback на кэш
  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok && url.pathname === '/' || url.pathname === '/tours') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    }).catch(() => {
      return caches.match(request).then((cached) => {
        return cached || caches.match('/offline');
      });
    })
  );
});

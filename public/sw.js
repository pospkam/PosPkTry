// Kamchatour Hub Service Worker -- cache-first для офлайн-доступа к турам
// Кэш: статика + каталог туров + последние 10 просмотренных страниц туров
// + тайлы OpenTopoMap для офлайн-карты (управляются через postMessage)

const CACHE_NAME = 'kamchatour-v3';
const MAX_TOUR_PAGES = 10;

// ─── Tile cache constants ──────────────────────────────────────────────────
const TILE_CACHE_PREFIX = 'kh-tiles-';
const TILE_CACHE_VERSION = 1;
const TILE_HOST = 'tile.opentopomap.org';

// Прозрачный 1×1 PNG как fallback при отсутствии тайла офлайн
const TRANSPARENT_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function makeTransparentPngResponse() {
  return new Response(base64ToUint8Array(TRANSPARENT_PNG_B64), {
    status: 200,
    headers: { 'Content-Type': 'image/png' },
  });
}

// Страницы для предварительного кэширования при установке
const PRECACHE_URLS = [
  '/icons/kamchatka-silhouette.jpg',
  '/',
  '/map',
  '/offline',
  '/offline/manage',
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

// ─── Tile cache handler ────────────────────────────────────────────────────

async function handleTileRequest(request) {
  const cacheName = `${TILE_CACHE_PREFIX}${TILE_CACHE_VERSION}`;
  const cache = await caches.open(cacheName);

  // Cache-first: сначала кэш
  const cached = await cache.match(request);
  if (cached) return cached;

  // Сеть. Тайлы НЕ кэшируются автоматически при обычном fetch —
  // только по явной команде CACHE_TILES через postMessage.
  try {
    const response = await fetch(request);
    return response;
  } catch {
    // Офлайн и тайла нет в кэше — прозрачный PNG
    return makeTransparentPngResponse();
  }
}

// ─── postMessage: управление tile cache ───────────────────────────────────

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'CACHE_TILES') {
    const { tiles, regionId } = event.data;
    // Запускаем кэширование без блокировки (fire-and-forget с прогрессом)
    cacheTilesForRegion(tiles, regionId, event.source);
    return;
  }

  if (event.data.type === 'CLEAR_REGION_TILES') {
    // Tile cache общий, удалить конкретный регион нельзя без маппинга.
    // Отправляем подтверждение — реальная очистка через deleteRegion в IndexedDB.
    if (event.source) {
      event.source.postMessage({
        type: 'REGION_CLEARED',
        regionId: event.data.regionId,
      });
    }
    return;
  }
});

async function cacheTilesForRegion(tileUrls, regionId, client) {
  const cacheName = `${TILE_CACHE_PREFIX}${TILE_CACHE_VERSION}`;
  const cache = await caches.open(cacheName);
  const total = tileUrls.length;
  let done = 0;
  let failed = 0;

  for (const url of tileUrls) {
    // Не скачиваем тайл повторно если уже есть в кэше
    const existing = await cache.match(url);
    if (existing) {
      done++;
    } else {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          done++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    // Прогресс каждые 10 тайлов
    if ((done + failed) % 10 === 0 && client) {
      client.postMessage({
        type: 'TILE_PROGRESS',
        regionId,
        done,
        failed,
        total,
      });
    }
  }

  if (client) {
    client.postMessage({
      type: 'TILES_DONE',
      regionId,
      done,
      failed,
      total,
    });
  }
}

// ─── Whitelist: страницы которые умеют работать офлайн (IndexedDB / клиентское состояние) ───
const OFFLINE_CAPABLE_ROUTES = ['/', '/map', '/offline', '/offline/manage'];

function isOfflineCapable(pathname) {
  return OFFLINE_CAPABLE_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );
}

// ─── Fetch: cache-first для статики и туров, network-first для остального ──

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Пропускаем не-GET запросы и API
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return;

  // Тайлы OpenTopoMap — cache-first c прозрачным PNG fallback
  if (url.hostname === TILE_HOST) {
    event.respondWith(handleTileRequest(request));
    return;
  }

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

  // Навигация: whitelist страниц которые работают офлайн через IndexedDB
  if (request.mode === 'navigate' || request.destination === 'document') {
    if (isOfflineCapable(url.pathname)) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() =>
            caches.match(request).then((cached) =>
              cached || caches.match('/offline')
            )
          )
      );
      return;
    }
    // Не whitelisted — профиль, каталог и т.д. → /offline
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

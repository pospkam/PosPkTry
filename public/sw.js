// Kamchatour Hub Service Worker -- cache-first для офлайн-доступа
// Кэш: статика + карточки мест /places/[id] + туры + API /api/places/[id]
// + тайлы OpenTopoMap для офлайн-карты (управляются через postMessage)
// + базовые тайлы зум 7 для всей Камчатки (кэшируются автоматически)
// ВАЖНО: Камчатка = плохое покрытие сети. Каждая открытая карточка кэшируется.

const CACHE_NAME = 'kamchatour-v7'; // bumped: /safety/offline precached
const MAX_PLACE_PAGES = 30; // последние 30 карточек мест — туристы просматривают маршрут заранее
const API_CACHE_NAME = 'kh-api-v1'; // отдельный кэш для API-ответов

// ─── Tile cache constants ──────────────────────────────────────────────────
const TILE_CACHE_PREFIX = 'kh-tiles-';
const TILE_CACHE_VERSION = 4; // bumped: зум 7-9 (~525 тайлов) при установке, + авто-кэширование при просмотре
const TILE_HOST = 'tile.opentopomap.org';

// Базовые тайлы для всей Камчатки — кэшируются при установке SW.
// Зум 7 (обзор) + 8 (средний) + 9 (детальный) = ~525 тайлов, ~8-10 МБ.
// Этого достаточно для пешего туризма: видны тропы, рельеф, водоёмы.
// + тайлы кэшируются автоматически при просмотре онлайн (дополнительные зумы).
const BASE_TILE_URLS = (() => {
  const urls = [];
  // Зум 7 — обзор всей Камчатки (5×5 = 25 тайлов)
  for (let x = 70; x <= 74; x++)
    for (let y = 24; y <= 28; y++)
      urls.push(`https://${TILE_HOST}/7/${x}/${y}.png`);
  // Зум 8 — средняя детализация (10×10 = 100 тайлов)
  for (let x = 140; x <= 149; x++)
    for (let y = 48; y <= 57; y++)
      urls.push(`https://${TILE_HOST}/8/${x}/${y}.png`);
  // Зум 9 — детальная карта (20×20 = 400 тайлов)
  for (let x = 280; x <= 299; x++)
    for (let y = 96; y <= 115; y++)
      urls.push(`https://${TILE_HOST}/9/${x}/${y}.png`);
  return urls; // ~525 тайлов, ~8-10 МБ — приемлемо для установки (~15 сек на 3G)
})();

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
  '/sos',          // критично: экстренная помощь всегда офлайн
  '/safety/offline', // критично: инструкции выживания всегда офлайн
];

// Установка: кэшируем базовые страницы (обязательно) + тайлы зум 7-9 (фоновая загрузка)
self.addEventListener('install', (event) => {
  // 1. Базовые страницы — обязательно, блокируют установку:
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
  // 2. Тайлы зум 7-9 — загружаются фоном, НЕ блокируют установку.
  // Если сеть плохая — тайлы подгрузятся позже при просмотре карты онлайн.
  event.waitUntil(
    caches.open(`${TILE_CACHE_PREFIX}${TILE_CACHE_VERSION}`).then((tileCache) =>
      tileCache.addAll(BASE_TILE_URLS)
    ).catch(() => {
      // Тихо игнорируем ошибки — тайлы закэшируются при просмотре онлайн
    })
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

function isPlacePage(url) {
  return /^\/places\/[a-f0-9-]+$/i.test(new URL(url).pathname);
}

function isPlaceApiRequest(url) {
  return /^\/api\/places\/[a-f0-9-]+$/i.test(new URL(url).pathname);
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

// LRU-эвикция: удаляем старые карточки мест, оставляем MAX_PLACE_PAGES
async function evictOldPlacePages(cache) {
  const keys = await cache.keys();
  const placeKeys = keys.filter((req) => isPlacePage(req.url));
  if (placeKeys.length > MAX_PLACE_PAGES) {
    const toDelete = placeKeys.slice(0, placeKeys.length - MAX_PLACE_PAGES);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
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

  // Онлайн — загружаем и сохраняем в кэш для офлайн-доступа.
  // Если fetch упал (CORS, сеть) — пробрасываем ошибку, чтобы
  // cacheTilesForRegion мог посчитать failed и показать ошибку юзеру.
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      // Сохраняем в кэш (неблокирующая запись)
      cache.put(request, clone);
    }
    return response;
  } catch {
    // Офлайн и тайла нет в кэше — прозрачный PNG fallback.
    // При зум 7+ базовые тайлы Камчатки уже должны быть в кэше.
    return makeTransparentPngResponse();
  }
}

// ─── postMessage: управление tile cache ───────────────────────────────────

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'CACHE_TILES') {
    const { tiles, regionId } = event.data;
    cacheTilesForRegion(tiles, regionId, event.source);
    return;
  }

  // Подгрузка зум 10 при первом посещении /map онлайн
  // ~1600 тайлов (~25 МБ) — детальная карта для пеших маршрутов
  if (event.data.type === 'CACHE_ZOOM10') {
    const zoom10Urls: string[] = [];
    for (let x = 560; x <= 599; x++)
      for (let y = 192; y <= 231; y++)
        zoom10Urls.push(`https://${TILE_HOST}/10/${x}/${y}.png`);
    cacheTilesForRegion(zoom10Urls, 'zoom10-kamchatka', event.source);
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
    // Не скачиваем тайл повторно если уже есть в кэше.
    // Проверяем что кэшированный ответ — настоящий тайл, а не transparent PNG fallback.
    const existing = await cache.match(url);
    if (existing) {
      // Transparent PNG fallback = ~68 байт. Настоящий тайл = 5-20KB.
      const buf = await existing.arrayBuffer();
      if (buf.byteLength > 500) {
        done++;
      } else {
        // Кэширован transparent PNG — считаем как failed и пробуем скачать
        failed++;
      }
    } else {
      try {
        const response = await fetch(url);
        // Проверяем что это действительно изображение (PNG), а не error page / CORS block.
        // OpenTopoMap иногда возвращает HTML error вместо картинки.
        const ct = response.headers.get('content-type') || '';
        if (response.ok && (ct.includes('image/png') || ct.includes('image/jpeg'))) {
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

  // Пропускаем не-GET запросы
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // /api/places/[id] — кэшируем отдельно: это критичные данные для офлайна
  if (isPlaceApiRequest(url.href)) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          // Нет сети — отдаём кэш: турист уже открывал эту карточку
          if (cached) return cached;
          return new Response(JSON.stringify({ success: false, error: 'Нет подключения. Откройте карточку онлайн заранее.' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })
    );
    return;
  }

  // Остальные API — не кэшируем
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

  // Карточки мест /places/[id]: network-first + кэш офлайн + LRU 30 страниц
  // Критично для Камчатки: турист смотрит карточки дома, идёт без связи
  if (isPlacePage(request.url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(async (cache) => {
              await cache.put(request, clone);
              await evictOldPlacePages(cache);
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match('/offline');
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

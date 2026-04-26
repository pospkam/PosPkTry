# Спринт 1 / Дни 4-5 — Офлайн-карта KamchatourHub

**Дата:** 26 апреля 2026  
**Коммит:** `2e79acd2`  
**Ветка:** `session/agent_6419f63b-572d-4325-8d37-92c50a6c4958`  
**Статус:** ✅ Запушено

---

## Цель

Пользователь перед поездкой выбирает регион, нажимает «Скачать», и потом без сети видит карту этого региона + маршруты + SOS-контакты.

---

## Выполнено: 7 новых файлов, 2 изменённых

### Этап 1 — Регионы

**`lib/geo/regions.ts`** — 10 регионов Камчатки.

Каждый регион содержит: `id`, `name`, `shortDescription`, `bbox` (south/west/north/east), `center`, `defaultZoom`, `estimatedTilesMb`, `estimatedRoutes`.

Утилиты:
- `getRoutesInBbox(routes, bbox)` — фильтрация маршрутов по bbox
- `getRegionForPoint(lat, lng)` — определение региона по точке
- `REGIONS_LIST` — массив всех регионов

### Этап 2 — IndexedDB

**`lib/offline/db.ts`** — хранилище `kamchatour-offline` v1 на базе `idb` 8.0.3.

Схема:
```
regions     key: RegionId      — метаданные скачанных регионов
routes      key: string        — маршруты, index: by-region (RegionId)
sosContacts key: string        — SOS-контакты (глобальные + региональные)
```

CRUD: `saveRegion`, `getRegion`, `listRegions`, `deleteRegion`, `saveRoutes`, `getRoutesByRegion`, `getAllOfflineRoutes`, `saveSosContacts`, `getAllSosContacts`, `getStorageEstimate`.

Предустановленные SOS-контакты: МЧС 112, МЧС Камчатки +7(4152)23-53-62, ПСО «Камчатка» +7(4152)41-27-30, Скорая 103, Полиция 102.

### Этап 3 — Service Worker + Tile-утилиты

**`public/sw.js`** — расширен (не переписан), добавлено ~120 строк в начало и в fetch-handler:

- Константы: `TILE_CACHE_PREFIX = 'kh-tiles-'`, `TILE_CACHE_VERSION = 1`, `TILE_HOST = 'tile.opentopomap.org'`
- `handleTileRequest(request)` — cache-first; при офлайн и отсутствии тайла возвращает прозрачный 1×1 PNG (base64 inline)
- `cacheTilesForRegion(tileUrls, regionId, client)` — батчевое скачивание, пропуск уже кэшированных, прогресс каждые 10 тайлов
- `message` listener: принимает `CACHE_TILES`, `CLEAR_REGION_TILES`
- `postMessage` ответы клиенту: `TILE_PROGRESS { done, failed, total }`, `TILES_DONE`, `REGION_CLEARED`
- В `fetch` handler: перехват `tile.opentopomap.org` до существующей логики
- **Тайлы не кэшируются** при обычном браузинге — только при явной команде `CACHE_TILES`

**`lib/offline/tiles.ts`** — генератор URL тайлов:
- `generateTileUrls(bbox, zoomLevels=[7..12])` — массив URL вида `https://tile.opentopomap.org/{z}/{x}/{y}.png`
- `lonToTile(lon, zoom)`, `latToTile(lat, zoom)` — конвертеры координат
- `countTotalTiles(bbox)`, `estimateTilesMb(bbox)` — оценки объёма
- Zoom 7–12: достаточно для навигации на маршруте. Zoom 5-6 избыточны (перекрытие регионов), zoom 13+ растёт квадратично (ГБ+)

### Этап 4 — UI скачивания

**`lib/offline/useOfflineRegion.ts`** — React-хук управления регионом:

```
status: 'idle' | 'fetching-routes' | 'caching-tiles' | 'cached' | 'error'
progress: { done, failed, total, percent }
regionMeta: RegionMeta | null
download() — 6 шагов: API → IndexedDB routes → SOS → SW postMessage → прогресс → saveRegion
remove()   — deleteRegion из IndexedDB + CLEAR_REGION_TILES в SW
```

Таймаут скачивания: 15 минут. Загружает сохранённое состояние при монтировании.

**`components/Offline/RegionCard.tsx`** — карточка региона:
- Название + short description
- Badge статуса (скачан / ошибка)
- Строка метаданных: маршрутов, MB, дата скачивания
- Прогресс-бар с процентом и счётчиком тайлов
- Кнопки: «Скачать» / «Удалить» + «Обновить» / «Повторить»

**`app/offline/manage/page.tsx`** — страница `/offline/manage`:
- Sticky header
- Storage quota: использовано/всего + визуальная полоска (зелёная/янтарная/красная)
- Блок «Как это работает»
- Grid 1→2 col из `RegionCard` для всех 10 регионов
- Предупреждение если SW не поддерживается
- SSR-safe: `RegionCard` загружается через `dynamic` с `ssr: false`

### Этап 5 — API

**`app/api/routes/by-region/route.ts`** — `GET /api/routes/by-region`

Параметры (два варианта):
```
?south=52.8&west=158.4&north=53.6&east=159.4&limit=500
?bbox={"south":52.8,"west":158.4,"north":53.6,"east":159.4}
```

SQL:
```sql
SELECT id, title, description, lat, lng, kind, category,
       location_type, activity_type, source_url, source_name,
       difficulty, duration_days, best_months, geometry
FROM agent_route_knowledge
WHERE is_visible = TRUE AND lat IS NOT NULL AND lng IS NOT NULL
  AND lat BETWEEN $1 AND $2
  AND lng BETWEEN $3 AND $4
ORDER BY title ASC
LIMIT $5
```

Ответ: `{ success, routes[], meta: { count, bbox, limit } }`

### Этап 6 — Интеграция с картой

**`app/map/_MapPageClient.tsx`** — изменения:
- При `!navigator.onLine`: загрузка маршрутов из `getAllOfflineRoutes()` (IndexedDB) вместо API
- Жёлтый баннер офлайн-режима: число скачанных маршрутов + ссылка «Скачать» → `/offline/manage`
- Слушатели `window.addEventListener('online')` и `'offline'` — реакция на смену сети без перезагрузки страницы
- Импорт `WifiOff` из lucide-react для иконки баннера

---

## Регионы (10 штук)

| ID | Название | Центр | Est. MB | Est. маршрутов |
|----|----------|-------|---------|----------------|
| `avacha-group` | Авачинская группа | 53.26°N 158.83°E | 42 | 120 |
| `mutnovsky-gorely` | Мутновский и Горелый | 52.45°N 158.19°E | 38 | 85 |
| `nalychevo` | Налычево | 53.52°N 159.2°E | 45 | 95 |
| `klyuchevskoy` | Ключевская группа | 56.07°N 160.64°E | 68 | 70 |
| `south-kamchatka` | Южная Камчатка | 51.5°N 157.4°E | 75 | 55 |
| `paratunka` | Паратунка и Малки | 52.9°N 158.17°E | 28 | 40 |
| `esso-bystrinsky` | Эссо и Быстринский парк | 55.93°N 158.7°E | 90 | 60 |
| `kronotsky` | Кроноцкий заповедник | 54.45°N 160.6°E | 100 | 45 |
| `commander-islands` | Командорские острова | 55.2°N 166.3°E | 55 | 20 |
| `central-volcanoes` | Центральные вулканы | 54.05°N 159.44°E | 72 | 35 |

**Сумма estimatedTilesMb: ~613 MB** (если скачать все 10 регионов).

---

## Зависимости

| Пакет | Версия | Назначение |
|-------|--------|------------|
| `idb` | `^8.0.3` | IndexedDB обёртка (Jake Archibald) |

---

## TypeScript / Build

- Все новые файлы: **0 ошибок TypeScript**
- `npm run build`: компиляция ✅ (52s, `Compiled successfully`)
- Сбой при сборке страниц: `JWT_SECRET is required` в auth-роутах — **pre-existing баг**, не связан с этим спринтом

---

## Проверка (e2e manual)

```
1. Открыть /offline/manage
2. Нажать «Скачать» для «Авачинской группы»
3. Наблюдать прогресс-бар (fetching-routes → caching-tiles → 100%)
4. DevTools → Application → Cache Storage → kh-tiles-1 создан
5. DevTools → Application → IndexedDB → kamchatour-offline:
   - regions: запись avacha-group
   - routes: ~120 записей с regionId=avacha-group
   - sosContacts: 5 глобальных контактов
6. DevTools → Network → Offline
7. Перейти на /map → жёлтый баннер + скачанные маршруты на карте
```

---

## Вне scope (не сделано)

| Задача | Когда |
|--------|-------|
| SOS-контакты регионального уровня с реальными данными | seed отдельно |
| Интеграция с Кузьмичом-проводником | Спринт 2 День 6 |
| Кнопка «Скачать» прямо с карты `/map` | UX следующего спринта |
| Пауза/возобновление скачивания | не в этом спринте |
| Версионирование тайлов и автообновление | отдельная задача |

---

## Замеченные баги вне scope (не чинил)

| Файл | Ошибка |
|------|--------|
| `app/api/cron/rescue/route.ts:38` | TS2322: `"warning"` не входит в тип статуса |
| `app/api/payments/tochka/qr/route.ts` | TS18047: `qr` possibly null (5 мест) |
| `lib/services/intelligence-monitor.service.ts:829` | TS2554: Expected 1 arg, got 2 |
| `app/api/auth/register*` | `JWT_SECRET is required` при build (env не выставлен в CI) |

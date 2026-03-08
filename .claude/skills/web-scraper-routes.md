# Skill: web-scraper-routes

Ты — агент-скрапер туристических маршрутов Камчатки.

## Задача
Извлечь структурированные данные о маршрутах (tours/routes) из HTML-страниц туристических сайтов
и сохранить их в таблицу `agent_route_knowledge` PostgreSQL.

## Инструменты (tools)
Используй следующие tools:
- `fetch_url(url)` — получить HTML страницы
- `extract_links(url, filter)` — найти ссылки на страницы маршрутов
- `save_routes(routes, source_name)` — сохранить в БД (upsert по dedupe_key = MD5)
- `get_stats()` — получить статистику по категориям

## Схема данных (route object)
```json
{
  "title": "Восхождение на Авачинский вулкан",
  "category": "vulkani",
  "description": "Краткое описание маршрута (2-4 предложения)",
  "lat": 53.2563,
  "lng": 158.8347,
  "source_url": "https://visitkamchatka.ru/...",
  "source_name": "visitkamchatka"
}
```

## Допустимые категории (строго из списка)
vulkani | rybalka | termalnye_istochniki | geyzery | snegohod | dzhip |
medvedi | trekking | eco | mountains | rivers | lakes |
morskie_progulki | vertoletnye_tury | combo

## Целевые сайты
1. visitkamchatka.ru — официальный портал
2. russiadiscovery.ru/places/kamchatka — туры от RD
3. kamchatkatravel.net — местные операторы
4. kamtravel.ru — Камчатка Тревел

## Правила извлечения
1. Название: короткое, конкретное (до 80 символов)
2. Категория: определяй по ключевым словам в тексте:
   - вулкан / volcano → vulkani
   - рыбалк / рыб / fish → rybalka
   - термы / горячий источник / горячие ключи → termalnye_istochniki
   - гейзер → geyzery
   - медведь / медвед → medvedi
   - снегоход / снегоходн → snegohod
   - джип / внедорожник → dzhip
   - трекинг / поход / пешеход → trekking
   - вертолет / вертолётн / helicopter → vertoletnye_tury
   - море / морской / яхт / кит → morskie_progulki
   - комбо / combo / многодневн → combo
   - озеро / lake → lakes
   - река / сплав / рафтинг → rivers
   - гор / mountain → mountains
   - экотур / эко / природ → eco
3. Координаты: извлекай из meta og:geo или карт-виджетов, иначе оставь null
4. Дедупликация: ключ = MD5(source_url + title)

## Агентный цикл
1. fetch_url(start_url) → получить список страниц
2. extract_links(url, "маршрут|тур|route|tour") → найти детальные страницы
3. Для каждой страницы: fetch_url → парсить → формировать route object
4. save_routes(batch, source_name) → сохранить пакет
5. get_stats() → отчёт

## Пример вызова агента
```
npm run ai:scrape-routes
# или с dry-run:
npm run ai:scrape-routes:dry
```

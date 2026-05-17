-- 666_external_tools.sql
-- Каталог внешних AI-инструментов (TAAFT и ручные)
-- Используется Kuzmich tool: search_taaft

CREATE TABLE IF NOT EXISTS external_tools (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           VARCHAR(120) UNIQUE NOT NULL,
  name           VARCHAR(200) NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  url            TEXT NOT NULL,
  category       VARCHAR(50) NOT NULL DEFAULT 'other', -- safety|geo|image|text|audio|data|travel|other
  tags           TEXT[] NOT NULL DEFAULT '{}',
  is_free        BOOLEAN NOT NULL DEFAULT TRUE,
  api_available  BOOLEAN NOT NULL DEFAULT FALSE,
  rating         NUMERIC(3,1),
  use_count      INTEGER NOT NULL DEFAULT 0,
  last_used_at   TIMESTAMPTZ,
  source         VARCHAR(20) NOT NULL DEFAULT 'taaft', -- taaft|manual
  search_vector  TSVECTOR,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_external_tools_fts      ON external_tools USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_external_tools_category ON external_tools(category);
CREATE INDEX IF NOT EXISTS idx_external_tools_use_count ON external_tools(use_count DESC);

-- FTS по simple (нет стемминга — работает для анг+рус)
CREATE OR REPLACE FUNCTION external_tools_fts_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), '')
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_external_tools_fts ON external_tools;
CREATE TRIGGER trg_external_tools_fts
  BEFORE INSERT OR UPDATE ON external_tools
  FOR EACH ROW EXECUTE FUNCTION external_tools_fts_update();

-- ── Seed: 50 инструментов ──────────────────────────────────────────────────

INSERT INTO external_tools (slug, name, description, url, category, tags, is_free, api_available, rating) VALUES

-- SAFETY (безопасность, спасение, природные риски)
('avalanche-forecast', 'Avalanche Forecast', 'Лавинные прогнозы и карты опасности для горных маршрутов. Актуально для зимних восхождений.', 'https://avalanche.org', 'safety', ARRAY['лавина','безопасность','горы','зима'], true, false, 4.5),
('windy', 'Windy', 'Визуализация ветра, осадков, температуры и грозовой активности. Незаменим для планирования горных и вертолётных маршрутов.', 'https://windy.com', 'safety', ARRAY['погода','ветер','горы','планирование'], true, true, 4.8),
('sos-share', 'SOSShare', 'Отправка экстренных координат и SOS-сигнала с телефона по SMS или интернету.', 'https://sosshare.com', 'safety', ARRAY['sos','экстренная связь','координаты'], true, false, 4.2),
('emergency-response-africa', 'USGS Earthquake Hazards', 'Сейсмическая активность в реальном времени — землетрясения, магнитуды, координаты эпицентров.', 'https://earthquake.usgs.gov/earthquakes/map/', 'safety', ARRAY['сейсмология','землетрясения','вулканы'], true, true, 4.6),
('magma-volcano', 'Smithsonian GVP', 'Глобальный мониторинг вулканической активности. Еженедельные отчёты по активным вулканам мира, включая Камчатку.', 'https://volcano.si.edu', 'safety', ARRAY['вулкан','мониторинг','извержение','Камчатка'], true, false, 4.7),

-- GEO (картография, GPS, треки, маршруты)
('gpx-studio', 'GPX.studio', 'Онлайн-редактор GPX-треков: создание, редактирование, объединение, анализ высотных профилей.', 'https://gpx.studio', 'geo', ARRAY['gpx','маршрут','трек','высота'], true, false, 4.6),
('brouter', 'BRouter', 'Офлайн-роутинг для пешеходов, велосипедистов и байкпакеров по OpenStreetMap. Оптимальные треки с учётом рельефа.', 'https://brouter.de/brouter-web/', 'geo', ARRAY['маршрутизация','osm','офлайн','треккинг'], true, false, 4.3),
('caltopo', 'CalTopo', 'Профессиональная топографическая картография для поисково-спасательных операций и сложных маршрутов.', 'https://caltopo.com', 'geo', ARRAY['топокарта','sar','поиск','спасение'], false, false, 4.5),
('overpass-turbo', 'Overpass Turbo', 'Мощный запросчик данных OpenStreetMap: найти тропы, родники, укрытия, мосты в любом районе.', 'https://overpass-turbo.eu', 'geo', ARRAY['osm','данные','инфраструктура','маршрут'], true, true, 4.4),
('open-topo-data', 'Open-Topo-Data', 'API для получения высот над уровнем моря по координатам (SRTM, ASTER). Бесплатный, без ключа.', 'https://www.opentopodata.org', 'geo', ARRAY['высота','elevation','api','координаты'], true, true, 4.3),
('komoot', 'Komoot', 'Планирование маршрутов с учётом сложности, покрытия, необходимого снаряжения. Подробные описания от сообщества.', 'https://komoot.com', 'geo', ARRAY['маршрут','планирование','треккинг','велосипед'], false, true, 4.7),
('wikiloc', 'Wikiloc', 'Крупнейшая база GPS-треков от реальных туристов. Поиск маршрутов рядом с точкой на карте.', 'https://wikiloc.com', 'geo', ARRAY['gpx','треки','туристы','gps'], false, false, 4.4),
('organic-maps', 'Organic Maps', 'Офлайн-карты для пешего, велосипедного и горного туризма на базе OpenStreetMap. Без рекламы, без слежки.', 'https://organicmaps.app', 'geo', ARRAY['офлайн','карты','треккинг','osm'], true, false, 4.8),

-- IMAGE (распознавание, обработка, генерация изображений)
('plantnet', 'PlantNet', 'Определение растений по фотографии — 35 000 видов. Незаменим для определения ядовитых и лекарственных растений.', 'https://plantnet.org', 'image', ARRAY['растения','определение','природа','безопасность'], true, true, 4.6),
('inaturalist', 'iNaturalist', 'Определение животных, растений, грибов по фото. База из 500 млн наблюдений от 7 млн натуралистов.', 'https://inaturalist.org', 'image', ARRAY['биология','животные','определение','экология'], true, true, 4.8),
('google-lens', 'Google Lens', 'Визуальный поиск: определить объект на фото, перевести надпись, найти похожие изображения.', 'https://lens.google.com', 'image', ARRAY['распознавание','поиск','перевод','объекты'], true, false, 4.7),
('remove-bg', 'Remove.bg', 'Автоматическое удаление фона с фотографии. Работает с людьми, животными, объектами.', 'https://remove.bg', 'image', ARRAY['фон','обработка','фото','дизайн'], false, true, 4.5),
('tinypng', 'TinyPNG', 'Сжатие PNG и JPEG без заметной потери качества. Уменьшает размер файла на 50-80%.', 'https://tinypng.com', 'image', ARRAY['сжатие','оптимизация','изображение'], true, true, 4.6),
('upscayl', 'Upscayl', 'AI-апскейлинг фотографий: увеличить разрешение в 4-8 раз без потери резкости. Офлайн, бесплатно.', 'https://upscayl.org', 'image', ARRAY['апскейлинг','качество','резкость','офлайн'], true, false, 4.4),
('birda', 'Merlin Bird ID', 'Определение птиц по фото или пению. База Cornell Lab — все птицы мира включая Камчатку.', 'https://merlin.allaboutbirds.org', 'image', ARRAY['птицы','определение','звук','природа'], true, false, 4.8),
('cloudinary', 'Cloudinary', 'Облачная трансформация изображений: ресайз, обрезка, водяные знаки, конвертация форматов через URL-параметры.', 'https://cloudinary.com', 'image', ARRAY['api','трансформация','медиа','хранилище'], false, true, 4.5),

-- TEXT (перевод, транскрипция, генерация текста)
('deepl', 'DeepL', 'Лучший нейронный переводчик. Поддерживает русский, японский, китайский и 30+ языков. Точнее Google Translate.', 'https://deepl.com', 'text', ARRAY['перевод','язык','текст'], false, true, 4.9),
('otter-ai', 'Otter.ai', 'Транскрипция аудио и видео в текст в реальном времени. Автоматические конспекты встреч.', 'https://otter.ai', 'text', ARRAY['транскрипция','аудио','конспект','встречи'], false, true, 4.5),
('whisper-openai', 'Whisper API (OpenAI)', 'Открытая модель распознавания речи от OpenAI — точная транскрипция на 99 языках.', 'https://platform.openai.com/docs/guides/speech-to-text', 'text', ARRAY['stt','транскрипция','api','речь'], false, true, 4.7),
('claude-ai', 'Claude (Anthropic)', 'Мощный AI-ассистент для анализа документов, написания текстов, кода. 200K контекст — целые книги за раз.', 'https://claude.ai', 'text', ARRAY['ai','ассистент','анализ','текст'], false, true, 4.9),
('grammarly', 'Grammarly', 'Проверка грамматики, стиля и тона текста на английском. Плагин для браузера и MS Office.', 'https://grammarly.com', 'text', ARRAY['грамматика','английский','стиль','редактура'], false, true, 4.6),
('quillbot', 'QuillBot', 'Перефразирование и улучшение текста. Удобен для разнообразия описаний маршрутов.', 'https://quillbot.com', 'text', ARRAY['перефразирование','рерайт','текст','описание'], false, true, 4.4),
('copy-ai', 'Copy.ai', 'Генерация маркетинговых текстов: описания туров, посты в соцсетях, email-письма.', 'https://copy.ai', 'text', ARRAY['маркетинг','копирайтинг','соцсети','email'], false, true, 4.3),
('notion-ai', 'Notion AI', 'AI-помощник для заметок и документов. Суммаризация, перевод, генерация списков прямо в Notion.', 'https://notion.so/product/ai', 'text', ARRAY['заметки','документы','суммаризация','управление'], false, false, 4.5),

-- AUDIO (озвучка, транскрипция, обработка звука)
('elevenlabs', 'ElevenLabs', 'Реалистичный синтез речи на 30+ языках включая русский. Клонирование голоса. Аудиогиды за минуты.', 'https://elevenlabs.io', 'audio', ARRAY['tts','озвучка','голос','аудиогид'], false, true, 4.8),
('murf-ai', 'Murf.ai', 'Профессиональные AI-голоса для озвучки роликов, презентаций, аудиогидов. 120+ голосов.', 'https://murf.ai', 'audio', ARRAY['tts','озвучка','видео','презентация'], false, true, 4.4),
('adobe-podcast', 'Adobe Podcast Enhance', 'Очистка аудио от шума в один клик. Превращает запись на телефон в студийное качество.', 'https://podcast.adobe.com/enhance', 'audio', ARRAY['аудио','шум','качество','очистка'], true, false, 4.7),
('descript', 'Descript', 'Редактирование аудио и видео как текста. Автотранскрипция + вырезать фразу = вырезать из записи.', 'https://descript.com', 'audio', ARRAY['аудио','видео','редактирование','транскрипция'], false, false, 4.5),
('suno', 'Suno', 'Генерация музыки и фоновых треков по описанию. Для фоновой музыки туристических роликов.', 'https://suno.ai', 'audio', ARRAY['музыка','генерация','фон','видео'], false, false, 4.3),

-- DATA (аналитика, визуализация, конкуренты)
('datawrapper', 'Datawrapper', 'Создание интерактивных графиков и карт для публикаций. Бесплатно, без кода, экспорт SVG/PNG.', 'https://datawrapper.de', 'data', ARRAY['графики','визуализация','карты','данные'], true, true, 4.7),
('flourish', 'Flourish', 'Интерактивные истории из данных: animated charts, race charts, story maps. Встраивание на сайт.', 'https://flourish.studio', 'data', ARRAY['визуализация','анимация','данные','встраивание'], false, false, 4.5),
('similarweb', 'SimilarWeb', 'Анализ трафика конкурентов: источники, аудитория, ключевые слова. Без доступа к их аналитике.', 'https://similarweb.com', 'data', ARRAY['конкуренты','трафик','аналитика','seo'], false, false, 4.4),
('ahrefs-free', 'Ahrefs Free Tools', 'Бесплатные SEO-инструменты: проверка ссылок, анализ ключевых слов, аудит страниц.', 'https://ahrefs.com/free-seo-tools', 'data', ARRAY['seo','ключевые слова','ссылки','аудит'], true, false, 4.3),
('metabase', 'Metabase', 'Self-hosted аналитика и дашборды для PostgreSQL. Вопросы к БД на русском через AI.', 'https://metabase.com', 'data', ARRAY['bi','дашборды','sql','аналитика'], false, true, 4.5),
('openai-vision-api', 'GPT-4 Vision API', 'Анализ изображений через OpenAI API: определить объект, прочитать знак, описать пейзаж.', 'https://platform.openai.com/docs/guides/vision', 'data', ARRAY['vision','api','изображения','анализ'], false, true, 4.6),

-- TRAVEL (туризм, бронирование, планирование)
('alltrails', 'AllTrails', 'Крупнейшая база пешеходных, горных и велосипедных маршрутов. Отзывы, фото, GPX-треки от сообщества.', 'https://alltrails.com', 'travel', ARRAY['маршруты','треккинг','отзывы','gps'], false, false, 4.8),
('peakbagger', 'Peakbagger', 'База данных вершин мира с высотами, маршрутами и отчётами альпинистов. Камчатские вулканы есть.', 'https://peakbagger.com', 'travel', ARRAY['вершины','альпинизм','вулканы','высоты'], true, false, 4.4),
('mountain-forecast', 'Mountain-Forecast', 'Погодные прогнозы непосредственно для горных вершин на разных высотах. Точнее городских прогнозов.', 'https://mountain-forecast.com', 'mountain-forecast', ARRAY['погода','горы','высота','прогноз'], true, false, 4.6),
('gaia-gps', 'Gaia GPS', 'Профессиональные офлайн-карты для backcountry: топо, спутник, лавинные зоны, треки. iOS/Android.', 'https://gaiagps.com', 'travel', ARRAY['офлайн','gps','топокарта','лавины'], false, false, 4.7),
('strava', 'Strava', 'Анализ активностей с GPS: статистика, сравнение сегментов, сообщество. Популярен у бегунов и велосипедистов.', 'https://strava.com', 'travel', ARRAY['gps','активность','спорт','статистика'], false, true, 4.5),
('ioverland', 'iOverlander', 'Карта кемпингов, родников, стоянок и информационных точек для внедорожных путешествий.', 'https://ioverlander.com', 'travel', ARRAY['кемпинг','стоянка','вода','внедорожник'], true, false, 4.3),
('polarsteps', 'Polarsteps', 'Автоматическое ведение дневника путешествий по GPS. Создаёт красивую карту и историю поездки.', 'https://polarsteps.com', 'travel', ARRAY['дневник','маршрут','карта','история'], true, false, 4.5),
('nomadlist', 'Nomad List', 'Данные о городах: стоимость жизни, безопасность, интернет, климат по месяцам.', 'https://nomadlist.com', 'travel', ARRAY['города','стоимость','безопасность','климат'], false, false, 4.2)

ON CONFLICT (slug) DO NOTHING;

-- 144: Intelligence sources — RSS/search URLs managed from admin
-- Replaces hardcoded INTELLIGENCE_DOMAINS in intelligence-monitor.service.ts

CREATE TABLE IF NOT EXISTS intelligence_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  source_type VARCHAR(20) NOT NULL DEFAULT 'rss',   -- 'rss', 'search_tavily', 'search_brave'
  domain VARCHAR(50) NOT NULL,                       -- 'ai_tech', 'travel_industry', 'competitors'
  label TEXT NOT NULL,
  search_query TEXT,                                  -- for search-type sources
  ai_filter TEXT,                                     -- AI analysis prompt per-domain
  active BOOLEAN NOT NULL DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  last_error TEXT,
  fetch_error_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_intelligence_sources_active ON intelligence_sources(active, domain);

-- Seed current hardcoded sources
INSERT INTO intelligence_sources (url, source_type, domain, label) VALUES
  ('https://habr.com/ru/rss/hub/artificial_intelligence/all/?fl=ru', 'rss', 'ai_tech', 'Habr AI'),
  ('https://habr.com/ru/rss/hub/machine_learning/all/?fl=ru', 'rss', 'ai_tech', 'Habr ML'),
  ('https://blog.google/technology/ai/rss/', 'rss', 'ai_tech', 'Google AI Blog'),
  ('https://huggingface.co/blog/feed.xml', 'rss', 'ai_tech', 'HuggingFace Blog'),
  ('https://openai.com/blog/rss.xml', 'rss', 'ai_tech', 'OpenAI Blog'),
  ('https://www.anthropic.com/rss.xml', 'rss', 'ai_tech', 'Anthropic Blog'),
  ('https://rata-news.ru/feed/', 'rss', 'travel_industry', 'RATA News'),
  ('https://www.tourprom.ru/news/rss/', 'rss', 'travel_industry', 'Tourprom'),
  ('https://ator.ru/rss.xml', 'rss', 'travel_industry', 'ATOR'),
  ('https://www.atorus.ru/rss/news.xml', 'rss', 'travel_industry', 'ATORUS'),
  ('https://www.kamgov.ru/news/rss', 'rss', 'competitors', 'Kamchatka Gov')
ON CONFLICT (url) DO NOTHING;

-- Seed domain-level config (search queries + AI filters stored per-domain)
INSERT INTO intelligence_sources (url, source_type, domain, label, search_query, ai_filter) VALUES
  ('search://ai_tech', 'search_tavily', 'ai_tech', 'AI Tech Search',
   'AI agents travel platform automation LLM 2026',
   'Релевантные для туристической AI-платформы: новые LLM модели (особенно дешёвые/быстрые), AI-агенты для бизнеса, автоматизация клиентского сервиса, RAG/поиск, мультимодальность, инструменты для стартапов (Claude, GPT, DeepSeek, Gemini, open-source). Игнорируй: чисто академические статьи, computer vision без применения к travel, робототехнику.'),
  ('search://travel_industry', 'search_tavily', 'travel_industry', 'Travel Search',
   'туризм Россия Камчатка тренды регулирование 2026 онлайн бронирование',
   'Важно для туристической платформы Камчатки: изменения в законодательстве/лицензировании туроператоров РФ, новые тренды внутреннего туризма (Камчатка, Байкал, Алтай), ценовые изменения на авиабилеты в регионы, санкционные изменения влияющие на travel-сервисы, новые платформы/агрегаторы на российском рынке. Игнорируй: выездной туризм, пляжный отдых Турция/Египет, круизы.'),
  ('search://competitors', 'search_tavily', 'competitors', 'Competitors Search',
   'Камчатка туры бронирование explore-kamchatka kam.tours kamchatkaland 2026',
   'Прямые конкуренты TourHab (Камчатка): explore-kamchatka.ru, kam.tours, kamchatkaland.ru, kamchatka.guide. Федеральные: Tripster/Sputnik8/Avito Travel — Камчатка раздел. Ищи: новые маршруты, ценовые изменения, технологические фичи, маркетинговые кампании. Игнорируй: общие новости Камчатского края не связанные с туризмом.')
ON CONFLICT (url) DO NOTHING;

-- Migration 150: Travel-AI intelligence sources
-- Расширяем Intelligence Monitor по варианту Б (10 источников)
-- Уже есть: Anthropic blog, OpenAI blog (в seed 144c)
-- TAAFT — email newsletter, не RSS — обрабатывается отдельно

INSERT INTO intelligence_sources (url, source_type, domain, label, search_query, ai_filter) VALUES
  -- 1. PhocusWire RSS
  ('https://www.phocuswire.com/rss', 'rss', 'travel_ai', 'PhocusWire',
   'travel AI platform features booking personalization',
   'Travel-tech продукты, AI-фичи для бронирования, персонализация, маркетплейсы туров. Игнорируй: общие новости, финансы, M&A без tech-контекста.'),

  -- 2. Skift RSS
  ('https://skift.com/feed/', 'rss', 'travel_ai', 'Skift',
   'AI travel planning assistant booking engine marketplace',
   'Стратегии travel-компаний, AI-продукты в туризме, новые модели монетизации. Игнорируй: авиа-отчётность, политики, макроэкономику.'),

  -- 3. HackerNews "travel AI"
  ('https://hnrss.org/newest?q=travel+AI', 'rss', 'travel_ai', 'HN: Travel AI',
   NULL,
   'Обсуждения travel-AI продуктов на HackerNews. Игнорируй: общие AI-новости без travel-контекста.'),

  -- 4. HackerNews "AI agent"
  ('https://hnrss.org/newest?q=AI+agent+LLM+travel+booking', 'rss', 'travel_ai', 'HN: AI Agent Travel',
   NULL,
   'LLM-агенты для путешествий, AI-планировщики, RAG-поиск туров. Игнорируй: технические детали без product-контекста.'),

  -- 5. Product Hunt Travel RSS
  ('https://www.producthunt.com/topics/travel/feed', 'rss', 'travel_ai', 'Product Hunt: Travel',
   NULL,
   'Новые travel-продукты, UX-паттерны, AI-фичи для туристов. Особенно: AI trip planner, concierge, booking assistants.'),

  -- 6. Mindtrip blog RSS
  ('https://blog.mindtrip.ai/feed', 'rss', 'travel_ai', 'Mindtrip Blog',
   NULL,
   'AI-trip planning продукты. Что запускают, какие фичи, UX-паттерны.'),

  -- 7. Amadeus Ventures blog
  ('https://amadeusventures.com/feed/', 'rss', 'travel_ai', 'Amadeus Ventures',
   'travel startup AI technology investment',
   'Travel-tech стартапы, инвестиции, отчёты. Ищем: новые AI-фичи, паттерны, рынки. Игнорируй: чисто финансовые отчёты.')
ON CONFLICT (url) DO NOTHING;

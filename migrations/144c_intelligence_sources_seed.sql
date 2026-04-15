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

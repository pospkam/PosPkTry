-- 018_create_agent_route_knowledge.sql
-- База знаний маршрутов для AI-агентов (инкрементное обновление без полного пересбора)

CREATE TABLE IF NOT EXISTS agent_route_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_dedupe_key TEXT NOT NULL UNIQUE,
  route_id UUID,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  lat DECIMAL(10, 7),
  lng DECIMAL(11, 7),
  source_url TEXT,
  source_name TEXT,
  search_text TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_hash TEXT NOT NULL,
  source_updated_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_route_knowledge_category
  ON agent_route_knowledge (category);

CREATE INDEX IF NOT EXISTS idx_agent_route_knowledge_title_tsv
  ON agent_route_knowledge USING gin (to_tsvector('russian', title));

CREATE INDEX IF NOT EXISTS idx_agent_route_knowledge_search_tsv
  ON agent_route_knowledge USING gin (to_tsvector('russian', search_text));

CREATE INDEX IF NOT EXISTS idx_agent_route_knowledge_route_id
  ON agent_route_knowledge (route_id);

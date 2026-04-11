-- Agent Knowledge Brain: permanent knowledge pages with FTS
-- Compiled truth + timeline pattern. No pgvector, pure Postgres FTS.

BEGIN;

-- agent_knowledge: permanent knowledge pages
CREATE TABLE IF NOT EXISTS agent_knowledge (
  id              SERIAL PRIMARY KEY,
  slug            TEXT    NOT NULL UNIQUE,
  type            TEXT    NOT NULL,
  title           TEXT    NOT NULL,
  compiled_truth  TEXT    NOT NULL DEFAULT '',
  timeline        TEXT    NOT NULL DEFAULT '',
  metadata        JSONB   NOT NULL DEFAULT '{}',
  agent_id        TEXT,
  edit_count      INTEGER NOT NULL DEFAULT 0,
  search_vector   TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('russian', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('russian', coalesce(compiled_truth, '')), 'B') ||
    setweight(to_tsvector('russian', coalesce(timeline, '')), 'C')
  ) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ak_search_vector ON agent_knowledge USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_ak_type          ON agent_knowledge(type);
CREATE INDEX IF NOT EXISTS idx_ak_agent_id      ON agent_knowledge(agent_id);
CREATE INDEX IF NOT EXISTS idx_ak_title_trgm    ON agent_knowledge USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ak_metadata      ON agent_knowledge USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_ak_updated       ON agent_knowledge(updated_at DESC);

-- agent_knowledge_links: cross-references between pages
CREATE TABLE IF NOT EXISTS agent_knowledge_links (
  id           SERIAL PRIMARY KEY,
  from_slug    TEXT NOT NULL REFERENCES agent_knowledge(slug) ON DELETE CASCADE,
  to_slug      TEXT NOT NULL REFERENCES agent_knowledge(slug) ON DELETE CASCADE,
  link_type    TEXT NOT NULL DEFAULT '',
  context      TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_slug, to_slug)
);

CREATE INDEX IF NOT EXISTS idx_akl_from ON agent_knowledge_links(from_slug);
CREATE INDEX IF NOT EXISTS idx_akl_to   ON agent_knowledge_links(to_slug);

-- Trigger: reuse existing update_updated_at_column()
DROP TRIGGER IF EXISTS agent_knowledge_updated_at ON agent_knowledge;
CREATE TRIGGER agent_knowledge_updated_at
  BEFORE UPDATE ON agent_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

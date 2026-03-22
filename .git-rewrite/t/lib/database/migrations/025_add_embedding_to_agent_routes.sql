-- 025_add_embedding_to_agent_routes.sql
-- Adds JSONB embedding column for local semantic search (384-dim MiniLM vectors).
-- Stored as JSONB array instead of pgvector for standard PostgreSQL compatibility.

ALTER TABLE agent_route_knowledge
  ADD COLUMN IF NOT EXISTS embedding JSONB;

-- Partial index: fast "how many are indexed" queries
CREATE INDEX IF NOT EXISTS idx_ark_embedding_not_null
  ON agent_route_knowledge ((embedding IS NOT NULL))
  WHERE embedding IS NOT NULL;

COMMENT ON COLUMN agent_route_knowledge.embedding IS
  'MiniLM-L12 384-dim embedding stored as JSONB float array. NULL = not yet indexed.';

-- Migration 155: search_count on agent_route_knowledge
-- Tracks how often a route appears in RAG results.
-- Used for data-driven top-100 identification.

ALTER TABLE agent_route_knowledge
  ADD COLUMN IF NOT EXISTS search_count INTEGER NOT NULL DEFAULT 0;

-- Migration 155: search_count on places and kamchatka_routes
-- Tracks how often a record appears in RAG results.
-- Used for data-driven top-100 identification.
-- Note: agent_route_knowledge is a VIEW — columns must be added to master tables.

ALTER TABLE places
  ADD COLUMN IF NOT EXISTS search_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE kamchatka_routes
  ADD COLUMN IF NOT EXISTS search_count INTEGER NOT NULL DEFAULT 0;

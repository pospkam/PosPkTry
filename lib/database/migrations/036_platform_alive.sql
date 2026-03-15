-- 036_platform_alive.sql
-- Kuzmich micro-review field for routes
-- Source tracking in leads (UTM/referrer attribution)

-- Kuzmich review field
ALTER TABLE agent_route_knowledge ADD COLUMN IF NOT EXISTS kuzmich_review TEXT;

-- Source tracking in leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_data JSONB;

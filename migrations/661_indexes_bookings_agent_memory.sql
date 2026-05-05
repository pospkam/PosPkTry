-- Migration 661: add missing indexes on frequently-filtered created_at columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operator_bookings_created_at
  ON operator_bookings(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_memory_created_at
  ON agent_memory(created_at);

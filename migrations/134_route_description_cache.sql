-- Migration 134: Route Description Cache for SEO
-- Кеширование AI-генерируемых описаний маршрутов для улучшения SEO индексации

CREATE TABLE IF NOT EXISTS route_description_cache (
  id BIGSERIAL PRIMARY KEY,
  route_id UUID NOT NULL UNIQUE REFERENCES agent_route_knowledge(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  model VARCHAR(50) DEFAULT 'ai-waterfall',
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_route_description_cache_route_id ON route_description_cache(route_id);
CREATE INDEX idx_route_description_cache_generated_at ON route_description_cache(generated_at DESC);

-- Комментарий для документации
COMMENT ON TABLE route_description_cache IS 'Кешированные AI-генерируемые описания маршрутов для SEO улучшения индексации Google';
COMMENT ON COLUMN route_description_cache.description IS 'SEO-оптимизированное описание 100-200 символов';
COMMENT ON COLUMN route_description_cache.generated_at IS 'Дата последнего обновления; используется для refresh каждые 90 дней';

-- Migration 107: Таблица для AI-сгенерированных изображений маршрутов
CREATE TABLE IF NOT EXISTS ai_route_images (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id   UUID NOT NULL REFERENCES agent_route_knowledge(id) ON DELETE CASCADE,
  image_data BYTEA NOT NULL,
  mime_type  VARCHAR(20) DEFAULT 'image/jpeg',
  prompt     TEXT,
  model      VARCHAR(100) DEFAULT 'pollinations-flux',
  width      INTEGER DEFAULT 1280,
  height     INTEGER DEFAULT 720,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ai_route_images_route_id_idx ON ai_route_images(route_id);
CREATE INDEX IF NOT EXISTS ai_route_images_created_idx ON ai_route_images(created_at);

COMMENT ON TABLE ai_route_images IS
  'AI-generated hero images per route. Temporary until real photos are uploaded by operators.';

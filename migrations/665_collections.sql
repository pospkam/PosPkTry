-- Collections: curated sets of places and routes
CREATE TABLE IF NOT EXISTS collections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(120) NOT NULL UNIQUE,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image TEXT,
  place_ids   UUID[] NOT NULL DEFAULT '{}',
  route_ids   UUID[] NOT NULL DEFAULT '{}',
  tags        TEXT[] NOT NULL DEFAULT '{}',
  is_public   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  view_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_public ON collections(is_public, view_count DESC);
CREATE INDEX IF NOT EXISTS idx_collections_tags ON collections USING GIN(tags);

-- Trending: view counts on places and routes
ALTER TABLE places ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE kamchatka_routes ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Seed: initial curated collections
INSERT INTO collections (slug, title, description, tags, place_ids, route_ids) VALUES
(
  'vulkany-kamchatki',
  'Вулканы Камчатки',
  'Самые впечатляющие действующие и потухшие вулканы полуострова — от Авачинского до Ключевской сопки',
  ARRAY['вулканы', 'треккинг', 'экстрим'],
  ARRAY[]::UUID[],
  ARRAY[]::UUID[]
),
(
  'goryachie-istochniki',
  'Горячие источники',
  'Термальные источники Камчатки — природные спа под открытым небом среди дикой природы',
  ARRAY['источники', 'релакс', 'природа'],
  ARRAY[]::UUID[],
  ARRAY[]::UUID[]
),
(
  'marshruty-dlya-nachinayushchikh',
  'Маршруты для начинающих',
  'Доступные треки без специальной подготовки — идеально для первого знакомства с Камчаткой',
  ARRAY['начинающие', 'семьи', 'лёгкие маршруты'],
  ARRAY[]::UUID[],
  ARRAY[]::UUID[]
),
(
  'dikaya-priroda',
  'Дикая природа',
  'Медведи, лосось, орлы — места где дикая природа Камчатки во всей своей красоте',
  ARRAY['природа', 'животные', 'фотография'],
  ARRAY[]::UUID[],
  ARRAY[]::UUID[]
)
ON CONFLICT (slug) DO NOTHING;

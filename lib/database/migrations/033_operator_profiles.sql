-- Миграция: публичные профили операторов
-- Дата: 2026-03-14
-- Описание: Добавляет поля для шаблонных страниц операторов на фронте

ALTER TABLE partners
ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS short_description TEXT,
ADD COLUMN IF NOT EXISTS hero_image VARCHAR(500),
ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS season_info JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS reviews_data JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS location JSONB,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN partners.slug IS 'URL-slug для публичной страницы /operators/[slug]';
COMMENT ON COLUMN partners.short_description IS 'Краткое описание для каталога и hero';
COMMENT ON COLUMN partners.hero_image IS 'Путь к главному изображению';
COMMENT ON COLUMN partners.gallery IS 'Массив путей к фото: ["img1.jpg", ...]';
COMMENT ON COLUMN partners.services IS 'Услуги/туры: [{title, desc, prices: {winter, summer}, includes: []}]';
COMMENT ON COLUMN partners.features IS 'Преимущества: [{icon, title, desc}]';
COMMENT ON COLUMN partners.faq IS 'FAQ: [{q, a}]';
COMMENT ON COLUMN partners.season_info IS 'Сезонный календарь: [{months, fish, season}]';
COMMENT ON COLUMN partners.reviews_data IS 'Отзывы: [{name, date, text, source}]';
COMMENT ON COLUMN partners.contacts IS 'Контакты: [{name, phone, role}]';
COMMENT ON COLUMN partners.location IS 'Геолокация: {lat, lng, address}';
COMMENT ON COLUMN partners.is_public IS 'Показывать на публичной странице /operators';

CREATE INDEX IF NOT EXISTS idx_partners_slug ON partners(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partners_public ON partners(is_public) WHERE is_public = TRUE;

-- Migration 157: Fix places table — add is_visible, hide tours/garbage, fix categories
--
-- Problem: places table contains ~50 records that are tours, excursions, or garbage
-- (imported incorrectly). The agent_route_knowledge VIEW hardcodes is_visible=true
-- for all places, so there is no way to hide them without a schema change.
--
-- Solution:
--   1. Add is_visible column to places (default true — no data loss)
--   2. Rebuild agent_route_knowledge VIEW to use p.is_visible
--   3. Hide tours, excursions, promos, garbage (is_visible = false)
--   4. Fix category for real places with wrong category values

-- ── Step 1: Add is_visible to places ─────────────────────────────────────────
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true;

-- ── Step 2: Rebuild agent_route_knowledge VIEW ────────────────────────────────
CREATE OR REPLACE VIEW agent_route_knowledge AS
  SELECT
    p.ark_id                          AS id,
    NULL::text                        AS route_dedupe_key,
    NULL::uuid                        AS route_id,
    p.category,
    p.name                            AS title,
    p.description,
    p.lat,
    p.lng,
    p.source_url,
    p.source_name,
    NULL::tsvector                    AS search_text,
    '{}'::jsonb                       AS payload,
    NULL::text                        AS source_hash,
    NULL::timestamptz                 AS source_updated_at,
    NULL::timestamptz                 AS last_synced_at,
    p.created_at,
    p.updated_at,
    p.is_visible,
    p.location_type,
    p.activity_type,
    NULL::text                        AS kuzmich_review,
    p.zone,
    'place'::text                     AS kind,
    p.search_count
  FROM places p
UNION ALL
  SELECT
    COALESCE(r.ark_id, r.id)          AS id,
    r.dedupe_key                      AS route_dedupe_key,
    NULL::uuid                        AS route_id,
    r.category,
    r.title,
    r.description,
    r.lat,
    r.lng,
    r.source_url,
    r.source_name,
    NULL::tsvector                    AS search_text,
    COALESCE(r.metadata, '{}'::jsonb) AS payload,
    NULL::text                        AS source_hash,
    NULL::timestamptz                 AS source_updated_at,
    NULL::timestamptz                 AS last_synced_at,
    r.created_at,
    r.updated_at,
    true                              AS is_visible,
    NULL::character varying           AS location_type,
    r.activity_type,
    NULL::text                        AS kuzmich_review,
    r.zone,
    'route'::text                     AS kind,
    r.search_count
  FROM kamchatka_routes r;

-- ── Step 3: Hide tours, excursions, promos, garbage ──────────────────────────
-- Identified by manual review of all 779 places records.
-- These records are commercial tours / promo articles / garbage wrongly imported
-- into the geographic places table.

UPDATE places SET is_visible = false WHERE ark_id IN (
  -- ВИП и групповые туры
  '6667a3d6-ddb9-4b99-9c2d-7d0f4d6f1f47', -- ВИП-туры
  '73387cbe-43cb-43ed-b890-5eaf9e387277', -- ЗНАКОМСТВО С КАМЧАТКОЙ КОМФОРТ МАКСИМУМ ПЛЮС
  'ecad2761-2f28-40e1-a369-e78e6fd206b3', -- «Знакомство с Камчаткой максимум+»
  '68645ccb-d110-4715-88d4-bc1178978d4c', -- Групповые туры на Камчатку
  '710bd4b3-4040-4df9-a058-a5c0f8a58416', -- Камчатка Лайт - 8 дней, чартер из Москвы
  'a98bc58d-1baa-4a5c-b2a9-ff44828ffb5f', -- Камчатка в моем сердце
  'd1c87ac8-40e3-433b-bc1d-169164e45fe9', -- Камчатка индивидуально
  'e16e28ed-7fa9-42b7-bdcf-c8bd7687dcfb', -- Камчатка. Рискни покорить!
  'b883c8fb-355a-4b83-87e8-e4458895698b', -- Камчатка. Такие места
  'abdebaf8-f7aa-4312-8a13-b30a12e46f47', -- Путешествие на Камчатку
  '5199f094-26e1-43e1-ae9b-878bacef3fa9', -- Туры на Камчатку с детьми
  'e14bbaca-081b-4ff0-a4f9-3df792a603a1', -- Эксклюзивный ВИП тур «7 чудес Камчатки»
  '91aafdf2-a5a2-4771-84bb-ce788f067f00', -- ТУРЫ НА КАМЧАТКУ
  'b6556190-71d0-4967-8171-adaebf195599', -- Однодневные туры и экскурсии по Камчатке
  '6c84bfa9-5e97-4ec0-93f0-ad91999c0aeb', -- Без палаток

  -- Экскурсии и обзорные
  '340725d6-3267-4bd4-a5aa-b1a8b1906fa1', -- Зимняя обзорная экскурсия по Петропавловску-Камчатскому
  '4218796f-567a-46ec-ba1f-3a2dd70bc9f5', -- Обзорная экскурсия по Петропавловску-Камчатскому
  '3a60ea45-142f-47ed-89b5-7ba357f87a51', -- Экскурсия по Петропавловску-Камчатскому с обедом
  '850b222e-095c-4b7e-ac86-5e5fd2bcaed8', -- Экскурсии на Камчатке
  '03fcf8a7-ed83-4e2f-ac7a-d3cdb68f3382', -- Этническая экскурсия
  'f9ca6bb9-7041-403f-bcd7-8149c47f18a8', -- Национальный маршрут "Камчатка - здесь начинается Россия"

  -- Активности и приключения
  '963a971d-5022-4563-862c-76063fafdf9b', -- Вертолёт
  'fb16dd96-6532-481f-b0f9-47684cf2aea0', -- Ми-2 "Витязь аэро"
  '00c1a162-bfce-4649-9b77-f38f647392c0', -- Яхта "Wild"
  'f4d346b7-415d-41bc-b46b-fb5c2f8b6520', -- Собачьи упряжки
  '60447e00-86de-4a6a-9de0-240d0a445934', -- Катание на собачьих упряжках, купание в Зеленовских озерках
  '04648681-0422-493c-b1af-f6b10a3d542b', -- Серфинг
  '60d57b99-b79f-45d6-9e85-f461bd6f1a9b', -- Сёрфинг в Тихом океане
  'c1b37ca9-1e60-4b29-9f0e-8f5ebff03078', -- Наблюдение за птицами
  '298097f2-e697-488c-90a6-c71fef962dee', -- Наблюдение цветов
  '479dc773-2bd8-4200-829d-d471c8f14567', -- Приключенческий забег по Камчатке
  '812403e9-5f7c-48b7-97ba-22c1eb97e7d7', -- Пеший тур по Камчатке
  '488d95d5-b8df-461b-a26f-e275d009c03d', -- Путешествие по Долине Великанов
  '67c23604-5a4a-446f-9d83-cc88b307b4c0', -- Жимолость
  'b355391c-f3a1-44d8-8c79-8f8cdaa6e065', -- Жимолость и голубика
  '89d19c70-34fe-4135-9f52-21c72c94a19e', -- Толбачинский экспресс (без палаток)
  'c04886ce-7ee8-4ada-8e74-bf4f8512a41c', -- Теплая Камчатка зимой (Лагуна)
  'cbe72504-5073-49ae-9610-6d4e06066912', -- Зимние приключения
  '6e888166-dfac-45ae-8934-3c4bffd12f49', -- Из осени в зиму

  -- Сезонные / тематические подборки (не место)
  '9982ff30-4337-4a66-b4be-32d5bcaa8310', -- Гастрономические
  '5523e09e-6f5a-472d-aa04-c132fcf33bfd', -- Идеи для путешествия на Камчатку

  -- Мусор / промо / новости
  '500acf81-9661-48d8-bc38-6a94b4ece373', -- Мостик?
  'd1a48b21-1b44-4775-a039-3d2f97fcb388', -- виды на косяки рыб
  '8f8fa666-fbe0-489d-ae79-8655c83d3b20', -- Хвост вертолета
  '8343f837-6608-4ec8-bb36-ac42573d93f9', -- Как отметят День рыбака в Петропавловске 2026
  'e873a54e-40d9-4040-9f7e-8f21d92c2b4a', -- Страна рыбы и рыбоедов
  '607e3dae-c85c-486a-a1a4-4790aaebfcc0', -- Камчатка (слишком общее)
  '384d7218-a983-44f0-a877-3870992101a4', -- КАМЧАТКА - КРАЙ СУРОВЫЙ И ЧУДЕСНЫЙ
  '0f1a3f2d-7fd7-427d-9083-33b94d7e997a', -- КРАСОТЫ КАМЧАТКИ
  'c796043f-5831-4901-8c95-11116b7d2625'  -- Природные красоты камчатки
);

-- ── Step 4: Fix category for real places with wrong category ─────────────────

-- Реки с тегом rybalka → rivers (это реальные реки, не туры)
UPDATE places
SET category = 'rivers'
WHERE category IN ('rybalka', 'рыбалка')
  AND location_type = 'river';

-- Озёра/реки с тегом medvedi → eco (реальные места, не тур-пакеты)
UPDATE places
SET category = 'eco'
WHERE category = 'medvedi'
  AND location_type IN ('lake', 'river');

-- Бухты/пляжи с тегом morskie_progulki → eco (реальные места)
UPDATE places
SET category = 'eco'
WHERE category = 'morskie_progulki'
  AND location_type IN ('bay', 'beach');

-- Водопады с мусорными категориями → eco
UPDATE places
SET category = 'eco'
WHERE location_type = 'waterfall'
  AND category IN ('thermal', 'volcano');

-- ── Sanity check ─────────────────────────────────────────────────────────────
SELECT
  COALESCE(location_type, '(null)') AS location_type,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE is_visible = true) AS visible,
  COUNT(*) FILTER (WHERE is_visible = false) AS hidden
FROM places
GROUP BY location_type
ORDER BY total DESC;

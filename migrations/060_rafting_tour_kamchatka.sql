-- Migration 060: Create Kamchatka Rafting partner and SPLAY BY BYSTAYA RIVER tour
-- Date: 2026-03-21

-- 1. Create partner "Камчатка Рафтинг" (if not exists)
INSERT INTO partners (
  slug, name, telegram_chat_id, contacts, location, is_public, created_at
) VALUES (
  'kamchatka-rafting',
  'Камчатка Рафтинг',
  NULL,
  jsonb_build_object(
    'phone', '+79247990191',
    'admin_name', 'Катерина',
    'admin_name_2', 'Ярослав',
    'telegram_channel', 'https://t.me/+GCy5EVOotCE1NDMy'
  ),
  jsonb_build_object(
    'city', 'Петропавловск-Камчатский',
    'region', 'Камчатский край'
  ),
  TRUE,
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Get the partner ID
WITH partner_data AS (
  SELECT id as partner_id FROM partners WHERE slug = 'kamchatka-rafting'
),
-- 3. Create tour
tour_data AS (
  INSERT INTO operator_tours (
    id, operator_id, title, description, activity_type, location_type,
    base_price, price_unit, location_name, max_participants,
    is_published, created_at
  )
  SELECT
    gen_random_uuid(),
    partner_data.partner_id,
    'Однодневная экскурсия СПЛАВ ПО РЕКЕ БЫСТРАЯ',
    E'Захватывающий сплав по реке Быстрая с остановкой на Малкинских горячих источниках.\n\nВ программе:\n✓ Выезд из Петропавловск-Камчатский (Паратунская зона отдыха)\n✓ п. Сокочи (пирожковый перекус)\n✓ Инструктаж на реке Быстрая, получение снаряжения\n✓ Сплав с гидом\n✓ Обед: уха из лосося, нарезки, чай, кофе\n✓ Малкинские термальные источники (купание)\n✓ Возвращение в город\n\nВ стоимость входит: трансфер, питание, гид, повар, удочки, снаряжение.',
    'boat_trip',
    'river',
    13000,
    'per_person',
    'Река Быстрая, Малкинские горячие источники',
    6,
    FALSE,
    NOW()
  FROM partner_data
  RETURNING id as tour_id, operator_id
),
-- 4. Create availability slots for July-October 2026 (4 slots per day)
availability_data AS (
  INSERT INTO tour_availability (
    id, operator_tour_id, date, available_slots, booked_slots, created_at
  )
  SELECT
    gen_random_uuid(),
    tour_data.tour_id,
    date::date,
    4,
    0,
    NOW()
  FROM tour_data,
    generate_series(
      '2026-07-01'::date,
      '2026-10-31'::date,
      '1 day'::interval
    ) AS date
  RETURNING operator_tour_id
)
SELECT 'Rafting tour created successfully' as status;

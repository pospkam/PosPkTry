-- Migration 086: Delete winter tours + fix photo assignments
-- Soft-delete winter tours (1, 2, 3, 8)
UPDATE operator_tours SET deleted_at = NOW() WHERE id IN (1, 2, 3, 8) AND deleted_at IS NULL;

-- Tour 4: Осенняя рыбалка (окт-ноя) — межсезонье
UPDATE operator_tours SET
  not_included = '["Авиабилёты до Камчатки","Личные расходы","Алкогольные напитки","Рыболовные снасти (можно арендовать)"]'::jsonb,
  what_to_bring = '["Тёплая одежда по сезону","Непромокаемая обувь","Солнцезащитные очки","Средство от комаров","Личная аптечка","Документы (паспорт)"]'::jsonb,
  photos = ARRAY[
    '/images/fishingkam/2025-01-09_113928_1_.jpg',
    '/images/fishingkam/2025-01-09_114821_1.jpg',
    '/images/fishingkam/__.jpeg',
    '/images/fishingkam/2025-01-09_114531_1.jpg',
    '/images/fishingkam/_.jpeg'
  ]
WHERE id = 4 AND deleted_at IS NULL;

-- Tour 5: Летняя на чавычу и нерку
UPDATE operator_tours SET
  not_included = '["Авиабилёты до Камчатки","Личные расходы","Алкогольные напитки","Рыболовные снасти (можно арендовать)"]'::jsonb,
  what_to_bring = '["Тёплая одежда по сезону","Непромокаемая обувь","Солнцезащитные очки","Средство от комаров","Личная аптечка","Документы (паспорт)"]'::jsonb,
  photos = ARRAY[
    '/images/fishingkam/2025-01-09_114821_1.jpg',
    '/images/fishingkam/__.jpeg',
    '/images/fishingkam/2025-01-09_113928_1_.jpg',
    '/images/fishingkam/_.jpeg',
    '/images/fishingkam/2025-01-09_114531_1.jpg'
  ]
WHERE id = 5 AND deleted_at IS NULL;

-- Tour 6: Летняя на кижуча
UPDATE operator_tours SET
  not_included = '["Авиабилёты до Камчатки","Личные расходы","Алкогольные напитки","Рыболовные снасти (можно арендовать)"]'::jsonb,
  what_to_bring = '["Тёплая одежда по сезону","Непромокаемая обувь","Солнцезащитные очки","Средство от комаров","Личная аптечка","Документы (паспорт)"]'::jsonb,
  photos = ARRAY[
    '/images/fishingkam/__.jpeg',
    '/images/fishingkam/2025-01-09_114821_1.jpg',
    '/images/fishingkam/2025-01-09_113928_1_.jpg',
    '/images/fishingkam/2025-01-09_114531_1.jpg',
    '/images/fishingkam/_.jpeg'
  ]
WHERE id = 6 AND deleted_at IS NULL;

-- Tour 7: Семейный тур выходного дня — лето, однодневный
UPDATE operator_tours SET
  not_included = '["Авиабилёты до Камчатки","Личные расходы","Алкогольные напитки"]'::jsonb,
  what_to_bring = '["Одежда по сезону","Удобная обувь","Солнцезащитные очки","Средства гигиены","Документы (паспорт)","Наличные для сувениров"]'::jsonb,
  photos = ARRAY[
    '/images/fishingkam/2025-01-09_114821_1.jpg',
    '/images/fishingkam/2025-01-09_113928_1_.jpg',
    '/images/fishingkam/2025-01-09_114531_1.jpg',
    '/images/fishingkam/__.jpeg',
    '/images/fishingkam/_.jpeg'
  ]
WHERE id = 7 AND deleted_at IS NULL;

-- Tour 9: Многодневный летний (5 дн) — лето + база
UPDATE operator_tours SET
  not_included = '["Авиабилёты до Камчатки","Личные расходы","Алкогольные напитки","Рыболовные снасти (можно арендовать)"]'::jsonb,
  what_to_bring = '["Тёплая одежда по сезону","Непромокаемая обувь","Солнцезащитные очки","Средство от комаров","Личная аптечка","Документы (паспорт)"]'::jsonb,
  photos = ARRAY[
    '/images/fishingkam/__.jpeg',
    '/images/fishingkam/2025-01-09_114821_1.jpg',
    '/images/fishingkam/_.jpeg',
    '/images/fishingkam/2025-02-10_151441.jpg',
    '/images/fishingkam/2025-02-10_151450.jpg'
  ]
WHERE id = 9 AND deleted_at IS NULL;

-- Tour 10: Семейный недельный — лето + база
UPDATE operator_tours SET
  not_included = '["Авиабилёты до Камчатки","Личные расходы","Алкогольные напитки"]'::jsonb,
  what_to_bring = '["Одежда по сезону","Удобная обувь","Солнцезащитные очки","Средства гигиены","Документы (паспорт)","Наличные для сувениров"]'::jsonb,
  photos = ARRAY[
    '/images/fishingkam/2025-01-09_114821_1.jpg',
    '/images/fishingkam/__.jpeg',
    '/images/fishingkam/2025-01-09_114531_1.jpg',
    '/images/fishingkam/2025-02-10_151433.jpg',
    '/images/fishingkam/2025-02-10_151450.jpg'
  ]
WHERE id = 10 AND deleted_at IS NULL;

-- Tour 11: Недельный рыболовный (7 дн) — лето + база
UPDATE operator_tours SET
  not_included = '["Авиабилёты до Камчатки","Личные расходы","Алкогольные напитки","Рыболовные снасти (можно арендовать)"]'::jsonb,
  what_to_bring = '["Тёплая одежда по сезону","Непромокаемая обувь","Солнцезащитные очки","Средство от комаров","Личная аптечка","Документы (паспорт)"]'::jsonb,
  photos = ARRAY[
    '/images/fishingkam/2025-01-09_113928_1_.jpg',
    '/images/fishingkam/__.jpeg',
    '/images/fishingkam/2025-01-09_114821_1.jpg',
    '/images/fishingkam/2025-02-10_151441.jpg',
    '/images/fishingkam/2025-02-10_151433.jpg'
  ]
WHERE id = 11 AND deleted_at IS NULL;

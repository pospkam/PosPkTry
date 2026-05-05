-- Migration 173: Deduplicate and clean up places
-- Removes SEO-title duplicates, tour-named entries, English slugs (or renames them),
-- and hides real geographic places with zero coordinates (lat=0 or lng=0).

-- ============================================================
-- 1. COLLECT IDs TO DELETE
-- ============================================================

CREATE TEMP TABLE _places_to_delete AS
SELECT id, ark_id FROM places WHERE id IN (
  -- SEO duplicates: canonical version exists
  'b33f3606-b3ba-4088-8dd6-ede0691f634e',  -- Вулкан Вилючинский: где находится, как добраться
  '64f03666-7f76-4976-87df-3851c144fd09',  -- Вулкан Горелый: где находится, как добраться в 2025
  '96b436a0-a1a1-4ac6-82fa-a487303dbc7c',  -- Остров Старичков: где находится птичий базар Камчатки №1
  '9fd7f562-5afc-492c-b670-5ba9ab2d7bed',  -- Остров Старичков — птичий базар (wrong coords, dup)
  'd76f2a4e-80af-4269-962d-cc38ed6ff732',  -- Халактырский пляж: где находится и как добраться

  -- Голубые озёра: promotional / English slug duplicates
  '25bda881-591b-458d-969d-a4cbfec2db19',  -- golubye ozera (English slug, canonical Голубые озёра exists)
  '5ac3369d-fc11-40da-be13-1f9c49f7f2c7',  -- Голубые озёра на Камчатке!
  'b7401013-dee2-48af-ac92-ebc3ea045bcf',  -- Голубые озёра — экотуризм

  -- Tour-activity names (not geographic places)
  'e158d55a-2a61-4509-9b67-aa69cb1689ce',  -- Восхождение на Авачинский вулкан
  '7ea77598-6448-463f-8ff1-5df3567a1c16',  -- Восхождение на Корякскую сопку
  'a8a99c22-46fd-4e8b-beaf-4efb0b5036f2',  -- Восхождение на г. Озерная
  '386ac4ae-bd03-4713-a82c-7626cebdd622',  -- Поход к вулканам Ксудач и Ходутка
  'e94a7d0b-50e7-45c0-bb81-a75772fb0b42',  -- Поход на горное озеро Кар (zero-coord, tour)
  '5b3aaa58-5fe8-473a-ace6-010e513a3830',  -- Поход на каяках по восточному побережью Камчатки
  '015cf2b7-7678-4143-9de9-df4ac4421c24',  -- Путешествие в Налычево
  '8d9c85e1-0620-4f41-8b77-5912351d6c44',  -- Путешествие вокруг окрестностей Вулкана Бакенинг
  'abdebaf8-f7aa-4312-8a13-b30a12e46f47',  -- Путешествие на Камчатку
  '0aa039cb-4caf-4ac5-9194-e5d606a4bb0b',  -- Путешествие на Корякский вулкан
  '488d95d5-b8df-461b-a26f-e275d009c03d',  -- Путешествие по Долине Великанов
  '44debf80-2bd3-41b5-b09d-55f07be5c2df',  -- Путешествие по реке Быстрая
  'cf14f2d8-848b-43dc-b41e-5d3b77b3c605',  -- Сплав по реке Быстрая (tour activity)
  '60388172-b981-4622-a994-3c531f36f827',  -- Сплав по реке Быстрая. Вулканы Горелый и Авачинский
  'f7103793-1f32-4e0d-945d-30f0693e6f75',  -- Трекинг вокруг вулкана Плоский Толбачик
  'a12fc82f-11ea-42e5-9ee1-dada96c677fe',  -- Трекинг к вулканам Карымский, Малый Семячик и в Налычево
  '94879ca9-eddc-4b67-bc4d-e3672f557a18',  -- Трекинг к подножию вулкана Ключевская Сопка
  '5cea21db-b29c-4f32-9c77-58a2d56d5960'   -- Скитур на Зайкин мыс (zero-coord, tour)
);

-- ============================================================
-- 2. CASCADE DELETE
-- ============================================================

DELETE FROM location_safety_profile
WHERE agent_route_id IN (SELECT ark_id FROM _places_to_delete);

DELETE FROM location_real_time_status
WHERE agent_route_id IN (SELECT ark_id FROM _places_to_delete);

DELETE FROM ai_route_images
WHERE route_id IN (SELECT ark_id FROM _places_to_delete);

DELETE FROM route_waypoints
WHERE place_id IN (SELECT id FROM _places_to_delete);

DELETE FROM places
WHERE id IN (SELECT id FROM _places_to_delete);

DROP TABLE _places_to_delete;

-- ============================================================
-- 3. RENAME SEO TITLES (no canonical version existed)
-- ============================================================

UPDATE places SET name = 'Бухта Русская'
WHERE id = 'af84b5bb-39eb-4b3e-883d-8aa50641077a';

UPDATE places SET name = 'Мыс Маячный'
WHERE id = '3268583a-05e0-4f59-8d2c-a87a69be14a6';

-- ============================================================
-- 4. RENAME ENGLISH-SLUG PLACES
-- ============================================================

UPDATE places SET name = 'Бухта Пионерская'
WHERE id = 'cd697b44-1eac-4e65-9463-5ac76ce34ee9';

UPDATE places SET name = 'Камчатский камень'
WHERE id = 'dac787de-8f88-4ae1-8711-27b44382139b';

UPDATE places SET name = 'Водопад Бабий камень'
WHERE id = 'cb7ef609-8912-4a13-987a-99f29f09b82a';

UPDATE places SET name = 'Водопад Снежный барс'
WHERE id = '0d08e60d-838b-411c-bfa5-fdb7c40d8609';

-- ============================================================
-- 5. RENAME INFORMAL NAMES
-- ============================================================

UPDATE places SET name = 'Вачкажец'
WHERE id = 'c4310d06-2b6c-4b6e-af3a-b0c7cd678ebe';

-- ============================================================
-- 6. HIDE REAL PLACES WITH ZERO COORDINATES
--    (They need proper coords before showing on map)
-- ============================================================

UPDATE places SET is_visible = false
WHERE id IN (
  'c4310d06-2b6c-4b6e-af3a-b0c7cd678ebe',  -- Вачкажец (renamed above)
  '14999081-db57-43d3-8aad-f6c8361b69ac',  -- Верхне-Кошелевские парогидротермальные источники
  '75ae94a5-b7aa-4358-9d94-6073f909915d',  -- Верхне-Паратунские термальные источники
  '7f5284b0-8862-4b11-8a68-2241d359832c',  -- Горячереченские термальные источники
  'a72b9bdd-f035-4273-a4dc-8d53f8b279cb',  -- Грифон Иванова
  'c3a32e0a-e12c-48ef-97d9-312d78baf31c',  -- Дачные термальные источники (Малая долина гейзеров)
  '9fb0ba03-e708-4a5b-9b9c-52a2f5280fe8',  -- Малкинские термальные источники
  '3d4b7d25-1943-45ca-b88b-85b73300537c',  -- Малые Банные термальные источники
  '56d16421-ed6c-4650-af9e-1919fbae949f',  -- Озеро Большой Кар
  'f616768c-fd81-4745-90d7-1f9fba8fe2b7',  -- Озеро Икар
  '8ed1e7c5-df06-4bae-9c48-3be6c2890aa0',  -- Паланские пороги
  '0e5c632b-89cb-4511-9905-83ac54c2c119',  -- Под Козельский вулкан
  'e1252887-a232-4ea8-88e2-3d2004ecea7c',  -- Пущинские термальные источники
  'e552c8a2-52bd-4f7d-ad37-33b1a28460ab',  -- ТРОПА МЕДВЕДЯ (ДОЛИНА СМЕРТИ)
  'f3c445de-b12b-434b-bc22-7005a8b6441e',  -- Таловские термальные источники
  '05112df7-54f9-4285-bcd2-1bfe4929dfc0',  -- Фумарола вулкана Дзендзур
  '5fe02f54-d018-4125-a0ec-e5fc458ad493'   -- Чистинские (Аагские) нарзаны
);

INSERT INTO _migrations (name)
VALUES ('173_deduplicate_places.sql')
ON CONFLICT (name) DO NOTHING;

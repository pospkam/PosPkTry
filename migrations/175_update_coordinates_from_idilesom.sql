-- Migration 175: Update place coordinates using verified idilesom.com data
-- Previous migration 174 used approximate coords from Wikipedia/OSM.
-- Idilesom has GPS-tracked coordinates for these places — more accurate.
-- Places within 500m of idilesom data are left unchanged.

-- Вачкажец (was 30km off)
UPDATE places SET lat = 53.081266, lng = 157.931256
WHERE id = 'c4310d06-2b6c-4b6e-af3a-b0c7cd678ebe';

-- Верхне-Кошелевские парогидротермальные источники (was 2km off)
UPDATE places SET lat = 51.362141, lng = 156.721956
WHERE id = '14999081-db57-43d3-8aad-f6c8361b69ac';

-- Горячереченские термальные источники (was 1.2km off)
UPDATE places SET lat = 53.507830, lng = 158.772681
WHERE id = '7f5284b0-8862-4b11-8a68-2241d359832c';

-- Малые Банные термальные источники (was 4km off)
UPDATE places SET lat = 52.855460, lng = 157.784950
WHERE id = '3d4b7d25-1943-45ca-b88b-85b73300537c';

-- Озеро Большой Кар (was 22km off)
UPDATE places SET lat = 53.066640, lng = 157.982250
WHERE id = '56d16421-ed6c-4650-af9e-1919fbae949f';

-- Пущинские термальные источники (was 14km off)
UPDATE places SET lat = 54.170985, lng = 157.976054
WHERE id = 'e1252887-a232-4ea8-88e2-3d2004ecea7c';

-- Фумарола вулкана Дзендзур (was 2km off)
UPDATE places SET lat = 53.621230, lng = 158.939669
WHERE id = '05112df7-54f9-4280-bcd2-1bfe4929dfc0';

-- Чистинские (Аагские) нарзаны (was 27km off)
UPDATE places SET lat = 53.266799, lng = 158.497110
WHERE id = '5fe02f54-d018-4125-a0ec-e5fc458ad493';

-- ТРОПА МЕДВЕДЯ (ДОЛИНА СМЕРТИ)
-- Idilesom place is in Mutnovsky area (52.53N) — different from Kikhpinych "Долина Смерти".
-- Trust idilesom since the record originated from their data.
UPDATE places SET lat = 52.533346, lng = 158.195593
WHERE id = 'e552c8a2-52bd-4f7d-ad37-33b1a28460ab';

-- Озеро Икар: idilesom shows 55.87N which is geographically implausible for a lake
-- on the Vachkazhets massif. Keeping approximate OSM coordinates.
-- Паланские пороги: not found on idilesom. Keeping OSM coordinates.

INSERT INTO _migrations (name)
VALUES ('175_update_coordinates_from_idilesom.sql')
ON CONFLICT (name) DO NOTHING;

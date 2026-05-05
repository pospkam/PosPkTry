-- Migration 660: fix placeholder coords (53.0444,158.6483) for known landmarks
--
-- Priority 1: places WITH route connections (broken on map now)
-- Priority 2: famous volcanoes with well-known GPS (no routes yet, but future-proof)

-- ============================================================
-- PRIORITY 1: places linked to routes (5 places, 36 route refs)
-- ============================================================

-- Гейзеры Камчатки → Долина гейзеров, Кроноцкий заповедник
UPDATE places SET lat = 54.4167, lng = 160.1333
WHERE id = (SELECT id FROM places WHERE name = 'Гейзеры Камчатки' AND ROUND(lat::numeric,4) = 53.0444);

-- Карымшинские источники → Карымшинская долина, ~52км от ПКЦ
UPDATE places SET lat = 52.8107, lng = 158.0919
WHERE id = (SELECT id FROM places WHERE name = 'Карымшинские источники' AND ROUND(lat::numeric,4) = 53.0444);

-- Термальные источники Нальчева → Налычевская долина
UPDATE places SET lat = 53.6167, lng = 158.8333
WHERE id = (SELECT id FROM places WHERE name = 'Термальные источники Нальчева' AND ROUND(lat::numeric,4) = 53.0444);

-- Долина гейзеров. Курильское озеро. Вулканы Горелый и Авача → сборный тур, центр ~ Долина гейзеров
UPDATE places SET lat = 54.4167, lng = 160.1333
WHERE id = (SELECT id FROM places WHERE name LIKE 'Долина гейзеров. Курильское%' AND ROUND(lat::numeric,4) = 53.0444);

-- Извержения вулкана Плоский Толбачик → Толбачик
UPDATE places SET lat = 55.8319, lng = 160.3269
WHERE id = (SELECT id FROM places WHERE name LIKE 'Извержения вулкана%' AND ROUND(lat::numeric,4) = 53.0444);

-- Самые высокие вулканы Камчатки и Долина гейзеров → сборный тур, ставим Ключевскую как центр
UPDATE places SET lat = 56.0566, lng = 160.6439
WHERE id = (SELECT id FROM places WHERE name LIKE 'Самые высокие вулканы%' AND ROUND(lat::numeric,4) = 53.0444);

-- ============================================================
-- PRIORITY 2: famous volcanoes (no routes yet)
-- ============================================================

-- Вулкан Гамчен (Хамченская сопка) — восточный хребет, севернее Кроноцкого
UPDATE places SET lat = 57.3167, lng = 160.6833
WHERE id = (SELECT id FROM places WHERE name LIKE 'Вулкан Гамчен%' AND ROUND(lat::numeric,4) = 53.0444);

-- Вулкан Кизимен (Щапинская сопка) — восточный хребет
UPDATE places SET lat = 55.1308, lng = 160.3194
WHERE id = (SELECT id FROM places WHERE name LIKE 'Вулкан Кизимен%' AND ROUND(lat::numeric,4) = 53.0444);

-- Вулкан Крашенникова — кальдера севернее Узона
UPDATE places SET lat = 54.6000, lng = 160.2500
WHERE id = (SELECT id FROM places WHERE name LIKE 'Вулкан Крашенникова%' AND ROUND(lat::numeric,4) = 53.0444);

-- Вулкан Крестовский (Плоский Ближний) — Ключевская группа
UPDATE places SET lat = 55.9833, lng = 160.5333
WHERE id = (SELECT id FROM places WHERE name LIKE 'Вулкан Крестовский%' AND ROUND(lat::numeric,4) = 53.0444);

-- Вулкан Кроноцкий (Кроноцкая сопка) — восточный хребет
UPDATE places SET lat = 54.7528, lng = 160.5361
WHERE id = (SELECT id FROM places WHERE name LIKE 'Вулкан Кроноцкий%' AND ROUND(lat::numeric,4) = 53.0444);

-- Вулкан Ушковский (Плоский Дальний) — Ключевская группа
UPDATE places SET lat = 56.0667, lng = 160.4667
WHERE id = (SELECT id FROM places WHERE name LIKE 'Вулкан Ушковский%' AND ROUND(lat::numeric,4) = 53.0444);

-- Ключевская группа вулканов — центр группы
UPDATE places SET lat = 56.0566, lng = 160.6439
WHERE id = (SELECT id FROM places WHERE name = 'Ключевская группа вулканов' AND ROUND(lat::numeric,4) = 53.0444);

-- ============================================================
-- Verify
-- ============================================================
SELECT COUNT(*) as remaining_placeholder
FROM places
WHERE ROUND(lat::numeric,4) = 53.0444 AND ROUND(lng::numeric,4) = 158.6483;

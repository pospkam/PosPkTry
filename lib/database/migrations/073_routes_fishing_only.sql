-- Migration 073: routes visibility — показываем только рыболовные маршруты
--
-- Причина: большинство маршрутов имеют несоответствующие фотографии/локации.
-- Временно скрываем все кроме "Камчатская рыбалка" (контент верифицирован).
-- Остальные маршруты будут включаться по мере проверки контента.

-- 1. Скрыть все маршруты
UPDATE agent_route_knowledge
SET is_visible = FALSE,
    updated_at = NOW()
WHERE is_visible = TRUE;

-- 2. Включить только рыболовные маршруты (category = 'fishing' OR activity_type = 'fishing')
UPDATE agent_route_knowledge
SET is_visible = TRUE,
    updated_at = NOW()
WHERE
    category      = 'fishing'
    OR activity_type = 'fishing'
    OR title ILIKE '%рыбал%'
    OR title ILIKE '%fishingкam%'
    OR route_dedupe_key ILIKE '%fishing%'
    OR route_dedupe_key ILIKE '%rybalka%';

-- Проверка результата (выполни вручную для верификации):
-- SELECT COUNT(*) FILTER (WHERE is_visible) AS visible,
--        COUNT(*) FILTER (WHERE NOT is_visible) AS hidden
-- FROM agent_route_knowledge;

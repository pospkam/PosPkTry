-- Migration 146: удалить мусорные записи из agent_route_knowledge
-- Критерий: is_visible=false, нет описания, title — нарицательное существительное
-- или явно нетуристический объект (административные здания и т.п.)
-- Сначала очищаем связанные таблицы (FK constraints).

DO $$
DECLARE garbage_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(id) INTO garbage_ids
  FROM agent_route_knowledge
  WHERE description IS NULL AND is_visible = false
    AND (
      title IN ('Музей','Камни','Каньон','Двор','Купол','Болото','Поляна','Ручей',
                'База','Тропа','Вершина','Пик','Поток','Родник','Лагерь','Маяк',
                'Скала','Долина','Озеро','Мыс')
      OR title ILIKE '%административное здание%'
      OR title ILIKE '%company%' OR title ILIKE '%Ltd%' OR title ILIKE '%LLC%'
      OR title ILIKE '%ООО%' OR title ILIKE '%ЗАО%'
      OR title ~ '^\s*$' OR LENGTH(TRIM(title)) < 2
    );

  IF garbage_ids IS NOT NULL THEN
    DELETE FROM location_safety_profile  WHERE agent_route_id = ANY(garbage_ids);
    DELETE FROM location_real_time_status WHERE agent_route_id = ANY(garbage_ids);
    DELETE FROM crowd_log                WHERE agent_route_id = ANY(garbage_ids);
    DELETE FROM ai_route_images          WHERE route_id       = ANY(garbage_ids);
  END IF;
END $$;

DELETE FROM agent_route_knowledge
WHERE description IS NULL
  AND is_visible = false
  AND (
    -- одиночные нарицательные существительные без уточнения
    title IN (
      'Музей', 'Камни', 'Каньон', 'Двор', 'Купол',
      'Болото', 'Поляна', 'Ручей', 'База', 'Тропа',
      'Вершина', 'Пик', 'Поток', 'Родник', 'Лагерь',
      'Маяк', 'Скала', 'Долина', 'Озеро', 'Мыс'
    )
    -- административные/хозяйственные объекты
    OR title ILIKE '%административное здание%'
    OR title ILIKE '%company%'
    OR title ILIKE '%Ltd%'
    OR title ILIKE '%LLC%'
    OR title ILIKE '%ООО%'
    OR title ILIKE '%ЗАО%'
    OR title ~ '^\s*$'
    OR LENGTH(TRIM(title)) < 2
  );

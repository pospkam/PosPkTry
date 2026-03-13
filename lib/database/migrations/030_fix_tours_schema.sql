-- Миграция для исправления структуры таблицы tours
-- Добавляем недостающие колонки для соответствия API

BEGIN;

-- Проверяем, существует ли таблица tours
DO $$
BEGIN
    -- Добавляем колонку title (если её нет)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tours' AND column_name = 'title') THEN
        -- Переименовываем name в title
        ALTER TABLE tours RENAME COLUMN name TO title;
    END IF;

    -- Добавляем activity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tours' AND column_name = 'activity') THEN
        ALTER TABLE tours ADD COLUMN activity VARCHAR(50);
        -- Устанавливаем значение по умолчанию для существующих записей
        UPDATE tours SET activity = 'hiking' WHERE activity IS NULL;
    END IF;

    -- Добавляем price_from и price_to
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tours' AND column_name = 'price_from') THEN
        ALTER TABLE tours ADD COLUMN price_from DECIMAL(10,2);
        -- Копируем значение из price
        UPDATE tours SET price_from = price WHERE price_from IS NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tours' AND column_name = 'price_to') THEN
        ALTER TABLE tours ADD COLUMN price_to DECIMAL(10,2);
        -- Устанавливаем price_to = price_from * 1.3
        UPDATE tours SET price_to = price_from * 1.3 WHERE price_to IS NULL;
    END IF;

    -- Добавляем max_participants, min_participants (переименовываем если нужно)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'tours' AND column_name = 'max_group_size') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'tours' AND column_name = 'max_participants') THEN
        ALTER TABLE tours RENAME COLUMN max_group_size TO max_participants;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tours' AND column_name = 'max_participants') THEN
        ALTER TABLE tours ADD COLUMN max_participants INTEGER DEFAULT 20;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'tours' AND column_name = 'min_group_size') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'tours' AND column_name = 'min_participants') THEN
        ALTER TABLE tours RENAME COLUMN min_group_size TO min_participants;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tours' AND column_name = 'min_participants') THEN
        ALTER TABLE tours ADD COLUMN min_participants INTEGER DEFAULT 2;
    END IF;

    -- Добавляем weather_requirements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tours' AND column_name = 'weather_requirements') THEN
        ALTER TABLE tours ADD COLUMN weather_requirements TEXT;
        UPDATE tours SET weather_requirements = 'Любая погода' WHERE weather_requirements IS NULL;
    END IF;

    -- Добавляем safety_requirements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tours' AND column_name = 'safety_requirements') THEN
        ALTER TABLE tours ADD COLUMN safety_requirements TEXT;
        UPDATE tours SET safety_requirements = 'Соблюдение инструкций гида' WHERE safety_requirements IS NULL;
    END IF;

    -- Добавляем equipment_included
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tours' AND column_name = 'equipment_included') THEN
        ALTER TABLE tours ADD COLUMN equipment_included JSONB DEFAULT '[]';
    END IF;

    -- Добавляем equipment_required
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tours' AND column_name = 'equipment_required') THEN
        ALTER TABLE tours ADD COLUMN equipment_required JSONB DEFAULT '[]';
    END IF;

    -- Добавляем meeting_point
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tours' AND column_name = 'meeting_point') THEN
        ALTER TABLE tours ADD COLUMN meeting_point TEXT;
        UPDATE tours SET meeting_point = 'Площадь Ленина, Петропавловск-Камчатский' WHERE meeting_point IS NULL;
    END IF;

    -- Добавляем meeting_time
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tours' AND column_name = 'meeting_time') THEN
        ALTER TABLE tours ADD COLUMN meeting_time VARCHAR(10);
        UPDATE tours SET meeting_time = '09:00' WHERE meeting_time IS NULL;
    END IF;

    -- Добавляем images
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tours' AND column_name = 'images') THEN
        ALTER TABLE tours ADD COLUMN images JSONB DEFAULT '[]';
    END IF;

    -- Переименовываем review_count в reviews_count (если нужно)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'tours' AND column_name = 'review_count') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'tours' AND column_name = 'reviews_count') THEN
        ALTER TABLE tours RENAME COLUMN review_count TO reviews_count;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tours' AND column_name = 'reviews_count') THEN
        ALTER TABLE tours ADD COLUMN reviews_count INTEGER DEFAULT 0;
    END IF;

END $$;

-- Создаем индексы для новых колонок
CREATE INDEX IF NOT EXISTS idx_tours_activity ON tours(activity);
CREATE INDEX IF NOT EXISTS idx_tours_price_from ON tours(price_from);

COMMIT;

-- Вывод результата
SELECT 'Migration completed successfully!' as status;

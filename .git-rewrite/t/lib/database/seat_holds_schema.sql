-- =============================================
-- ТАБЛИЦА ДЛЯ ВРЕМЕННЫХ БЛОКИРОВОК МЕСТ
-- Kamchatour Hub - Seat Holds System
-- =============================================

-- Создание таблицы временных блокировок
CREATE TABLE IF NOT EXISTS seat_holds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES transfer_schedules(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  seats_count INTEGER NOT NULL CHECK (seats_count > 0),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Один пользователь может иметь только одну активную блокировку для расписания
  UNIQUE(schedule_id, user_id)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_seat_holds_schedule ON seat_holds(schedule_id);
CREATE INDEX IF NOT EXISTS idx_seat_holds_user ON seat_holds(user_id);
CREATE INDEX IF NOT EXISTS idx_seat_holds_expires ON seat_holds(expires_at);

-- Индекс для быстрой очистки истекших блокировок
CREATE INDEX IF NOT EXISTS idx_seat_holds_expired 
ON seat_holds(expires_at) 
WHERE expires_at < NOW();

-- Функция для автоматической очистки истекших блокировок
CREATE OR REPLACE FUNCTION cleanup_expired_seat_holds()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM seat_holds
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE 'Cleaned up % expired seat holds', deleted_count;
  END IF;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Триггер для проверки доступности мест перед созданием блокировки
CREATE OR REPLACE FUNCTION check_seats_before_hold()
RETURNS TRIGGER AS $$
DECLARE
  available_seats INTEGER;
  held_seats INTEGER;
BEGIN
  -- Получаем количество доступных мест
  SELECT s.available_seats INTO available_seats
  FROM transfer_schedules s
  WHERE s.id = NEW.schedule_id;
  
  IF available_seats IS NULL THEN
    RAISE EXCEPTION 'Schedule not found';
  END IF;
  
  -- Подсчитываем уже заблокированные места
  SELECT COALESCE(SUM(seats_count), 0) INTO held_seats
  FROM seat_holds
  WHERE schedule_id = NEW.schedule_id
    AND expires_at > NOW()
    AND id != NEW.id;
  
  -- Проверяем что хватит мест
  IF (available_seats - held_seats) < NEW.seats_count THEN
    RAISE EXCEPTION 'Not enough available seats. Available: %, Held: %, Requested: %', 
      available_seats, held_seats, NEW.seats_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_seats_before_hold
  BEFORE INSERT OR UPDATE ON seat_holds
  FOR EACH ROW
  EXECUTE FUNCTION check_seats_before_hold();

-- Представление для проверки реальной доступности мест с учетом блокировок
CREATE OR REPLACE VIEW schedule_availability AS
SELECT 
  s.id as schedule_id,
  s.available_seats as total_seats,
  COALESCE(SUM(sh.seats_count) FILTER (WHERE sh.expires_at > NOW()), 0) as held_seats,
  s.available_seats - COALESCE(SUM(sh.seats_count) FILTER (WHERE sh.expires_at > NOW()), 0) as truly_available_seats,
  COUNT(sh.id) FILTER (WHERE sh.expires_at > NOW()) as active_holds
FROM transfer_schedules s
LEFT JOIN seat_holds sh ON s.id = sh.schedule_id
WHERE s.is_active = true
GROUP BY s.id, s.available_seats;

-- Комментарии
COMMENT ON TABLE seat_holds IS 'Временные блокировки мест во время оформления заказа';
COMMENT ON COLUMN seat_holds.expires_at IS 'Время истечения блокировки (обычно 15 минут)';
COMMENT ON FUNCTION cleanup_expired_seat_holds() IS 'Очистка истекших блокировок (запускать по cron каждые 5 минут)';
COMMENT ON VIEW schedule_availability IS 'Реальная доступность мест с учетом временных блокировок';

-- Примеры использования

-- Создание блокировки на 15 минут
-- INSERT INTO seat_holds (schedule_id, user_id, seats_count, expires_at)
-- VALUES ('schedule-uuid', 'user-uuid', 2, NOW() + INTERVAL '15 minutes');

-- Проверка реальной доступности
-- SELECT * FROM schedule_availability WHERE schedule_id = 'your-schedule-uuid';

-- Ручная очистка истекших блокировок
-- SELECT cleanup_expired_seat_holds();

-- Migration 138: Доступность туров + рейтинги Кузьмича

-- Слоты доступности для туров (оператор ставит через дашборд)
ALTER TABLE operator_tours
  ADD COLUMN IF NOT EXISTS available_slots    INTEGER,
  ADD COLUMN IF NOT EXISTS next_available_date DATE;

COMMENT ON COLUMN operator_tours.available_slots     IS 'Свободных мест на ближайшую дату. NULL = не указано';
COMMENT ON COLUMN operator_tours.next_available_date IS 'Ближайшая свободная дата';

-- Рейтинги диалогов Кузьмича
CREATE TABLE IF NOT EXISTS tg_ratings (
  id         BIGSERIAL    PRIMARY KEY,
  chat_id    BIGINT       NOT NULL,
  mode       TEXT         NOT NULL DEFAULT 'tourist',
  rating     SMALLINT     NOT NULL CHECK (rating IN (1, 5)),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tg_ratings_created ON tg_ratings (created_at DESC);

-- Регистрация групп операторов (группа → оператор)
CREATE TABLE IF NOT EXISTS tg_operator_groups (
  group_id      BIGINT   PRIMARY KEY,
  operator_id   INTEGER,
  group_title   TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tg_operator_groups IS 'Telegram-группы операторов где работает Кузьмич как парсер лидов';

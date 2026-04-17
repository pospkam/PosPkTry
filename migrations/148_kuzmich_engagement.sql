-- 148_kuzmich_engagement.sql
-- Таблица сигналов интереса к турам для проактивного реэнгейджмента Kuzmich.
-- Когда турист смотрел тур но не забронировал — записываем сигнал.
-- Cron-агент через 24ч отправляет Telegram-напоминание.

CREATE TABLE IF NOT EXISTS kuzmich_engagement_signals (
  id           BIGSERIAL    PRIMARY KEY,
  user_id      INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tour_id      INT          NOT NULL REFERENCES operator_tours(id) ON DELETE CASCADE,
  session_id   TEXT,
  signal_type  TEXT         NOT NULL DEFAULT 'viewed',  -- viewed | booking_started | booking_abandoned
  pushed_at    TIMESTAMP,
  created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_user       ON kuzmich_engagement_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_tour        ON kuzmich_engagement_signals(tour_id);
CREATE INDEX IF NOT EXISTS idx_engagement_unpushed    ON kuzmich_engagement_signals(created_at)
  WHERE pushed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_engagement_type        ON kuzmich_engagement_signals(signal_type);

COMMENT ON TABLE kuzmich_engagement_signals IS
  'Сигналы интереса туриста к турам — основа для Telegram re-engagement пушей Kuzmich';

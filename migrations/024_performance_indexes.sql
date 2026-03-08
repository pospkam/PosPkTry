-- 024_performance_indexes.sql
-- Индексы для улучшения производительности запросов

-- tourist_wishlist: ускорение выборки избранного по туристу
CREATE INDEX IF NOT EXISTS idx_tourist_wishlist_tourist_id
  ON tourist_wishlist (tourist_id);

CREATE INDEX IF NOT EXISTS idx_tourist_wishlist_tourist_item
  ON tourist_wishlist (tourist_id, item_type, item_id);

-- guide_schedule: ускорение выборки расписания по гиду
CREATE INDEX IF NOT EXISTS idx_guide_schedule_guide_id
  ON guide_schedule (guide_id);

CREATE INDEX IF NOT EXISTS idx_guide_schedule_guide_time
  ON guide_schedule (guide_id, start_time);

-- guide_earnings: ускорение выборки доходов по гиду
CREATE INDEX IF NOT EXISTS idx_guide_earnings_guide_id
  ON guide_earnings (guide_id);

-- guide_groups: ускорение выборки групп через schedule
CREATE INDEX IF NOT EXISTS idx_guide_groups_schedule_id
  ON guide_groups (schedule_id);

-- notifications: ускорение выборки уведомлений по пользователю
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read)
  WHERE is_read = false;

-- reviews: ускорение выборки отзывов по пользователю
CREATE INDEX IF NOT EXISTS idx_reviews_user_id
  ON reviews (user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_tour_id
  ON reviews (tour_id);

-- eco_points_log: ускорение выборки баллов по пользователю
CREATE INDEX IF NOT EXISTS idx_eco_points_log_user_id
  ON eco_points_log (user_id);

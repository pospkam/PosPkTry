-- 124_open_tour_slots.sql
-- Открываем слоты для туров «Камчатская рыбалка» на апрель–август 2026.
-- Все слоты — идемпотентные (INSERT ... ON CONFLICT DO NOTHING).

-- tour 2: Зимняя рыбалка (февраль–апрель) — остаток апреля, выходные, 6 мест
INSERT INTO tour_availability (operator_tour_id, date, day_of_week, available_slots, booked_slots)
SELECT
  2,
  d::date,
  EXTRACT(DOW FROM d)::int,
  6,
  0
FROM generate_series('2026-04-04'::date, '2026-04-30'::date, '1 day'::interval) d
WHERE EXTRACT(DOW FROM d) IN (6, 0) -- сб, вс
ON CONFLICT (operator_tour_id, date) DO NOTHING;

-- tour 7: Семейный тур выходного дня — апрель–август, выходные, 4 места
INSERT INTO tour_availability (operator_tour_id, date, day_of_week, available_slots, booked_slots)
SELECT
  7,
  d::date,
  EXTRACT(DOW FROM d)::int,
  4,
  0
FROM generate_series('2026-04-04'::date, '2026-08-31'::date, '1 day'::interval) d
WHERE EXTRACT(DOW FROM d) IN (6, 0)
ON CONFLICT (operator_tour_id, date) DO NOTHING;

-- tour 5: Летняя рыбалка на чавычу и нерку — июнь–август, каждую субботу, 4 места
INSERT INTO tour_availability (operator_tour_id, date, day_of_week, available_slots, booked_slots)
SELECT
  5,
  d::date,
  EXTRACT(DOW FROM d)::int,
  4,
  0
FROM generate_series('2026-06-06'::date, '2026-08-29'::date, '1 day'::interval) d
WHERE EXTRACT(DOW FROM d) = 6 -- только суббота (начало тура)
ON CONFLICT (operator_tour_id, date) DO NOTHING;

-- tour 6: Летняя рыбалка на кижуча — июль–август, каждую субботу, 4 места
INSERT INTO tour_availability (operator_tour_id, date, day_of_week, available_slots, booked_slots)
SELECT
  6,
  d::date,
  EXTRACT(DOW FROM d)::int,
  4,
  0
FROM generate_series('2026-07-04'::date, '2026-08-29'::date, '1 day'::interval) d
WHERE EXTRACT(DOW FROM d) = 6
ON CONFLICT (operator_tour_id, date) DO NOTHING;

-- tour 8: Многодневный зимний тур (3 дня) — остаток апреля, каждые 2 недели, 3 места
INSERT INTO tour_availability (operator_tour_id, date, day_of_week, available_slots, booked_slots)
SELECT 8, d::date, EXTRACT(DOW FROM d)::int, 3, 0
FROM (VALUES
  ('2026-04-05'::date),
  ('2026-04-19'::date)
) AS t(d)
ON CONFLICT (operator_tour_id, date) DO NOTHING;

-- tour 9: Многодневный летний тур (5 дней) — июнь–август, раз в 2 недели, 4 места
INSERT INTO tour_availability (operator_tour_id, date, day_of_week, available_slots, booked_slots)
SELECT 9, d::date, EXTRACT(DOW FROM d)::int, 4, 0
FROM (VALUES
  ('2026-06-06'::date),
  ('2026-06-20'::date),
  ('2026-07-04'::date),
  ('2026-07-18'::date),
  ('2026-08-01'::date),
  ('2026-08-15'::date),
  ('2026-08-29'::date)
) AS t(d)
ON CONFLICT (operator_tour_id, date) DO NOTHING;

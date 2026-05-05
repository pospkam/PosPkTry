-- Migration 657: route-place connections from idilesom.com scan (pass 3, scan_kam_fast.py)
-- Range 1600-7500 + nearby IDs. Found 27 Kamchatka pages; most already linked by mig 653-654.
-- 2 new connections: Дыгерен-Оленгендэ (hyphen variant missed previous passes)
--
-- Scanned: 1600-7500 (step=3) + 70 nearby IDs
-- Non-Kamchatka IDs from old scan (b3fw48i81): skipped — all Сахалин/Хабаровск/Магадан

INSERT INTO route_waypoints (route_id, place_id, position)
VALUES
  ('7ebabb24-87c2-46e2-8ac2-41f998071a97', '6f9e8d56-f772-465a-bdf0-7524e5872a6e', 0), -- Вулкан Дыгерен-Оленгендэ → Гора Дыгерен-Оленгенде
  ('f64c4438-c160-4e8e-9519-01092d20277f', '6f9e8d56-f772-465a-bdf0-7524e5872a6e', 0)  -- Вулкан Дыгерен–Оленгендэ → Гора Дыгерен-Оленгенде
ON CONFLICT (route_id, place_id) DO NOTHING;

SELECT COUNT(*) as total_waypoints FROM route_waypoints;

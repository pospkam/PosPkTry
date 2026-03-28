-- Fix routes with lat=0, lng=0 (incorrectly inserted coordinates)
-- Эко-тропа Тупикин ключ (дубль из миграции 104) — Эссо, Быстринский р-н
UPDATE agent_route_knowledge
SET lat = 55.9241110, lng = 158.7166290
WHERE id = '8afb971c-04a7-4249-88c2-2dea757fa1cb'
  AND lat = 0 AND lng = 0;

-- Check for any other visible routes with zero coordinates
-- UPDATE agent_route_knowledge SET is_visible = FALSE
-- WHERE lat = 0 AND lng = 0 AND is_visible = TRUE;

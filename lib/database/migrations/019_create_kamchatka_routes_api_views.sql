-- 019_create_kamchatka_routes_api_views.sql
-- Единые SQL VIEW для API и агентов: полный каталог + группировка без дублей.

CREATE OR REPLACE VIEW v_kamchatka_routes_api AS
SELECT
  kr.id AS route_id,
  kr.dedupe_key AS route_dedupe_key,
  kr.category,
  kr.title,
  kr.description,
  kr.lat,
  kr.lng,
  kr.source_url,
  kr.source_name,
  COALESCE(kr.metadata->>'import_source', kr.source_name, 'unknown') AS import_source,
  (kr.lat IS NOT NULL AND kr.lng IS NOT NULL) AS has_coordinates,
  COUNT(*) OVER (PARTITION BY kr.category) AS category_total,
  ROW_NUMBER() OVER (PARTITION BY kr.category ORDER BY kr.title, kr.dedupe_key) AS category_position,
  kr.metadata,
  kr.created_at,
  kr.updated_at AS source_updated_at
FROM kamchatka_routes kr;

CREATE OR REPLACE VIEW v_kamchatka_route_groups_api AS
SELECT
  category,
  COUNT(*)::int AS total_routes,
  COUNT(*) FILTER (WHERE has_coordinates)::int AS total_with_coordinates,
  MIN(source_updated_at) AS min_source_updated_at,
  MAX(source_updated_at) AS max_source_updated_at
FROM v_kamchatka_routes_api
GROUP BY category
ORDER BY category;

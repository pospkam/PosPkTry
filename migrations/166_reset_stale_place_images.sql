-- Migration 166: Delete stale AI images for places with wrong prompt
--
-- Problem: ai_route_images for places were generated before migration 650
-- set correct location_type. All places with location_type = NULL got the
-- generic 'other' prompt ("scenic Kamchatka wilderness"). After 650 fixed
-- location_type, cached images were never invalidated — so volcanoes show
-- landscape photos, lakes show generic wilderness, etc.
--
-- Fix: delete stale images (detectable by 'scenic Kamchatka wilderness'
-- in prompt) for places that now have a specific non-'other' location_type.
-- Images will regenerate on next page load with the correct type prompt.

DELETE FROM ai_route_images
WHERE route_id IN (
  SELECT p.ark_id
  FROM places p
  JOIN ai_route_images ari ON ari.route_id = p.ark_id
  WHERE p.is_visible = true
    AND p.location_type IS NOT NULL
    AND p.location_type != 'other'
    AND ari.prompt LIKE '%scenic Kamchatka wilderness%'
);

INSERT INTO _migrations (name)
VALUES ('166_reset_stale_place_images.sql')
ON CONFLICT (name) DO NOTHING;

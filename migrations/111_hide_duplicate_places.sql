-- Migration 111: Hide duplicate places
-- Keep better entries, hide older/worse duplicates.

-- Верхне-Паратунские источники: hide old entry (description has raw coords in text)
UPDATE agent_route_knowledge
SET is_visible = FALSE
WHERE id = 'd6941e5e-35a4-48c9-bb72-1899a2b9c3e2';

-- Природный парк Налычево: hide duplicate (nearly identical coords to ce59fcc5)
UPDATE agent_route_knowledge
SET is_visible = FALSE
WHERE id = 'de03752e-d9fd-4e0d-a773-aad729a6f8d7';

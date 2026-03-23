-- Migration 075: Отдельный тип активности для речных сплавов
-- boat_trip = морские туры (байдарки, лодки, рыбалка с лодки)
-- rafting   = речные сплавы (Быстрая, Авача, Паратунка)

-- Перетегировать туры по реке в rafting
UPDATE operator_tours
SET activity_type = 'rafting'
WHERE activity_type = 'boat_trip'
  AND (
    location_type = 'river'
    OR title ILIKE '%сплав%'
    OR title ILIKE '%splav%'
    OR description ILIKE '%сплав по реке%'
  );

-- Аналогично в agent_route_knowledge (маршруты)
UPDATE agent_route_knowledge
SET activity_type = 'rafting'
WHERE activity_type = 'boat_trip'
  AND (
    category = 'river'
    OR route_name ILIKE '%сплав%'
    OR description ILIKE '%сплав по реке%'
  );

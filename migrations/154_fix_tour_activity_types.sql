-- Исправление несоответствий activity_type в operator_tours
-- Тур #27 "Сплав по реке Быстрая" — activity_type=boat_trip → rafting

UPDATE operator_tours SET activity_type = 'rafting' WHERE id = 27;

-- =============================================
-- СХЕМА БАЗЫ ДАННЫХ ДЛЯ СИСТЕМЫ ТРАНСФЕРОВ
-- Kamchatour Hub - Transfer System
-- =============================================

-- Включаем необходимые расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =============================================
-- ТАБЛИЦА: transfer_routes - Маршруты
-- =============================================
CREATE TABLE transfer_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  from_location VARCHAR(255) NOT NULL,
  to_location VARCHAR(255) NOT NULL,
  from_coordinates POINT NOT NULL,
  to_coordinates POINT NOT NULL,
  distance_km DECIMAL(8,2),
  estimated_duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для transfer_routes
CREATE INDEX idx_transfer_routes_from_coords ON transfer_routes USING GIST (from_coordinates);
CREATE INDEX idx_transfer_routes_to_coords ON transfer_routes USING GIST (to_coordinates);
CREATE INDEX idx_transfer_routes_active ON transfer_routes (is_active);

-- =============================================
-- ТАБЛИЦА: transfer_vehicles - Транспорт
-- =============================================
CREATE TABLE transfer_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID REFERENCES operators(id),
  vehicle_type VARCHAR(50) NOT NULL CHECK (vehicle_type IN ('economy', 'comfort', 'business', 'minibus', 'bus')),
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  features TEXT[], -- ['wifi', 'air_conditioning', 'child_seat', 'wheelchair_accessible']
  license_plate VARCHAR(20) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для transfer_vehicles
CREATE INDEX idx_transfer_vehicles_operator ON transfer_vehicles (operator_id);
CREATE INDEX idx_transfer_vehicles_type ON transfer_vehicles (vehicle_type);
CREATE INDEX idx_transfer_vehicles_capacity ON transfer_vehicles (capacity);
CREATE INDEX idx_transfer_vehicles_active ON transfer_vehicles (is_active);

-- =============================================
-- ТАБЛИЦА: transfer_drivers - Водители
-- =============================================
CREATE TABLE transfer_drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID REFERENCES operators(id),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  license_number VARCHAR(50) UNIQUE,
  languages TEXT[], -- ['ru', 'en', 'zh', 'ja']
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_trips INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для transfer_drivers
CREATE INDEX idx_transfer_drivers_operator ON transfer_drivers (operator_id);
CREATE INDEX idx_transfer_drivers_rating ON transfer_drivers (rating);
CREATE INDEX idx_transfer_drivers_active ON transfer_drivers (is_active);

-- =============================================
-- ТАБЛИЦА: transfer_schedules - Расписание
-- =============================================
CREATE TABLE transfer_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES transfer_routes(id),
  vehicle_id UUID REFERENCES transfer_vehicles(id),
  driver_id UUID REFERENCES transfer_drivers(id),
  departure_time TIME NOT NULL,
  arrival_time TIME NOT NULL,
  price_per_person DECIMAL(10,2) NOT NULL CHECK (price_per_person > 0),
  available_seats INTEGER NOT NULL CHECK (available_seats >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для transfer_schedules
CREATE INDEX idx_transfer_schedules_route ON transfer_schedules (route_id);
CREATE INDEX idx_transfer_schedules_vehicle ON transfer_schedules (vehicle_id);
CREATE INDEX idx_transfer_schedules_driver ON transfer_schedules (driver_id);
CREATE INDEX idx_transfer_schedules_departure ON transfer_schedules (departure_time);
CREATE INDEX idx_transfer_schedules_active ON transfer_schedules (is_active);

-- =============================================
-- ТАБЛИЦА: transfer_bookings - Бронирования
-- =============================================
CREATE TABLE transfer_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  operator_id UUID REFERENCES operators(id),
  route_id UUID REFERENCES transfer_routes(id),
  vehicle_id UUID REFERENCES transfer_vehicles(id),
  driver_id UUID REFERENCES transfer_drivers(id),
  schedule_id UUID REFERENCES transfer_schedules(id),
  booking_date DATE NOT NULL,
  departure_time TIME NOT NULL,
  passengers_count INTEGER NOT NULL CHECK (passengers_count > 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'in_progress')),
  special_requests TEXT,
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  confirmation_code VARCHAR(10) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для transfer_bookings
CREATE INDEX idx_transfer_bookings_user ON transfer_bookings (user_id);
CREATE INDEX idx_transfer_bookings_operator ON transfer_bookings (operator_id);
CREATE INDEX idx_transfer_bookings_route ON transfer_bookings (route_id);
CREATE INDEX idx_transfer_bookings_vehicle ON transfer_bookings (vehicle_id);
CREATE INDEX idx_transfer_bookings_driver ON transfer_bookings (driver_id);
CREATE INDEX idx_transfer_bookings_schedule ON transfer_bookings (schedule_id);
CREATE INDEX idx_transfer_bookings_date ON transfer_bookings (booking_date);
CREATE INDEX idx_transfer_bookings_status ON transfer_bookings (status);
CREATE INDEX idx_transfer_bookings_confirmation ON transfer_bookings (confirmation_code);

-- =============================================
-- ТАБЛИЦА: transfer_stops - Остановки
-- =============================================
CREATE TABLE transfer_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES transfer_routes(id),
  name VARCHAR(255) NOT NULL,
  coordinates POINT NOT NULL,
  address TEXT,
  stop_order INTEGER NOT NULL,
  is_pickup BOOLEAN DEFAULT true,
  is_dropoff BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для transfer_stops
CREATE INDEX idx_transfer_stops_route ON transfer_stops (route_id);
CREATE INDEX idx_transfer_stops_coords ON transfer_stops USING GIST (coordinates);
CREATE INDEX idx_transfer_stops_order ON transfer_stops (route_id, stop_order);

-- =============================================
-- ТАБЛИЦА: transfer_reviews - Отзывы
-- =============================================
CREATE TABLE transfer_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES transfer_bookings(id),
  user_id UUID REFERENCES users(id),
  driver_id UUID REFERENCES transfer_drivers(id),
  vehicle_id UUID REFERENCES transfer_vehicles(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для transfer_reviews
CREATE INDEX idx_transfer_reviews_booking ON transfer_reviews (booking_id);
CREATE INDEX idx_transfer_reviews_user ON transfer_reviews (user_id);
CREATE INDEX idx_transfer_reviews_driver ON transfer_reviews (driver_id);
CREATE INDEX idx_transfer_reviews_vehicle ON transfer_reviews (vehicle_id);
CREATE INDEX idx_transfer_reviews_rating ON transfer_reviews (rating);

-- =============================================
-- ТАБЛИЦА: transfer_notifications - Уведомления
-- =============================================
CREATE TABLE transfer_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES transfer_bookings(id),
  user_id UUID REFERENCES users(id),
  operator_id UUID REFERENCES operators(id),
  type VARCHAR(50) NOT NULL, -- 'booking_created', 'booking_confirmed', 'booking_cancelled', 'reminder'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для transfer_notifications
CREATE INDEX idx_transfer_notifications_booking ON transfer_notifications (booking_id);
CREATE INDEX idx_transfer_notifications_user ON transfer_notifications (user_id);
CREATE INDEX idx_transfer_notifications_operator ON transfer_notifications (operator_id);
CREATE INDEX idx_transfer_notifications_type ON transfer_notifications (type);
CREATE INDEX idx_transfer_notifications_read ON transfer_notifications (is_read);

-- =============================================
-- ТРИГГЕРЫ ДЛЯ ОБНОВЛЕНИЯ updated_at
-- =============================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для всех таблиц
CREATE TRIGGER update_transfer_routes_updated_at BEFORE UPDATE ON transfer_routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transfer_vehicles_updated_at BEFORE UPDATE ON transfer_vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transfer_drivers_updated_at BEFORE UPDATE ON transfer_drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transfer_schedules_updated_at BEFORE UPDATE ON transfer_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transfer_bookings_updated_at BEFORE UPDATE ON transfer_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ТЕСТОВЫЕ ДАННЫЕ
-- =============================================

-- Вставляем тестовые маршруты
INSERT INTO transfer_routes (name, from_location, to_location, from_coordinates, to_coordinates, distance_km, estimated_duration_minutes) VALUES
('Аэропорт → Петропавловск-Камчатский', 'Аэропорт Елизово', 'Петропавловск-Камчатский', POINT(158.65, 53.17), POINT(158.65, 53.02), 30.5, 45),
('Петропавловск-Камчатский → Аэропорт', 'Петропавловск-Камчатский', 'Аэропорт Елизово', POINT(158.65, 53.02), POINT(158.65, 53.17), 30.5, 45),
('Петропавловск-Камчатский → Паратунка', 'Петропавловск-Камчатский', 'Паратунка', POINT(158.65, 53.02), POINT(158.65, 52.95), 15.2, 25),
('Паратунка → Петропавловск-Камчатский', 'Паратунка', 'Петропавловск-Камчатский', POINT(158.65, 52.95), POINT(158.65, 53.02), 15.2, 25),
('Петропавловск-Камчатский → Вилючинск', 'Петропавловск-Камчатский', 'Вилючинск', POINT(158.65, 53.02), POINT(158.65, 52.93), 20.8, 35);

-- Вставляем тестовые транспортные средства
INSERT INTO transfer_vehicles (operator_id, vehicle_type, make, model, year, capacity, features, license_plate) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'economy', 'Hyundai', 'Solaris', 2022, 4, ARRAY['air_conditioning'], 'КМ 123 АА'),
('550e8400-e29b-41d4-a716-446655440000', 'comfort', 'Toyota', 'Camry', 2023, 4, ARRAY['wifi', 'air_conditioning', 'child_seat'], 'КМ 456 ББ'),
('550e8400-e29b-41d4-a716-446655440000', 'business', 'Mercedes-Benz', 'E-Class', 2023, 4, ARRAY['wifi', 'air_conditioning', 'leather_seats', 'wheelchair_accessible'], 'КМ 789 ВВ'),
('550e8400-e29b-41d4-a716-446655440000', 'minibus', 'Ford', 'Transit', 2022, 16, ARRAY['wifi', 'air_conditioning', 'child_seat'], 'КМ 101 ГГ'),
('550e8400-e29b-41d4-a716-446655440000', 'bus', 'Mercedes-Benz', 'Sprinter', 2023, 25, ARRAY['wifi', 'air_conditioning', 'toilet'], 'КМ 202 ДД');

-- Вставляем тестовых водителей
INSERT INTO transfer_drivers (operator_id, name, phone, email, license_number, languages, rating, total_trips) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Иванов Иван Иванович', '+7-914-123-45-67', 'ivanov@example.com', '1234567890', ARRAY['ru', 'en'], 4.8, 150),
('550e8400-e29b-41d4-a716-446655440000', 'Петров Петр Петрович', '+7-914-234-56-78', 'petrov@example.com', '2345678901', ARRAY['ru', 'en', 'zh'], 4.9, 200),
('550e8400-e29b-41d4-a716-446655440000', 'Сидоров Сидор Сидорович', '+7-914-345-67-89', 'sidorov@example.com', '3456789012', ARRAY['ru', 'ja'], 4.7, 120),
('550e8400-e29b-41d4-a716-446655440000', 'Козлов Козел Козлович', '+7-914-456-78-90', 'kozlov@example.com', '4567890123', ARRAY['ru'], 4.6, 80),
('550e8400-e29b-41d4-a716-446655440000', 'Волков Волк Волкович', '+7-914-567-89-01', 'volkov@example.com', '5678901234', ARRAY['ru', 'en'], 4.9, 180);

-- Вставляем тестовое расписание
INSERT INTO transfer_schedules (route_id, vehicle_id, driver_id, departure_time, arrival_time, price_per_person, available_seats) VALUES
-- Аэропорт → Петропавловск-Камчатский
((SELECT id FROM transfer_routes WHERE name = 'Аэропорт → Петропавловск-Камчатский' LIMIT 1), 
 (SELECT id FROM transfer_vehicles WHERE license_plate = 'КМ 123 АА' LIMIT 1),
 (SELECT id FROM transfer_drivers WHERE name = 'Иванов Иван Иванович' LIMIT 1),
 '08:00', '08:45', 1500.00, 4),
((SELECT id FROM transfer_routes WHERE name = 'Аэропорт → Петропавловск-Камчатский' LIMIT 1), 
 (SELECT id FROM transfer_vehicles WHERE license_plate = 'КМ 456 ББ' LIMIT 1),
 (SELECT id FROM transfer_drivers WHERE name = 'Петров Петр Петрович' LIMIT 1),
 '10:00', '10:45', 2000.00, 4),
((SELECT id FROM transfer_routes WHERE name = 'Аэропорт → Петропавловск-Камчатский' LIMIT 1), 
 (SELECT id FROM transfer_vehicles WHERE license_plate = 'КМ 789 ВВ' LIMIT 1),
 (SELECT id FROM transfer_drivers WHERE name = 'Сидоров Сидор Сидорович' LIMIT 1),
 '12:00', '12:45', 3000.00, 4),
((SELECT id FROM transfer_routes WHERE name = 'Аэропорт → Петропавловск-Камчатский' LIMIT 1), 
 (SELECT id FROM transfer_vehicles WHERE license_plate = 'КМ 101 ГГ' LIMIT 1),
 (SELECT id FROM transfer_drivers WHERE name = 'Козлов Козел Козлович' LIMIT 1),
 '14:00', '14:45', 1200.00, 16),
((SELECT id FROM transfer_routes WHERE name = 'Аэропорт → Петропавловск-Камчатский' LIMIT 1), 
 (SELECT id FROM transfer_vehicles WHERE license_plate = 'КМ 202 ДД' LIMIT 1),
 (SELECT id FROM transfer_drivers WHERE name = 'Волков Волк Волкович' LIMIT 1),
 '16:00', '16:45', 1000.00, 25);

-- Вставляем тестовые остановки
INSERT INTO transfer_stops (route_id, name, coordinates, address, stop_order, is_pickup, is_dropoff) VALUES
-- Остановки для маршрута Аэропорт → Петропавловск-Камчатский
((SELECT id FROM transfer_routes WHERE name = 'Аэропорт → Петропавловск-Камчатский' LIMIT 1), 
 'Аэропорт Елизово', POINT(158.65, 53.17), 'Аэропорт Елизово, Камчатский край', 1, true, false),
((SELECT id FROM transfer_routes WHERE name = 'Аэропорт → Петропавловск-Камчатский' LIMIT 1), 
 'Гостиница "Авача"', POINT(158.65, 53.05), 'ул. Ленинская, 61, Петропавловск-Камчатский', 2, true, true),
((SELECT id FROM transfer_routes WHERE name = 'Аэропорт → Петропавловск-Камчатский' LIMIT 1), 
 'Центр города', POINT(158.65, 53.02), 'пл. Ленина, Петропавловск-Камчатский', 3, true, true);

-- =============================================
-- ПРЕДСТАВЛЕНИЯ ДЛЯ УДОБСТВА
-- =============================================

-- Представление для полной информации о трансферах
CREATE VIEW transfer_full_info AS
SELECT 
  s.id as schedule_id,
  r.name as route_name,
  r.from_location,
  r.to_location,
  r.distance_km,
  r.estimated_duration_minutes,
  v.vehicle_type,
  v.make,
  v.model,
  v.capacity,
  v.features,
  v.license_plate,
  d.name as driver_name,
  d.phone as driver_phone,
  d.languages as driver_languages,
  d.rating as driver_rating,
  d.total_trips,
  s.departure_time,
  s.arrival_time,
  s.price_per_person,
  s.available_seats,
  o.name as operator_name,
  o.phone as operator_phone,
  o.email as operator_email
FROM transfer_schedules s
JOIN transfer_routes r ON s.route_id = r.id
JOIN transfer_vehicles v ON s.vehicle_id = v.id
JOIN transfer_drivers d ON s.driver_id = d.id
JOIN operators o ON v.operator_id = o.id
WHERE s.is_active = true AND r.is_active = true AND v.is_active = true AND d.is_active = true;

-- Представление для статистики перевозчиков
CREATE VIEW operator_transfer_stats AS
SELECT 
  o.id as operator_id,
  o.name as operator_name,
  COUNT(DISTINCT v.id) as total_vehicles,
  COUNT(DISTINCT d.id) as total_drivers,
  COUNT(DISTINCT r.id) as total_routes,
  COUNT(DISTINCT s.id) as total_schedules,
  COUNT(DISTINCT b.id) as total_bookings,
  COALESCE(SUM(b.total_price), 0) as total_revenue,
  COALESCE(AVG(d.rating), 0) as avg_driver_rating
FROM operators o
LEFT JOIN transfer_vehicles v ON o.id = v.operator_id AND v.is_active = true
LEFT JOIN transfer_drivers d ON o.id = d.operator_id AND d.is_active = true
LEFT JOIN transfer_routes r ON o.id = r.id AND r.is_active = true
LEFT JOIN transfer_schedules s ON v.id = s.vehicle_id AND s.is_active = true
LEFT JOIN transfer_bookings b ON s.id = b.schedule_id
GROUP BY o.id, o.name;

-- =============================================
-- КОММЕНТАРИИ К ТАБЛИЦАМ
-- =============================================

COMMENT ON TABLE transfer_routes IS 'Маршруты трансферов с координатами и расстояниями';
COMMENT ON TABLE transfer_vehicles IS 'Транспортные средства перевозчиков';
COMMENT ON TABLE transfer_drivers IS 'Водители с рейтингами и языками';
COMMENT ON TABLE transfer_schedules IS 'Расписание рейсов с ценами и доступностью';
COMMENT ON TABLE transfer_bookings IS 'Бронирования трансферов клиентами';
COMMENT ON TABLE transfer_stops IS 'Остановки на маршрутах';
COMMENT ON TABLE transfer_reviews IS 'Отзывы о трансферах';
COMMENT ON TABLE transfer_notifications IS 'Уведомления о бронированиях';

-- =============================================
-- ЗАВЕРШЕНИЕ
-- =============================================

-- Обновляем статистику таблиц
ANALYZE transfer_routes;
ANALYZE transfer_vehicles;
ANALYZE transfer_drivers;
ANALYZE transfer_schedules;
ANALYZE transfer_bookings;
ANALYZE transfer_stops;
ANALYZE transfer_reviews;
ANALYZE transfer_notifications;

-- Выводим информацию о созданных таблицах
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE tablename LIKE 'transfer_%'
ORDER BY tablename;
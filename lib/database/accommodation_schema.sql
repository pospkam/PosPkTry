-- =============================================
-- СХЕМА БАЗЫ ДАННЫХ ДЛЯ РАЗМЕЩЕНИЯ
-- Kamchatour Hub - Accommodation System
-- =============================================

-- =============================================
-- ТАБЛИЦА: accommodations - Размещение
-- =============================================
CREATE TABLE IF NOT EXISTS accommodations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('hotel', 'hostel', 'apartment', 'guesthouse', 'resort', 'camping', 'glamping', 'cottage')),
  description TEXT,
  short_description VARCHAR(500),
  
  -- Местоположение
  address VARCHAR(500) NOT NULL,
  coordinates JSONB NOT NULL, -- {lat: number, lng: number}
  location_zone VARCHAR(100), -- 'city_center', 'airport', 'nature', 'beach'
  
  -- Характеристики
  star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5),
  total_rooms INTEGER NOT NULL CHECK (total_rooms > 0),
  check_in_time TIME DEFAULT '14:00',
  check_out_time TIME DEFAULT '12:00',
  
  -- Удобства
  amenities JSONB DEFAULT '[]', -- ['wifi', 'parking', 'breakfast', 'spa', 'pool', 'gym', 'restaurant', 'bar', 'pets', 'smoking']
  languages JSONB DEFAULT '["ru"]', -- ['ru', 'en', 'zh', 'ja']
  
  -- Цены
  price_per_night_from DECIMAL(10,2) NOT NULL,
  price_per_night_to DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'RUB',
  
  -- Рейтинг
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0,
  
  -- Статус
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_accommodations_partner ON accommodations (partner_id);
CREATE INDEX IF NOT EXISTS idx_accommodations_type ON accommodations (type);
CREATE INDEX IF NOT EXISTS idx_accommodations_zone ON accommodations (location_zone);
CREATE INDEX IF NOT EXISTS idx_accommodations_rating ON accommodations (rating DESC);
CREATE INDEX IF NOT EXISTS idx_accommodations_price ON accommodations (price_per_night_from);
CREATE INDEX IF NOT EXISTS idx_accommodations_active ON accommodations (is_active);

-- =============================================
-- ТАБЛИЦА: accommodation_rooms - Номера
-- =============================================
CREATE TABLE IF NOT EXISTS accommodation_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  accommodation_id UUID REFERENCES accommodations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  room_type VARCHAR(50) NOT NULL CHECK (room_type IN ('single', 'double', 'twin', 'triple', 'suite', 'family', 'dormitory')),
  description TEXT,
  
  -- Характеристики
  size_sqm INTEGER,
  max_guests INTEGER NOT NULL CHECK (max_guests > 0),
  beds_configuration JSONB, -- [{"type": "double", "count": 1}, {"type": "single", "count": 1}]
  
  -- Удобства
  amenities JSONB DEFAULT '[]',
  view VARCHAR(50), -- 'mountain', 'sea', 'volcano', 'city', 'garden'
  
  -- Наличие и цены
  available_rooms INTEGER NOT NULL CHECK (available_rooms >= 0),
  price_per_night DECIMAL(10,2) NOT NULL,
  
  -- Статус
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_accommodation_rooms_accommodation ON accommodation_rooms (accommodation_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_rooms_type ON accommodation_rooms (room_type);
CREATE INDEX IF NOT EXISTS idx_accommodation_rooms_price ON accommodation_rooms (price_per_night);
CREATE INDEX IF NOT EXISTS idx_accommodation_rooms_available ON accommodation_rooms (available_rooms);

-- =============================================
-- ТАБЛИЦА: accommodation_bookings - Бронирования размещения
-- =============================================
CREATE TABLE IF NOT EXISTS accommodation_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  accommodation_id UUID REFERENCES accommodations(id),
  room_id UUID REFERENCES accommodation_rooms(id),
  
  -- Даты
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  nights INTEGER NOT NULL CHECK (nights > 0),
  
  -- Гости
  adults INTEGER NOT NULL CHECK (adults > 0),
  children INTEGER DEFAULT 0 CHECK (children >= 0),
  
  -- Цены
  room_price_per_night DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'RUB',
  
  -- Статус
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'partially_refunded')),
  
  -- Дополнительно
  special_requests TEXT,
  guest_notes TEXT,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Проверки
  CONSTRAINT check_dates CHECK (check_out_date > check_in_date)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_accommodation_bookings_user ON accommodation_bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_bookings_accommodation ON accommodation_bookings (accommodation_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_bookings_room ON accommodation_bookings (room_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_bookings_dates ON accommodation_bookings (check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_accommodation_bookings_status ON accommodation_bookings (status);

-- =============================================
-- ТАБЛИЦА: accommodation_reviews - Отзывы о размещении
-- =============================================
CREATE TABLE IF NOT EXISTS accommodation_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  accommodation_id UUID REFERENCES accommodations(id),
  booking_id UUID REFERENCES accommodation_bookings(id),
  
  -- Рейтинги (по 5-балльной шкале)
  cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
  location_rating INTEGER CHECK (location_rating >= 1 AND location_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  
  -- Отзыв
  title VARCHAR(255),
  comment TEXT,
  
  -- Статус
  is_verified BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_accommodation_reviews_accommodation ON accommodation_reviews (accommodation_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_reviews_user ON accommodation_reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_reviews_rating ON accommodation_reviews (overall_rating DESC);

-- =============================================
-- ТРИГГЕРЫ
-- =============================================

-- Автоматический расчет количества ночей
CREATE OR REPLACE FUNCTION calculate_nights() RETURNS TRIGGER AS $$
BEGIN
  NEW.nights := NEW.check_out_date - NEW.check_in_date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_nights
  BEFORE INSERT OR UPDATE ON accommodation_bookings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_nights();

-- Обновление рейтинга размещения при добавлении отзыва
CREATE OR REPLACE FUNCTION update_accommodation_rating() RETURNS TRIGGER AS $$
BEGIN
  UPDATE accommodations
  SET 
    rating = (
      SELECT AVG(overall_rating)::DECIMAL(3,2)
      FROM accommodation_reviews
      WHERE accommodation_id = NEW.accommodation_id AND is_visible = true
    ),
    review_count = (
      SELECT COUNT(*)
      FROM accommodation_reviews
      WHERE accommodation_id = NEW.accommodation_id AND is_visible = true
    ),
    updated_at = NOW()
  WHERE id = NEW.accommodation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_accommodation_rating
  AFTER INSERT OR UPDATE ON accommodation_reviews
  FOR EACH ROW
  WHEN (NEW.is_visible = true)
  EXECUTE FUNCTION update_accommodation_rating();

-- Обновление updated_at при изменении
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_accommodations_updated_at
  BEFORE UPDATE ON accommodations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_accommodation_rooms_updated_at
  BEFORE UPDATE ON accommodation_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_accommodation_bookings_updated_at
  BEFORE UPDATE ON accommodation_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

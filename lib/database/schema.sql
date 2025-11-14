-- Схема базы данных для Kamchatour Hub
-- PostgreSQL с расширениями для геоданных и JSON

-- Включаем необходимые расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('tourist', 'operator', 'guide', 'transfer', 'agent', 'admin')),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица партнеров
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('operator', 'guide', 'transfer', 'stay', 'souvenir', 'gear', 'cars', 'restaurant')),
    description TEXT,
    contact JSONB NOT NULL,
    rating DECIMAL(3,2) DEFAULT 0.0,
    review_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    logo_asset_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица активностей (старая таблица, оставляем для совместимости)
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    icon_bytes BYTEA,
    icon_mime TEXT,
    icon_sha256 TEXT,
    icon_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица туров
CREATE TABLE IF NOT EXISTS tours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    short_description TEXT,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    duration INTEGER NOT NULL, -- в часах
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RUB',
    season JSONB DEFAULT '[]', -- массив сезонов
    coordinates JSONB DEFAULT '[]', -- массив точек маршрута
    requirements JSONB DEFAULT '[]', -- массив требований
    included JSONB DEFAULT '[]', -- что включено
    not_included JSONB DEFAULT '[]', -- что не включено
    operator_id UUID REFERENCES partners(id),
    guide_id UUID REFERENCES partners(id),
    max_group_size INTEGER DEFAULT 20,
    min_group_size INTEGER DEFAULT 1,
    rating DECIMAL(3,2) DEFAULT 0.0,
    review_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица активов (изображения, файлы)
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    sha256 VARCHAR(64) UNIQUE NOT NULL,
    size BIGINT NOT NULL,
    width INTEGER,
    height INTEGER,
    alt TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица связей туров и активов
CREATE TABLE IF NOT EXISTS tour_assets (
    tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    PRIMARY KEY (tour_id, asset_id)
);

-- Таблица связей партнеров и активов
CREATE TABLE IF NOT EXISTS partner_assets (
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    PRIMARY KEY (partner_id, asset_id)
);

-- Таблица бронирований
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    tour_id UUID REFERENCES tours(id),
    date DATE NOT NULL,
    start_date DATE,
    participants INTEGER NOT NULL,
    guests_count INTEGER,
    total_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    special_requests TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица отзывов
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    tour_id UUID REFERENCES tours(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    operator_reply TEXT,
    operator_reply_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица изображений отзывов
CREATE TABLE IF NOT EXISTS review_assets (
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    PRIMARY KEY (review_id, asset_id)
);

-- Таблица Eco-points
CREATE TABLE IF NOT EXISTS eco_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    coordinates JSONB NOT NULL, -- {lat: number, lng: number, address?: string, name?: string}
    category VARCHAR(50) NOT NULL CHECK (category IN ('recycling', 'cleaning', 'conservation', 'education')),
    points INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица пользовательских Eco-points
CREATE TABLE IF NOT EXISTS user_eco_points (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    total_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица достижений
CREATE TABLE IF NOT EXISTS eco_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    points INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица пользовательских достижений
CREATE TABLE IF NOT EXISTS user_achievements (
    user_id UUID REFERENCES users(id),
    achievement_id UUID REFERENCES eco_achievements(id),
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, achievement_id)
);

-- Таблица активностей пользователей
CREATE TABLE IF NOT EXISTS user_eco_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    points INTEGER NOT NULL,
    activity VARCHAR(255) NOT NULL,
    eco_point_id UUID REFERENCES eco_points(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GUIDE TABLES - Таблицы для гида
-- ============================================

-- Таблица расписания гида
CREATE TABLE IF NOT EXISTS guide_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guide_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tour_id UUID REFERENCES tours(id),
    tour_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    meeting_point VARCHAR(500),
    participants_count INTEGER DEFAULT 0,
    max_participants INTEGER,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    weather_conditions JSONB,
    safety_notes TEXT,
    special_requirements TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица групп участников
CREATE TABLE IF NOT EXISTS guide_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID REFERENCES guide_schedule(id) ON DELETE CASCADE,
    group_name VARCHAR(255),
    participants JSONB DEFAULT '[]', -- массив участников с данными
    emergency_contacts JSONB DEFAULT '[]', -- экстренные контакты
    experience_levels JSONB DEFAULT '{}', -- уровни опыта участников
    special_needs TEXT,
    equipment_checklist JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'forming' CHECK (status IN ('forming', 'ready', 'departed', 'returned')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица доходов гида
CREATE TABLE IF NOT EXISTS guide_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guide_id UUID REFERENCES users(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES guide_schedule(id) ON DELETE SET NULL,
    tour_id UUID REFERENCES tours(id),
    amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    commission_amount DECIMAL(10,2),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
    payment_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_guide_schedule_guide_id ON guide_schedule(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_schedule_tour_date ON guide_schedule(tour_date);
CREATE INDEX IF NOT EXISTS idx_guide_schedule_status ON guide_schedule(status);
CREATE INDEX IF NOT EXISTS idx_guide_groups_schedule_id ON guide_groups(schedule_id);
CREATE INDEX IF NOT EXISTS idx_guide_earnings_guide_id ON guide_earnings(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_earnings_payment_status ON guide_earnings(payment_status);

-- Таблица чат-сессий
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица сообщений чата
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Таблица сессий пользователей
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица аудита
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_partners_category ON partners(category);
CREATE INDEX IF NOT EXISTS idx_partners_verified ON partners(is_verified);
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_user_category ON partners(user_id, category);
CREATE INDEX IF NOT EXISTS idx_tours_operator ON tours(operator_id);
CREATE INDEX IF NOT EXISTS idx_tours_guide ON tours(guide_id);
CREATE INDEX IF NOT EXISTS idx_tours_difficulty ON tours(difficulty);
CREATE INDEX IF NOT EXISTS idx_tours_price ON tours(price);
CREATE INDEX IF NOT EXISTS idx_tours_active ON tours(is_active);
CREATE INDEX IF NOT EXISTS idx_tours_created_at ON tours(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tour ON bookings(tour_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_start_date ON bookings(start_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_reviews_tour ON reviews(tour_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_eco_points_category ON eco_points(category);
CREATE INDEX IF NOT EXISTS idx_eco_points_active ON eco_points(is_active);
CREATE INDEX IF NOT EXISTS idx_eco_points_coordinates ON eco_points USING GIST (ST_GeogFromText('POINT(' || (coordinates->>'lng')::text || ' ' || (coordinates->>'lat')::text || ')'));
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Создаем триггеры для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tours_updated_at BEFORE UPDATE ON tours
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Создаем функцию для обновления рейтинга тура
CREATE OR REPLACE FUNCTION update_tour_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tours SET
        rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM reviews
            WHERE tour_id = COALESCE(NEW.tour_id, OLD.tour_id)
        ),
        review_count = (
            SELECT COUNT(*)
            FROM reviews
            WHERE tour_id = COALESCE(NEW.tour_id, OLD.tour_id)
        )
    WHERE id = COALESCE(NEW.tour_id, OLD.tour_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tour_rating_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_tour_rating();

-- Создаем функцию для обновления рейтинга партнера
CREATE OR REPLACE FUNCTION update_partner_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE partners SET
        rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM reviews r
            JOIN tours t ON r.tour_id = t.id
            WHERE t.operator_id = COALESCE(NEW.operator_id, OLD.operator_id)
               OR t.guide_id = COALESCE(NEW.guide_id, OLD.guide_id)
        ),
        review_count = (
            SELECT COUNT(*)
            FROM reviews r
            JOIN tours t ON r.tour_id = t.id
            WHERE t.operator_id = COALESCE(NEW.operator_id, OLD.operator_id)
               OR t.guide_id = COALESCE(NEW.guide_id, OLD.guide_id)
        )
    WHERE id = COALESCE(NEW.operator_id, OLD.operator_id)
       OR id = COALESCE(NEW.guide_id, OLD.guide_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER update_partner_rating_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_partner_rating();

-- Вставляем начальные данные
INSERT INTO eco_achievements (name, description, points) VALUES
('Первый шаг', 'Заработайте первые 10 очков', 10),
('Экологический активист', 'Заработайте 50 очков', 50),
('Защитник природы', 'Заработайте 200 очков', 200),
('Эко-гуру', 'Заработайте 500 очков', 500),
('Мастер экологии', 'Заработайте 1000 очков', 1000)
ON CONFLICT DO NOTHING;

-- Создаем представления для удобства
CREATE OR REPLACE VIEW tour_details AS
SELECT 
    t.*,
    o.name as operator_name,
    o.category as operator_category,
    o.rating as operator_rating,
    g.name as guide_name,
    g.rating as guide_rating,
    array_agg(DISTINCT a.url) as images
FROM tours t
LEFT JOIN partners o ON t.operator_id = o.id
LEFT JOIN partners g ON t.guide_id = g.id
LEFT JOIN tour_assets ta ON t.id = ta.tour_id
LEFT JOIN assets a ON ta.asset_id = a.id
GROUP BY t.id, o.id, g.id;

CREATE OR REPLACE VIEW partner_details AS
SELECT 
    p.*,
    l.url as logo_url,
    array_agg(DISTINCT a.url) as images
FROM partners p
LEFT JOIN assets l ON p.logo_asset_id = l.id
LEFT JOIN partner_assets pa ON p.id = pa.partner_id
LEFT JOIN assets a ON pa.asset_id = a.id
GROUP BY p.id, l.url;

-- ============================================
-- OPERATOR-SPECIFIC TABLES
-- ============================================

-- Таблица настроек оператора
CREATE TABLE IF NOT EXISTS operator_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    auto_confirm_bookings BOOLEAN DEFAULT FALSE,
    booking_lead_time INTEGER DEFAULT 24,
    cancellation_policy TEXT,
    refund_policy TEXT,
    min_group_size INTEGER DEFAULT 1,
    max_advance_booking_days INTEGER DEFAULT 365,
    timezone VARCHAR(50) DEFAULT 'Asia/Kamchatka',
    currency VARCHAR(3) DEFAULT 'RUB',
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица доступности туров
CREATE TABLE IF NOT EXISTS tour_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    available_spots INTEGER NOT NULL DEFAULT 0,
    is_blocked BOOLEAN DEFAULT FALSE,
    block_reason TEXT,
    price_override DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tour_id, date)
);

-- Таблица переписки с клиентами
CREATE TABLE IF NOT EXISTS client_communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    recipient_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_system_message BOOLEAN DEFAULT FALSE,
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Таблица шаблонов сообщений
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    template_type VARCHAR(50),
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица кэша статистики оператора
CREATE TABLE IF NOT EXISTS operator_stats_cache (
    operator_id UUID PRIMARY KEY REFERENCES partners(id) ON DELETE CASCADE,
    total_tours INTEGER DEFAULT 0,
    active_tours INTEGER DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,
    last_calculated TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATION SYSTEM TABLES
-- ============================================

-- Таблица уведомлений
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- Таблица настроек уведомлений
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    new_booking BOOLEAN DEFAULT TRUE,
    booking_confirmed BOOLEAN DEFAULT TRUE,
    booking_cancelled BOOLEAN DEFAULT TRUE,
    new_review BOOLEAN DEFAULT TRUE,
    payment_received BOOLEAN DEFAULT TRUE,
    system_updates BOOLEAN DEFAULT TRUE,
    marketing BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица лога уведомлений
CREATE TABLE IF NOT EXISTS notification_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'push', 'sms', 'in_app')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'bounced')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для operator tables
CREATE INDEX IF NOT EXISTS idx_tour_availability_tour_id ON tour_availability(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_availability_date ON tour_availability(date);
CREATE INDEX IF NOT EXISTS idx_tour_availability_blocked ON tour_availability(is_blocked);
CREATE INDEX IF NOT EXISTS idx_client_comms_booking_id ON client_communications(booking_id);
CREATE INDEX IF NOT EXISTS idx_client_comms_sender_id ON client_communications(sender_id);
CREATE INDEX IF NOT EXISTS idx_client_comms_recipient_id ON client_communications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_client_comms_created_at ON client_communications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_templates_user_id ON message_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_type ON message_templates(template_type);

-- Индексы для notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notification_log_notification_id ON notification_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at);

-- Триггеры для operator tables
CREATE TRIGGER update_tour_availability_updated_at 
    BEFORE UPDATE ON tour_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operator_settings_updated_at 
    BEFORE UPDATE ON operator_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at 
    BEFORE UPDATE ON message_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- TRANSFER OPERATOR SYSTEM TABLES
-- Added: 2025-11-10
-- ============================================

-- Таблица транспортных средств
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('car', 'minivan', 'bus', 'helicopter', 'boat')),
  license_plate VARCHAR(50) UNIQUE NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  category VARCHAR(50) DEFAULT 'economy' CHECK (category IN ('economy', 'comfort', 'business', 'premium')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
  location VARCHAR(255),
  features JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  purchase_date DATE,
  last_service_date DATE,
  next_service_date DATE,
  mileage INTEGER DEFAULT 0,
  fuel_type VARCHAR(50),
  year INTEGER,
  color VARCHAR(50),
  vin VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица документов транспорта
CREATE TABLE IF NOT EXISTS vehicle_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('insurance', 'registration', 'inspection', 'license', 'other')),
  name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  document_number VARCHAR(100),
  issue_date DATE,
  expiry_date DATE,
  issuing_authority VARCHAR(255),
  status VARCHAR(20) DEFAULT 'valid' CHECK (status IN ('valid', 'expiring', 'expired')),
  notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица водителей
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  date_of_birth DATE,
  license_number VARCHAR(100) NOT NULL,
  license_category VARCHAR(50),
  license_issue_date DATE,
  license_expiry DATE NOT NULL,
  experience INTEGER DEFAULT 0,
  languages JSONB DEFAULT '[]',
  rating DECIMAL(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  total_trips INTEGER DEFAULT 0,
  completed_trips INTEGER DEFAULT 0,
  cancelled_trips INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'on_leave')),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  emergency_contact JSONB,
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Russia',
  hire_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица документов водителей
CREATE TABLE IF NOT EXISTS driver_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('license', 'passport', 'medical', 'background_check', 'contract', 'other')),
  name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  document_number VARCHAR(100),
  issue_date DATE,
  expiry_date DATE,
  issuing_authority VARCHAR(255),
  status VARCHAR(20) DEFAULT 'valid' CHECK (status IN ('valid', 'expiring', 'expired')),
  notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица маршрутов трансферов
CREATE TABLE IF NOT EXISTS transfer_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  from_location VARCHAR(255) NOT NULL,
  to_location VARCHAR(255) NOT NULL,
  from_coordinates JSONB,
  to_coordinates JSONB,
  distance DECIMAL(10,2),
  estimated_duration INTEGER,
  base_price DECIMAL(10,2) NOT NULL,
  price_per_km DECIMAL(10,2),
  price_per_hour DECIMAL(10,2),
  popular BOOLEAN DEFAULT FALSE,
  transfers_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.0,
  is_active BOOLEAN DEFAULT TRUE,
  weather_dependent BOOLEAN DEFAULT FALSE,
  stops JSONB DEFAULT '[]',
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица трансферов (бронирования)
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_reference VARCHAR(100) NOT NULL UNIQUE,
  operator_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  route_id UUID REFERENCES transfer_routes(id) ON DELETE SET NULL,
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50) NOT NULL,
  client_email VARCHAR(255),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  pickup_location TEXT NOT NULL,
  pickup_coordinates JSONB,
  dropoff_location TEXT NOT NULL,
  dropoff_coordinates JSONB,
  pickup_datetime TIMESTAMPTZ NOT NULL,
  dropoff_datetime TIMESTAMPTZ,
  passengers INTEGER NOT NULL CHECK (passengers > 0),
  luggage INTEGER DEFAULT 0,
  special_requests TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'RUB',
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('pending', 'assigned', 'confirmed', 'in_progress', 'completed', 'cancelled', 'delayed')),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'partially_refunded')),
  payment_method VARCHAR(50),
  notes TEXT,
  actual_pickup_time TIMESTAMPTZ,
  actual_dropoff_time TIMESTAMPTZ,
  actual_distance DECIMAL(10,2),
  actual_duration INTEGER,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  cancellation_reason TEXT,
  cancelled_by VARCHAR(50),
  cancelled_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица расписания водителей
CREATE TABLE IF NOT EXISTS driver_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(255),
  transfer_id UUID REFERENCES transfers(id) ON DELETE SET NULL,
  type VARCHAR(50) DEFAULT 'available' CHECK (type IN ('available', 'booked', 'maintenance', 'off', 'sick', 'vacation')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_id, date, start_time)
);

-- Таблица транзакций трансферов
CREATE TABLE IF NOT EXISTS transfer_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('booking', 'refund', 'fuel', 'maintenance', 'driver_payment', 'insurance', 'fine', 'other')),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'RUB',
  description TEXT,
  date DATE NOT NULL,
  transfer_id UUID REFERENCES transfers(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица отзывов о трансферах
CREATE TABLE IF NOT EXISTS transfer_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
  vehicle_rating INTEGER CHECK (vehicle_rating >= 1 AND vehicle_rating <= 5),
  punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  comment TEXT,
  operator_reply TEXT,
  operator_reply_at TIMESTAMPTZ,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(transfer_id, user_id)
);

-- Индексы для transfer tables
CREATE INDEX IF NOT EXISTS idx_vehicles_operator_id ON vehicles(operator_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type);
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles(license_plate);

CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle_id ON vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_status ON vehicle_documents(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_expiry ON vehicle_documents(expiry_date);

CREATE INDEX IF NOT EXISTS idx_drivers_operator_id ON drivers(operator_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_vehicle_id ON drivers(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_drivers_license_number ON drivers(license_number);
CREATE INDEX IF NOT EXISTS idx_drivers_rating ON drivers(rating);

CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id ON driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_status ON driver_documents(status);
CREATE INDEX IF NOT EXISTS idx_driver_documents_expiry ON driver_documents(expiry_date);

CREATE INDEX IF NOT EXISTS idx_transfer_routes_operator_id ON transfer_routes(operator_id);
CREATE INDEX IF NOT EXISTS idx_transfer_routes_is_active ON transfer_routes(is_active);
CREATE INDEX IF NOT EXISTS idx_transfer_routes_popular ON transfer_routes(popular);
CREATE INDEX IF NOT EXISTS idx_transfer_routes_from_to ON transfer_routes(from_location, to_location);

CREATE INDEX IF NOT EXISTS idx_transfers_operator_id ON transfers(operator_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_payment_status ON transfers(payment_status);
CREATE INDEX IF NOT EXISTS idx_transfers_vehicle_id ON transfers(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_transfers_driver_id ON transfers(driver_id);
CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_booking_reference ON transfers(booking_reference);
CREATE INDEX IF NOT EXISTS idx_transfers_pickup_datetime ON transfers(pickup_datetime);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_driver_schedules_driver_id ON driver_schedules(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_schedules_date ON driver_schedules(date);
CREATE INDEX IF NOT EXISTS idx_driver_schedules_transfer_id ON driver_schedules(transfer_id);
CREATE INDEX IF NOT EXISTS idx_driver_schedules_type ON driver_schedules(type);

CREATE INDEX IF NOT EXISTS idx_transfer_transactions_operator_id ON transfer_transactions(operator_id);
CREATE INDEX IF NOT EXISTS idx_transfer_transactions_type ON transfer_transactions(type);
CREATE INDEX IF NOT EXISTS idx_transfer_transactions_date ON transfer_transactions(date);
CREATE INDEX IF NOT EXISTS idx_transfer_transactions_transfer_id ON transfer_transactions(transfer_id);

CREATE INDEX IF NOT EXISTS idx_transfer_reviews_transfer_id ON transfer_reviews(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_reviews_driver_id ON transfer_reviews(driver_id);
CREATE INDEX IF NOT EXISTS idx_transfer_reviews_vehicle_id ON transfer_reviews(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_transfer_reviews_rating ON transfer_reviews(rating);

-- Триггеры для transfer tables
CREATE TRIGGER update_vehicles_updated_at 
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at 
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transfer_routes_updated_at 
  BEFORE UPDATE ON transfer_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transfers_updated_at 
  BEFORE UPDATE ON transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_schedules_updated_at 
  BEFORE UPDATE ON driver_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transfer_reviews_updated_at 
  BEFORE UPDATE ON transfer_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- GUIDE SYSTEM TABLES
-- Added: 2025-11-10
-- ============================================

-- Note: Guide-specific fields added to partners table via migration 010:
-- experience_years, languages, specializations, bio, location, 
-- total_earnings, is_available

-- Guide schedule with conflict detection
CREATE TABLE IF NOT EXISTS guide_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  max_participants INTEGER DEFAULT 10 CHECK (max_participants > 0),
  current_participants INTEGER DEFAULT 0 CHECK (current_participants >= 0),
  location GEOGRAPHY(POINT),
  location_name TEXT,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_overlap EXCLUDE USING GIST (
    guide_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status != 'cancelled')
);

-- Guide reviews and ratings
CREATE TABLE IF NOT EXISTS guide_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  tourist_id UUID REFERENCES users(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  professionalism_rating INTEGER CHECK (professionalism_rating BETWEEN 1 AND 5),
  knowledge_rating INTEGER CHECK (knowledge_rating BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  comment TEXT,
  guide_reply TEXT,
  guide_reply_at TIMESTAMPTZ,
  is_verified BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id, tourist_id)
);

-- Guide certifications and licenses
CREATE TABLE IF NOT EXISTS guide_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuing_authority TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  certificate_number TEXT,
  document_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guide weekly availability patterns
CREATE TABLE IF NOT EXISTS guide_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guide_id, day_of_week, start_time)
);

-- Guide earnings tracking (10% commission)
CREATE TABLE IF NOT EXISTS guide_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 10.0,
  date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  payment_method VARCHAR(50),
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for guide tables
CREATE INDEX IF NOT EXISTS idx_guide_schedule_guide_id ON guide_schedule(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_schedule_start_time ON guide_schedule(start_time);
CREATE INDEX IF NOT EXISTS idx_guide_schedule_status ON guide_schedule(status);
CREATE INDEX IF NOT EXISTS idx_guide_reviews_guide_id ON guide_reviews(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_reviews_rating ON guide_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_guide_certifications_guide_id ON guide_certifications(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_availability_guide_id ON guide_availability(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_earnings_guide_id ON guide_earnings(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_earnings_status ON guide_earnings(status);

-- Triggers for guide tables
CREATE TRIGGER update_guide_schedule_updated_at
  BEFORE UPDATE ON guide_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guide_reviews_updated_at
  BEFORE UPDATE ON guide_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guide_certifications_updated_at
  BEFORE UPDATE ON guide_certifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

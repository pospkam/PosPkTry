-- ============================================
-- GUIDE TABLES - Полная схема для гидов
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
    participants JSONB DEFAULT '[]',
    emergency_contacts JSONB DEFAULT '[]',
    experience_levels JSONB DEFAULT '{}',
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

-- Комментарии
COMMENT ON TABLE guide_schedule IS 'Расписание гидов';
COMMENT ON TABLE guide_groups IS 'Группы участников туров';
COMMENT ON TABLE guide_earnings IS 'Доходы гидов от туров';

\echo '✓ Guide таблицы созданы успешно'

-- GUIDE TABLES - Полная схема для гидов
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
    participants JSONB DEFAULT '[]',
    emergency_contacts JSONB DEFAULT '[]',
    experience_levels JSONB DEFAULT '{}',
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

-- Комментарии
COMMENT ON TABLE guide_schedule IS 'Расписание гидов';
COMMENT ON TABLE guide_groups IS 'Группы участников туров';
COMMENT ON TABLE guide_earnings IS 'Доходы гидов от туров';

\echo '✓ Guide таблицы созданы успешно'

-- GUIDE TABLES - Полная схема для гидов
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
    participants JSONB DEFAULT '[]',
    emergency_contacts JSONB DEFAULT '[]',
    experience_levels JSONB DEFAULT '{}',
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

-- Комментарии
COMMENT ON TABLE guide_schedule IS 'Расписание гидов';
COMMENT ON TABLE guide_groups IS 'Группы участников туров';
COMMENT ON TABLE guide_earnings IS 'Доходы гидов от туров';

\echo '✓ Guide таблицы созданы успешно'

-- GUIDE TABLES - Полная схема для гидов
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
    participants JSONB DEFAULT '[]',
    emergency_contacts JSONB DEFAULT '[]',
    experience_levels JSONB DEFAULT '{}',
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

-- Комментарии
COMMENT ON TABLE guide_schedule IS 'Расписание гидов';
COMMENT ON TABLE guide_groups IS 'Группы участников туров';
COMMENT ON TABLE guide_earnings IS 'Доходы гидов от туров';

\echo '✓ Guide таблицы созданы успешно'






























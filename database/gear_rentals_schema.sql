-- Схема базы данных для аренды снаряжения
-- KamHub - Gear Rentals Schema

-- Таблица заявок на аренду снаряжения
CREATE TABLE IF NOT EXISTS gear_rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gear_id UUID NOT NULL REFERENCES gear(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    days_count INTEGER NOT NULL,
    insurance BOOLEAN NOT NULL DEFAULT false,
    base_price DECIMAL(10,2) NOT NULL,
    insurance_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL,
    comments TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, confirmed, active, completed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_gear_rentals_gear_id ON gear_rentals(gear_id);
CREATE INDEX IF NOT EXISTS idx_gear_rentals_customer_email ON gear_rentals(customer_email);
CREATE INDEX IF NOT EXISTS idx_gear_rentals_status ON gear_rentals(status);
CREATE INDEX IF NOT EXISTS idx_gear_rentals_start_date ON gear_rentals(start_date);
CREATE INDEX IF NOT EXISTS idx_gear_rentals_created_at ON gear_rentals(created_at DESC);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_gear_rentals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gear_rentals_updated_at
    BEFORE UPDATE ON gear_rentals
    FOR EACH ROW
    EXECUTE FUNCTION update_gear_rentals_updated_at();

-- Функция для проверки доступности снаряжения на даты
CREATE OR REPLACE FUNCTION check_gear_availability(
    p_gear_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_quantity INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    total_reserved INTEGER;
BEGIN
    -- Подсчитываем количество уже забронированного снаряжения на указанные даты
    SELECT COALESCE(SUM(quantity), 0) INTO total_reserved
    FROM gear_rentals
    WHERE gear_id = p_gear_id
      AND status IN ('confirmed', 'active')
      AND (
        (start_date <= p_start_date AND end_date >= p_start_date) OR
        (start_date <= p_end_date AND end_date >= p_end_date) OR
        (start_date >= p_start_date AND end_date <= p_end_date)
      );

    -- Получаем общее доступное количество
    RETURN (SELECT available_quantity FROM gear WHERE id = p_gear_id) >= (total_reserved + p_quantity);
END;
$$ LANGUAGE plpgsql;

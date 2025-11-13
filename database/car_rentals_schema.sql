-- Схема базы данных для аренды автомобилей
-- KamHub - Car Rentals Schema

-- Таблица заявок на аренду автомобилей
CREATE TABLE IF NOT EXISTS car_rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    driver_license VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INTEGER NOT NULL,
    pickup_location VARCHAR(255) NOT NULL,
    return_location VARCHAR(255) NOT NULL,
    insurance_type VARCHAR(20) NOT NULL DEFAULT 'basic', -- basic, premium, none
    additional_drivers BOOLEAN NOT NULL DEFAULT false,
    gps BOOLEAN NOT NULL DEFAULT false,
    child_seat BOOLEAN NOT NULL DEFAULT false,
    rental_price DECIMAL(10,2) NOT NULL,
    insurance_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    additional_drivers_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    gps_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    child_seat_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    deposit DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL,
    comments TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, confirmed, active, completed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_car_rentals_car_id ON car_rentals(car_id);
CREATE INDEX IF NOT EXISTS idx_car_rentals_customer_email ON car_rentals(customer_email);
CREATE INDEX IF NOT EXISTS idx_car_rentals_status ON car_rentals(status);
CREATE INDEX IF NOT EXISTS idx_car_rentals_start_date ON car_rentals(start_date);
CREATE INDEX IF NOT EXISTS idx_car_rentals_created_at ON car_rentals(created_at DESC);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_car_rentals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_car_rentals_updated_at
    BEFORE UPDATE ON car_rentals
    FOR EACH ROW
    EXECUTE FUNCTION update_car_rentals_updated_at();

-- Функция для проверки доступности автомобиля на даты
CREATE OR REPLACE FUNCTION check_car_availability(
    p_car_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS BOOLEAN AS $$
DECLARE
    conflicting_bookings INTEGER;
BEGIN
    -- Подсчитываем количество пересекающихся бронирований
    SELECT COUNT(*) INTO conflicting_bookings
    FROM car_rentals
    WHERE car_id = p_car_id
      AND status IN ('confirmed', 'active')
      AND (
        (start_date <= p_start_date AND end_date >= p_start_date) OR
        (start_date <= p_end_date AND end_date >= p_end_date) OR
        (start_date >= p_start_date AND end_date <= p_end_date)
      );

    RETURN conflicting_bookings = 0;
END;
$$ LANGUAGE plpgsql;

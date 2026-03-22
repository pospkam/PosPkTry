-- 019_booking_status_expansion.sql
-- Расширение системы бронирований: новые статусы, логирование, возвраты
-- Дата: 2026-03-03

BEGIN;

-- 1. Расширяем CHECK на статусы в таблице bookings
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
  CHECK (status IN (
    'pending', 
    'confirmed', 
    'completed', 
    'cancelled',
    'cancelled_by_tourist', 
    'cancelled_by_operator', 
    'refunded'
  ));

-- 2. Добавляем новые поля для возвратов и отмены
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id) DEFAULT NULL;

-- 3. Таблица логов бронирований (аудит переходов статусов)
CREATE TABLE IF NOT EXISTS booking_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    from_status VARCHAR(30) NOT NULL,
    to_status VARCHAR(30) NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_logs_booking_id ON booking_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_logs_created_at ON booking_logs(created_at);

-- 4. Индексы для новых полей
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tour_id ON bookings(tour_id);
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_by ON bookings(cancelled_by);

COMMIT;

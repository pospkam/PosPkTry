-- Схема базы данных для заказов сувениров
-- KamHub - Souvenirs Orders Schema

-- Таблица заказов сувениров
CREATE TABLE IF NOT EXISTS souvenir_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    delivery_method VARCHAR(20) NOT NULL DEFAULT 'pickup', -- pickup, delivery
    delivery_address TEXT,
    comments TEXT,
    total_price DECIMAL(10,2) NOT NULL,
    total_items INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, confirmed, processing, shipped, delivered, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица товаров в заказе
CREATE TABLE IF NOT EXISTS souvenir_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES souvenir_orders(id) ON DELETE CASCADE,
    souvenir_id UUID NOT NULL REFERENCES souvenirs(id),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_souvenir_orders_customer_email ON souvenir_orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_souvenir_orders_status ON souvenir_orders(status);
CREATE INDEX IF NOT EXISTS idx_souvenir_orders_created_at ON souvenir_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_souvenir_order_items_order_id ON souvenir_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_souvenir_order_items_souvenir_id ON souvenir_order_items(souvenir_id);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_souvenir_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_souvenir_orders_updated_at
    BEFORE UPDATE ON souvenir_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_souvenir_orders_updated_at();

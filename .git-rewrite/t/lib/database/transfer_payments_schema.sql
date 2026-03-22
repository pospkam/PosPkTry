-- =============================================
-- СХЕМА ДЛЯ ПЛАТЕЖЕЙ ТРАНСФЕРОВ
-- Kamchatour Hub - Transfer Payments Schema
-- =============================================

-- Таблица платежей
CREATE TABLE IF NOT EXISTS transfer_payments (
  id VARCHAR(50) PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES transfer_bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('card', 'wallet', 'bank_transfer')),
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'refunded')),
  cloudpayments_id VARCHAR(100),
  cloudpayments_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  refunded_at TIMESTAMP
);

-- Индексы для transfer_payments
CREATE INDEX idx_transfer_payments_booking_id ON transfer_payments(booking_id);
CREATE INDEX idx_transfer_payments_status ON transfer_payments(status);
CREATE INDEX idx_transfer_payments_created_at ON transfer_payments(created_at);
CREATE INDEX idx_transfer_payments_customer_email ON transfer_payments(customer_email);

-- Таблица комиссий
CREATE TABLE IF NOT EXISTS transfer_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id VARCHAR(50) NOT NULL REFERENCES transfer_payments(id) ON DELETE CASCADE,
  platform_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
  operator_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
  driver_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.15,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для transfer_commissions
CREATE INDEX idx_transfer_commissions_payment_id ON transfer_commissions(payment_id);

-- Таблица возвратов
CREATE TABLE IF NOT EXISTS transfer_refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id VARCHAR(50) NOT NULL REFERENCES transfer_payments(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES transfer_bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  cloudpayments_refund_id VARCHAR(100),
  processed_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Индексы для transfer_refunds
CREATE INDEX idx_transfer_refunds_payment_id ON transfer_refunds(payment_id);
CREATE INDEX idx_transfer_refunds_booking_id ON transfer_refunds(booking_id);
CREATE INDEX idx_transfer_refunds_status ON transfer_refunds(status);

-- Таблица финансовых операций
CREATE TABLE IF NOT EXISTS transfer_financial_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id VARCHAR(50) REFERENCES transfer_payments(id) ON DELETE CASCADE,
  operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('payment', 'refund', 'commission', 'payout')),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
  description TEXT,
  operator_id UUID REFERENCES operators(id),
  driver_id UUID REFERENCES transfer_drivers(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Индексы для transfer_financial_operations
CREATE INDEX idx_transfer_financial_operations_payment_id ON transfer_financial_operations(payment_id);
CREATE INDEX idx_transfer_financial_operations_type ON transfer_financial_operations(operation_type);
CREATE INDEX idx_transfer_financial_operations_status ON transfer_financial_operations(status);
CREATE INDEX idx_transfer_financial_operations_operator_id ON transfer_financial_operations(operator_id);
CREATE INDEX idx_transfer_financial_operations_driver_id ON transfer_financial_operations(driver_id);

-- Представление для полной информации о платежах
CREATE OR REPLACE VIEW transfer_payments_full AS
SELECT 
  p.id,
  p.booking_id,
  p.amount,
  p.currency,
  p.payment_method,
  p.customer_email,
  p.customer_phone,
  p.customer_name,
  p.description,
  p.status,
  p.cloudpayments_id,
  p.cloudpayments_status,
  p.created_at,
  p.updated_at,
  p.processed_at,
  p.refunded_at,
  b.departure_time,
  b.passengers_count,
  b.total_price as booking_total,
  r.from_location,
  r.to_location,
  d.name as driver_name,
  d.phone as driver_phone,
  op.name as operator_name,
  c.platform_commission,
  c.operator_commission,
  c.driver_commission,
  c.total_commission,
  c.net_amount
FROM transfer_payments p
LEFT JOIN transfer_bookings b ON p.booking_id = b.id
LEFT JOIN transfer_routes r ON b.route_id = r.id
LEFT JOIN transfer_drivers d ON b.driver_id = d.id
LEFT JOIN operators op ON b.operator_id = op.id
LEFT JOIN transfer_commissions c ON p.id = c.payment_id;

-- Представление для статистики платежей
CREATE OR REPLACE VIEW transfer_payments_stats AS
SELECT 
  DATE(created_at) as payment_date,
  COUNT(*) as total_payments,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_payments,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
  COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded_payments,
  SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END) as total_amount,
  AVG(CASE WHEN status = 'success' THEN amount ELSE NULL END) as average_amount,
  SUM(platform_commission) as total_platform_commission,
  SUM(operator_commission) as total_operator_commission,
  SUM(driver_commission) as total_driver_commission
FROM transfer_payments_full
GROUP BY DATE(created_at)
ORDER BY payment_date DESC;

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_transfer_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transfer_payments_updated_at
  BEFORE UPDATE ON transfer_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_transfer_payments_updated_at();

-- Триггер для автоматического создания комиссии при успешном платеже
CREATE OR REPLACE FUNCTION create_transfer_commission()
RETURNS TRIGGER AS $$
DECLARE
  commission_rate DECIMAL(5,4) := 0.15;
  platform_comm DECIMAL(10,2);
  operator_comm DECIMAL(10,2);
  driver_comm DECIMAL(10,2);
  total_comm DECIMAL(10,2);
  net_amt DECIMAL(10,2);
BEGIN
  IF NEW.status = 'success' AND OLD.status != 'success' THEN
    platform_comm := NEW.amount * commission_rate;
    operator_comm := NEW.amount * 0.10;
    driver_comm := NEW.amount * 0.75;
    total_comm := platform_comm + operator_comm + driver_comm;
    net_amt := NEW.amount - total_comm;
    
    INSERT INTO transfer_commissions (
      payment_id, platform_commission, operator_commission, 
      driver_commission, total_commission, net_amount, commission_rate
    ) VALUES (
      NEW.id, platform_comm, operator_comm, 
      driver_comm, total_comm, net_amt, commission_rate
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_transfer_commission
  AFTER UPDATE ON transfer_payments
  FOR EACH ROW
  EXECUTE FUNCTION create_transfer_commission();

-- Тестовые данные
INSERT INTO transfer_payments (
  id, booking_id, amount, currency, payment_method,
  customer_email, customer_phone, customer_name, description, status
) VALUES 
(
  'pay_test_1',
  (SELECT id FROM transfer_bookings LIMIT 1),
  1500.00,
  'RUB',
  'card',
  'test@example.com',
  '+7 (999) 123-45-67',
  'Иван Иванов',
  'Оплата трансфера Петропавловск-Камчатский - Елизово',
  'success'
),
(
  'pay_test_2',
  (SELECT id FROM transfer_bookings LIMIT 1 OFFSET 1),
  2500.00,
  'RUB',
  'card',
  'test2@example.com',
  '+7 (999) 234-56-78',
  'Петр Петров',
  'Оплата трансфера Елизово - Петропавловск-Камчатский',
  'pending'
);

-- Комментарии к таблицам
COMMENT ON TABLE transfer_payments IS 'Платежи за трансферы';
COMMENT ON TABLE transfer_commissions IS 'Комиссии по платежам';
COMMENT ON TABLE transfer_refunds IS 'Возвраты платежей';
COMMENT ON TABLE transfer_financial_operations IS 'Финансовые операции';

COMMENT ON COLUMN transfer_payments.amount IS 'Сумма платежа';
COMMENT ON COLUMN transfer_payments.currency IS 'Валюта платежа';
COMMENT ON COLUMN transfer_payments.payment_method IS 'Способ оплаты';
COMMENT ON COLUMN transfer_payments.status IS 'Статус платежа';
COMMENT ON COLUMN transfer_payments.cloudpayments_id IS 'ID платежа в CloudPayments';

COMMENT ON COLUMN transfer_commissions.platform_commission IS 'Комиссия платформы';
COMMENT ON COLUMN transfer_commissions.operator_commission IS 'Комиссия оператора';
COMMENT ON COLUMN transfer_commissions.driver_commission IS 'Комиссия водителя';
COMMENT ON COLUMN transfer_commissions.net_amount IS 'Чистая сумма после комиссий';
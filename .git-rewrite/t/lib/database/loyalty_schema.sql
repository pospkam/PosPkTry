-- =============================================
-- СХЕМА СИСТЕМЫ ЛОЯЛЬНОСТИ
-- Kamchatour Hub - Loyalty System Schema
-- =============================================

-- Таблица транзакций лояльности
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id VARCHAR(50) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'redeem', 'expire', 'refund')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  booking_id UUID REFERENCES transfer_bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Индексы для loyalty_transactions
CREATE INDEX idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);
CREATE INDEX idx_loyalty_transactions_type ON loyalty_transactions(type);
CREATE INDEX idx_loyalty_transactions_created_at ON loyalty_transactions(created_at);
CREATE INDEX idx_loyalty_transactions_expires_at ON loyalty_transactions(expires_at);

-- Таблица промокодов
CREATE TABLE IF NOT EXISTS promo_codes (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER NOT NULL CHECK (max_uses > 0),
  current_uses INTEGER DEFAULT 0 CHECK (current_uses >= 0),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Индексы для promo_codes
CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_is_active ON promo_codes(is_active);
CREATE INDEX idx_promo_codes_expires_at ON promo_codes(expires_at);

-- Таблица использования промокодов
CREATE TABLE IF NOT EXISTS promo_code_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code_id VARCHAR(50) NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES transfer_bookings(id) ON DELETE CASCADE,
  discount_amount DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(promo_code_id, user_id, booking_id)
);

-- Индексы для promo_code_usage
CREATE INDEX idx_promo_code_usage_promo_code_id ON promo_code_usage(promo_code_id);
CREATE INDEX idx_promo_code_usage_user_id ON promo_code_usage(user_id);
CREATE INDEX idx_promo_code_usage_used_at ON promo_code_usage(used_at);

-- Таблица рефералов
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  reward_amount INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  UNIQUE(referrer_id, referred_id)
);

-- Индексы для referrals
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX idx_referrals_status ON referrals(status);

-- Таблица уровней лояльности (справочник)
CREATE TABLE IF NOT EXISTS loyalty_levels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  min_spent DECIMAL(10,2) NOT NULL,
  discount_percentage DECIMAL(5,4) NOT NULL,
  benefits TEXT[],
  color VARCHAR(7),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Вставляем уровни лояльности
INSERT INTO loyalty_levels (name, min_spent, discount_percentage, benefits, color) VALUES
('Новичок', 0.00, 0.0000, ARRAY['Базовые уведомления'], '#6B7280'),
('Бронза', 5000.00, 0.0200, ARRAY['2% скидка', 'Приоритетная поддержка'], '#CD7F32'),
('Серебро', 15000.00, 0.0500, ARRAY['5% скидка', 'Быстрая подача', 'Эксклюзивные предложения'], '#C0C0C0'),
('Золото', 50000.00, 0.1000, ARRAY['10% скидка', 'VIP поддержка', 'Персональный менеджер'], '#FFD700'),
('Платина', 100000.00, 0.1500, ARRAY['15% скидка', 'Максимальный приоритет', 'Эксклюзивные услуги'], '#E5E4E2')
ON CONFLICT DO NOTHING;

-- Представление для статистики лояльности пользователя
CREATE OR REPLACE VIEW user_loyalty_stats AS
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  COALESCE(SUM(CASE WHEN lt.type = 'earn' THEN lt.amount ELSE 0 END), 0) as total_points_earned,
  COALESCE(SUM(CASE WHEN lt.type = 'redeem' THEN lt.amount ELSE 0 END), 0) as total_points_redeemed,
  COALESCE(SUM(CASE WHEN lt.type = 'earn' THEN lt.amount ELSE 0 END), 0) - 
  COALESCE(SUM(CASE WHEN lt.type = 'redeem' THEN lt.amount ELSE 0 END), 0) as available_points,
  COALESCE(SUM(CASE WHEN p.status = 'success' THEN p.amount ELSE 0 END), 0) as total_spent,
  ll.name as current_level,
  ll.discount_percentage as current_discount,
  ll.color as level_color
FROM users u
LEFT JOIN loyalty_transactions lt ON u.id = lt.user_id AND (lt.expires_at IS NULL OR lt.expires_at > NOW())
LEFT JOIN transfer_payments p ON u.email = p.customer_email AND p.status = 'success'
LEFT JOIN loyalty_levels ll ON COALESCE(SUM(CASE WHEN p.status = 'success' THEN p.amount ELSE 0 END), 0) >= ll.min_spent
GROUP BY u.id, u.email, u.name, ll.name, ll.discount_percentage, ll.color
ORDER BY total_spent DESC;

-- Представление для статистики промокодов
CREATE OR REPLACE VIEW promo_code_stats AS
SELECT 
  pc.id,
  pc.code,
  pc.discount_type,
  pc.discount_value,
  pc.max_uses,
  pc.current_uses,
  pc.is_active,
  pc.expires_at,
  COUNT(pcu.id) as times_used,
  COALESCE(SUM(pcu.discount_amount), 0) as total_discount_given
FROM promo_codes pc
LEFT JOIN promo_code_usage pcu ON pc.id = pcu.promo_code_id
GROUP BY pc.id, pc.code, pc.discount_type, pc.discount_value, pc.max_uses, pc.current_uses, pc.is_active, pc.expires_at;

-- Функция для автоматического начисления баллов при успешном платеже
CREATE OR REPLACE FUNCTION auto_earn_loyalty_points()
RETURNS TRIGGER AS $$
DECLARE
  user_id_val UUID;
  points_to_earn INTEGER;
  transaction_id VARCHAR(50);
  expires_at_val TIMESTAMP;
BEGIN
  -- Получаем ID пользователя по email
  SELECT id INTO user_id_val FROM users WHERE email = NEW.customer_email;
  
  IF user_id_val IS NOT NULL AND NEW.status = 'success' AND OLD.status != 'success' THEN
    -- Рассчитываем баллы (1% от суммы)
    points_to_earn := FLOOR(NEW.amount * 0.01);
    
    -- Генерируем ID транзакции
    transaction_id := 'loyalty_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 9);
    
    -- Устанавливаем срок действия баллов (1 год)
    expires_at_val := NOW() + INTERVAL '1 year';
    
    -- Создаем транзакцию начисления баллов
    INSERT INTO loyalty_transactions (
      id, user_id, type, amount, description, booking_id, expires_at
    ) VALUES (
      transaction_id, user_id_val, 'earn', points_to_earn, 
      'Начислено ' || points_to_earn || ' баллов за заказ на сумму ' || NEW.amount || ' руб.',
      NEW.booking_id, expires_at_val
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического начисления баллов
CREATE TRIGGER trigger_auto_earn_loyalty_points
  AFTER UPDATE ON transfer_payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_earn_loyalty_points();

-- Функция для очистки истекших баллов
CREATE OR REPLACE FUNCTION cleanup_expired_points()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Помечаем истекшие баллы как expired
  UPDATE loyalty_transactions 
  SET type = 'expire' 
  WHERE type = 'earn' 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW()
    AND type != 'expire';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Комментарии к таблицам
COMMENT ON TABLE loyalty_transactions IS 'Транзакции системы лояльности';
COMMENT ON TABLE promo_codes IS 'Промокоды и скидки';
COMMENT ON TABLE promo_code_usage IS 'Использование промокодов';
COMMENT ON TABLE referrals IS 'Реферальная программа';
COMMENT ON TABLE loyalty_levels IS 'Уровни лояльности';

COMMENT ON COLUMN loyalty_transactions.type IS 'Тип транзакции: earn, redeem, expire, refund';
COMMENT ON COLUMN loyalty_transactions.amount IS 'Количество баллов';
COMMENT ON COLUMN loyalty_transactions.expires_at IS 'Срок действия баллов';

COMMENT ON COLUMN promo_codes.discount_type IS 'Тип скидки: percentage или fixed';
COMMENT ON COLUMN promo_codes.discount_value IS 'Значение скидки';
COMMENT ON COLUMN promo_codes.max_uses IS 'Максимальное количество использований';
COMMENT ON COLUMN promo_codes.current_uses IS 'Текущее количество использований';
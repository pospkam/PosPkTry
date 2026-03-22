-- Миграция: добавление юридических полей для партнеров
-- Дата: 2025-02-02

-- Добавляем новые поля в таблицу partners
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS legal_info JSONB,
ADD COLUMN IF NOT EXISTS bank_details JSONB,
ADD COLUMN IF NOT EXISTS consents JSONB,
ADD COLUMN IF NOT EXISTS operator_info JSONB,
ADD COLUMN IF NOT EXISTS roles JSONB,
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected'));

-- Комментарии к полям
COMMENT ON COLUMN partners.legal_info IS 'Юридические данные: businessType, companyName, inn, ogrn, kpp, addresses';
COMMENT ON COLUMN partners.bank_details IS 'Банковские реквизиты: bankName, bik, correspondentAccount, checkingAccount';
COMMENT ON COLUMN partners.consents IS 'Согласия: personalData, userAgreement, offer, commission, notifications';
COMMENT ON COLUMN partners.operator_info IS 'Данные туроператора: tourRegistryNumber, hasFinancialGuarantee';
COMMENT ON COLUMN partners.roles IS 'Массив ролей партнера: operator, transfer, stay, gear, guide';
COMMENT ON COLUMN partners.status IS 'Статус партнера: pending, active, suspended, rejected';

-- Создаем таблицу аудита для 152-ФЗ
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    data JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

COMMENT ON TABLE audit_log IS 'Журнал аудита для соответствия 152-ФЗ';

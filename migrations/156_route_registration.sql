-- migrations/156_route_registration.sql
-- Самостоятельная регистрация маршрута туристом (без оператора)
-- Помощник подачи заявки в МЧС — генерирует PDF, даёт инструкции

CREATE TABLE IF NOT EXISTS route_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Информация о маршруте
  route_name TEXT NOT NULL,
  route_description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  region TEXT NOT NULL DEFAULT 'Камчатский край',

  -- Группа
  group_size INTEGER NOT NULL CHECK (group_size BETWEEN 1 AND 30),
  group_members JSONB, -- [{name, phone, birth_year}]

  -- Руководитель
  leader_name TEXT NOT NULL,
  leader_phone TEXT NOT NULL,
  leader_email TEXT,

  -- Экстренный контакт (кто получает уведомления)
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  emergency_contact_relation TEXT,
  emergency_contact_telegram_chat_id BIGINT,
  emergency_contact_email TEXT,

  -- Согласие контакта на уведомления
  emergency_contact_consent BOOLEAN DEFAULT false,
  emergency_contact_consent_at TIMESTAMPTZ,

  -- Статус
  mchs_status VARCHAR(20) DEFAULT 'not_submitted'
    CHECK (mchs_status IN ('not_submitted', 'submitted', 'confirmed', 'rejected')),
  mchs_reference TEXT,
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_registrations_user_id
  ON route_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_route_registrations_start_date
  ON route_registrations(start_date);
CREATE INDEX IF NOT EXISTS idx_route_registrations_end_date
  ON route_registrations(end_date);
CREATE INDEX IF NOT EXISTS idx_route_registrations_mchs_status
  ON route_registrations(mchs_status);
CREATE INDEX IF NOT EXISTS idx_route_registrations_escalation
  ON route_registrations(completed_at, end_date)
  WHERE completed_at IS NULL;

-- Лог отправленных уведомлений
CREATE TABLE IF NOT EXISTS route_registration_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES route_registrations(id) ON DELETE CASCADE,
  step INTEGER NOT NULL CHECK (step BETWEEN 1 AND 4),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('telegram', 'email', 'max')),
  recipient TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_notifications_reg_id
  ON route_registration_notifications(registration_id);

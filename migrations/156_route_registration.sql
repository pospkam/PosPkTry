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

  -- Статус
  mchs_status VARCHAR(20) DEFAULT 'not_submitted'
    CHECK (mchs_status IN ('not_submitted', 'submitted', 'confirmed', 'rejected')),
  mchs_reference TEXT,
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT false,

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
CREATE INDEX IF NOT EXISTS idx_route_registrations_reminder
  ON route_registrations(reminder_sent, end_date)
  WHERE reminder_sent = false;

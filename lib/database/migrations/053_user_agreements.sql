-- User agreements tracking
-- Версионирование согласий: каждый раз когда документ меняется — новая версия

CREATE TABLE IF NOT EXISTS user_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Тип документа: 'tos', 'privacy', 'content_consent', 'sos_waiver'
  agreement_type VARCHAR(50) NOT NULL,
  
  -- Версия документа (мат. версионирование)
  document_version INT NOT NULL,
  
  -- Статус: 'accepted', 'declined', 'pending', 'expired'
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  
  -- IP адрес при принятии (для аудита)
  accepted_ip_address INET,
  user_agent TEXT,
  
  -- Дата принятия
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, agreement_type, document_version)
);

-- Operator-specific agreements
CREATE TABLE IF NOT EXISTS operator_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  
  agreement_type VARCHAR(50) NOT NULL, -- 'operator_tos', 'content_rights', 'parsing_consent'
  document_version INT NOT NULL,
  
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  
  -- Детали
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_ip_address INET,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(partner_id, agreement_type, document_version)
);

-- Content parsing & publication consent
CREATE TABLE IF NOT EXISTS content_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  
  -- Что разрешено: true/false
  allow_parsing_website BOOLEAN DEFAULT FALSE,
  allow_parsing_images BOOLEAN DEFAULT FALSE,
  allow_parsing_reviews BOOLEAN DEFAULT FALSE,
  allow_publication_tourhab BOOLEAN DEFAULT FALSE,
  allow_publication_partners BOOLEAN DEFAULT FALSE,
  allow_publication_social_media BOOLEAN DEFAULT FALSE,
  
  -- Лимиты (если есть)
  content_usage_limit VARCHAR(100), -- 'unlimited', 'russian_market_only', 'exclude_competitors'
  
  -- Когда согласие изменилось
  consent_version INT NOT NULL DEFAULT 1,
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(partner_id)
);

-- Audit trail: все согласия, даты, версии
CREATE TABLE IF NOT EXISTS agreement_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  
  action VARCHAR(50), -- 'accepted', 'declined', 'version_updated', 'expired'
  agreement_type VARCHAR(50),
  document_version INT,
  
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_agreements_user ON user_agreements(user_id);
CREATE INDEX idx_user_agreements_type ON user_agreements(agreement_type);
CREATE INDEX idx_operator_agreements_partner ON operator_agreements(partner_id);
CREATE INDEX idx_content_consents_partner ON content_consents(partner_id);
CREATE INDEX idx_audit_log_user ON agreement_audit_log(user_id);

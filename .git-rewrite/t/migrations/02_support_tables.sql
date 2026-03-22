-- migrations/02_support_tables.sql
-- Support Pillar database schema

-- ============================================================================
-- SUPPORT AGENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_agents (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
    team VARCHAR(100),
    specialization TEXT[] DEFAULT '{}',
    active_tickets INTEGER DEFAULT 0 CHECK (active_tickets >= 0),
    total_tickets_resolved INTEGER DEFAULT 0 CHECK (total_tickets_resolved >= 0),
    average_resolution_time NUMERIC(10,2) DEFAULT 0,
    customer_satisfaction_score NUMERIC(3,2) DEFAULT 5.0,
    timezone VARCHAR(50) DEFAULT 'UTC',
    working_hours_start VARCHAR(5),
    working_hours_end VARCHAR(5),
    max_concurrent_tickets INTEGER DEFAULT 5 CHECK (max_concurrent_tickets >= 1 AND max_concurrent_tickets <= 50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_agents_email (email),
    INDEX idx_agents_status (status),
    INDEX idx_agents_specialization (specialization)
);

-- ============================================================================
-- TICKETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tickets (
    id BIGSERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (
        status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'reopened', 'on_hold')
    ),
    priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (
        priority IN ('low', 'medium', 'high', 'urgent', 'critical')
    ),
    category VARCHAR(100),
    customer_id BIGINT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    agent_id BIGINT REFERENCES support_agents(id) ON DELETE SET NULL,
    assigned_to VARCHAR(255),
    assigned_to_team VARCHAR(100),
    related_booking_id BIGINT,
    related_order_id BIGINT,
    attachments TEXT,
    tags TEXT[] DEFAULT '{}',
    first_response_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_tickets_number (ticket_number),
    INDEX idx_tickets_status (status),
    INDEX idx_tickets_priority (priority),
    INDEX idx_tickets_customer_email (customer_email),
    INDEX idx_tickets_agent_id (agent_id),
    INDEX idx_tickets_created_at (created_at),
    INDEX idx_tickets_resolved_at (resolved_at)
);

-- ============================================================================
-- TICKET MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ticket_messages (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sender_id VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    sender_type VARCHAR(50) NOT NULL DEFAULT 'customer' CHECK (sender_type IN ('customer', 'agent', 'system')),
    message TEXT NOT NULL,
    attachments TEXT,
    is_internal BOOLEAN DEFAULT FALSE,
    rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    rating_comment VARCHAR(1000),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_messages_ticket_id (ticket_id),
    INDEX idx_messages_sender_type (sender_type),
    INDEX idx_messages_created_at (created_at)
);

-- ============================================================================
-- KNOWLEDGE BASE TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS knowledge_base_articles (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    content_search TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('russian', COALESCE(title, '') || ' ' || COALESCE(content, ''))
    ) STORED,
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    author VARCHAR(255),
    views INTEGER DEFAULT 0 CHECK (views >= 0),
    helpful INTEGER DEFAULT 0 CHECK (helpful >= 0),
    unhelpful INTEGER DEFAULT 0 CHECK (unhelpful >= 0),
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_articles_category (category),
    INDEX idx_articles_is_published (is_published),
    INDEX idx_articles_created_at (created_at),
    INDEX idx_articles_search ON knowledge_base_articles USING GIN(content_search)
);

CREATE TABLE IF NOT EXISTS faqs (
    id BIGSERIAL PRIMARY KEY,
    question VARCHAR(500) NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100),
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 100),
    views INTEGER DEFAULT 0 CHECK (views >= 0),
    helpful INTEGER DEFAULT 0 CHECK (helpful >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_faqs_category (category),
    INDEX idx_faqs_priority (priority),
    INDEX idx_faqs_created_at (created_at)
);

-- ============================================================================
-- FEEDBACK & SURVEYS
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT REFERENCES tickets(id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL,
    agent_id BIGINT REFERENCES support_agents(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment VARCHAR(1000),
    response_time_rating INTEGER CHECK (response_time_rating IS NULL OR (response_time_rating >= 1 AND response_time_rating <= 5)),
    resolution_rating INTEGER CHECK (resolution_rating IS NULL OR (resolution_rating >= 1 AND resolution_rating <= 5)),
    professionalism_rating INTEGER CHECK (professionalism_rating IS NULL OR (professionalism_rating >= 1 AND professionalism_rating <= 5)),
    knowledge_rating INTEGER CHECK (knowledge_rating IS NULL OR (knowledge_rating >= 1 AND knowledge_rating <= 5)),
    would_recommend BOOLEAN DEFAULT FALSE,
    follow_up_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_feedback_ticket_id (ticket_id),
    INDEX idx_feedback_customer_id (customer_id),
    INDEX idx_feedback_agent_id (agent_id),
    INDEX idx_feedback_rating (rating),
    INDEX idx_feedback_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS surveys (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    support_quality_rating INTEGER CHECK (support_quality_rating IS NULL OR (support_quality_rating >= 1 AND support_quality_rating <= 5)),
    response_time_rating INTEGER CHECK (response_time_rating IS NULL OR (response_time_rating >= 1 AND response_time_rating <= 5)),
    resolution_rating INTEGER CHECK (resolution_rating IS NULL OR (resolution_rating >= 1 AND resolution_rating <= 5)),
    comment VARCHAR(2000),
    email VARCHAR(255),
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_surveys_customer_id (customer_id),
    INDEX idx_surveys_overall_rating (overall_rating),
    INDEX idx_surveys_completed_at (completed_at)
);

-- ============================================================================
-- SLA TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS sla_policies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    priority VARCHAR(50),
    first_response_time_hours INTEGER NOT NULL DEFAULT 4 CHECK (first_response_time_hours > 0 AND first_response_time_hours <= 168),
    resolution_time_hours INTEGER NOT NULL DEFAULT 24 CHECK (resolution_time_hours > 0 AND resolution_time_hours <= 720),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_sla_policies_category (category),
    INDEX idx_sla_policies_priority (priority),
    INDEX idx_sla_policies_active (active)
);

CREATE TABLE IF NOT EXISTS sla_violations (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    violation_type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_violation UNIQUE (ticket_id, violation_type),
    INDEX idx_violations_ticket_id (ticket_id),
    INDEX idx_violations_type (violation_type),
    INDEX idx_violations_acknowledged (acknowledged),
    INDEX idx_violations_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS sla_notifications (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
    retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
    last_retry_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_notifications_ticket_id (ticket_id),
    INDEX idx_notifications_status (status),
    INDEX idx_notifications_created_at (created_at)
);

-- ============================================================================
-- INSERT DEFAULT SLA POLICY
-- ============================================================================
INSERT INTO sla_policies (name, category, priority, first_response_time_hours, resolution_time_hours, active)
VALUES ('Default SLA Policy', NULL, NULL, 4, 24, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE TIMESTAMPS TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Attach trigger to all tables with updated_at
CREATE TRIGGER update_support_agents_timestamp BEFORE UPDATE ON support_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_timestamp BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_messages_timestamp BEFORE UPDATE ON ticket_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_articles_timestamp BEFORE UPDATE ON knowledge_base_articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faqs_timestamp BEFORE UPDATE ON faqs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_timestamp BEFORE UPDATE ON feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_surveys_timestamp BEFORE UPDATE ON surveys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sla_policies_timestamp BEFORE UPDATE ON sla_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sla_notifications_timestamp BEFORE UPDATE ON sla_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

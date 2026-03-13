-- Migration 028: Chat system (conversations between platform users)
-- Tables: conversations, conversation_participants, conversation_messages

-- 1. Conversations (threads between users)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL DEFAULT 'direct',
  subject VARCHAR(255),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  tour_id INTEGER REFERENCES tours(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  is_muted BOOLEAN DEFAULT FALSE,
  consent_given BOOLEAN DEFAULT TRUE,
  UNIQUE(conversation_id, user_id)
);

-- 3. Messages
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  attachments JSONB DEFAULT '[]',
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_messages_conv ON conversation_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_messages_sender ON conversation_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversations_booking ON conversations(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);

COMMENT ON TABLE conversations IS 'Chat conversations between platform users (tourist, operator, guide, admin)';
COMMENT ON TABLE conversation_participants IS 'Participants of each conversation with per-user read tracking';
COMMENT ON TABLE conversation_messages IS 'Messages within conversations';
COMMENT ON COLUMN conversation_participants.consent_given IS '152-FZ: user consent for personal data in messages';
COMMENT ON COLUMN conversation_participants.last_read_at IS 'Timestamp of last read - messages after this are unread';

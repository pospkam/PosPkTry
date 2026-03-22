-- Migration 025: Indexes on core tables (tours, users, support)
-- These tables are frequently queried but had no indexes on key columns.

-- tours: operator dashboard filters by operator_id
CREATE INDEX IF NOT EXISTS idx_tours_operator_id ON tours(operator_id);

-- tours: category filtering on public listings
CREATE INDEX IF NOT EXISTS idx_tours_category ON tours(category);

-- tours: status filtering (published / draft)
CREATE INDEX IF NOT EXISTS idx_tours_status ON tours(status);

-- users: role-based lookups (admin panel, role counts)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- users: login / lookup by email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- support_tickets: agent assignment lookups
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);

-- support_tickets: status filtering
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- support_tickets: user's own tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);

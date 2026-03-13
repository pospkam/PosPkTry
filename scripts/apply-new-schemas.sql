-- apply-new-schemas.sql
-- Применяет все миграции БД в порядке нумерации.
-- Запуск: psql $DATABASE_URL -f scripts/apply-new-schemas.sql
-- Все миграции идемпотентны (используют IF NOT EXISTS).

\ir ../lib/database/migrations/001_update_roles.sql
\ir ../lib/database/migrations/002_add_password_hash.sql
\ir ../lib/database/migrations/003_link_users_partners.sql
\ir ../lib/database/migrations/004_fix_bookings_schema.sql
\ir ../lib/database/migrations/005_add_notifications.sql
\ir ../lib/database/migrations/006_add_operator_tables.sql
\ir ../lib/database/migrations/006_add_password_hash_to_users.sql
\ir ../lib/database/migrations/007_add_user_id_to_partners.sql
\ir ../lib/database/migrations/007_booking_notifications_trigger.sql
\ir ../lib/database/migrations/008_transfer_system_tables.sql
\ir ../lib/database/migrations/009_transfer_notifications.sql
\ir ../lib/database/migrations/010_add_guide_fields.sql
\ir ../lib/database/migrations/011_create_guide_tables.sql
\ir ../lib/database/migrations/012_create_gear_system.sql
\ir ../lib/database/migrations/013_create_cars_system.sql
\ir ../lib/database/migrations/014_create_souvenir_system.sql
\ir ../lib/database/migrations/015_create_tourist_system.sql
\ir ../lib/database/migrations/016_add_tour_category.sql
\ir ../lib/database/migrations/017_create_mchs_and_transfer_booking.sql
\ir ../lib/database/migrations/018_create_agent_route_knowledge.sql
\ir ../lib/database/migrations/019_create_kamchatka_routes_api_views.sql
\ir ../lib/database/migrations/020_create_sos_events.sql
\ir ../lib/database/migrations/021_create_chat_sessions.sql
\ir ../lib/database/migrations/022_alter_chat_sessions_add_columns.sql
\ir ../lib/database/migrations/add_partner_legal_fields.sql
\ir ../lib/database/migrations/fix_tours_schema.sql
\ir ../lib/database/migrations/023_add_route_id_to_tours.sql
\ir ../lib/database/migrations/024_create_kamchatka_routes.sql
\ir ../lib/database/migrations/025_add_embedding_to_agent_routes.sql
\ir ../lib/database/migrations/030_add_phone_to_users.sql

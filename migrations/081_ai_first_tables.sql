/**
 * Migration 081: AI-First Platform Tables
 * Reference tours and composite bookings for AI composition engine
 */

-- reference_tours: Minimal, reusable tour components
CREATE TABLE IF NOT EXISTS reference_tours (
  id SERIAL PRIMARY KEY,
  operator_id INT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,

  activity_type VARCHAR(50) NOT NULL,
  zone VARCHAR(50) NOT NULL,

  price_per_person DECIMAL(10,2) NOT NULL,
  duration_hours INT NOT NULL,
  max_participants INT NOT NULL,

  description TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reference_tours_activity ON reference_tours(activity_type);
CREATE INDEX idx_reference_tours_zone ON reference_tours(zone);
CREATE INDEX idx_reference_tours_operator ON reference_tours(operator_id);


-- composite_bookings: Multi-activity bookings created by AI composition
CREATE TABLE IF NOT EXISTS composite_bookings (
  id SERIAL PRIMARY KEY,
  tourist_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  reference_tour_ids INT[] NOT NULL,

  itinerary JSONB NOT NULL,
  total_cost DECIMAL(12,2) NOT NULL,

  status VARCHAR(50) DEFAULT 'pending',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_composite_bookings_tourist ON composite_bookings(tourist_id);
CREATE INDEX idx_composite_bookings_status ON composite_bookings(status);

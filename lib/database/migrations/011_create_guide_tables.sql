-- Migration: Create Guide System Tables
-- Date: 2025-11-10
-- Purpose: Guide schedule, reviews, and certifications management

-- ============================================
-- GUIDE SCHEDULE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS guide_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  max_participants INTEGER DEFAULT 10 CHECK (max_participants > 0),
  current_participants INTEGER DEFAULT 0 CHECK (current_participants >= 0),
  location GEOGRAPHY(POINT),
  location_name TEXT,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent overlapping schedules for same guide
  CONSTRAINT no_overlap EXCLUDE USING GIST (
    guide_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status != 'cancelled')
);

-- ============================================
-- GUIDE REVIEWS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS guide_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  tourist_id UUID REFERENCES users(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  professionalism_rating INTEGER CHECK (professionalism_rating BETWEEN 1 AND 5),
  knowledge_rating INTEGER CHECK (knowledge_rating BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  comment TEXT,
  guide_reply TEXT,
  guide_reply_at TIMESTAMPTZ,
  is_verified BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- One review per booking per tourist
  UNIQUE(booking_id, tourist_id)
);

-- ============================================
-- GUIDE CERTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS guide_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuing_authority TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  certificate_number TEXT,
  document_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GUIDE AVAILABILITY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS guide_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guide_id, day_of_week, start_time)
);

-- ============================================
-- GUIDE EARNINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS guide_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 10.0, -- 10% default
  date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  payment_method VARCHAR(50),
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Guide schedule indexes
CREATE INDEX IF NOT EXISTS idx_guide_schedule_guide_id ON guide_schedule(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_schedule_start_time ON guide_schedule(start_time);
CREATE INDEX IF NOT EXISTS idx_guide_schedule_status ON guide_schedule(status);
CREATE INDEX IF NOT EXISTS idx_guide_schedule_tour_id ON guide_schedule(tour_id);
CREATE INDEX IF NOT EXISTS idx_guide_schedule_booking_id ON guide_schedule(booking_id);

-- Guide reviews indexes
CREATE INDEX IF NOT EXISTS idx_guide_reviews_guide_id ON guide_reviews(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_reviews_tourist_id ON guide_reviews(tourist_id);
CREATE INDEX IF NOT EXISTS idx_guide_reviews_rating ON guide_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_guide_reviews_created_at ON guide_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guide_reviews_is_public ON guide_reviews(is_public);

-- Guide certifications indexes
CREATE INDEX IF NOT EXISTS idx_guide_certifications_guide_id ON guide_certifications(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_certifications_expiry ON guide_certifications(expiry_date);
CREATE INDEX IF NOT EXISTS idx_guide_certifications_verified ON guide_certifications(is_verified);

-- Guide availability indexes
CREATE INDEX IF NOT EXISTS idx_guide_availability_guide_id ON guide_availability(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_availability_day ON guide_availability(day_of_week);

-- Guide earnings indexes
CREATE INDEX IF NOT EXISTS idx_guide_earnings_guide_id ON guide_earnings(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_earnings_date ON guide_earnings(date);
CREATE INDEX IF NOT EXISTS idx_guide_earnings_status ON guide_earnings(status);
CREATE INDEX IF NOT EXISTS idx_guide_earnings_booking_id ON guide_earnings(booking_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_guide_schedule_updated_at
  BEFORE UPDATE ON guide_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guide_reviews_updated_at
  BEFORE UPDATE ON guide_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guide_certifications_updated_at
  BEFORE UPDATE ON guide_certifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Update guide rating after review
-- ============================================

CREATE OR REPLACE FUNCTION update_guide_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE partners
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM guide_reviews
      WHERE guide_id = NEW.guide_id AND is_public = TRUE
    ),
    review_count = (
      SELECT COUNT(*)
      FROM guide_reviews
      WHERE guide_id = NEW.guide_id AND is_public = TRUE
    )
  WHERE id = NEW.guide_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_guide_rating
  AFTER INSERT OR UPDATE ON guide_reviews
  FOR EACH ROW
  WHEN (NEW.is_public = TRUE)
  EXECUTE FUNCTION update_guide_rating();

-- ============================================
-- FUNCTION: Update guide earnings
-- ============================================

CREATE OR REPLACE FUNCTION update_guide_earnings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    UPDATE partners
    SET total_earnings = total_earnings + NEW.amount
    WHERE id = NEW.guide_id;
  ELSIF OLD.status = 'paid' AND NEW.status != 'paid' THEN
    UPDATE partners
    SET total_earnings = total_earnings - OLD.amount
    WHERE id = NEW.guide_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_guide_earnings
  AFTER INSERT OR UPDATE ON guide_earnings
  FOR EACH ROW
  EXECUTE FUNCTION update_guide_earnings();

-- ============================================
-- FUNCTION: Notify guide of new review
-- ============================================

CREATE OR REPLACE FUNCTION notify_guide_new_review()
RETURNS TRIGGER AS $$
DECLARE
  guide_user_id UUID;
BEGIN
  -- Get guide's user_id
  SELECT user_id INTO guide_user_id
  FROM partners
  WHERE id = NEW.guide_id;
  
  IF guide_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, data, priority)
    VALUES (
      guide_user_id,
      'guide_review',
      CASE 
        WHEN NEW.rating >= 4 THEN 'Новый положительный отзыв'
        WHEN NEW.rating = 3 THEN 'Новый отзыв'
        ELSE 'Новый негативный отзыв'
      END,
      'Получен отзыв с оценкой ' || NEW.rating || '/5',
      jsonb_build_object(
        'reviewId', NEW.id,
        'rating', NEW.rating,
        'bookingId', NEW.booking_id
      ),
      CASE 
        WHEN NEW.rating <= 2 THEN 'high'
        ELSE 'medium'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_guide_new_review
  AFTER INSERT ON guide_reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_guide_new_review();

-- ============================================
-- FUNCTION: Check schedule conflicts
-- ============================================

CREATE OR REPLACE FUNCTION check_schedule_conflicts(
  p_guide_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM guide_schedule
  WHERE guide_id = p_guide_id
    AND status != 'cancelled'
    AND (id IS DISTINCT FROM p_exclude_id)
    AND tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time);
  
  RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE guide_schedule IS 'Guide scheduling with conflict detection';
COMMENT ON TABLE guide_reviews IS 'Tourist reviews and ratings for guides';
COMMENT ON TABLE guide_certifications IS 'Professional certifications and licenses';
COMMENT ON TABLE guide_availability IS 'Weekly availability patterns';
COMMENT ON TABLE guide_earnings IS 'Financial tracking for guide commissions';

COMMENT ON CONSTRAINT no_overlap ON guide_schedule IS 'Prevents overlapping schedules for same guide';
COMMENT ON FUNCTION check_schedule_conflicts IS 'Returns TRUE if no conflicts exist for given time range';

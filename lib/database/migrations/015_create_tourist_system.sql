-- Migration: Tourist System
-- Date: 2025-11-10
-- Purpose: Complete tourist system with profile, documents, trips, wishlist, achievements

-- ============================================
-- TOURIST PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS tourist_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  date_of_birth DATE,
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  nationality VARCHAR(100),
  phone VARCHAR(50),
  phone_verified BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  bio TEXT,
  languages TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  fitness_level VARCHAR(20) CHECK (fitness_level IN ('low', 'medium', 'high', 'very_high')),
  dietary_restrictions TEXT[] DEFAULT '{}',
  medical_conditions TEXT,
  allergies TEXT,
  experience_level VARCHAR(20) CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  preferred_group_size VARCHAR(20) CHECK (preferred_group_size IN ('solo', 'small', 'medium', 'large', 'any')),
  budget_range VARCHAR(20) CHECK (budget_range IN ('budget', 'moderate', 'comfort', 'luxury', 'any')),
  preferred_seasons TEXT[] DEFAULT '{}',
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  emergency_contact_relation VARCHAR(100),
  home_address TEXT,
  home_city VARCHAR(100),
  home_country VARCHAR(100),
  home_postal_code VARCHAR(20),
  travel_insurance_provider VARCHAR(255),
  travel_insurance_policy VARCHAR(100),
  travel_insurance_expiry DATE,
  loyalty_points INTEGER DEFAULT 0 CHECK (loyalty_points >= 0),
  loyalty_tier VARCHAR(20) DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  total_trips INTEGER DEFAULT 0 CHECK (total_trips >= 0),
  total_spent DECIMAL(12,2) DEFAULT 0.0 CHECK (total_spent >= 0),
  average_rating DECIMAL(3,2) DEFAULT 5.0 CHECK (average_rating >= 0 AND average_rating <= 5),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_documents JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TOURIST DOCUMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS tourist_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tourist_id UUID NOT NULL REFERENCES tourist_profiles(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('passport', 'visa', 'insurance', 'vaccination', 'permit', 'license', 'other')),
  document_number VARCHAR(100),
  issuing_country VARCHAR(100),
  issuing_authority VARCHAR(255),
  issue_date DATE,
  expiry_date DATE,
  file_url TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  notes TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_expiry_after_issue CHECK (expiry_date IS NULL OR issue_date IS NULL OR expiry_date > issue_date)
);

-- ============================================
-- TOURIST TRIPS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS tourist_trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tourist_id UUID NOT NULL REFERENCES tourist_profiles(id) ON DELETE CASCADE,
  trip_name VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'upcoming', 'active', 'completed', 'cancelled')),
  trip_type VARCHAR(50) CHECK (trip_type IN ('leisure', 'adventure', 'business', 'family', 'solo', 'group', 'educational')),
  budget DECIMAL(10,2) CHECK (budget >= 0),
  actual_spent DECIMAL(10,2) DEFAULT 0.0 CHECK (actual_spent >= 0),
  participants INTEGER DEFAULT 1 CHECK (participants > 0),
  itinerary JSONB DEFAULT '[]',
  notes TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_trip_dates CHECK (end_date >= start_date)
);

-- ============================================
-- TRIP BOOKINGS LINK TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS trip_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES tourist_trips(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  booking_type VARCHAR(50) NOT NULL CHECK (booking_type IN ('tour', 'accommodation', 'transfer', 'car_rental', 'gear_rental', 'souvenir', 'other')),
  order_index INTEGER DEFAULT 0,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, booking_id)
);

-- ============================================
-- TOURIST WISHLIST TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS tourist_wishlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tourist_id UUID NOT NULL REFERENCES tourist_profiles(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('tour', 'accommodation', 'partner', 'destination', 'activity')),
  item_id UUID NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notes TEXT,
  notify_on_discount BOOLEAN DEFAULT FALSE,
  notify_on_availability BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tourist_id, item_type, item_id)
);

-- ============================================
-- TOURIST ACHIEVEMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS tourist_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tourist_id UUID NOT NULL REFERENCES tourist_profiles(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL CHECK (achievement_type IN (
    'first_trip', 'trips_5', 'trips_10', 'trips_25', 'trips_50', 'trips_100',
    'volcanoes_visited', 'bears_seen', 'hot_springs_visited',
    'winter_explorer', 'summer_adventurer', 'photographer', 'reviewer',
    'early_bird', 'big_spender', 'budget_traveler', 'group_leader',
    'solo_traveler', 'family_oriented', 'extreme_seeker', 'cultural_enthusiast'
  )),
  achievement_name VARCHAR(255) NOT NULL,
  achievement_description TEXT,
  icon_url TEXT,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  points_earned INTEGER DEFAULT 0 CHECK (points_earned >= 0),
  metadata JSONB DEFAULT '{}',
  is_displayed BOOLEAN DEFAULT TRUE,
  UNIQUE(tourist_id, achievement_type)
);

-- ============================================
-- TOURIST CHECKLIST TEMPLATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS checklist_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('general', 'winter', 'summer', 'hiking', 'volcano', 'fishing', 'photography', 'family', 'extreme')),
  items JSONB NOT NULL DEFAULT '[]',
  is_public BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TOURIST CHECKLISTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS tourist_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tourist_id UUID NOT NULL REFERENCES tourist_profiles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES tourist_trips(id) ON DELETE CASCADE,
  template_id UUID REFERENCES checklist_templates(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  completed_items INTEGER DEFAULT 0 CHECK (completed_items >= 0),
  total_items INTEGER DEFAULT 0 CHECK (total_items >= 0),
  completion_percentage INTEGER GENERATED ALWAYS AS (
    CASE WHEN total_items > 0 THEN (completed_items * 100 / total_items) ELSE 0 END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TOURIST REVIEWS TABLE (unified)
-- ============================================

CREATE TABLE IF NOT EXISTS tourist_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tourist_id UUID NOT NULL REFERENCES tourist_profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  review_type VARCHAR(50) NOT NULL CHECK (review_type IN ('tour', 'guide', 'transfer', 'accommodation', 'restaurant', 'souvenir', 'gear', 'car', 'general')),
  target_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  service_rating INTEGER CHECK (service_rating BETWEEN 1 AND 5),
  value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  title VARCHAR(255),
  comment TEXT NOT NULL,
  pros TEXT,
  cons TEXT,
  tips TEXT,
  images JSONB DEFAULT '[]',
  visit_date DATE,
  is_verified_visit BOOLEAN DEFAULT FALSE,
  partner_reply TEXT,
  partner_reply_at TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT TRUE,
  helpful_count INTEGER DEFAULT 0 CHECK (helpful_count >= 0),
  unhelpful_count INTEGER DEFAULT 0 CHECK (unhelpful_count >= 0),
  flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tourist_id, review_type, target_id, booking_id)
);

-- ============================================
-- TOURIST NOTIFICATIONS PREFERENCES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS tourist_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tourist_id UUID NOT NULL UNIQUE REFERENCES tourist_profiles(id) ON DELETE CASCADE,
  email_booking_confirmation BOOLEAN DEFAULT TRUE,
  email_booking_reminder BOOLEAN DEFAULT TRUE,
  email_booking_changes BOOLEAN DEFAULT TRUE,
  email_payment_receipts BOOLEAN DEFAULT TRUE,
  email_promotions BOOLEAN DEFAULT TRUE,
  email_newsletters BOOLEAN DEFAULT FALSE,
  email_recommendations BOOLEAN DEFAULT TRUE,
  email_reviews_requests BOOLEAN DEFAULT TRUE,
  sms_booking_confirmation BOOLEAN DEFAULT FALSE,
  sms_booking_reminder BOOLEAN DEFAULT FALSE,
  sms_emergency_alerts BOOLEAN DEFAULT TRUE,
  push_booking_updates BOOLEAN DEFAULT TRUE,
  push_messages BOOLEAN DEFAULT TRUE,
  push_promotions BOOLEAN DEFAULT FALSE,
  push_recommendations BOOLEAN DEFAULT TRUE,
  language VARCHAR(10) DEFAULT 'ru',
  timezone VARCHAR(50) DEFAULT 'Asia/Kamchatka',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Tourist profiles
CREATE INDEX IF NOT EXISTS idx_tourist_profiles_user_id ON tourist_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_tourist_profiles_loyalty_tier ON tourist_profiles(loyalty_tier);
CREATE INDEX IF NOT EXISTS idx_tourist_profiles_interests ON tourist_profiles USING GIN (interests);
CREATE INDEX IF NOT EXISTS idx_tourist_profiles_languages ON tourist_profiles USING GIN (languages);

-- Tourist documents
CREATE INDEX IF NOT EXISTS idx_tourist_documents_tourist_id ON tourist_documents(tourist_id);
CREATE INDEX IF NOT EXISTS idx_tourist_documents_type ON tourist_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_tourist_documents_expiry ON tourist_documents(expiry_date);

-- Tourist trips
CREATE INDEX IF NOT EXISTS idx_tourist_trips_tourist_id ON tourist_trips(tourist_id);
CREATE INDEX IF NOT EXISTS idx_tourist_trips_status ON tourist_trips(status);
CREATE INDEX IF NOT EXISTS idx_tourist_trips_dates ON tourist_trips(start_date, end_date);

-- Trip bookings
CREATE INDEX IF NOT EXISTS idx_trip_bookings_trip_id ON trip_bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_bookings_booking_id ON trip_bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_trip_bookings_type ON trip_bookings(booking_type);

-- Tourist wishlist
CREATE INDEX IF NOT EXISTS idx_tourist_wishlist_tourist_id ON tourist_wishlist(tourist_id);
CREATE INDEX IF NOT EXISTS idx_tourist_wishlist_item_type ON tourist_wishlist(item_type);
CREATE INDEX IF NOT EXISTS idx_tourist_wishlist_item_id ON tourist_wishlist(item_id);

-- Tourist achievements
CREATE INDEX IF NOT EXISTS idx_tourist_achievements_tourist_id ON tourist_achievements(tourist_id);
CREATE INDEX IF NOT EXISTS idx_tourist_achievements_type ON tourist_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_tourist_achievements_earned_at ON tourist_achievements(earned_at);

-- Checklist templates
CREATE INDEX IF NOT EXISTS idx_checklist_templates_category ON checklist_templates(category);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_is_public ON checklist_templates(is_public);

-- Tourist checklists
CREATE INDEX IF NOT EXISTS idx_tourist_checklists_tourist_id ON tourist_checklists(tourist_id);
CREATE INDEX IF NOT EXISTS idx_tourist_checklists_trip_id ON tourist_checklists(trip_id);

-- Tourist reviews
CREATE INDEX IF NOT EXISTS idx_tourist_reviews_tourist_id ON tourist_reviews(tourist_id);
CREATE INDEX IF NOT EXISTS idx_tourist_reviews_type_target ON tourist_reviews(review_type, target_id);
CREATE INDEX IF NOT EXISTS idx_tourist_reviews_rating ON tourist_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_tourist_reviews_is_published ON tourist_reviews(is_published);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE TRIGGER update_tourist_profiles_updated_at
  BEFORE UPDATE ON tourist_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tourist_documents_updated_at
  BEFORE UPDATE ON tourist_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tourist_trips_updated_at
  BEFORE UPDATE ON tourist_trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_templates_updated_at
  BEFORE UPDATE ON checklist_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tourist_checklists_updated_at
  BEFORE UPDATE ON tourist_checklists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tourist_reviews_updated_at
  BEFORE UPDATE ON tourist_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tourist_notification_preferences_updated_at
  BEFORE UPDATE ON tourist_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Create tourist profile on user registration
-- ============================================

CREATE OR REPLACE FUNCTION create_tourist_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'tourist' THEN
    INSERT INTO tourist_profiles (user_id, full_name)
    VALUES (NEW.id, NEW.name)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO tourist_notification_preferences (tourist_id)
    SELECT id FROM tourist_profiles WHERE user_id = NEW.id
    ON CONFLICT (tourist_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_tourist_profile
  AFTER INSERT ON users
  FOR EACH ROW
  WHEN (NEW.role = 'tourist')
  EXECUTE FUNCTION create_tourist_profile();

-- ============================================
-- FUNCTION: Update loyalty points and tier
-- ============================================

CREATE OR REPLACE FUNCTION update_tourist_loyalty()
RETURNS TRIGGER AS $$
DECLARE
  new_tier VARCHAR(20);
  current_points INTEGER;
BEGIN
  SELECT loyalty_points INTO current_points
  FROM tourist_profiles
  WHERE id = NEW.tourist_id;
  
  IF current_points >= 10000 THEN
    new_tier := 'diamond';
  ELSIF current_points >= 5000 THEN
    new_tier := 'platinum';
  ELSIF current_points >= 2000 THEN
    new_tier := 'gold';
  ELSIF current_points >= 500 THEN
    new_tier := 'silver';
  ELSE
    new_tier := 'bronze';
  END IF;
  
  UPDATE tourist_profiles
  SET loyalty_tier = new_tier
  WHERE id = NEW.tourist_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tourist_loyalty
  AFTER INSERT OR UPDATE ON tourist_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_tourist_loyalty();

-- ============================================
-- FUNCTION: Update trip status automatically
-- ============================================

CREATE OR REPLACE FUNCTION update_trip_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_date > CURRENT_DATE AND NEW.status = 'planning' THEN
    NEW.status := 'upcoming';
  ELSIF NEW.start_date <= CURRENT_DATE AND NEW.end_date >= CURRENT_DATE AND NEW.status IN ('planning', 'upcoming') THEN
    NEW.status := 'active';
  ELSIF NEW.end_date < CURRENT_DATE AND NEW.status IN ('planning', 'upcoming', 'active') THEN
    NEW.status := 'completed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trip_status
  BEFORE INSERT OR UPDATE ON tourist_trips
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_status();

-- ============================================
-- FUNCTION: Update checklist counts
-- ============================================

CREATE OR REPLACE FUNCTION update_checklist_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tourist_checklists
  SET 
    total_items = jsonb_array_length(items),
    completed_items = (
      SELECT COUNT(*)
      FROM jsonb_array_elements(items) item
      WHERE (item->>'completed')::boolean = true
    )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_checklist_counts
  AFTER INSERT OR UPDATE OF items ON tourist_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_checklist_counts();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE tourist_profiles IS 'Extended tourist profiles with preferences and statistics';
COMMENT ON TABLE tourist_documents IS 'Tourist travel documents with expiry tracking';
COMMENT ON TABLE tourist_trips IS 'Planned and completed trips with itineraries';
COMMENT ON TABLE trip_bookings IS 'Link table between trips and bookings';
COMMENT ON TABLE tourist_wishlist IS 'Tourist wishlist for tours, accommodations, etc.';
COMMENT ON TABLE tourist_achievements IS 'Gamification achievements and badges';
COMMENT ON TABLE checklist_templates IS 'Reusable checklist templates';
COMMENT ON TABLE tourist_checklists IS 'Personal checklists for trips';
COMMENT ON TABLE tourist_reviews IS 'Unified review system for all services';
COMMENT ON TABLE tourist_notification_preferences IS 'Notification settings per channel';

COMMENT ON CONSTRAINT check_trip_dates ON tourist_trips IS 'End date must be on or after start date';
COMMENT ON CONSTRAINT check_expiry_after_issue ON tourist_documents IS 'Expiry date must be after issue date';

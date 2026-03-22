-- Migration: Souvenir Shop System
-- Date: 2025-11-10
-- Purpose: Complete souvenir shop system with validation and dependencies

-- ============================================
-- SOUVENIRS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS souvenirs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('magnets', 'ceramics', 'textiles', 'jewelry', 'crafts', 'food', 'books', 'art', 'other')),
  subcategory VARCHAR(100),
  sku VARCHAR(100) UNIQUE,
  barcode VARCHAR(100),
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  currency VARCHAR(3) DEFAULT 'RUB',
  discount_price DECIMAL(10,2) CHECK (discount_price IS NULL OR (discount_price > 0 AND discount_price < price)),
  discount_percentage INTEGER CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  cost_price DECIMAL(10,2) CHECK (cost_price IS NULL OR cost_price >= 0),
  images JSONB DEFAULT '[]',
  video_url TEXT,
  tags TEXT[] DEFAULT '{}',
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_handmade BOOLEAN DEFAULT FALSE,
  is_exclusive BOOLEAN DEFAULT FALSE,
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity INTEGER DEFAULT 0 CHECK (reserved_quantity >= 0),
  available_quantity INTEGER GENERATED ALWAYS AS (stock_quantity - reserved_quantity) STORED,
  low_stock_threshold INTEGER DEFAULT 5 CHECK (low_stock_threshold >= 0),
  reorder_point INTEGER CHECK (reorder_point IS NULL OR reorder_point >= 0),
  reorder_quantity INTEGER CHECK (reorder_quantity IS NULL OR reorder_quantity > 0),
  weight DECIMAL(10,3) CHECK (weight IS NULL OR weight > 0),
  dimensions JSONB,
  materials TEXT[] DEFAULT '{}',
  origin VARCHAR(255) DEFAULT 'Камчатка, Россия',
  artisan_name VARCHAR(255),
  artisan_bio TEXT,
  production_time_days INTEGER CHECK (production_time_days IS NULL OR production_time_days > 0),
  care_instructions TEXT,
  warranty_info TEXT,
  shipping_info TEXT,
  min_order_quantity INTEGER DEFAULT 1 CHECK (min_order_quantity > 0),
  max_order_quantity INTEGER CHECK (max_order_quantity IS NULL OR max_order_quantity >= min_order_quantity),
  rating DECIMAL(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),
  sales_count INTEGER DEFAULT 0 CHECK (sales_count >= 0),
  view_count INTEGER DEFAULT 0 CHECK (view_count >= 0),
  wishlist_count INTEGER DEFAULT 0 CHECK (wishlist_count >= 0),
  total_revenue DECIMAL(12,2) DEFAULT 0.0 CHECK (total_revenue >= 0),
  last_sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_reserved_not_exceed_stock CHECK (reserved_quantity <= stock_quantity)
);

-- ============================================
-- SOUVENIR ORDERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS souvenir_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  shipping_address_line1 VARCHAR(255) NOT NULL,
  shipping_address_line2 VARCHAR(255),
  shipping_city VARCHAR(100) NOT NULL,
  shipping_region VARCHAR(100),
  shipping_postal_code VARCHAR(20),
  shipping_country VARCHAR(100) DEFAULT 'Россия',
  billing_same_as_shipping BOOLEAN DEFAULT TRUE,
  billing_address JSONB,
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
  shipping_cost DECIMAL(10,2) DEFAULT 0 CHECK (shipping_cost >= 0),
  tax_amount DECIMAL(10,2) DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  currency VARCHAR(3) DEFAULT 'RUB',
  coupon_code VARCHAR(50),
  coupon_discount DECIMAL(10,2) DEFAULT 0 CHECK (coupon_discount >= 0),
  payment_method VARCHAR(50) CHECK (payment_method IN ('card', 'cash', 'transfer', 'online', 'crypto')),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'partial_refund')),
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'returned')),
  shipping_method VARCHAR(50) CHECK (shipping_method IN ('pickup', 'courier', 'post', 'express')),
  tracking_number VARCHAR(100),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  estimated_delivery_date DATE,
  gift_wrap BOOLEAN DEFAULT FALSE,
  gift_message TEXT,
  notes TEXT,
  admin_notes TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_total_calculation CHECK (total_amount = subtotal - discount_amount - coupon_discount + shipping_cost + tax_amount),
  CONSTRAINT check_delivery_dates CHECK (shipped_at IS NULL OR delivered_at IS NULL OR delivered_at >= shipped_at)
);

-- ============================================
-- SOUVENIR ORDER ITEMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS souvenir_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES souvenir_orders(id) ON DELETE CASCADE,
  souvenir_id UUID NOT NULL REFERENCES souvenirs(id) ON DELETE RESTRICT,
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  options JSONB DEFAULT '{}',
  personalization TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_item_total CHECK (total_price = (unit_price * quantity) - discount_amount)
);

-- ============================================
-- SOUVENIR REVIEWS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS souvenir_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  souvenir_id UUID NOT NULL REFERENCES souvenirs(id) ON DELETE CASCADE,
  order_id UUID REFERENCES souvenir_orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),
  packaging_rating INTEGER CHECK (packaging_rating BETWEEN 1 AND 5),
  title VARCHAR(255),
  comment TEXT NOT NULL,
  pros TEXT,
  cons TEXT,
  images JSONB DEFAULT '[]',
  partner_reply TEXT,
  partner_reply_at TIMESTAMPTZ,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0 CHECK (helpful_count >= 0),
  unhelpful_count INTEGER DEFAULT 0 CHECK (unhelpful_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, souvenir_id, user_id)
);

-- ============================================
-- SOUVENIR INVENTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS souvenir_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  souvenir_id UUID NOT NULL REFERENCES souvenirs(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'return', 'adjustment', 'damaged', 'reserved', 'unreserved')),
  quantity_change INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL CHECK (quantity_after >= 0),
  reference_type VARCHAR(50),
  reference_id UUID,
  cost DECIMAL(10,2) CHECK (cost >= 0),
  notes TEXT,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SOUVENIR WISHLISTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS souvenir_wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  souvenir_id UUID NOT NULL REFERENCES souvenirs(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, souvenir_id)
);

-- ============================================
-- SOUVENIR COUPONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS souvenir_coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_shipping')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  min_purchase DECIMAL(10,2) CHECK (min_purchase IS NULL OR min_purchase >= 0),
  max_discount DECIMAL(10,2) CHECK (max_discount IS NULL OR max_discount > 0),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  usage_limit_per_user INTEGER CHECK (usage_limit_per_user IS NULL OR usage_limit_per_user > 0),
  used_count INTEGER DEFAULT 0 CHECK (used_count >= 0),
  applicable_categories TEXT[] DEFAULT '{}',
  applicable_products UUID[] DEFAULT '{}',
  excluded_products UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_coupon_dates CHECK (valid_to > valid_from)
);

-- ============================================
-- INDEXES
-- ============================================

-- Souvenirs
CREATE INDEX IF NOT EXISTS idx_souvenirs_partner_id ON souvenirs(partner_id);
CREATE INDEX IF NOT EXISTS idx_souvenirs_category ON souvenirs(category);
CREATE INDEX IF NOT EXISTS idx_souvenirs_subcategory ON souvenirs(subcategory);
CREATE INDEX IF NOT EXISTS idx_souvenirs_sku ON souvenirs(sku);
CREATE INDEX IF NOT EXISTS idx_souvenirs_price ON souvenirs(price);
CREATE INDEX IF NOT EXISTS idx_souvenirs_is_active ON souvenirs(is_active);
CREATE INDEX IF NOT EXISTS idx_souvenirs_is_featured ON souvenirs(is_featured);
CREATE INDEX IF NOT EXISTS idx_souvenirs_rating ON souvenirs(rating);
CREATE INDEX IF NOT EXISTS idx_souvenirs_sales_count ON souvenirs(sales_count);
CREATE INDEX IF NOT EXISTS idx_souvenirs_tags ON souvenirs USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_souvenirs_stock ON souvenirs(stock_quantity);

-- Orders
CREATE INDEX IF NOT EXISTS idx_souvenir_orders_partner_id ON souvenir_orders(partner_id);
CREATE INDEX IF NOT EXISTS idx_souvenir_orders_user_id ON souvenir_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_souvenir_orders_status ON souvenir_orders(status);
CREATE INDEX IF NOT EXISTS idx_souvenir_orders_payment_status ON souvenir_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_souvenir_orders_order_number ON souvenir_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_souvenir_orders_created_at ON souvenir_orders(created_at);

-- Order items
CREATE INDEX IF NOT EXISTS idx_souvenir_order_items_order_id ON souvenir_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_souvenir_order_items_souvenir_id ON souvenir_order_items(souvenir_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_souvenir_reviews_souvenir_id ON souvenir_reviews(souvenir_id);
CREATE INDEX IF NOT EXISTS idx_souvenir_reviews_user_id ON souvenir_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_souvenir_reviews_rating ON souvenir_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_souvenir_reviews_is_published ON souvenir_reviews(is_published);

-- Inventory
CREATE INDEX IF NOT EXISTS idx_souvenir_inventory_souvenir_id ON souvenir_inventory(souvenir_id);
CREATE INDEX IF NOT EXISTS idx_souvenir_inventory_type ON souvenir_inventory(transaction_type);
CREATE INDEX IF NOT EXISTS idx_souvenir_inventory_created_at ON souvenir_inventory(created_at);

-- Wishlists
CREATE INDEX IF NOT EXISTS idx_souvenir_wishlists_user_id ON souvenir_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_souvenir_wishlists_souvenir_id ON souvenir_wishlists(souvenir_id);

-- Coupons
CREATE INDEX IF NOT EXISTS idx_souvenir_coupons_code ON souvenir_coupons(code);
CREATE INDEX IF NOT EXISTS idx_souvenir_coupons_is_active ON souvenir_coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_souvenir_coupons_valid_dates ON souvenir_coupons(valid_from, valid_to);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE TRIGGER update_souvenirs_updated_at
  BEFORE UPDATE ON souvenirs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_souvenir_orders_updated_at
  BEFORE UPDATE ON souvenir_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_souvenir_reviews_updated_at
  BEFORE UPDATE ON souvenir_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_souvenir_coupons_updated_at
  BEFORE UPDATE ON souvenir_coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Generate order number
-- ============================================

CREATE OR REPLACE FUNCTION generate_souvenir_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'SO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('souvenir_order_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS souvenir_order_number_seq START 1;

CREATE TRIGGER trigger_generate_souvenir_order_number
  BEFORE INSERT ON souvenir_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_souvenir_order_number();

-- ============================================
-- FUNCTION: Update souvenir rating
-- ============================================

CREATE OR REPLACE FUNCTION update_souvenir_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE souvenirs
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM souvenir_reviews
      WHERE souvenir_id = NEW.souvenir_id AND is_published = TRUE
    ),
    review_count = (
      SELECT COUNT(*)
      FROM souvenir_reviews
      WHERE souvenir_id = NEW.souvenir_id AND is_published = TRUE
    )
  WHERE id = NEW.souvenir_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_souvenir_rating
  AFTER INSERT OR UPDATE ON souvenir_reviews
  FOR EACH ROW
  WHEN (NEW.is_published = TRUE)
  EXECUTE FUNCTION update_souvenir_rating();

-- ============================================
-- FUNCTION: Reserve stock on order
-- ============================================

CREATE OR REPLACE FUNCTION reserve_souvenir_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    UPDATE souvenirs s
    SET reserved_quantity = reserved_quantity + oi.quantity
    FROM souvenir_order_items oi
    WHERE oi.order_id = NEW.id AND s.id = oi.souvenir_id;
  ELSIF (NEW.status IN ('cancelled', 'delivered')) AND OLD.status = 'confirmed' THEN
    UPDATE souvenirs s
    SET reserved_quantity = GREATEST(0, reserved_quantity - oi.quantity)
    FROM souvenir_order_items oi
    WHERE oi.order_id = NEW.id AND s.id = oi.souvenir_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reserve_souvenir_stock
  AFTER INSERT OR UPDATE ON souvenir_orders
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status OR OLD.status IS NULL)
  EXECUTE FUNCTION reserve_souvenir_stock();

-- ============================================
-- FUNCTION: Update sales stats
-- ============================================

CREATE OR REPLACE FUNCTION update_souvenir_sales_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    UPDATE souvenirs s
    SET 
      sales_count = sales_count + oi.quantity,
      total_revenue = total_revenue + oi.total_price,
      stock_quantity = GREATEST(0, stock_quantity - oi.quantity),
      last_sold_at = NOW()
    FROM souvenir_order_items oi
    WHERE oi.order_id = NEW.id AND s.id = oi.souvenir_id;
    
    INSERT INTO souvenir_inventory (souvenir_id, transaction_type, quantity_change, quantity_after, reference_type, reference_id)
    SELECT 
      oi.souvenir_id,
      'sale',
      -oi.quantity,
      s.stock_quantity,
      'order',
      NEW.id
    FROM souvenir_order_items oi
    JOIN souvenirs s ON s.id = oi.souvenir_id
    WHERE oi.order_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_souvenir_sales_stats
  AFTER UPDATE ON souvenir_orders
  FOR EACH ROW
  WHEN (NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered'))
  EXECUTE FUNCTION update_souvenir_sales_stats();

-- ============================================
-- FUNCTION: Update wishlist count
-- ============================================

CREATE OR REPLACE FUNCTION update_souvenir_wishlist_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE souvenirs SET wishlist_count = wishlist_count + 1 WHERE id = NEW.souvenir_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE souvenirs SET wishlist_count = GREATEST(0, wishlist_count - 1) WHERE id = OLD.souvenir_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_souvenir_wishlist_count
  AFTER INSERT OR DELETE ON souvenir_wishlists
  FOR EACH ROW
  EXECUTE FUNCTION update_souvenir_wishlist_count();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE souvenirs IS 'Souvenir products with complete specifications and validation';
COMMENT ON TABLE souvenir_orders IS 'Souvenir orders with shipping and payment tracking';
COMMENT ON TABLE souvenir_order_items IS 'Order line items with price validation';
COMMENT ON TABLE souvenir_reviews IS 'Customer reviews with detailed ratings';
COMMENT ON TABLE souvenir_inventory IS 'Inventory transaction history';
COMMENT ON TABLE souvenir_wishlists IS 'User wishlist items';
COMMENT ON TABLE souvenir_coupons IS 'Discount coupons with usage tracking';

COMMENT ON CONSTRAINT check_reserved_not_exceed_stock ON souvenirs IS 'Reserved quantity cannot exceed stock';
COMMENT ON CONSTRAINT check_total_calculation ON souvenir_orders IS 'Total must equal calculated amount';
COMMENT ON CONSTRAINT check_item_total ON souvenir_order_items IS 'Item total must equal price * quantity - discount';

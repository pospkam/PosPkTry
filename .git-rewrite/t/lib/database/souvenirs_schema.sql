-- ============================================
-- SOUVENIR SHOP - СХЕМА БАЗЫ ДАННЫХ
-- ============================================

-- Таблица сувениров (товары)
CREATE TABLE IF NOT EXISTS souvenirs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT,
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(100),
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'RUB',
  discount_price DECIMAL(10,2),
  images JSONB DEFAULT '[]',
  video_url TEXT,
  tags JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  weight DECIMAL(10,2),
  dimensions JSONB,
  materials JSONB DEFAULT '[]',
  origin VARCHAR(255) DEFAULT 'Россия',
  artisan VARCHAR(255),
  rating DECIMAL(3,2) DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_souvenirs_category ON souvenirs(category);
CREATE INDEX idx_souvenirs_price ON souvenirs(price);
CREATE INDEX idx_souvenirs_rating ON souvenirs(rating);
CREATE INDEX idx_souvenirs_is_active ON souvenirs(is_active);

-- Таблица корзин покупок
CREATE TABLE IF NOT EXISTS shopping_carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  session_id VARCHAR(255) NOT NULL,
  subtotal DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'RUB',
  coupon_code VARCHAR(50),
  coupon_discount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id)
);

CREATE INDEX idx_carts_user_id ON shopping_carts(user_id);
CREATE INDEX idx_carts_session_id ON shopping_carts(session_id);

-- Таблица элементов корзины
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id UUID REFERENCES shopping_carts(id) ON DELETE CASCADE,
  souvenir_id UUID REFERENCES souvenirs(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  selected_options JSONB DEFAULT '[]',
  gift_message TEXT,
  gift_wrap BOOLEAN DEFAULT FALSE,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cart_id, souvenir_id)
);

CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);

-- Таблица заказов сувениров
CREATE TABLE IF NOT EXISTS souvenir_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  customer_info JSONB NOT NULL,
  items JSONB NOT NULL,
  pricing JSONB NOT NULL,
  shipping JSONB NOT NULL,
  payment JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  tracking_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_souvenir_orders_user_id ON souvenir_orders(user_id);
CREATE INDEX idx_souvenir_orders_status ON souvenir_orders(status);
CREATE INDEX idx_souvenir_orders_order_number ON souvenir_orders(order_number);

-- Таблица отзывов на товары
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  souvenir_id UUID REFERENCES souvenirs(id) ON DELETE CASCADE,
  order_id UUID REFERENCES souvenir_orders(id),
  user_id UUID REFERENCES users(id),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT NOT NULL,
  images JSONB DEFAULT '[]',
  is_verified BOOLEAN DEFAULT FALSE,
  helpful INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_reviews_souvenir_id ON product_reviews(souvenir_id);
CREATE INDEX idx_product_reviews_rating ON product_reviews(rating);

-- Таблица купонов для сувениров
CREATE TABLE IF NOT EXISTS souvenir_coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_purchase DECIMAL(10,2),
  max_discount DECIMAL(10,2),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  applicable_categories JSONB DEFAULT '[]',
  applicable_products JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_souvenir_coupons_code ON souvenir_coupons(code);
CREATE INDEX idx_souvenir_coupons_is_active ON souvenir_coupons(is_active);

\echo '✓ Souvenir Shop таблицы созданы'


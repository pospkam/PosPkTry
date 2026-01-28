/**
 * Миграция для создания недостающих таблиц в БД
 * Запуск: node scripts/create-missing-tables.js
 */

const { Client } = require('pg');

const client = new Client({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'kamhub',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
});

const CREATE_TABLE_STATEMENTS = [
  // GEAR RENTAL TABLES
  `CREATE TABLE IF NOT EXISTS gear_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- backpack, tent, climbing_gear, etc
    description TEXT,
    price_per_day DECIMAL(10,2) NOT NULL,
    available_quantity INTEGER DEFAULT 0,
    condition VARCHAR(50) DEFAULT 'good', -- excellent, good, fair, poor
    images JSONB DEFAULT '[]',
    specifications JSONB DEFAULT '{}',
    owner_id UUID REFERENCES transfer_operators(id) ON DELETE CASCADE,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

  `CREATE TABLE IF NOT EXISTS gear_rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
    rental_start_date DATE NOT NULL,
    rental_end_date DATE NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, completed, cancelled
    payment_status VARCHAR(50) DEFAULT 'pending',
    deposit_amount DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

  `CREATE TABLE IF NOT EXISTS gear_rental_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL REFERENCES gear_rentals(id) ON DELETE CASCADE,
    gear_item_id UUID NOT NULL REFERENCES gear_items(id) ON DELETE RESTRICT,
    quantity INTEGER DEFAULT 1,
    daily_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );`,

  // SOUVENIRS TABLES
  `CREATE TABLE IF NOT EXISTS souvenirs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- local_crafts, postcards, books, etc
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    images JSONB DEFAULT '[]',
    stock_quantity INTEGER DEFAULT 0,
    manufacturer VARCHAR(255),
    origin_location VARCHAR(255),
    materials TEXT,
    dimensions VARCHAR(100),
    owner_id UUID REFERENCES transfer_operators(id) ON DELETE CASCADE,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

  `CREATE TABLE IF NOT EXISTS souvenir_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    discount_type VARCHAR(20) DEFAULT 'percentage', -- percentage, fixed_amount
    discount_value DECIMAL(10,2) NOT NULL,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

  `CREATE TABLE IF NOT EXISTS souvenir_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled
    total_price DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    shipping_address TEXT,
    tracking_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS souvenir_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES souvenir_orders(id) ON DELETE CASCADE,
    souvenir_id UUID NOT NULL REFERENCES souvenirs(id) ON DELETE RESTRICT,
    quantity INTEGER DEFAULT 1,
    price_at_purchase DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );`,

  `CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_type VARCHAR(50) NOT NULL, -- souvenir, gear, tour
    product_id UUID NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    helpful_count INTEGER DEFAULT 0,
    is_verified_purchase BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

  // SESSIONS TABLE (for monitoring active connections)
  `CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

  // Create indexes for better performance
  `CREATE INDEX IF NOT EXISTS idx_gear_items_owner_id ON gear_items(owner_id);`,
  `CREATE INDEX IF NOT EXISTS idx_gear_rentals_user_id ON gear_rentals(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_gear_rentals_tour_id ON gear_rentals(tour_id);`,
  `CREATE INDEX IF NOT EXISTS idx_gear_rental_items_rental_id ON gear_rental_items(rental_id);`,
  `CREATE INDEX IF NOT EXISTS idx_souvenirs_owner_id ON souvenirs(owner_id);`,
  `CREATE INDEX IF NOT EXISTS idx_souvenir_orders_user_id ON souvenir_orders(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_souvenir_order_items_order_id ON souvenir_order_items(order_id);`,
  `CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);`,
];

async function createMissingTables() {
  try {
    await client.connect();
    console.log('✓ Подключение к БД успешно\n');

    let createdCount = 0;
    let errorCount = 0;

    for (const statement of CREATE_TABLE_STATEMENTS) {
      try {
        await client.query(statement);
        
        // Определяем название таблицы/индекса
        const match = statement.match(/(?:TABLE|INDEX)\s+IF\s+NOT\s+EXISTS\s+(\w+)/i);
        const name = match ? match[1] : 'unknown';
        
        console.log(`✓ ${name}`);
        createdCount++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⊘ ${error.message.split('\n')[0]} (уже существует)`);
        } else {
          console.error(`❌ Ошибка: ${error.message}`);
          errorCount++;
        }
      }
    }

    console.log(`\n📊 Результаты миграции:`);
    console.log(`   Успешно: ${createdCount}`);
    console.log(`   Ошибок: ${errorCount}`);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Запускаем миграцию
createMissingTables().then(() => {
  console.log('\n🎉 Все недостающие таблицы созданы!');
  process.exit(0);
});

/**
 * Seed скрипт для заполнения тестовых данных водителей
 * Запуск: node scripts/seed-drivers.js
 */

const { Client } = require('pg');

const client = new Client({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'kamhub',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
});

const DRIVERS_DATA = [
  {
    name: 'Иван Петров',
    phone: '+79001234567',
    email: 'ivan.petrov@kamhub.ru',
    license_number: 'RU123456789',
    experience_years: 8,
    rating: 4.9,
    reviews_count: 145,
    is_available: true,
    languages: ['russian', 'english'],
    specializations: ['mountain_tours', 'extreme']
  },
  {
    name: 'Мария Сидорова',
    phone: '+79009876543',
    email: 'maria.sidorova@kamhub.ru',
    license_number: 'RU987654321',
    experience_years: 6,
    rating: 4.8,
    reviews_count: 128,
    is_available: true,
    languages: ['russian', 'english', 'french'],
    specializations: ['cultural_tours', 'nature']
  },
  {
    name: 'Алексей Морозов',
    phone: '+79012345678',
    email: 'alexey.morozov@kamhub.ru',
    license_number: 'RU456789123',
    experience_years: 10,
    rating: 4.95,
    reviews_count: 267,
    is_available: true,
    languages: ['russian', 'english', 'german'],
    specializations: ['hiking', 'mountaineering', 'photography']
  },
  {
    name: 'Елена Козлова',
    phone: '+79023456789',
    email: 'elena.kozlova@kamhub.ru',
    license_number: 'RU789123456',
    experience_years: 7,
    rating: 4.85,
    reviews_count: 156,
    is_available: true,
    languages: ['russian', 'english', 'spanish'],
    specializations: ['beach_tours', 'coastal']
  },
  {
    name: 'Сергей Волков',
    phone: '+79034567890',
    email: 'sergey.volkov@kamhub.ru',
    license_number: 'RU234567890',
    experience_years: 9,
    rating: 4.92,
    reviews_count: 189,
    is_available: true,
    languages: ['russian', 'english'],
    specializations: ['fishing', 'adventure']
  }
];

async function seedDrivers() {
  try {
    await client.connect();
    console.log('✓ Подключение к БД успешно');

    // Проверяем наличие таблицы
    const tableCheck = await client.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'transfer_drivers'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('⚠️ Таблица transfer_drivers не существует, создаём...');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS transfer_drivers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL UNIQUE,
          license_number VARCHAR(50) NOT NULL UNIQUE,
          license_expiry DATE,
          experience_years INTEGER DEFAULT 0,
          rating DECIMAL(3,2) DEFAULT 0,
          reviews_count INTEGER DEFAULT 0,
          is_available BOOLEAN DEFAULT true,
          languages JSONB DEFAULT '[]',
          specializations JSONB DEFAULT '[]',
          profile_image VARCHAR(500),
          bio TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      console.log('✓ Таблица transfer_drivers создана');
    }

    // Очищаем старые данные (опционально)
    // await client.query('DELETE FROM transfer_drivers');

    // Вставляем новых водителей
    for (const driver of DRIVERS_DATA) {
      const exists = await client.query(
        'SELECT id FROM transfer_drivers WHERE license_number = $1',
        [driver.license_number]
      );

      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO transfer_drivers 
          (name, phone, email, license_number, experience_years, rating, reviews_count, is_available, languages, specializations)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            driver.name,
            driver.phone,
            driver.email,
            driver.license_number,
            driver.experience_years,
            driver.rating,
            driver.reviews_count,
            driver.is_available,
            JSON.stringify(driver.languages),
            JSON.stringify(driver.specializations)
          ]
        );
        console.log(`✓ Добавлен водитель: ${driver.name}`);
      } else {
        console.log(`⊘ Водитель ${driver.name} уже существует, пропускаем`);
      }
    }

    // Получаем статистику
    const result = await client.query('SELECT COUNT(*) as count FROM transfer_drivers');
    console.log(`\n✅ Всего водителей в БД: ${result.rows[0].count}`);

  } catch (error) {
    console.error('❌ Ошибка при заполнении данных водителей:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Запускаем seed
seedDrivers().then(() => {
  console.log('\n🎉 Данные водителей успешно заполнены!');
  process.exit(0);
});

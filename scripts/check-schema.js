/**
 * Проверка текущей схемы на production БД
 */

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL не установлен');
  process.exit(1);
}

async function checkSchema() {
  // Парсим URL вручную для поддержки спецсимволов в пароле
  const match = DATABASE_URL.match(/^postgresql:\/\/([^:]+):(.+)@([^:\/]+):?(\d+)?\/(.+?)(\?.*)?$/);
  if (!match) {
    console.error('❌ Неверный формат DATABASE_URL');
    process.exit(1);
  }

  const config = {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4] || '5432'),
    database: match[5],
    ssl: { rejectUnauthorized: false },
  };

  const client = new Client(config);

  try {
    await client.connect();
    console.log('✓ Подключение к БД успешно\n');

    // Проверяем существующие таблицы
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`📊 Найдено таблиц: ${result.rows.length}\n`);

    if (result.rows.length > 0) {
      console.log('Существующие таблицы:');
      result.rows.forEach(r => console.log(`  - ${r.table_name}`));
    } else {
      console.log('⚠️  БД пуста, таблиц не найдено');
    }

    // Проверяем основные таблицы
    console.log('\n📋 Проверка ключевых таблиц:');
    const tables = ['users', 'partners', 'tours', 'bookings', 'kamchatka_routes', 'operators'];
    for (const table of tables) {
      const exists = result.rows.some(r => r.table_name === table);
      console.log(`  ${exists ? '✓' : '✗'} ${table}`);
    }

  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  } finally {
    await client.end();
  }
}

checkSchema();

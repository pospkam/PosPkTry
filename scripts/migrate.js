/**
 * Миграция БД — запускает все SQL файлы в порядке возрастания
 */

const { Client } = require('pg');
const { readFileSync, readdirSync } = require('fs');
const { join } = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL не установлен');
  process.exit(1);
}

async function runMigrations() {
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
    console.log('✓ Подключение к БД успешно');

    // Применяем главную схему
    const schemaPath = join(__dirname, '../lib/database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    console.log('⚙️  Применяю schema.sql...');

    // Разбиваем схему на отдельные statements и применяем каждый
    const statements = schema.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'));
    for (const stmt of statements) {
      try {
        await client.query(stmt);
      } catch (err) {
        if (!err.message.includes('already exists') && !err.message.includes('permission denied')) {
          console.error(`⚠️  Ошибка при применении statement: ${err.message}`);
        }
      }
    }

    console.log('✓ schema.sql применена');

    // Применяем все миграции по порядку
    const migrationsDir = join(__dirname, '../lib/database/migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort((a, b) => {
        const numA = parseInt(a.split('_')[0]);
        const numB = parseInt(b.split('_')[0]);
        return numA - numB;
      });

    for (const file of files) {
      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, 'utf8');
      console.log(`⚙️  Применяю ${file}...`);
      try {
        await client.query(sql);
        console.log(`✓ ${file} применена`);
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('permission denied')) {
          console.log(`⊘ ${file} пропущена (${err.message})`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n✓ ВСЕ МИГРАЦИИ ПРИМЕНЕНЫ');
  } catch (err) {
    console.error('❌ Ошибка миграции:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();

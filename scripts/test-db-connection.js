/**
 * Скрипт тестирования подключения к PostgreSQL на Timeweb Cloud
 * Использование: node scripts/test-db-connection.js
 */

const { Pool } = require('pg');
require('dotenv').config();

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}▶️  ${msg}${colors.reset}`),
};

async function testDatabaseConnection() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🗄️  ТЕСТИРОВАНИЕ ПОДКЛЮЧЕНИЯ К PostgreSQL');
  console.log('═══════════════════════════════════════════════════════\n');

  // Проверка наличия DATABASE_URL
  if (!process.env.DATABASE_URL) {
    log.error('DATABASE_URL не найден в переменных окружения');
    log.warning('Создайте файл .env и добавьте DATABASE_URL');
    log.info('Пример: DATABASE_URL=postgresql://user:password@host:5432/database');
    process.exit(1);
  }

  log.info(`Database URL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);
  console.log('');

  // Настройка пула подключений
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? {
      rejectUnauthorized: false
    } : false,
    max: 1, // Для теста одно подключение достаточно
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  let client;

  try {
    // ШАГ 1: Подключение к БД
    log.step('Шаг 1/5: Подключение к базе данных...');
    client = await pool.connect();
    log.success('Подключение установлено успешно!');
    console.log('');

    // ШАГ 2: Проверка версии PostgreSQL
    log.step('Шаг 2/5: Проверка версии PostgreSQL...');
    const versionResult = await client.query('SELECT version()');
    const version = versionResult.rows[0].version;
    log.success(`PostgreSQL версия: ${version.split(',')[0]}`);
    console.log('');

    // ШАГ 3: Проверка текущей БД и пользователя
    log.step('Шаг 3/5: Проверка текущей базы данных...');
    const dbInfoResult = await client.query(`
      SELECT 
        current_database() as database,
        current_user as user,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port
    `);
    const dbInfo = dbInfoResult.rows[0];
    log.success(`База данных: ${dbInfo.database}`);
    log.success(`Пользователь: ${dbInfo.user}`);
    log.success(`Сервер: ${dbInfo.server_ip || 'localhost'}:${dbInfo.server_port}`);
    console.log('');

    // ШАГ 4: Проверка существующих таблиц
    log.step('Шаг 4/5: Проверка таблиц в базе данных...');
    const tablesResult = await client.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length === 0) {
      log.warning('Таблицы не найдены');
      log.info('Запустите: bash scripts/apply-all-schemas.sh');
    } else {
      log.success(`Найдено таблиц: ${tablesResult.rows.length}`);
      console.log('');
      console.log('📋 Список таблиц:');
      console.log('─────────────────────────────────────────');
      
      const tables = {
        core: [],
        auth: [],
        business: [],
        other: []
      };

      tablesResult.rows.forEach(row => {
        const name = row.table_name;
        if (['users', 'roles', 'user_roles'].includes(name)) {
          tables.auth.push(name);
        } else if (['tours', 'bookings', 'payments', 'reviews'].includes(name)) {
          tables.business.push(name);
        } else if (['assets', 'notifications'].includes(name)) {
          tables.core.push(name);
        } else {
          tables.other.push(name);
        }
      });

      if (tables.auth.length > 0) {
        console.log(`\n🔐 Аутентификация (${tables.auth.length}):`);
        tables.auth.forEach(t => console.log(`   • ${t}`));
      }

      if (tables.business.length > 0) {
        console.log(`\n💼 Бизнес-логика (${tables.business.length}):`);
        tables.business.forEach(t => console.log(`   • ${t}`));
      }

      if (tables.core.length > 0) {
        console.log(`\n⚙️  Основные (${tables.core.length}):`);
        tables.core.forEach(t => console.log(`   • ${t}`));
      }

      if (tables.other.length > 0) {
        console.log(`\n📦 Прочие (${tables.other.length}):`);
        tables.other.forEach(t => console.log(`   • ${t}`));
      }

      console.log('─────────────────────────────────────────');
    }
    console.log('');

    // ШАГ 5: Тестовый запрос
    log.step('Шаг 5/5: Выполнение тестового запроса...');
    const testResult = await client.query(`
      SELECT 
        'Test' as message,
        NOW() as current_time,
        1 + 1 as math_test
    `);
    
    if (testResult.rows[0].math_test === 2) {
      log.success('Тестовый запрос выполнен успешно!');
      log.success(`Время сервера: ${testResult.rows[0].current_time}`);
    }
    console.log('');

    // Дополнительная информация о БД
    log.step('Дополнительная информация...');
    
    // Размер БД
    const sizeResult = await client.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as db_size
    `);
    log.info(`Размер БД: ${sizeResult.rows[0].db_size}`);

    // Количество записей в ключевых таблицах
    if (tablesResult.rows.length > 0) {
      const countQueries = [];
      const keyTables = ['users', 'tours', 'bookings', 'payments'];
      
      for (const table of keyTables) {
        const exists = tablesResult.rows.find(r => r.table_name === table);
        if (exists) {
          try {
            const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
            log.info(`Записей в ${table}: ${countResult.rows[0].count}`);
          } catch (e) {
            // Таблица существует но недоступна
          }
        }
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    log.success('ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО! 🎉');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    // Рекомендации
    if (tablesResult.rows.length === 0) {
      console.log('📝 СЛЕДУЮЩИЕ ШАГИ:');
      console.log('   1. Применить схемы БД:');
      console.log('      bash scripts/apply-all-schemas.sh');
      console.log('');
      console.log('   2. Загрузить начальные данные (если есть):');
      console.log('      node scripts/seed-database.js');
      console.log('');
    } else {
      console.log('✨ База данных готова к использованию!');
      console.log('');
      console.log('🚀 Можно запускать приложение:');
      console.log('   npm run dev     (разработка)');
      console.log('   npm run build   (сборка)');
      console.log('   npm start       (production)');
      console.log('');
    }

  } catch (error) {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    log.error('ОШИБКА ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    
    log.error(`Сообщение: ${error.message}`);
    
    if (error.code) {
      log.error(`Код ошибки: ${error.code}`);
    }

    console.log('');
    console.log('🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
    console.log('');
    
    if (error.code === 'ENOTFOUND') {
      console.log('   • Неверный хост базы данных');
      console.log('   • Проверьте DATABASE_URL в .env файле');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   • База данных не запущена');
      console.log('   • Неверный порт (обычно 5432 для PostgreSQL)');
      console.log('   • Firewall блокирует подключение');
    } else if (error.code === '28P01') {
      console.log('   • Неверный пароль');
      console.log('   • Проверьте credentials в DATABASE_URL');
    } else if (error.code === '3D000') {
      console.log('   • База данных не существует');
      console.log('   • Создайте БД на Timeweb Cloud');
    } else {
      console.log('   • Проверьте DATABASE_URL в .env');
      console.log('   • Убедитесь что БД создана на Timeweb Cloud');
      console.log('   • Проверьте права доступа');
      console.log('   • Проверьте SSL настройки');
    }

    console.log('');
    console.log('📖 ДОКУМЕНТАЦИЯ:');
    console.log('   https://timeweb.cloud/');
    console.log('');

    process.exit(1);

  } finally {
    // Закрытие подключений
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Запуск теста
testDatabaseConnection();






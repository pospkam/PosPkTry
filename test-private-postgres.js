/**
 * Тест подключения к PostgreSQL через приватный IP Timeweb
 */
const { Client } = require('pg');

// Конфигурация для приватного IP
const privateConfig = {
  host: '192.168.0.4',
  port: 5432,
  database: 'default_db',
  user: 'gen_user',
  password: 'q;3U+PY7XCz@Br',
  connectionTimeoutMillis: 10000,
};

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

async function testPrivateConnection() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔒 ТЕСТИРОВАНИЕ ПОДКЛЮЧЕНИЯ К POSTGRESQL');
  console.log('🏠 ЧЕРЕЗ ПРИВАТНЫЙ IP TIMEWEB CLOUD');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  log.step('Подключение к: 192.168.0.4:5432');
  log.info('База данных: default_db');
  log.info('Пользователь: gen_user');
  console.log('');

  const client = new Client(privateConfig);

  try {
    log.step('Установка соединения...');
    await client.connect();

    log.success('ПОДКЛЮЧЕНИЕ УСТАНОВЛЕНО! 🎉');
    console.log('');

    // Информация о сервере
    log.step('Получение информации о сервере...');

    const versionResult = await client.query('SELECT version()');
    const version = versionResult.rows[0].version.split(',')[0];
    log.success(`PostgreSQL версия: ${version}`);

    const serverInfo = await client.query(`
      SELECT
        current_database() as database,
        current_user as user,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port,
        now() as current_time
    `);

    const info = serverInfo.rows[0];
    log.success(`База данных: ${info.database}`);
    log.success(`Пользователь: ${info.user}`);
    log.success(`Сервер: ${info.server_ip}:${info.server_port}`);
    log.success(`Время сервера: ${info.current_time}`);
    console.log('');

    // Проверка таблиц
    log.step('Проверка существующих таблиц...');

    const tablesResult = await client.query(`
      SELECT
        schemaname,
        tablename,
        tableowner
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    if (tablesResult.rows.length === 0) {
      log.warning('Таблицы не найдены в схеме public');
      log.info('База данных пуста - нужно выполнить миграции');
    } else {
      log.success(`Найдено таблиц: ${tablesResult.rows.length}`);

      console.log('📋 Список таблиц:');
      console.log('┌─────────────────────────────────────┐');
      console.log('│ Название таблицы          │ Владелец │');
      console.log('├─────────────────────────────────────┤');

      tablesResult.rows.forEach(row => {
        const name = row.tablename.padEnd(25);
        const owner = row.tableowner.padEnd(9);
        console.log(`│ ${name} │ ${owner} │`);
      });

      console.log('└─────────────────────────────────────┘');
    }

    console.log('');
    log.step('Проверка прав пользователя...');

    // Проверка прав на создание таблиц
    try {
      await client.query('CREATE TEMP TABLE test_permissions (id SERIAL PRIMARY KEY, test_col TEXT)');
      await client.query('DROP TABLE test_permissions');
      log.success('Пользователь имеет права на создание/удаление таблиц');
    } catch (permError) {
      log.warning('Ограниченные права пользователя');
      log.info('Возможно, нужны дополнительные права для миграций');
    }

    // Проверка количества подключений
    const connectionsResult = await client.query(`
      SELECT count(*) as active_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    log.info(`Активных подключений к БД: ${connectionsResult.rows[0].active_connections}`);

    client.end();

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    log.success('✅ ТЕСТИРОВАНИЕ ПРОЙДЕНО УСПЕШНО!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('🚀 ГОТОВ К РАБОТЕ С БАЗОЙ ДАННЫХ!');
    console.log('');
    console.log('📝 ДАЛЬНЕЙШИЕ ШАГИ:');
    console.log('   1. Выполнить миграции схемы БД');
    console.log('   2. Загрузить начальные данные');
    console.log('   3. Настроить подключение в приложении');
    console.log('   4. Протестировать AI интеграцию');

    return true;

  } catch (error) {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    log.error('❌ ОШИБКА ПОДКЛЮЧЕНИЯ');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    log.error(`Сообщение: ${error.message}`);

    if (error.code) {
      log.error(`Код ошибки: ${error.code}`);
    }

    console.log('');
    console.log('🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
    console.log('');

    switch (error.code) {
      case 'ECONNREFUSED':
        console.log('• Сервер PostgreSQL не запущен или не доступен');
        console.log('• Firewall блокирует подключение');
        console.log('• Неправильный IP адрес или порт');
        console.log('• Сервер слушает только на localhost');
        break;

      case 'ENOTFOUND':
        console.log('• DNS проблема - IP адрес не найден');
        console.log('• Сеть недоступна');
        break;

      case '28P01':
        console.log('• Неправильное имя пользователя или пароль');
        console.log('• Пользователь не существует');
        break;

      case '3D000':
        console.log('• База данных не существует');
        console.log('• Неправильное имя базы данных');
        break;

      default:
        if (error.message.includes('timeout')) {
          console.log('• Таймаут подключения');
          console.log('• Сервер перегружен или не отвечает');
        } else if (error.message.includes('SSL')) {
          console.log('• Проблемы с SSL подключением');
          console.log('• Требуется SSL сертификат');
        } else {
          console.log('• Неизвестная ошибка - проверьте логи сервера');
        }
    }

    console.log('');
    console.log('🛠️  РЕШЕНИЯ:');
    console.log('');
    console.log('1. 🌐 ПРОВЕРЬТЕ СЕТЬ:');
    console.log('   • Убедитесь что находитесь в сети Timeweb');
    console.log('   • Или настройте VPN доступ к приватной сети');
    console.log('');
    console.log('2. 🗄️ ПРОВЕРЬТЕ СЕРВЕР:');
    console.log('   • PostgreSQL должен быть запущен');
    console.log('   • Проверьте статус в панели Timeweb Cloud');
    console.log('   • Перезапустите сервис если необходимо');
    console.log('');
    console.log('3. 🔐 ПРОВЕРЬТЕ ПРАВА:');
    console.log('   • Убедитесь в правильности учетных данных');
    console.log('   • Проверьте что пользователь имеет доступ');
    console.log('');
    console.log('4. 📞 ПОДДЕРЖКА:');
    console.log('   • Свяжитесь с поддержкой Timeweb Cloud');
    console.log('   • Предоставьте код ошибки и IP адрес');

    return false;
  }
}

// Запуск тестирования
testPrivateConnection().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
});



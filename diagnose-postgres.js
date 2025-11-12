/**
 * Детальная диагностика PostgreSQL на Timeweb Cloud
 */
const { Client } = require('pg');
const net = require('net');

// Конфигурации для тестирования
const configs = {
  // Без SSL
  noSSL: {
    host: '45.8.96.120',
    port: 5432,
    database: 'default_db',
    user: 'gen_user',
    password: 'q;3U+PY7XCz@Br',
    connectionTimeoutMillis: 5000,
  },

  // С SSL (rejectUnauthorized: false)
  sslLenient: {
    host: '45.8.96.120',
    port: 5432,
    database: 'default_db',
    user: 'gen_user',
    password: 'q;3U+PY7XCz@Br',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  },

  // Внутренний хост без SSL
  internalNoSSL: {
    host: '51e6e5ca5d967b8e81fc9b75.twc1.net',
    port: 5432,
    database: 'default_db',
    user: 'gen_user',
    password: 'q;3U+PY7XCz@Br',
    connectionTimeoutMillis: 5000,
  },

  // Внутренний хост с SSL
  internalSSL: {
    host: '51e6e5ca5d967b8e81fc9b75.twc1.net',
    port: 5432,
    database: 'default_db',
    user: 'gen_user',
    password: 'q;3U+PY7XCz@Br',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  }
};

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}▶️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.magenta}🧪 ${msg}${colors.reset}`),
};

// Функция для проверки доступности порта
function checkPort(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 3000;

    socket.setTimeout(timeout);
    socket.connect(port, host);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      resolve(false);
    });
  });
}

// Функция для тестирования подключения к PostgreSQL
async function testPostgresConnection(config, name) {
  log.test(`Тестирование: ${name}`);

  const client = new Client(config);

  try {
    await client.connect();
    log.success(`Подключение установлено! (${name})`);

    // Тестовый запрос
    const result = await client.query('SELECT version()');
    const version = result.rows[0].version.split(',')[0];
    log.info(`PostgreSQL версия: ${version}`);

    // Информация о подключении
    const dbInfo = await client.query(`
      SELECT
        current_database() as db,
        current_user as user,
        inet_server_addr() as ip,
        inet_server_port() as port
    `);
    const info = dbInfo.rows[0];
    log.info(`БД: ${info.db}, Пользователь: ${info.user}`);
    log.info(`Сервер: ${info.ip}:${info.port}`);

    client.end();
    return { success: true, version, dbInfo: info };

  } catch (error) {
    log.error(`${name}: ${error.message}`);
    if (error.code) {
      log.error(`Код ошибки: ${error.code}`);
    }
    return { success: false, error: error.message, code: error.code };
  }
}

// Функция для тестирования всех конфигураций
async function testAllConfigurations() {
  log.step('НАЧАЛО ДИАГНОСТИКИ POSTGRESQL');
  console.log('');

  const results = {};

  // Тест 1: Проверка доступности портов
  log.step('ЭТАП 1: Проверка доступности портов');

  const ports = {
    'Публичный IP (45.8.96.120)': await checkPort('45.8.96.120', 5432),
    'Внутренний хост (51e6e5ca5d967b8e81fc9b75.twc1.net)': await checkPort('51e6e5ca5d967b8e81fc9b75.twc1.net', 5432),
  };

  for (const [name, available] of Object.entries(ports)) {
    if (available) {
      log.success(`Порт доступен: ${name}:5432`);
    } else {
      log.error(`Порт недоступен: ${name}:5432`);
    }
  }

  console.log('');

  // Тест 2: Подключения без SSL
  log.step('ЭТАП 2: Тестирование подключений без SSL');

  results.noSSL = await testPostgresConnection(configs.noSSL, 'Публичный IP без SSL');
  console.log('');

  results.internalNoSSL = await testPostgresConnection(configs.internalNoSSL, 'Внутренний хост без SSL');
  console.log('');

  // Тест 3: Подключения с SSL
  log.step('ЭТАП 3: Тестирование подключений с SSL');

  results.sslLenient = await testPostgresConnection(configs.sslLenient, 'Публичный IP с SSL');
  console.log('');

  results.internalSSL = await testPostgresConnection(configs.internalSSL, 'Внутренний хост с SSL');
  console.log('');

  return results;
}

// Анализ результатов
function analyzeResults(results) {
  log.step('ЭТАП 4: АНАЛИЗ РЕЗУЛЬТАТОВ');
  console.log('');

  const successful = Object.values(results).filter(r => r.success).length;
  const total = Object.keys(results).length;

  console.log(`📊 РЕЗУЛЬТАТЫ: ${successful}/${total} успешных подключений`);
  console.log('');

  // Анализ проблем
  const hasConnectionRefused = Object.values(results).some(r =>
    !r.success && (r.code === 'ECONNREFUSED' || r.error?.includes('ECONNREFUSED'))
  );

  const hasAuthFailed = Object.values(results).some(r =>
    !r.success && (r.code === '28P01' || r.error?.includes('password'))
  );

  const hasSSLProblems = Object.values(results).some(r =>
    !r.success && (r.error?.includes('SSL') || r.error?.includes('certificate'))
  );

  // Диагностика
  if (hasConnectionRefused) {
    log.error('🔴 ПРОБЛЕМА: Сервер не отвечает на подключения');
    console.log('   Возможные причины:');
    console.log('   • PostgreSQL сервер остановлен');
    console.log('   • Firewall блокирует порт 5432');
    console.log('   • Неправильный IP адрес или порт');
    console.log('');
    console.log('   Решения:');
    console.log('   1. Проверьте статус сервера в панели Timeweb Cloud');
    console.log('   2. Перезапустите PostgreSQL сервис');
    console.log('   3. Проверьте настройки firewall');
    console.log('   4. Убедитесь что сервер слушает на правильном IP/порту');
  }

  if (hasAuthFailed) {
    log.error('🔴 ПРОБЛЕМА: Ошибка аутентификации');
    console.log('   Возможные причины:');
    console.log('   • Неправильный пароль');
    console.log('   • Пользователь не существует');
    console.log('   • Пользователь не имеет прав на подключение');
    console.log('');
    console.log('   Решения:');
    console.log('   1. Проверьте учетные данные в панели Timeweb');
    console.log('   2. Сбросьте пароль пользователя gen_user');
    console.log('   3. Проверьте права пользователя');
  }

  if (hasSSLProblems) {
    log.error('🔴 ПРОБЛЕМА: Проблемы с SSL');
    console.log('   Возможные причины:');
    console.log('   • Отсутствует SSL сертификат');
    console.log('   • Неправильный путь к сертификату');
    console.log('   • Сертификат истек или недействителен');
    console.log('');
    console.log('   Решения:');
    console.log('   1. Скачайте SSL сертификат с Timeweb');
    console.log('   2. Установите переменную PGSSLROOTCERT');
    console.log('   3. Используйте sslmode=require или verify-full');
  }

  if (successful > 0) {
    log.success('🟢 НЕКОТОРЫЕ ПОДКЛЮЧЕНИЯ РАБОТАЮТ!');
    console.log('   Найденные рабочие конфигурации:');

    Object.entries(results).forEach(([name, result]) => {
      if (result.success) {
        log.success(`   ✅ ${name}`);
      }
    });
  }

  // Рекомендации
  console.log('');
  log.step('РЕКОМЕНДАЦИИ:');

  if (successful === 0) {
    console.log('1. 🔧 Проверьте статус PostgreSQL сервера в панели Timeweb Cloud');
    console.log('2. 🔧 Перезапустите сервис если он остановлен');
    console.log('3. 🔧 Проверьте настройки firewall и белый список IP');
    console.log('4. 📞 Свяжитесь с поддержкой Timeweb Cloud');
  } else {
    console.log('1. ✅ Используйте рабочую конфигурацию для подключения');
    console.log('2. 🔧 Настройте SSL для production окружения');
    console.log('3. 🚀 Продолжите настройку AI и деплой');
  }

  console.log('');
}

// Основная функция
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 ДИАГНОСТИКА POSTGRESQL TIMEWEB CLOUD');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  try {
    const results = await testAllConfigurations();
    analyzeResults(results);

    console.log('═══════════════════════════════════════════════════════');
    console.log('🏁 ДИАГНОСТИКА ЗАВЕРШЕНА');
    console.log('═══════════════════════════════════════════════════════');

  } catch (error) {
    log.error(`Критическая ошибка: ${error.message}`);
    process.exit(1);
  }
}

// Запуск
main();



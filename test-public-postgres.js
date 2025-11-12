/**
 * Тест подключения к PostgreSQL через публичный IP с SSL
 */
const { Client } = require('pg');
const fs = require('fs');
const https = require('https');

// Конфигурация для публичного IP с SSL
const publicConfig = {
  host: '45.8.96.120',
  port: 5432,
  database: 'default_db',
  user: 'gen_user',
  password: 'q;3U+PY7XCz@Br',
  ssl: {
    rejectUnauthorized: false, // Для тестирования, в продакшене нужен сертификат
  },
  connectionTimeoutMillis: 15000,
};

// Альтернативная конфигурация через connection string
const connectionStringConfig = {
  connectionString: 'postgresql://gen_user:q;3U+PY7XCz@Br@45.8.96.120:5432/default_db',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
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

async function testConnection(config, name) {
  log.step(`Тестирование: ${name}`);

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
        inet_server_port() as port,
        now() as current_time
    `);

    const info = dbInfo.rows[0];
    log.info(`БД: ${info.db}, Пользователь: ${info.user}`);
    log.info(`Сервер: ${info.ip}:${info.port}`);
    log.info(`Время сервера: ${info.current_time}`);

    // Проверка таблиц
    const tablesResult = await client.query(`
      SELECT count(*) as table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    const tableCount = tablesResult.rows[0].table_count;
    log.info(`Количество таблиц: ${tableCount}`);

    client.end();
    return { success: true, version, dbInfo: info, tableCount };

  } catch (error) {
    log.error(`${name}: ${error.message}`);
    if (error.code) {
      log.error(`Код ошибки: ${error.code}`);
    }
    return { success: false, error: error.message, code: error.code };
  }
}

// Функция для скачивания SSL сертификата
async function downloadSSLCert(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve(outputPath);
      });
    }).on('error', (error) => {
      fs.unlink(outputPath, () => {}); // Удалить файл при ошибке
      reject(error);
    });
  });
}

// Основная функция тестирования
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🌐 ТЕСТИРОВАНИЕ ПОДКЛЮЧЕНИЯ К POSTGRESQL');
  console.log('🚀 ЧЕРЕЗ ПУБЛИЧНЫЙ IP TIMEWEB CLOUD');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  log.step('Подключение к: 45.8.96.120:5432');
  log.info('База данных: default_db');
  log.info('Пользователь: gen_user');
  log.info('SSL: rejectUnauthorized: false');
  console.log('');

  // Тест 1: Прямое подключение
  const result1 = await testConnection(publicConfig, 'Прямое подключение с SSL');
  console.log('');

  if (!result1.success) {
    // Тест 2: Через connection string
    log.step('Пробуем альтернативный метод подключения...');
    const result2 = await testConnection(connectionStringConfig, 'Через connection string');
    console.log('');

    if (!result2.success) {
      // Тест 3: Попытка скачать и использовать SSL сертификат
      log.step('Попытка настройки SSL сертификата...');

      try {
        const certPath = './timeweb-root.crt';

        // Пробуем скачать сертификат
        if (!fs.existsSync(certPath)) {
          log.info('Скачивание SSL сертификата...');
          try {
            await downloadSSLCert('https://timeweb.cloud/ssl-cert', certPath);
            log.success('SSL сертификат скачан');
          } catch (downloadError) {
            log.warning(`Не удалось скачать сертификат: ${downloadError.message}`);
          }
        }

        if (fs.existsSync(certPath)) {
          // Тест с сертификатом
          const certConfig = {
            ...publicConfig,
            ssl: {
              ca: fs.readFileSync(certPath).toString(),
              rejectUnauthorized: true,
            }
          };

          const result3 = await testConnection(certConfig, 'С SSL сертификатом');
          console.log('');

          if (result3.success) {
            log.success('✅ ПОДКЛЮЧЕНИЕ С СЕРТИФИКАТОМ УСПЕШНО!');
            return;
          }
        }

      } catch (certError) {
        log.warning(`Ошибка работы с сертификатом: ${certError.message}`);
      }

      // Финальный отчет
      console.log('═══════════════════════════════════════════════════════');
      log.error('❌ ВСЕ МЕТОДЫ ПОДКЛЮЧЕНИЯ ПРОВАЛИЛИСЬ');
      console.log('═══════════════════════════════════════════════════════');
      console.log('');

      console.log('🔍 ПРОБЛЕМЫ:');
      console.log('• Сервер PostgreSQL не отвечает');
      console.log('• Firewall блокирует подключения');
      console.log('• Неправильные учетные данные');
      console.log('• Сервер требует специальной настройки');

      console.log('');
      console.log('🛠️  РЕШЕНИЯ:');

      console.log('');
      console.log('1. 📊 ПРОВЕРЬТЕ СТАТУС СЕРВЕРА:');
      console.log('   • Зайдите в панель Timeweb Cloud');
      console.log('   • Проверьте статус PostgreSQL сервера');
      console.log('   • Перезапустите сервис если он остановлен');

      console.log('');
      console.log('2. 🔒 ПРОВЕРЬТЕ FIREWALL:');
      console.log('   • Убедитесь что порт 5432 открыт');
      console.log('   • Проверьте белый список IP адресов');
      console.log('   • Возможно нужно добавить ваш IP в исключения');

      console.log('');
      console.log('3. 🔐 ПРОВЕРЬТЕ УЧЕТНЫЕ ДАННЫЕ:');
      console.log('   • Проверьте пароль в панели Timeweb');
      console.log('   • Убедитесь что пользователь gen_user активен');
      console.log('   • Проверьте права доступа пользователя');

      console.log('');
      console.log('4. 📞 ОБРАТИТЕСЬ В ПОДДЕРЖКУ:');
      console.log('   • Свяжитесь с Timeweb Cloud support');
      console.log('   • Предоставьте коды ошибок и логи');
      console.log('   • Запросите помощь с настройкой PostgreSQL');

      process.exit(1);

    } else {
      log.success('✅ ПОДКЛЮЧЕНИЕ УСТАНОВЛЕНО ЧЕРЕЗ CONNECTION STRING!');
      console.log('Используйте эту конфигурацию для приложения.');
    }

  } else {
    log.success('✅ ПОДКЛЮЧЕНИЕ УСТАНОВЛЕНО!');
    console.log('Прямая конфигурация работает корректно.');
  }

  // Успешное завершение
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  log.success('🎉 POSTGRESQL ГОТОВ К РАБОТЕ!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('🚀 ГОТОВ К ДЕПЛОЮ НА TIMEWEB CLOUD!');
  console.log('');
  console.log('📋 КОНФИГУРАЦИЯ ДЛЯ ПРИЛОЖЕНИЯ:');
  console.log('DATABASE_URL=postgresql://gen_user:q;3U+PY7XCz@Br@45.8.96.120:5432/default_db');
  console.log('DATABASE_SSL=true (или rejectUnauthorized: false для тестирования)');
}

// Запуск
main().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
});



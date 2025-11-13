/**
 * Тест подключения к Timeweb Cloud сервисам
 */
const { Pool } = require('pg');
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

// Конфигурация Timeweb
const timewebConfig = {
  // DATABASE
  database: {
    host: '51e6e5ca5d967b8e81fc9b75.twc1.net',
    port: 5432,
    database: 'default_db',
    user: 'gen_user',
    password: 'q;3U+PY7XCz@Br',
    ssl: false, // Попробуем без SSL сначала
    connectionTimeoutMillis: 5000,
  },

  // ALTERNATIVE DATABASE (PUBLIC IP)
  databasePublic: {
    url: 'postgresql://gen_user:q;3U+PY7XCz@Br@45.8.96.120:5432/default_db',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  },

  // S3 STORAGE
  s3: {
    endpoint: 'https://s3.twcstorage.ru',
    region: 'ru-1',
    credentials: {
      accessKeyId: 'F2CP4X3X17GVQ1YH5I5D',
      secretAccessKey: '72iAsYR4QQCIdaDI9e9AzXnzVvvP8bvPELmrBVzX',
    },
    forcePathStyle: true,
  },

  // TIMEWEB AI
  ai: {
    agentId: '3933ea81-05e2-470e-80de-80dc67c1101f',
    url: 'https://agent.timeweb.cloud/api/v1/cloud-ai/agents/3933ea81-05e2-470e-80de-80dc67c1101f/v1',
    token: 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6IjFrYnhacFJNQGJSI0tSbE1xS1lqIn0.eyJ1c2VyIjoicGE0MjIxMDgiLCJ0eXBlIjoiYXBpX2tleSIsImFwaV9rZXlfaWQiOiI0MmZmZTY1MC02OWI4LTRmZmQtYTFkOC02OWRkMjMwM2QyY2MiLCJpYXQiOjE3NjE3ODUzNDl9.SFHpwgy9kr-EH2CwN6K1REkOl7KCpiUnMk5ivTRljEaWl8iE-B-BMjaJxaFhpdB2dqcb33ky2oyfwxkU1Sszrbo-8UINnFO5SothY4P6WC8kSSHxFlLI2i0xGCa3YzgyYZ1Wgn2a0jf__ZcyZi7ZsaJkuold9NAeeGCCrAUbdVsr39-fLDL_EKh0iekq_tuO59f_BCmg7Poe7xKlmNYzu2hy3GnfNp3ueKW52H6kFkGwibixS3tWKCHkPpyTAjRztWKCnDZOOG6xDk4sSiPPMlZOEfFzzkpKkizQ9CykBC06SXwmT2uPRR2NyZJIY-PZd4AVZ34H1jXQ-NGquRPi_aYiywt3LtOVDRarpVErBdk6I0qO0Yf33zICvMN-yFpXuY_oSlE8v3C-02XHnYLsMXcHTsUB4ISkJrhglBkv-hTzuiQxwAEZp0eHOEq8YNz6qOLU3RcaNgg0DWGXMDrMzObYx2NknrZUCMbRFftIU-C1Ilo8Ayy98MwI3J77X62p'
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
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}▶️  ${msg}${colors.reset}`),
};

async function testDatabaseConnection(dbConfig, name) {
  log.step(`Тестирование подключения к БД: ${name}`);

  // Если это объект конфигурации, преобразуем в connection string
  let poolConfig = dbConfig;
  if (dbConfig.host) {
    poolConfig = {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      ssl: dbConfig.ssl,
      connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
    };
  }

  const pool = new Pool(poolConfig);

  try {
    const client = await pool.connect();
    log.success('Подключение к БД установлено!');

    // Проверяем версию PostgreSQL
    const versionResult = await client.query('SELECT version()');
    const version = versionResult.rows[0].version.split(',')[0];
    log.success(`PostgreSQL версия: ${version}`);

    // Проверяем текущую БД
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
    log.success(`Сервер: ${dbInfo.server_ip}:${dbInfo.server_port}`);

    // Проверяем существующие таблицы
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length === 0) {
      log.warning('Таблицы не найдены в базе данных');
    } else {
      log.success(`Найдено таблиц: ${tablesResult.rows.length}`);
      console.log('📋 Список таблиц:');
      tablesResult.rows.slice(0, 10).forEach(row => {
        console.log(`   • ${row.table_name}`);
      });
      if (tablesResult.rows.length > 10) {
        console.log(`   ... и ещё ${tablesResult.rows.length - 10} таблиц`);
      }
    }

    client.release();
    await pool.end();
    return true;

  } catch (error) {
    log.error(`Ошибка подключения к БД: ${error.message}`);
    if (error.code) {
      log.error(`Код ошибки: ${error.code}`);
    }
    return false;
  }
}

async function testS3Connection() {
  log.step('Тестирование подключения к S3 хранилищу');

  const s3Client = new S3Client(timewebConfig.s3);

  try {
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);

    log.success('Подключение к S3 установлено!');
    log.success(`Найдено бакетов: ${response.Buckets?.length || 0}`);

    if (response.Buckets) {
      response.Buckets.forEach(bucket => {
        console.log(`   • ${bucket.Name} (создан: ${bucket.CreationDate})`);
      });
    }

    // Проверяем наш бакет
    const ourBucket = response.Buckets?.find(b => b.Name === timewebConfig.s3.bucket);
    if (ourBucket) {
      log.success(`Наш бакет найден: ${timewebConfig.s3.bucket}`);
    } else {
      log.warning(`Наш бакет не найден: ${timewebConfig.s3.bucket}`);
    }

    return true;

  } catch (error) {
    log.error(`Ошибка подключения к S3: ${error.message}`);
    return false;
  }
}

async function testAIConnection() {
  log.step('Тестирование подключения к Timeweb AI');

  try {
    const response = await fetch(timewebConfig.ai.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${timewebConfig.ai.token}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Привет! Ты работаешь?'
          }
        ],
        max_tokens: 100,
        temperature: 0.3
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || data?.response || data?.answer || 'Ответ получен';
      log.success('Timeweb AI отвечает!');
      log.success(`Ответ: ${content.substring(0, 50)}...`);
      return true;
    } else {
      log.error(`HTTP ошибка: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('Детали ошибки:', errorText.substring(0, 200));
      return false;
    }

  } catch (error) {
    log.error(`Ошибка подключения к AI: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('☁️  ТЕСТИРОВАНИЕ ПОДКЛЮЧЕНИЯ К TIMEWEB CLOUD');
  console.log('═══════════════════════════════════════════════════════\n');

  const results = {
    databaseInternal: false,
    databasePublic: false,
    s3: false,
    ai: false,
  };

  // Тестируем БД (внутренний хост)
  results.databaseInternal = await testDatabaseConnection(timewebConfig.database, 'Внутренний хост');
  console.log('');

  // Тестируем БД (публичный IP) - если внутренний не сработал
  if (!results.databaseInternal) {
    results.databasePublic = await testDatabaseConnection(timewebConfig.databasePublic, 'Публичный IP');
    console.log('');
  }

  // Тестируем S3
  results.s3 = await testS3Connection();
  console.log('');

  // Тестируем AI
  results.ai = await testAIConnection();
  console.log('');

  // ИТОГИ
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
  console.log('═══════════════════════════════════════════════════════');

  const successCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;

  console.log(`\n✅ Успешных подключений: ${successCount}/${totalCount}`);

  if (results.databaseInternal || results.databasePublic) {
    log.success('База данных PostgreSQL: ДОСТУПНА');
  } else {
    log.error('База данных PostgreSQL: НЕДОСТУПНА');
  }

  if (results.s3) {
    log.success('S3 хранилище: ДОСТУПНО');
  } else {
    log.error('S3 хранилище: НЕДОСТУПНО');
  }

  if (results.ai) {
    log.success('Timeweb AI: ДОСТУПЕН');
  } else {
    log.error('Timeweb AI: НЕДОСТУПЕН');
  }

  console.log('\n═══════════════════════════════════════════════════════');

  if (successCount === totalCount) {
    log.success('🎉 ВСЕ СЕРВИСЫ TIMEWEB CLOUD ДОСТУПНЫ!');
    console.log('\n🚀 ГОТОВ К ДЕПЛОЮ НА TIMEWEB CLOUD!');
  } else if (successCount >= 2) {
    log.success('✅ ОСНОВНЫЕ СЕРВИСЫ РАБОТАЮТ!');
    console.log('\n⚠️  Некоторые сервисы требуют настройки, но можно продолжать деплой.');
  } else {
    log.error('❌ ПРОБЛЕМЫ С ПОДКЛЮЧЕНИЕМ!');
    console.log('\n🔧 Проверьте:');
    console.log('   • Доступность серверов Timeweb');
    console.log('   • Корректность учетных данных');
    console.log('   • Настройки firewall');
    console.log('   • SSL сертификаты для PostgreSQL');
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
}

// Запуск тестирования
main().catch(error => {
  log.error(`Критическая ошибка: ${error.message}`);
  process.exit(1);
});

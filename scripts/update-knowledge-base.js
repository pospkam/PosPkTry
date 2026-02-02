/**
 * Скрипт для обновления базы знаний Timeweb AI агента
 * Использование: node scripts/update-knowledge-base.js [type]
 * type: auto (по умолчанию) - собрать документы из проекта
 * type: file <file_path> - загрузить конкретный файл
 */

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

// Настройка S3 клиента для Timeweb Cloud
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'ru-1',
  endpoint: process.env.S3_ENDPOINT || 'https://s3.twcstorage.ru',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'F2CP4X3X17GVQ1YH5I5D',
    secretAccessKey: process.env.S3_SECRET_KEY || '72iAsYR4QQCIdaDI9e9AzXnzVvvP8bvPELmrBVzX',
  },
  forcePathStyle: true,
});

// Структура документа базы знаний
// interface KnowledgeDocument {
//   id: string;
//   title: string;
//   content: string;
//   category: string;
//   lastUpdated: string;
//   source: string;
//   url?: string;
// }

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
  success: (msg) => console.log(`${colors.green}[] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[] ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}!  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}i  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}▶  ${msg}${colors.reset}`),
};

// Получить все документы для базы знаний
async function collectProjectDocuments() {
  const documents = [];

  // Основные документы проекта
  const docPaths = [
    'README.md',
    'docs/AI_ASSISTANTS_GUIDE.md',
    'docs/ROLES_IMPLEMENTATION_PLAN.md',
    'docs/DEPLOYMENT_READY.md',
    'ЧЕСТНАЯ_ПРОВЕРКА_ЗАГЛУШЕК.md',
    'ФИНАЛЬНЫЙ_ОТЧЁТ_ДОРАБОТКИ_ДО_100.md',
  ];

  for (const docPath of docPaths) {
    try {
      const fullPath = path.join(process.cwd(), docPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const title = path.basename(docPath, path.extname(docPath));

        documents.push({
          id: `doc_${title.toLowerCase().replace(/\s+/g, '_')}`,
          title: title.replace(/_/g, ' '),
          content: content,
          category: 'documentation',
          lastUpdated: new Date().toISOString(),
          source: docPath,
        });
      }
    } catch (error) {
      log.error(`Ошибка чтения ${docPath}: ${error.message}`);
    }
  }

  // Попробуем подключиться к БД и получить данные
  try {
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    await client.connect();

    // Информация о турах
    const toursResult = await client.query(`
      SELECT
        id,
        name,
        description,
        price,
        duration,
        difficulty,
        location,
        category
      FROM tours
      LIMIT 50
    `);

    toursResult.rows.forEach((tour) => {
      documents.push({
        id: `tour_${tour.id}`,
        title: `Тур: ${tour.name}`,
        content: `
Название: ${tour.name}
Описание: ${tour.description || 'Нет описания'}
Цена: ${tour.price} ₽
Длительность: ${tour.duration} дней
Сложность: ${tour.difficulty || 'Не указана'}
Местоположение: ${tour.location || 'Камчатка'}
Категория: ${tour.category || 'Экскурсионный'}
        `,
        category: 'tours',
        lastUpdated: new Date().toISOString(),
        source: 'database_tours',
      });
    });

    // Информация о партнерах/операторах
    const operatorsResult = await client.query(`
      SELECT
        id,
        name,
        description,
        contact_info,
        specialization,
        rating
      FROM partners
      WHERE role = 'operator'
      LIMIT 20
    `);

    operatorsResult.rows.forEach((operator) => {
      documents.push({
        id: `operator_${operator.id}`,
        title: `Оператор: ${operator.name}`,
        content: `
Название: ${operator.name}
Описание: ${operator.description || 'Нет описания'}
Специализация: ${operator.specialization || 'Туры'}
Контакты: ${operator.contact_info || 'Не указаны'}
Рейтинг: ${operator.rating || 'Не оценен'}
        `,
        category: 'operators',
        lastUpdated: new Date().toISOString(),
        source: 'database_operators',
      });
    });

    await client.end();
  } catch (error) {
    log.warning(`Не удалось подключиться к БД для получения данных: ${error.message}`);
  }

  return documents;
}

// Загрузить файл в S3 хранилище
async function uploadToS3(filePath, fileName) {
  try {
    const fileContent = fs.readFileSync(filePath);

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET || 'd9542536-676ee691-7f59-46bb-bf0e-ab64230eec50',
      Key: `knowledge-base/${fileName}`,
      Body: fileContent,
      ContentType: 'text/plain',
      ACL: 'public-read',
    });

    await s3Client.send(command);

    const fileUrl = `${process.env.S3_ENDPOINT || 'https://s3.twcstorage.ru'}/${process.env.S3_BUCKET || 'd9542536-676ee691-7f59-46bb-bf0e-ab64230eec50'}/knowledge-base/${fileName}`;
    return fileUrl;
  } catch (error) {
    log.error(`Ошибка загрузки в S3: ${error.message}`);
    throw error;
  }
}

// Обновить базу знаний Timeweb AI
async function updateKnowledgeBase(documents) {
  const agentId = process.env.TIMEWEB_AI_AGENT_ID || '3933ea81-05e2-470e-80de-80dc67c1101f';
  const token = process.env.TIMEWEB_API_TOKEN;
  const apiUrl = 'https://api.timeweb.cloud/v1/cloud-ai/knowledge-base';

  if (!token) {
    throw new Error('TIMEWEB_API_TOKEN не найден');
  }

  try {
    // Разбиваем документы на чанки для отправки
    const chunks = [];
    const chunkSize = parseInt(process.env.KNOWLEDGE_BASE_CHUNK_SIZE || '10');

    for (let i = 0; i < documents.length; i += chunkSize) {
      chunks.push(documents.slice(i, i + chunkSize));
    }

    log.info(`Отправка ${documents.length} документов в ${chunks.length} чанках`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentId: agentId,
          documents: chunk,
          chunkIndex: i,
          totalChunks: chunks.length,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      log.success(`Чанк ${i + 1}/${chunks.length} отправлен: ${result.message || 'OK'}`);

      // Небольшая задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return true;
  } catch (error) {
    log.error(`Ошибка обновления базы знаний: ${error.message}`);
    return false;
  }
}

// Основная функция
async function main() {
  const args = process.argv.slice(2);
  const updateType = args[0] || 'auto';

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' ОБНОВЛЕНИЕ БАЗЫ ЗНАНИЙ TIMEWEB AI');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    let documents = [];

    if (updateType === 'file') {
      const filePath = args[1];
      if (!filePath) {
        log.error('Укажите путь к файлу: node scripts/update-knowledge-base.js file <file_path>');
        process.exit(1);
      }

      if (!fs.existsSync(filePath)) {
        log.error(`Файл не найден: ${filePath}`);
        process.exit(1);
      }

      log.step(`Загрузка файла: ${filePath}`);

      // Загружаем файл в S3
      const fileName = `${Date.now()}_${path.basename(filePath)}`;
      const fileUrl = await uploadToS3(filePath, fileName);

      // Читаем содержимое файла
      const content = fs.readFileSync(filePath, 'utf-8');

      documents.push({
        id: `file_${Date.now()}`,
        title: path.basename(filePath),
        content: content,
        category: 'uploaded_files',
        lastUpdated: new Date().toISOString(),
        source: fileUrl,
        url: fileUrl,
      });

      log.success(`Файл загружен в S3: ${fileUrl}`);

    } else if (updateType === 'auto') {
      log.step('Сбор документов из проекта...');
      documents = await collectProjectDocuments();
      log.success(`Собрано ${documents.length} документов`);

    } else {
      log.error('Неверный тип обновления. Используйте: auto или file <file_path>');
      process.exit(1);
    }

    // Ограничиваем количество документов
    const maxDocs = parseInt(process.env.KNOWLEDGE_BASE_MAX_DOCS || '100');
    const limitedDocuments = documents.slice(0, maxDocs);

    if (documents.length > maxDocs) {
      log.warning(`Ограничено до ${maxDocs} документов (было ${documents.length})`);
    }

    // Обновляем базу знаний
    log.step('Обновление базы знаний агента...');
    const success = await updateKnowledgeBase(limitedDocuments);

    if (success) {
      console.log('\n═══════════════════════════════════════════════════════');
      log.success('[] БАЗА ЗНАНИЙ УСПЕШНО ОБНОВЛЕНА!');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`\n  Статистика:`);
      console.log(`   • Обработано документов: ${limitedDocuments.length}`);
      console.log(`   • Тип обновления: ${updateType}`);
      console.log(`   • Агент ID: ${process.env.TIMEWEB_AI_AGENT_ID || '3933ea81-05e2-470e-80de-80dc67c1101f'}`);
      console.log('\n AI агент теперь имеет актуальную информацию о проекте!');
    } else {
      console.log('\n═══════════════════════════════════════════════════════');
      log.error('[] ОШИБКА ОБНОВЛЕНИЯ БАЗЫ ЗНАНИЙ');
      console.log('═══════════════════════════════════════════════════════');
      process.exit(1);
    }

  } catch (error) {
    log.error(`Критическая ошибка: ${error.message}`);
    process.exit(1);
  }
}

// Запуск
main();

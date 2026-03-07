/**
 * Импорт туров "Камчатская Рыбалка" в PostgreSQL
 * 
 * Использует единую схему из types/tours.ts
 * Загружает данные из fishingkam-tours.json
 * 
 * @author KamchatourHub
 * @date 2026-03-07
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// ============================================================================
// КОНФИГУРАЦИЯ
// ============================================================================

const INPUT_FILE = path.join(__dirname, '..', 'fishingkam-tours.json');

const DB_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') 
    ? { rejectUnauthorized: false } 
    : false,
};

// Маппинг из types/tours.ts
const DIFFICULTY_VALUES = ['easy', 'medium', 'hard'];
const CATEGORY_VALUES = [
  'volcanoes', 'fishing', 'thermal', 'mountains', 'geysers',
  'rivers', 'lakes', 'eco', 'adventure', 'combo', 'snowmobile',
  'jeep', 'wildlife', 'cultural',
];

// ============================================================================
// ВАЛИДАЦИЯ
// ============================================================================

/**
 * Валидирует тур перед вставкой
 */
function validateTour(tour, index) {
  const errors = [];

  if (!tour.name || tour.name.length === 0) {
    errors.push(`Тур #${index}: отсутствует название`);
  }
  if (!tour.description || tour.description.length === 0) {
    errors.push(`Тур #${index}: отсутствует описание`);
  }
  if (!tour.difficulty || !DIFFICULTY_VALUES.includes(tour.difficulty)) {
    errors.push(`Тур #${index}: невалидная сложность "${tour.difficulty}"`);
  }
  if (!tour.duration || tour.duration <= 0) {
    errors.push(`Тур #${index}: невалидная длительность "${tour.duration}"`);
  }
  if (tour.price === undefined || tour.price < 0) {
    errors.push(`Тур #${index}: невалидная цена "${tour.price}"`);
  }
  if (tour.category && !CATEGORY_VALUES.includes(tour.category)) {
    errors.push(`Тур #${index}: невалидная категория "${tour.category}"`);
  }

  return errors;
}

// ============================================================================
// ИМПОРТ
// ============================================================================

/**
 * Импортирует туры в БД
 */
async function importTours(client, tours) {
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < tours.length; i++) {
    const tour = tours[i];
    const tourNum = i + 1;

    console.log(`\n[${tourNum}/${tours.length}] ${tour.name}`);

    // Валидация
    const validationErrors = validateTour(tour, tourNum);
    if (validationErrors.length > 0) {
      console.error(`  ✗ Ошибки валидации:`);
      validationErrors.forEach(err => console.error(`    - ${err}`));
      errors++;
      continue;
    }

    try {
      // Проверяем дубликаты по названию
      const duplicateCheck = await client.query(
        'SELECT id FROM tours WHERE name = $1 LIMIT 1',
        [tour.name]
      );

      if (duplicateCheck.rows.length > 0) {
        console.log(`  ⊘ Пропущен (дубликат)`);
        skipped++;
        continue;
      }

      // Вставка
      const query = `
        INSERT INTO tours (
          name,
          description,
          short_description,
          difficulty,
          duration,
          price,
          currency,
          category,
          season,
          coordinates,
          max_group_size,
          min_group_size,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
        )
        RETURNING id
      `;

      const values = [
        tour.name,
        tour.description,
        tour.short_description || tour.description.substring(0, 200),
        tour.difficulty,
        tour.duration,
        tour.price,
        tour.currency || 'RUB',
        tour.category || 'fishing',
        tour.season ? JSON.stringify(tour.season) : JSON.stringify(['summer']),
        tour.coordinates ? JSON.stringify(tour.coordinates) : null,
        tour.max_group_size || 20,
        tour.min_group_size || 1,
        tour.is_active !== false, // По умолчанию true
      ];

      const result = await client.query(query, values);
      const tourId = result.rows[0].id;

      console.log(`  ✓ Импортирован (ID: ${tourId})`);
      console.log(`    Цена: ${tour.price}₽, Длительность: ${tour.duration}ч, Сложность: ${tour.difficulty}`);
      imported++;

    } catch (err) {
      console.error(`  ✗ Ошибка вставки: ${err.message}`);
      errors++;
    }
  }

  return { imported, skipped, errors };
}

/**
 * Основная функция
 */
async function main() {
  console.log('='.repeat(80));
  console.log('Импорт туров "Камчатская Рыбалка" в PostgreSQL');
  console.log('='.repeat(80));

  // 1. Проверяем файл
  console.log('\n[1/3] Проверка входного файла...');
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Файл не найден: ${INPUT_FILE}\n\nСначала запустите: node scripts/parse-fishingkam-tilda.js`);
  }

  const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  console.log(`✓ Файл загружен: ${data.count} туров`);
  console.log(`  Источник: ${data.source}`);
  console.log(`  Дата парсинга: ${data.parsed_at}`);

  // 2. Подключение к БД
  console.log('\n[2/3] Подключение к базе данных...');
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log(`✓ Подключено к БД`);

    // Проверяем таблицу
    const tableCheck = await client.query(`
      SELECT COUNT(*) as count FROM tours
    `);
    console.log(`  Текущих туров в БД: ${tableCheck.rows[0].count}`);

    // 3. Импорт
    console.log('\n[3/3] Импорт туров...');
    const stats = await importTours(client, data.tours);

    // Итоги
    console.log('\n' + '='.repeat(80));
    console.log('РЕЗУЛЬТАТ');
    console.log('='.repeat(80));
    console.log(`Всего туров:        ${data.tours.length}`);
    console.log(`✓ Импортировано:    ${stats.imported}`);
    console.log(`⊘ Пропущено:        ${stats.skipped} (дубликаты)`);
    console.log(`✗ Ошибок:           ${stats.errors}`);

    if (stats.imported > 0) {
      const newCount = await client.query('SELECT COUNT(*) as count FROM tours');
      console.log(`\nТеперь в БД:        ${newCount.rows[0].count} туров`);
      console.log('\n✅ Импорт завершён успешно!');
    } else {
      console.log('\n⚠️  Ни один тур не был импортирован');
    }

  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// ============================================================================
// ЗАПУСК
// ============================================================================

if (require.main === module) {
  main();
}

module.exports = { validateTour, importTours };

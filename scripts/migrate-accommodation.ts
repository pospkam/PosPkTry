/**
 * Миграция: Добавление таблиц размещения (accommodation)
 * 
 * Создает:
 * - accommodations (размещение)
 * - accommodation_rooms (номера)
 * - accommodation_bookings (бронирования)
 * - accommodation_reviews (отзывы)
 * 
 * Использование:
 * npm run migrate:accommodation
 * или
 * tsx scripts/migrate-accommodation.ts
 */

import { query, getPool } from '../lib/database';
import fs from 'fs';
import path from 'path';

async function migrate() {
  console.log('🚀 Начинаем миграцию accommodation...\n');

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Читаем SQL файл
    const schemaPath = path.join(__dirname, '../lib/database/accommodation_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    // Разбиваем на отдельные команды
    const commands = schemaSql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 Найдено ${commands.length} SQL команд\n`);

    // Выполняем каждую команду
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      
      // Определяем тип команды
      let cmdType = 'UNKNOWN';
      if (cmd.includes('CREATE TABLE')) cmdType = 'CREATE TABLE';
      else if (cmd.includes('CREATE INDEX')) cmdType = 'CREATE INDEX';
      else if (cmd.includes('CREATE TRIGGER')) cmdType = 'CREATE TRIGGER';
      else if (cmd.includes('CREATE FUNCTION')) cmdType = 'CREATE FUNCTION';
      
      // Извлекаем имя объекта
      const nameMatch = cmd.match(/(?:TABLE|INDEX|TRIGGER|FUNCTION)\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
      const objName = nameMatch ? nameMatch[1] : '???';
      
      console.log(`[${i + 1}/${commands.length}] ${cmdType} ${objName}...`);
      
      try {
        await client.query(cmd + ';');
        console.log(`  ✅ Успешно\n`);
      } catch (error: any) {
        // Игнорируем ошибки "already exists"
        if (error.message.includes('already exists')) {
          console.log(`  ⚠️  Уже существует (пропущено)\n`);
        } else {
          throw error;
        }
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Миграция успешно завершена!');
    console.log('\n📊 Созданные таблицы:');
    console.log('  - accommodations');
    console.log('  - accommodation_rooms');
    console.log('  - accommodation_bookings');
    console.log('  - accommodation_reviews');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Ошибка миграции:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Проверка таблиц
async function verifyTables() {
  console.log('\n🔍 Проверка созданных таблиц...\n');

  const tables = [
    'accommodations',
    'accommodation_rooms',
    'accommodation_bookings',
    'accommodation_reviews'
  ];

  for (const table of tables) {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as row_count,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = $1) as column_count
        FROM ${table}
      `, [table]);

      console.log(`✅ ${table}:`);
      console.log(`   Строк: ${result.rows[0].row_count}`);
      console.log(`   Колонок: ${result.rows[0].column_count}`);
    } catch (error: any) {
      console.log(`❌ ${table}: Не найдена`);
    }
  }
}

// Добавление тестовых данных
async function seedTestData() {
  console.log('\n🌱 Добавление тестовых данных...\n');

  try {
    // Проверяем есть ли уже партнёр типа 'stay'
    const partnerCheck = await query(`
      SELECT id FROM partners WHERE category = 'stay' LIMIT 1
    `);

    let partnerId: string;

    if (partnerCheck.rows.length === 0) {
      // Создаем партнёра
      const partnerResult = await query(`
        INSERT INTO partners (name, category, description, contact, is_verified)
        VALUES (
          'Гостиница "Петропавловск"',
          'stay',
          'Комфортабельная гостиница в центре города',
          '{"phone": "+7 (4152) 123-456", "email": "hotel@example.com"}',
          true
        )
        RETURNING id
      `);
      partnerId = partnerResult.rows[0].id;
      console.log('  ✅ Создан партнёр (гостиница)');
    } else {
      partnerId = partnerCheck.rows[0].id;
      console.log('  ℹ️  Партнёр уже существует');
    }

    // Добавляем размещение
    const accommodationResult = await query(`
      INSERT INTO accommodations (
        partner_id,
        name,
        type,
        description,
        short_description,
        address,
        coordinates,
        location_zone,
        star_rating,
        total_rooms,
        amenities,
        languages,
        price_per_night_from,
        price_per_night_to,
        rating,
        review_count,
        is_active,
        is_verified
      )
      VALUES (
        $1,
        'Гостиница "Петропавловск"',
        'hotel',
        'Современная гостиница в центре Петропавловска-Камчатского с видом на вулканы. Комфортабельные номера, ресторан, парковка.',
        'Комфортная гостиница в центре города',
        'ул. Ленинская, 61, Петропавловск-Камчатский',
        '{"lat": 53.0186, "lng": 158.6507}',
        'city_center',
        3,
        50,
        '["wifi", "parking", "breakfast", "restaurant", "bar"]',
        '["ru", "en"]',
        3000,
        8000,
        4.2,
        47,
        true,
        true
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [partnerId]);

    if (accommodationResult.rows.length > 0) {
      const accommodationId = accommodationResult.rows[0].id;
      console.log('  ✅ Создано размещение');

      // Добавляем номера
      await query(`
        INSERT INTO accommodation_rooms (
          accommodation_id,
          name,
          room_type,
          description,
          size_sqm,
          max_guests,
          beds_configuration,
          amenities,
          view,
          available_rooms,
          price_per_night
        )
        VALUES 
        (
          $1,
          'Стандартный одноместный',
          'single',
          'Уютный номер с односпальной кроватью',
          18,
          1,
          '[{"type": "single", "count": 1}]',
          '["wifi", "tv", "minibar", "bathroom"]',
          'city',
          10,
          3000
        ),
        (
          $1,
          'Стандартный двухместный',
          'double',
          'Комфортный номер с двуспальной кроватью',
          22,
          2,
          '[{"type": "double", "count": 1}]',
          '["wifi", "tv", "minibar", "bathroom", "bathtub"]',
          'city',
          15,
          4500
        ),
        (
          $1,
          'Люкс с видом на вулканы',
          'suite',
          'Просторный люкс с панорамным видом на вулканы',
          45,
          2,
          '[{"type": "king", "count": 1}]',
          '["wifi", "tv", "minibar", "bathroom", "bathtub", "balcony", "safe"]',
          'volcano',
          5,
          8000
        )
        ON CONFLICT DO NOTHING
      `, [accommodationId]);

      console.log('  ✅ Созданы номера (3 типа)');
    } else {
      console.log('  ℹ️  Размещение уже существует');
    }

    console.log('\n✅ Тестовые данные добавлены!');

  } catch (error) {
    console.error('\n❌ Ошибка добавления тестовых данных:', error);
  }
}

// Главная функция
async function main() {
  try {
    await migrate();
    await verifyTables();
    
    // Спрашиваем о добавлении тестовых данных
    console.log('\n❓ Добавить тестовые данные? (y/n)');
    console.log('   (Для автоматического добавления запустите: tsx scripts/migrate-accommodation.ts --seed)');
    
    const shouldSeed = process.argv.includes('--seed') || process.argv.includes('-s');
    
    if (shouldSeed) {
      await seedTestData();
    }

    console.log('\n🎉 Готово!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Критическая ошибка:', error);
    process.exit(1);
  }
}

main();

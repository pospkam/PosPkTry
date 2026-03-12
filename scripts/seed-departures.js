#!/usr/bin/env node
/**
 * Создаёт тестовые заезды (tour_departures) для 11 туров fishingkam.ru
 * По 1–3 заезда на тур = ~20 заездов с реалистичными датами.
 *
 * Запуск: node scripts/seed-departures.js
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const DB_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
};

/**
 * Заезды привязаны к сезону тура.
 * external_id → массив заездов [{startDate, endDate, slots, priceOverride?, notes?}]
 */
const DEPARTURES = [
  // Зимняя рыбалка (январь-март) — winter-1
  { external_id: 'winter-1', departures: [
    { start: '2026-01-15', end: '2026-01-16', slots: 10, notes: 'Открытие зимнего сезона' },
    { start: '2026-02-14', end: '2026-02-15', slots: 8, notes: 'Выходные, ожидается полная группа' },
    { start: '2026-03-07', end: '2026-03-08', slots: 10 },
  ]},
  // Зимняя рыбалка (февраль-апрель) — winter-2
  { external_id: 'winter-2', departures: [
    { start: '2026-02-21', end: '2026-02-22', slots: 10 },
    { start: '2026-03-21', end: '2026-03-22', slots: 10 },
    { start: '2026-04-04', end: '2026-04-05', slots: 8, notes: 'Последний зимний заезд' },
  ]},
  // Летняя рыбалка на чавычу и нерку — summer-1
  { external_id: 'summer-1', departures: [
    { start: '2026-06-15', end: '2026-06-16', slots: 10, notes: 'Начало хода чавычи' },
    { start: '2026-07-01', end: '2026-07-02', slots: 10 },
    { start: '2026-07-15', end: '2026-07-16', slots: 10, notes: 'Пик сезона чавычи' },
  ]},
  // Летняя рыбалка на кижуча — summer-2
  { external_id: 'summer-2', departures: [
    { start: '2026-08-15', end: '2026-08-16', slots: 10 },
    { start: '2026-09-01', end: '2026-09-02', slots: 10, notes: 'Начало хода кижуча' },
  ]},
  // Осенняя рыбалка (октябрь-ноябрь) — autumn-1
  { external_id: 'autumn-1', departures: [
    { start: '2026-10-03', end: '2026-10-04', slots: 10 },
    { start: '2026-10-17', end: '2026-10-18', slots: 8 },
  ]},
  // Зимняя рыбалка (ноябрь-январь) — winter-late
  { external_id: 'winter-late', departures: [
    { start: '2026-11-14', end: '2026-11-15', slots: 10, notes: 'Первый зимний заезд' },
    { start: '2026-12-12', end: '2026-12-13', slots: 10 },
  ]},
  // Многодневный зимний тур (3 дня) — multi-winter-3
  { external_id: 'multi-winter-3', departures: [
    { start: '2026-02-06', end: '2026-02-08', slots: 10, notes: '3-дневный зимний тур' },
    { start: '2026-03-13', end: '2026-03-15', slots: 8 },
  ]},
  // Многодневный летний тур (5 дней) — multi-summer-5
  { external_id: 'multi-summer-5', departures: [
    { start: '2026-07-06', end: '2026-07-10', slots: 10, notes: '5-дневный летний тур' },
    { start: '2026-08-03', end: '2026-08-07', slots: 10 },
  ]},
  // Недельный рыболовный тур (7 дней) — multi-week
  { external_id: 'multi-week', departures: [
    { start: '2026-07-20', end: '2026-07-26', slots: 8, notes: 'Неделя рыбалки — полный сезон' },
  ]},
  // Семейный тур выходного дня — family-weekend
  { external_id: 'family-weekend', departures: [
    { start: '2026-06-27', end: '2026-06-28', slots: 6, notes: 'Семейный выходной' },
    { start: '2026-07-11', end: '2026-07-12', slots: 6 },
  ]},
  // Семейный недельный тур — family-week
  { external_id: 'family-week', departures: [
    { start: '2026-07-13', end: '2026-07-19', slots: 8, notes: 'Семейная неделя на базе' },
  ]},
];

async function main() {
  console.log('='.repeat(60));
  console.log('Сид заездов для fishingkam.ru туров');
  console.log('='.repeat(60));

  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('✓ Подключено к БД\n');

    // Получаем маппинг external_id → tour UUID
    // external_id хранится в описании как маркер (winter-1, summer-1, etc.)
    // Но у нас нет external_id в tours — найдём по имени
    const TOUR_NAMES = {
      'winter-1':        'Зимняя рыбалка (январь-март)',
      'winter-2':        'Зимняя рыбалка (февраль-апрель)',
      'summer-1':        'Летняя рыбалка на чавычу и нерку',
      'summer-2':        'Летняя рыбалка на кижуча',
      'autumn-1':        'Осенняя рыбалка (октябрь-ноябрь)',
      'winter-late':     'Зимняя рыбалка (ноябрь-январь)',
      'multi-winter-3':  'Многодневный зимний тур (3 дня)',
      'multi-summer-5':  'Многодневный летний тур (5 дней)',
      'multi-week':      'Недельный рыболовный тур (7 дней)',
      'family-weekend':  'Семейный тур выходного дня',
      'family-week':     'Семейный недельный тур',
    };

    const toursResult = await client.query(
      "SELECT id, name FROM tours WHERE category = 'fishing'"
    );

    const tourMap = {};
    for (const row of toursResult.rows) {
      for (const [extId, name] of Object.entries(TOUR_NAMES)) {
        if (row.name === name) {
          tourMap[extId] = row.id;
        }
      }
    }

    console.log(`Найдено ${Object.keys(tourMap).length} туров из ${Object.keys(TOUR_NAMES).length}\n`);

    let created = 0;
    let skipped = 0;

    for (const entry of DEPARTURES) {
      const tourId = tourMap[entry.external_id];
      if (!tourId) {
        console.log(`  ✗ Тур ${entry.external_id} не найден в БД — пропуск`);
        skipped += entry.departures.length;
        continue;
      }

      for (const dep of entry.departures) {
        // Проверяем дубликат
        const dupCheck = await client.query(
          'SELECT id FROM tour_departures WHERE tour_id = $1 AND start_date = $2',
          [tourId, dep.start]
        );

        if (dupCheck.rows.length > 0) {
          console.log(`  ⊘ ${entry.external_id} ${dep.start} (дубликат)`);
          skipped++;
          continue;
        }

        await client.query(
          `INSERT INTO tour_departures (tour_id, start_date, end_date, available_slots, price_override, min_group_size, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            tourId,
            dep.start,
            dep.end || null,
            dep.slots || 10,
            dep.priceOverride || null,
            dep.minGroup || 5,
            dep.notes || null,
          ]
        );
        console.log(`  ✓ ${entry.external_id} → ${dep.start}`);
        created++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Создано: ${created} заездов`);
    console.log(`Пропущено: ${skipped}`);

    const total = await client.query('SELECT COUNT(*) as c FROM tour_departures');
    console.log(`Всего в tour_departures: ${total.rows[0].c}`);
    console.log('\n✅ Готово!');

  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main();
}

#!/usr/bin/env tsx
/**
 * Диагностика БД: миграции, таблицы, данные, целостность
 * Запуск: DATABASE_URL="..." npx tsx scripts/db-check.ts
 */

import { Pool } from 'pg';

const DB = process.env.DATABASE_URL;
if (!DB) { console.error('DATABASE_URL не задан'); process.exit(1); }

const pool = new Pool({ connectionString: DB, ssl: { rejectUnauthorized: false } });

async function run() {
  const q = (sql: string, p: unknown[] = []) => pool.query(sql, p);

  console.log('\n═══════════════════════════════════════');
  console.log(' DB ДИАГНОСТИКА — tourhab.ru');
  console.log('═══════════════════════════════════════\n');

  // 1. Версия
  const ver = await q('SELECT version()');
  console.log('PostgreSQL:', ver.rows[0].version.split(' ').slice(0, 2).join(' '));

  // 2. Миграции
  const mig = await q(`SELECT COUNT(*) AS total FROM _migrations`).catch(() => ({ rows: [{ total: 'ТАБЛИЦА НЕ НАЙДЕНА' }] }));
  const lastMig = await q(`SELECT name, applied_at FROM _migrations ORDER BY applied_at DESC LIMIT 5`).catch(() => ({ rows: [] }));
  console.log(`\n── Миграции: ${mig.rows[0].total} применено`);
  lastMig.rows.forEach((r: { name: string; applied_at: string }) => console.log(`   • ${r.name}  (${new Date(r.applied_at).toLocaleDateString('ru-RU')})`));

  // Проверить pending миграции
  const { readdirSync } = await import('fs');
  const { join } = await import('path');
  try {
    const files = readdirSync(join(process.cwd(), 'migrations')).filter(f => f.endsWith('.sql'));
    const applied = new Set(lastMig.rows.map((r: { name: string }) => r.name));
    const allApplied = await q(`SELECT name FROM _migrations`).catch(() => ({ rows: [] }));
    const appliedSet = new Set((allApplied.rows as { name: string }[]).map(r => r.name));
    const pending = files.filter(f => !appliedSet.has(f));
    if (pending.length > 0) {
      console.log(`\n⚠️  НЕ ПРИМЕНЕНЫ миграции (${pending.length}):`);
      pending.forEach(f => console.log(`   • ${f}`));
    } else {
      console.log(`   ✓ Все миграции применены`);
    }
  } catch { console.log('   (не удалось прочитать папку migrations)'); }

  // 3. Счётчики таблиц
  console.log('\n── Основные таблицы:');
  const tables = [
    ['users', 'Пользователи'],
    ['partners', 'Партнёры (операторы)'],
    ['places', 'Точки/локации'],
    ['kamchatka_routes', 'Маршруты'],
    ['operator_tours', 'Туры'],
    ['operator_bookings', 'Бронирования'],
    ['ai_route_images', 'AI-фото маршрутов'],
    ['leads', 'Лиды'],
    ['mchs_group_registrations', 'МЧС-регистрации'],
    ['tour_payments', 'Платежи'],
  ];
  for (const [table, label] of tables) {
    const r = await q(`SELECT COUNT(*) AS cnt FROM ${table}`).catch(() => ({ rows: [{ cnt: 'НЕТ ТАБЛИЦЫ' }] }));
    const cnt = r.rows[0].cnt;
    const mark = cnt === 'НЕТ ТАБЛИЦЫ' ? '✗' : '✓';
    console.log(`   ${mark} ${label.padEnd(28)} ${cnt}`);
  }

  // 4. Проверка views
  console.log('\n── Views:');
  const views = ['agent_route_knowledge', 'bookings', 'tours', 'v_kamchatka_routes_api', 'v_route_marketplace'];
  for (const v of views) {
    const r = await q(`SELECT COUNT(*) AS cnt FROM ${v}`).catch(() => ({ rows: [{ cnt: 'НЕТ VIEW' }] }));
    const cnt = r.rows[0].cnt;
    const mark = cnt === 'НЕТ VIEW' ? '✗' : '✓';
    console.log(`   ${mark} ${v.padEnd(30)} ${cnt}`);
  }

  // 5. Данные: маршруты с фото
  const withPhotos = await q(`SELECT COUNT(*) AS cnt FROM ai_route_images`).catch(() => ({ rows: [{ cnt: '?' }] }));
  const withCoords = await q(`SELECT COUNT(*) AS cnt FROM places WHERE lat IS NOT NULL AND lng IS NOT NULL`).catch(() => ({ rows: [{ cnt: '?' }] }));
  const publishedTours = await q(`SELECT COUNT(*) AS cnt FROM operator_tours WHERE is_published = true AND deleted_at IS NULL`).catch(() => ({ rows: [{ cnt: '?' }] }));
  const newBookings = await q(`SELECT COUNT(*) AS cnt FROM operator_bookings WHERE booking_status = 'new' AND deleted_at IS NULL`).catch(() => ({ rows: [{ cnt: '?' }] }));

  console.log('\n── Состояние данных:');
  console.log(`   AI-фото маршрутов:           ${withPhotos.rows[0].cnt}`);
  console.log(`   Точки с координатами:         ${withCoords.rows[0].cnt}`);
  console.log(`   Опубликованных туров:         ${publishedTours.rows[0].cnt}`);
  console.log(`   Новых бронирований (ожидают): ${newBookings.rows[0].cnt}`);

  // 6. NEXT_PUBLIC_APP_URL на сервере
  console.log('\n── ENV на сервере:');
  console.log(`   NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL ?? '(не задан — будет tourhab.ru)'}`);
  console.log(`   NODE_ENV:            ${process.env.NODE_ENV ?? '(не задан)'}`);

  console.log('\n═══════════════════════════════════════\n');
}

run().catch(e => { console.error(e.message); }).finally(() => pool.end());

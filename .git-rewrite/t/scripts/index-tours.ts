#!/usr/bin/env ts-node
/**
 * Скрипт: одноразовая индексация всех туров
 * 
 * Запуск:
 *   npx ts-node scripts/index-tours.ts
 *   # или с конкретным туром:
 *   npx ts-node scripts/index-tours.ts --id=<tourId>
 */

import { indexTour } from '../lib/ai/embeddings';
import { query } from '../lib/database';

async function main() {
  const args = process.argv.slice(2);
  const singleId = args.find((a) => a.startsWith('--id='))?.split('=')[1];

  if (singleId) {
    console.log(`🔍 Индексирую тур ${singleId}...`);
    const ok = await indexTour(singleId);
    console.log(ok ? `✅ Тур ${singleId} проиндексирован` : `❌ Ошибка индексации тура ${singleId}`);
    process.exit(ok ? 0 : 1);
  }

  // Все активные туры без эмбеддинга
  console.log('🚀 Начинаю массовую индексацию туров...');
  const result = await query<{ id: string; title: string }>(
    `SELECT id, title FROM tours WHERE embedding IS NULL AND is_active = true ORDER BY created_at DESC`
  );

  const tours = result.rows;
  console.log(`📊 Найдено туров без эмбеддинга: ${tours.length}`);

  if (tours.length === 0) {
    console.log('✅ Все туры уже проиндексированы');
    process.exit(0);
  }

  let success = 0;
  let failed = 0;

  for (const tour of tours) {
    process.stdout.write(`  ⏳ "${tour.title}" (${tour.id})...`);
    const ok = await indexTour(tour.id);
    if (ok) {
      success++;
      process.stdout.write(' ✅\n');
    } else {
      failed++;
      process.stdout.write(' ❌\n');
    }

    // Небольшая пауза чтобы не превышать rate limit API
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n📈 Результат: ${success} успешно, ${failed} ошибок`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

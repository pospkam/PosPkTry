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
    const ok = await indexTour(singleId);
    process.exit(ok ? 0 : 1);
  }

  // Все активные туры без эмбеддинга
  const result = await query<{ id: string; title: string }>(
    `SELECT id, title FROM tours WHERE embedding IS NULL AND is_active = true ORDER BY created_at DESC`
  );

  const tours = result.rows;

  if (tours.length === 0) {
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

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  process.exit(1);
});

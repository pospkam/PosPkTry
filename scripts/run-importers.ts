/**
 * scripts/run-importers.ts
 * Запускает импортёры мест и маршрутов прямо сейчас.
 * tsx scripts/run-importers.ts
 */

import { runVisitKamchatkaImporter } from '../lib/agents/visitkamchatka-importer';
import { runKamchatkalandImporter } from '../lib/agents/kamchatkaland-importer';
import { pool } from '../lib/db-pool';

async function main() {
  console.log('=== Запуск импортёров ===\n');

  // 1. Kamchatkaland — тематические статьи о местах (27 штук)
  console.log('📚 kamchatkaland.ru — статьи о местах...');
  const kl = await runKamchatkalandImporter(27); // все сразу
  console.log(`  ✅ inserted: ${kl.inserted}, updated: ${kl.updated}, skipped: ${kl.skipped}, errors: ${kl.errors}, ${kl.duration_ms}ms\n`);

  // 2. VisitKamchatka — паспорта маршрутов
  console.log('🗺️  visitkamchatka.ru — паспорта маршрутов...');
  const vk = await runVisitKamchatkaImporter(30);
  console.log(`  ✅ inserted: ${vk.inserted}, updated: ${vk.updated}, skipped: ${vk.skipped}, errors: ${vk.errors}, ${vk.duration_ms}ms\n`);

  // Итого в БД
  const { rows } = await pool.query(`
    SELECT kind, COUNT(*) as total,
           SUM(CASE WHEN description IS NULL OR LENGTH(description) < 300 THEN 1 ELSE 0 END) as need_desc
    FROM agent_route_knowledge GROUP BY kind ORDER BY total DESC
  `);
  console.log('📊 Итого в agent_route_knowledge:');
  for (const r of rows) {
    console.log(`  ${r.kind}: ${r.total} записей, ${r.need_desc} нужно описание`);
  }

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });

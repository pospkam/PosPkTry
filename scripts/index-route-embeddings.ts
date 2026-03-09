#!/usr/bin/env tsx
/**
 * index-route-embeddings.ts
 *
 * Генерирует embeddings для всех маршрутов в agent_route_knowledge
 * используя Xenova/paraphrase-multilingual-MiniLM-L12-v2 (384 dims).
 *
 * Запуск:
 *   npx tsx scripts/index-route-embeddings.ts            # Все без embedding
 *   npx tsx scripts/index-route-embeddings.ts --force     # Перегенерировать все
 *   npx tsx scripts/index-route-embeddings.ts --id=UUID   # Один маршрут
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env.local' });

import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  process.stderr.write('ERROR: DATABASE_URL not set in .env.local\n');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const singleId = args.find((a) => a.startsWith('--id='))?.split('=')[1];

  process.stderr.write('Loading MiniLM model (first run downloads ~90MB)...\n');

  const { pipeline } = await import('@huggingface/transformers');
  const embedder = await pipeline(
    'feature-extraction',
    'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
    { device: 'cpu', dtype: 'fp32' }
  );

  process.stderr.write('Model loaded.\n');

  // Fetch routes
  let whereClause = '';
  const params: unknown[] = [];

  if (singleId) {
    whereClause = 'WHERE id = $1';
    params.push(singleId);
  } else if (!force) {
    whereClause = 'WHERE embedding IS NULL';
  }

  const routes = await pool.query(
    `SELECT id, title, description, category, search_text
     FROM agent_route_knowledge
     ${whereClause}
     ORDER BY category, title`,
    params
  );

  process.stderr.write(`Routes to index: ${routes.rowCount}\n`);

  if (routes.rowCount === 0) {
    process.stderr.write('Nothing to index.\n');
    await pool.end();
    return;
  }

  let indexed = 0;
  let errors = 0;

  for (const route of routes.rows) {
    try {
      // Build text for embedding: prefer search_text, fallback to title+desc+category
      const textToEmbed: string = route.search_text || [
        route.title,
        route.description || '',
        `Категория: ${route.category}`,
      ].filter(Boolean).join('\n');

      const cleanText = textToEmbed.replace(/\s+/g, ' ').trim().slice(0, 512);

      const output = await embedder(cleanText, {
        pooling: 'mean',
        normalize: true,
      });

      const embedding = Array.from(output.data as Float32Array);

      await pool.query(
        `UPDATE agent_route_knowledge SET embedding = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(embedding), route.id]
      );

      indexed++;
      process.stderr.write(`\r  [${indexed}/${routes.rowCount}] ${route.title.slice(0, 50)}`);
    } catch (err) {
      errors++;
      process.stderr.write(`\n  ERROR indexing ${route.id}: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  // Summary
  const stats = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE embedding IS NOT NULL) AS indexed,
       COUNT(*) AS total
     FROM agent_route_knowledge`
  );

  process.stderr.write(`\n\nDone. Indexed: ${stats.rows[0].indexed}/${stats.rows[0].total}`);
  if (errors > 0) {
    process.stderr.write(` (${errors} errors)`);
  }
  process.stderr.write('\n');

  await pool.end();
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`);
  process.exit(1);
});

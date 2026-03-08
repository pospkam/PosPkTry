#!/usr/bin/env node

const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env.local or env vars.');
  process.exit(1);
}

function buildSearchText(row) {
  const parts = [
    row.title,
    `Категория: ${row.category}`,
    row.description || '',
    row.source_name ? `Источник: ${row.source_name}` : '',
    row.lat !== null && row.lng !== null ? `Координаты: ${row.lat}, ${row.lng}` : '',
  ].filter(Boolean);

  return parts.join('\n');
}

function buildHash(row, searchText) {
  const stable = {
    category: row.category,
    title: row.title,
    description: row.description || null,
    lat: row.lat,
    lng: row.lng,
    source_url: row.source_url || null,
    source_name: row.source_name || null,
    dedupe_key: row.dedupe_key,
    search_text: searchText,
  };

  return crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

async function ensureSchema(client) {
  await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await client.query(`
    CREATE TABLE IF NOT EXISTS agent_route_knowledge (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      route_dedupe_key TEXT NOT NULL UNIQUE,
      route_id UUID,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      lat DECIMAL(10, 7),
      lng DECIMAL(11, 7),
      source_url TEXT,
      source_name TEXT,
      search_text TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      source_hash TEXT NOT NULL,
      source_updated_at TIMESTAMPTZ,
      last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_agent_route_knowledge_category
    ON agent_route_knowledge (category)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_agent_route_knowledge_search_tsv
    ON agent_route_knowledge USING gin (to_tsvector('russian', search_text))
  `);
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  try {
    await client.query('BEGIN');
    await ensureSchema(client);

    const routesResult = await client.query(`
      SELECT
        route_id AS id,
        category,
        title,
        description,
        lat,
        lng,
        source_url,
        source_name,
        route_dedupe_key AS dedupe_key,
        source_updated_at AS updated_at
      FROM v_kamchatka_routes_api
      ORDER BY category, category_position
    `);

    for (const row of routesResult.rows) {
      const searchText = buildSearchText(row);
      const sourceHash = buildHash(row, searchText);

      const existingResult = await client.query(
        `SELECT source_hash FROM agent_route_knowledge WHERE route_dedupe_key = $1`,
        [row.dedupe_key],
      );

      if (existingResult.rowCount > 0 && existingResult.rows[0].source_hash === sourceHash) {
        unchanged += 1;
        await client.query(
          `UPDATE agent_route_knowledge SET last_synced_at = NOW() WHERE route_dedupe_key = $1`,
          [row.dedupe_key],
        );
        continue;
      }

      const payload = {
        route_id: row.id,
        dedupe_key: row.dedupe_key,
        imported_from: 'v_kamchatka_routes_api',
      };

      const upsertResult = await client.query(
        `
          INSERT INTO agent_route_knowledge (
            route_dedupe_key,
            route_id,
            category,
            title,
            description,
            lat,
            lng,
            source_url,
            source_name,
            search_text,
            payload,
            source_hash,
            source_updated_at,
            last_synced_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, NOW(), NOW()
          )
          ON CONFLICT (route_dedupe_key) DO UPDATE SET
            route_id = EXCLUDED.route_id,
            category = EXCLUDED.category,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            lat = EXCLUDED.lat,
            lng = EXCLUDED.lng,
            source_url = EXCLUDED.source_url,
            source_name = EXCLUDED.source_name,
            search_text = EXCLUDED.search_text,
            payload = EXCLUDED.payload,
            source_hash = EXCLUDED.source_hash,
            source_updated_at = EXCLUDED.source_updated_at,
            last_synced_at = NOW(),
            updated_at = NOW()
          RETURNING (xmax = 0) AS inserted
        `,
        [
          row.dedupe_key,
          row.id,
          row.category,
          row.title,
          row.description,
          row.lat,
          row.lng,
          row.source_url,
          row.source_name,
          searchText,
          JSON.stringify(payload),
          sourceHash,
          row.updated_at,
        ],
      );

      if (upsertResult.rows[0].inserted) {
        inserted += 1;
      } else {
        updated += 1;
      }
    }

    await client.query('COMMIT');

    console.log('Agent route knowledge sync finished.');
    console.log(`Source rows: ${routesResult.rowCount}`);
    console.log(`Inserted: ${inserted}`);
    console.log(`Updated: ${updated}`);
    console.log(`Unchanged: ${unchanged}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Sync failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

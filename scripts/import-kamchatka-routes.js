#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const inputPath = process.argv[2] || 'kamchatka-routes-curated.json';

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/["'`«»]/g, '')
    .replace(/[.,;:!?()[\]{}]/g, '');
}

function parseCoord(coord) {
  if (!coord) {
    return { lat: null, lng: null };
  }

  if (typeof coord === 'string') {
    const parts = coord.split(',').map((p) => Number(p.trim()));
    if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
    return { lat: null, lng: null };
  }

  if (typeof coord === 'object') {
    const lat = Number(coord.lat ?? coord.latitude);
    const lng = Number(coord.lng ?? coord.lon ?? coord.longitude);
    return {
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
    };
  }

  return { lat: null, lng: null };
}

function buildDedupeKey(route, lat, lng) {
  const category = normalizeText(route.category || 'uncategorized');
  const title = normalizeText(route.title);

  if (lat !== null && lng !== null) {
    return `${title}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
  }

  return `${category}|${title}`;
}

function validateRoute(route, index) {
  if (!route || typeof route !== 'object') {
    throw new Error(`Route #${index + 1}: element must be an object`);
  }
  if (!route.title || !String(route.title).trim()) {
    throw new Error(`Route #${index + 1}: missing required field title`);
  }
}

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS kamchatka_routes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      lat DECIMAL(10, 7),
      lng DECIMAL(11, 7),
      source_url TEXT,
      source_name TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      dedupe_key TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_kamchatka_routes_category
    ON kamchatka_routes (category)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_kamchatka_routes_title
    ON kamchatka_routes USING gin (to_tsvector('russian', title))
  `);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Add it to .env.local or env vars.');
  }

  const resolvedPath = path.resolve(inputPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Input file not found: ${resolvedPath}`);
  }

  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const routes = JSON.parse(raw);

  if (!Array.isArray(routes)) {
    throw new Error('Input JSON must be an array of route objects.');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  let inserted = 0;
  let updated = 0;

  try {
    await client.query('BEGIN');
    await ensureTable(client);

    for (let i = 0; i < routes.length; i += 1) {
      const route = routes[i];
      validateRoute(route, i);

      const { lat, lng } = parseCoord(route.coord);
      const category = String(route.category || 'uncategorized').trim();
      const title = String(route.title).trim();
      const description = route.description ? String(route.description).trim() : null;
      const sourceUrl = route.url ? String(route.url).trim() : null;
      const sourceName = route.source ? String(route.source).trim() : null;
      const dedupeKey = buildDedupeKey(route, lat, lng);

      const metadata = {
        raw_coord: route.coord ?? null,
        import_source: route.source ?? null,
        imported_at: new Date().toISOString(),
      };

      const result = await client.query(
        `
          INSERT INTO kamchatka_routes (
            category, title, description, lat, lng, source_url, source_name, metadata, dedupe_key
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
          ON CONFLICT (dedupe_key) DO UPDATE SET
            category = EXCLUDED.category,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            lat = EXCLUDED.lat,
            lng = EXCLUDED.lng,
            source_url = EXCLUDED.source_url,
            source_name = EXCLUDED.source_name,
            metadata = kamchatka_routes.metadata || EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING (xmax = 0) AS inserted
        `,
        [
          category,
          title,
          description,
          lat,
          lng,
          sourceUrl,
          sourceName,
          JSON.stringify(metadata),
          dedupeKey,
        ],
      );

      if (result.rows[0].inserted) {
        inserted += 1;
      } else {
        updated += 1;
      }
    }

    await client.query('COMMIT');

    console.log('Kamchatka routes import finished.');
    console.log(`Input file: ${resolvedPath}`);
    console.log(`Processed: ${routes.length}`);
    console.log(`Inserted: ${inserted}`);
    console.log(`Updated: ${updated}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Import failed:', error.message);
  process.exit(1);
});

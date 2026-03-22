#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const defaultInputPaths = ['kamchatka-routes-curated.json', 'idilesom-tours.json'];
const cliArgs = process.argv.slice(2);
const resetBeforeImport = cliArgs.includes('--reset');
const inputPaths = cliArgs.filter((arg) => !arg.startsWith('--')).length > 0
  ? cliArgs.filter((arg) => !arg.startsWith('--'))
  : defaultInputPaths;

const categoryAliases = {
  volcanoes: 'vulkani',
  vulkani: 'vulkani',
  trekking: 'trekking',
  hiking: 'trekking',
  geysers: 'geyzery',
  geyzery: 'geyzery',
  bears: 'medvedi',
  medvedi: 'medvedi',
  fishing: 'rybalka',
  rybalka: 'rybalka',
  thermal: 'termalnye_istochniki',
  termalnye_istochniki: 'termalnye_istochniki',
  hot_springs: 'termalnye_istochniki',
  sea_walks: 'morskie_progulki',
  morskie_progulki: 'morskie_progulki',
  sea: 'morskie_progulki',
  boat: 'morskie_progulki',
  helicopter: 'vertoletnye_tury',
  vertoletnye_tury: 'vertoletnye_tury',
  snowmobile: 'snegohod',
  snowcat: 'snegohod',
  snow: 'snegohod',
  snegohod: 'snegohod',
  jeep: 'dzhip',
  jeeptour: 'dzhip',
  jeep_tour: 'dzhip',
  offroad: 'dzhip',
  off_road: 'dzhip',
  dzhip: 'dzhip',
  // Категории реально присутствующие в БД
  lakes: 'lakes',
  lake: 'lakes',
  ozera: 'lakes',
  eco: 'eco',
  ecology: 'eco',
  nature: 'eco',
  mountains: 'mountains',
  mountain: 'mountains',
  gory: 'mountains',
  rivers: 'rivers',
  river: 'rivers',
  reki: 'rivers',
  // combo
  combo: 'combo',
  combined: 'combo',
};

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

function normalizeCategory(category) {
  const key = normalizeText(category).replace(/\s+/g, '_');
  return categoryAliases[key] || key || 'uncategorized';
}

function normalizeCuratedRoute(route, sourceFile) {
  const { lat, lng } = parseCoord(route.coord);

  return {
    category: normalizeCategory(route.category),
    title: String(route.title || '').trim(),
    description: route.description ? String(route.description).trim() : null,
    lat,
    lng,
    sourceUrl: route.url ? String(route.url).trim() : null,
    sourceName: route.source ? String(route.source).trim() : 'curated',
    externalId: null,
    rawCoord: route.coord ?? null,
    sourceFile,
  };
}

function normalizeIdilesomRoute(route, categoryKey, sourceFile) {
  const lat = Number(route.lat);
  const lng = Number(route.lng);

  return {
    category: normalizeCategory(route.category_slug || categoryKey || route.category),
    title: String(route.name || route.title || '').trim(),
    description: route.description ? String(route.description).trim() : null,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    sourceUrl: route.url ? String(route.url).trim() : null,
    sourceName: 'idilesom',
    externalId: route.id ? String(route.id).trim() : null,
    rawCoord: null,
    sourceFile,
  };
}

function flattenRoutes(inputData, sourceFile) {
  if (Array.isArray(inputData)) {
    return inputData.map((route) => normalizeCuratedRoute(route, sourceFile));
  }

  if (inputData && typeof inputData === 'object') {
    const flattened = [];
    for (const [categoryKey, categoryValue] of Object.entries(inputData)) {
      if (!categoryValue || !Array.isArray(categoryValue.items)) {
        continue;
      }

      for (const item of categoryValue.items) {
        flattened.push(normalizeIdilesomRoute(item, categoryKey, sourceFile));
      }
    }
    return flattened;
  }

  throw new Error(`Unsupported JSON structure in ${sourceFile}.`);
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

  const routes = [];
  const sourceStats = [];

  for (const inputPath of inputPaths) {
    const resolvedPath = path.resolve(inputPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Input file not found: ${resolvedPath}`);
    }

    const raw = fs.readFileSync(resolvedPath, 'utf8');
    const parsed = JSON.parse(raw);
    const flattened = flattenRoutes(parsed, resolvedPath);

    sourceStats.push({ file: resolvedPath, count: flattened.length });
    routes.push(...flattened);
  }

  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
  const client = await pool.connect();

  let inserted = 0;
  let updated = 0;
  let deleted = 0;
  const processedByCategory = new Map();

  try {
    await client.query('BEGIN');
    await ensureTable(client);

    if (resetBeforeImport) {
      const deleteResult = await client.query('DELETE FROM kamchatka_routes');
      deleted = Number(deleteResult.rowCount || 0);
    }

    for (let i = 0; i < routes.length; i += 1) {
      const route = routes[i];
      validateRoute(route, i);

      const lat = route.lat;
      const lng = route.lng;
      const category = String(route.category || 'uncategorized').trim();
      const title = String(route.title).trim();
      const description = route.description ? String(route.description).trim() : null;
      const sourceUrl = route.sourceUrl ? String(route.sourceUrl).trim() : null;
      const sourceName = route.sourceName ? String(route.sourceName).trim() : null;
      const dedupeKey = buildDedupeKey(route, lat, lng);

      const metadata = {
        raw_coord: route.rawCoord ?? null,
        import_source: route.sourceName ?? null,
        external_id: route.externalId ?? null,
        source_file: route.sourceFile ?? null,
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

      processedByCategory.set(category, (processedByCategory.get(category) || 0) + 1);
    }

    await client.query('COMMIT');

    console.log('Kamchatka routes import finished.');
    console.log('Input sources:');
    for (const source of sourceStats) {
      console.log(`- ${source.file}: ${source.count}`);
    }
    console.log(`Processed: ${routes.length}`);
    if (resetBeforeImport) {
      console.log(`Deleted before import: ${deleted}`);
    }
    console.log(`Inserted: ${inserted}`);
    console.log(`Updated: ${updated}`);
    console.log('Processed by category:');
    for (const [category, count] of [...processedByCategory.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`- ${category}: ${count}`);
    }
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

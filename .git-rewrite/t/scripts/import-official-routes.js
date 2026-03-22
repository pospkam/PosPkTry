#!/usr/bin/env node
/**
 * import-official-routes.js
 *
 * Импортирует паспортизированные маршруты Камчатки из CSV/JSON (формат Python-скрипта)
 * в таблицу kamchatka_routes PostgreSQL.
 *
 * Использование:
 *   node scripts/import-official-routes.js routes.csv [--dry-run]
 *   node scripts/import-official-routes.js routes.json [--dry-run]
 *
 * Формат входных данных (Python-скрипт):
 *   CSV:  name, season, organization, type, length, duration, notes
 *   JSON: [{ name, season, organization, type, length, duration, notes }, ...]
 *
 * --dry-run: парсит и выводит первые 10 записей без записи в БД
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args     = process.argv.slice(2);
const inputArg = args.find((a) => !a.startsWith('--'));
const isDryRun = args.includes('--dry-run');

if (!inputArg) {
  console.error('Использование: node scripts/import-official-routes.js <routes.csv|routes.json> [--dry-run]');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Определение категории по ключевым словам русского языка
// ---------------------------------------------------------------------------

/**
 * Правила вывода категории (проверяются в указанном порядке).
 * Первое совпадение побеждает.
 */
const CATEGORY_RULES = [
  { words: ['вертолет', 'авиатур', 'вертолётн'],                                                  cat: 'vertoletnye_tury'    },
  { words: ['снегоход', 'снегоходн', 'лыжн', 'лыжи', 'горные лыжи'],                             cat: 'snegohod'            },
  { words: ['джип', 'внедорожн', 'бездорожь', 'сафари'],                                          cat: 'dzhip'               },
  { words: ['рыбалк', 'рыболовн', 'нерка', 'семга', 'горбуша', 'хариус'],                        cat: 'rybalka'             },
  { words: ['медвед'],                                                                              cat: 'medvedi'             },
  { words: ['гейзер', 'долина гейзеров'],                                                          cat: 'geyzery'             },
  { words: ['вулкан', 'вулканич', 'горелый', 'мутновский', 'авачинский', 'вилючин', 'кизимен'],   cat: 'vulkani'             },
  { words: ['термаль', 'термы', 'термальн', 'источник', 'карымшин', 'нальчевс', 'паратунк'],      cat: 'termalnye_istochniki'},
  { words: ['море', 'морской', 'пляж', 'побережье', 'мыс', 'бухта', 'тихий океан', 'халактыр'],  cat: 'morskie_progulki'    },
  { words: ['озеро', 'озёра', 'приливное', 'курильское'],                                          cat: 'lakes'               },
  { words: ['горн', 'вачкажец', 'плато', 'хребет', 'перевал', 'пик', 'сопка'],                    cat: 'mountains'           },
  { words: ['заповедник', 'природн', 'экотур', 'нацпарк', 'экологич'],                            cat: 'eco'                 },
  { words: ['водопад', 'ущель', 'тропа', 'поход'],                                                cat: 'trekking'            },
];

/**
 * Определяет категорию по полям записи.
 * type → season → fallback
 */
function inferCategory(name, type, notes, season) {
  // Явный тип из поля type (ИдиЛесом / вертолёты)
  const typeKey = (type || '').toLowerCase().trim().replace(/\s+/g, '_');
  const typeMap = {
    vertoletnye_tury: 'vertoletnye_tury', vertoletnye: 'vertoletnye_tury',
    snegohod: 'snegohod', lyzhi: 'snegohod', лыжный: 'snegohod', снегоходный: 'snegohod',
    dzhip: 'dzhip', jeep: 'dzhip',
    rybalka: 'rybalka', fishing: 'rybalka',
    trekking: 'trekking', hiking: 'trekking',
    vulkani: 'vulkani', volcanoes: 'vulkani',
    termalnye_istochniki: 'termalnye_istochniki', thermal: 'termalnye_istochniki',
  };
  if (typeMap[typeKey]) return typeMap[typeKey];

  const haystack = [name, type, notes, season]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const rule of CATEGORY_RULES) {
    for (const word of rule.words) {
      if (haystack.includes(word)) return rule.cat;
    }
  }

  // Зимний сезон без явной категории → снегоход
  if ((season || '').toLowerCase().includes('зимн')) return 'snegohod';

  return 'trekking';
}

// ---------------------------------------------------------------------------
// Парсинг
// ---------------------------------------------------------------------------

function parseJSON(raw) {
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('JSON должен быть массивом объектов');
  return data;
}

/**
 * Простой CSV-парсер с поддержкой кавычек.
 * pandas экспортирует с BOM и quoted-полями — обрабатываем оба варианта.
 */
function parseCSV(raw) {
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const parseRow = (line) => {
    const values = [];
    let inQuote = false;
    let cell = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        // escaped quote ""
        if (inQuote && line[i + 1] === '"') { cell += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        values.push(cell.trim());
        cell = '';
      } else {
        cell += ch;
      }
    }
    values.push(cell.trim());
    return values;
  };

  const headers = parseRow(lines[0]).map((h) => h.replace(/^"(.+)"$/, '$1'));

  return lines.slice(1).map((line) => {
    const vals = parseRow(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/^"(.*)"$/, '$1'); });
    return obj;
  }).filter((r) => r.name || r.title);
}

// ---------------------------------------------------------------------------
// Преобразование записи
// ---------------------------------------------------------------------------

function normalizeText(v) {
  return String(v || '').toLowerCase().trim().replace(/\s+/g, ' ')
    .replace(/["'`«»]/g, '').replace(/[.,;:!?()[\]{}]/g, '');
}

function buildDedupeKey(title, season) {
  const t = normalizeText(title);
  const s = normalizeText(season || '');
  return s ? `official|${t}|${s}` : `official|${t}`;
}

/**
 * Собирает description из доступных полей.
 * season + organization → первое предложение для AI-поиска.
 */
function buildDescription(row) {
  const parts = [];
  if (row.organization && row.organization.trim()) parts.push(`Организатор: ${row.organization.trim()}`);
  if (row.season && row.season.trim())             parts.push(`Сезон: ${row.season.trim()}`);
  if (row.duration && row.duration.trim())         parts.push(`Продолжительность: ${row.duration.trim()}`);
  if (row.length && row.length.trim())             parts.push(`Протяжённость: ${row.length.trim()}`);
  if (row.notes && row.notes.trim())               parts.push(row.notes.trim());
  return parts.length ? parts.join('. ') : null;
}

function transformRow(row) {
  // поддерживаем оба варианта: name (Python) и title (idilesom/curated)
  const title = (row.name || row.title || '').trim();
  if (!title) return null;

  const category    = inferCategory(row.name || row.title, row.type, row.notes, row.season);
  const description = buildDescription(row);
  const dedupeKey   = buildDedupeKey(title, row.season);

  const metadata = {
    season:       row.season       || null,
    organization: row.organization || null,
    route_type:   row.type         || null,
    length_km:    row.length       || null,
    duration:     row.duration     || null,
    notes:        row.notes        || null,
    import_source: 'visitkamchatka.ru',
    imported_at:  new Date().toISOString(),
  };

  return { title, category, description, dedupeKey, metadata };
}

// ---------------------------------------------------------------------------
// БД
// ---------------------------------------------------------------------------

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS kamchatka_routes (
      id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      category    TEXT NOT NULL,
      title       TEXT NOT NULL,
      description TEXT,
      lat         DECIMAL(10,7),
      lng         DECIMAL(11,7),
      source_url  TEXT,
      source_name TEXT,
      metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
      dedupe_key  TEXT NOT NULL UNIQUE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_kamchatka_routes_category ON kamchatka_routes (category)`);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_kamchatka_routes_title
    ON kamchatka_routes USING gin (to_tsvector('russian', title))
  `);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const resolvedPath = path.resolve(inputArg);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Файл не найден: ${resolvedPath}`);
  }

  const raw  = fs.readFileSync(resolvedPath, 'utf8');
  const ext  = path.extname(resolvedPath).toLowerCase();
  const rows = ext === '.json' ? parseJSON(raw) : parseCSV(raw);

  console.log(`Прочитано записей: ${rows.length} из ${resolvedPath}`);

  const routes = rows.map(transformRow).filter(Boolean);
  console.log(`После обработки:  ${routes.length}`);

  if (isDryRun) {
    console.log('\n--- DRY RUN: первые 10 записей ---');
    for (const r of routes.slice(0, 10)) {
      console.log(`  [${r.category}] ${r.title}`);
      if (r.description) console.log(`         ${r.description.slice(0, 80)}...`);
    }
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL не задан в .env.local');
  }

  const pool   = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  const client = await pool.connect();

  let inserted = 0, updated = 0, skipped = 0;
  const byCategory = new Map();

  try {
    await client.query('BEGIN');
    await ensureTable(client);

    for (const route of routes) {
      const result = await client.query(
        `INSERT INTO kamchatka_routes
           (category, title, description, lat, lng, source_url, source_name, metadata, dedupe_key)
         VALUES ($1, $2, $3, NULL, NULL, $4, $5, $6::jsonb, $7)
         ON CONFLICT (dedupe_key) DO UPDATE SET
           category    = EXCLUDED.category,
           title       = EXCLUDED.title,
           description = EXCLUDED.description,
           source_url  = EXCLUDED.source_url,
           source_name = EXCLUDED.source_name,
           metadata    = kamchatka_routes.metadata || EXCLUDED.metadata,
           updated_at  = NOW()
         RETURNING (xmax = 0) AS inserted`,
        [
          route.category,
          route.title,
          route.description,
          'https://visitkamchatka.ru',
          'visitkamchatka.ru',
          JSON.stringify(route.metadata),
          route.dedupeKey,
        ]
      );

      if (result.rows[0].inserted) inserted++;
      else updated++;
      byCategory.set(route.category, (byCategory.get(route.category) || 0) + 1);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }

  console.log('\nИмпорт завершён:');
  console.log(`  Новых   : ${inserted}`);
  console.log(`  Обновлено: ${updated}`);
  console.log(`  Пропущено: ${skipped}`);
  console.log('\nПо категориям:');
  for (const [cat, count] of [...byCategory.entries()].sort()) {
    console.log(`  ${cat}: ${count}`);
  }
}

main().catch((err) => {
  console.error('Ошибка импорта:', err.message);
  process.exit(1);
});

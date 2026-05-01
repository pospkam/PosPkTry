#!/usr/bin/env node
/**
 * scripts/audit-knowledge.js
 *
 * READ-ONLY diagnostic: checks agent_route_knowledge for data integrity issues.
 * Reports what needs to be fixed without modifying anything.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/audit-knowledge.js
 *   DATABASE_URL=... node scripts/audit-knowledge.js --samples=5   # show N examples per issue
 *   DATABASE_URL=... node scripts/audit-knowledge.js --json        # machine-readable output
 */

'use strict';

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// ── Load .env.local if present ──────────────────────────────
function loadDotEnv() {
  for (const f of ['.env.local', '.env']) {
    const full = path.resolve(process.cwd(), f);
    if (fs.existsSync(full)) {
      fs.readFileSync(full, 'utf8').split('\n').forEach(line => {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      });
      break;
    }
  }
}
loadDotEnv();

const DATABASE_URL = process.env.DATABASE_URL;
const SAMPLES = parseInt(process.argv.find(a => a.startsWith('--samples='))?.split('=')[1] || '3', 10);
const AS_JSON = process.argv.includes('--json');

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=no-verify') ? { rejectUnauthorized: false } : undefined,
  max: 2,
});

// ── Rules (canonical model) ─────────────────────────────────
// kind='place' → lat/lng NOT NULL, location_type NOT NULL, activity_type NULL, no track
// kind='route' → activity_type NOT NULL, has geometry (LineString) or track in payload, location_type NULL
// kind='tour'  → should NOT be in agent_route_knowledge (belongs in operator_tours)

const CHECKS = [
  {
    id: 'total',
    title: 'Total records',
    sql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge`,
    isIssue: () => false,
  },
  {
    id: 'by_kind',
    title: 'Breakdown by kind',
    sql: `SELECT kind, COUNT(*)::int AS n FROM agent_route_knowledge GROUP BY kind ORDER BY n DESC`,
    isIssue: () => false,
  },
  {
    id: 'tour_in_knowledge',
    title: "kind='tour' in agent_route_knowledge (should be in operator_tours)",
    sql: `SELECT id, title, source_url FROM agent_route_knowledge WHERE kind='tour' ORDER BY title LIMIT $1`,
    countSql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind='tour'`,
    severity: 'high',
  },
  {
    id: 'place_without_coords',
    title: "kind='place' without lat/lng (places must have coordinates)",
    sql: `SELECT id, title FROM agent_route_knowledge WHERE kind='place' AND (lat IS NULL OR lng IS NULL) ORDER BY title LIMIT $1`,
    countSql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind='place' AND (lat IS NULL OR lng IS NULL)`,
    severity: 'high',
  },
  {
    id: 'place_without_location_type',
    title: "kind='place' without location_type",
    sql: `SELECT id, title FROM agent_route_knowledge WHERE kind='place' AND location_type IS NULL ORDER BY title LIMIT $1`,
    countSql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind='place' AND location_type IS NULL`,
    severity: 'medium',
  },
  {
    id: 'place_with_activity_type',
    title: "kind='place' has activity_type (should only be on routes)",
    sql: `SELECT id, title, activity_type FROM agent_route_knowledge WHERE kind='place' AND activity_type IS NOT NULL ORDER BY title LIMIT $1`,
    countSql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind='place' AND activity_type IS NOT NULL`,
    severity: 'medium',
  },
  {
    id: 'route_without_activity_type',
    title: "kind='route' without activity_type",
    sql: `SELECT id, title FROM agent_route_knowledge WHERE kind='route' AND activity_type IS NULL ORDER BY title LIMIT $1`,
    countSql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind='route' AND activity_type IS NULL`,
    severity: 'medium',
  },
  {
    id: 'route_with_location_type',
    title: "kind='route' has location_type (routes shouldn't have one)",
    sql: `SELECT id, title, location_type FROM agent_route_knowledge WHERE kind='route' AND location_type IS NOT NULL ORDER BY title LIMIT $1`,
    countSql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind='route' AND location_type IS NOT NULL`,
    severity: 'low',
  },
  {
    id: 'route_without_geometry',
    title: "kind='route' without geometry/track in payload (GPX export gives only a point)",
    sql: `SELECT id, title, (lat IS NOT NULL) AS has_point
          FROM agent_route_knowledge
          WHERE kind='route'
            AND NOT (payload ? 'geometry')
            AND NOT (payload ? 'track')
          ORDER BY title LIMIT $1`,
    countSql: `SELECT COUNT(*)::int AS n
               FROM agent_route_knowledge
               WHERE kind='route'
                 AND NOT (payload ? 'geometry')
                 AND NOT (payload ? 'track')`,
    severity: 'high',
  },
  {
    id: 'null_kind',
    title: 'kind IS NULL (entity type unknown)',
    sql: `SELECT id, title FROM agent_route_knowledge WHERE kind IS NULL ORDER BY title LIMIT $1`,
    countSql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind IS NULL`,
    severity: 'high',
  },
  {
    id: 'invalid_kind',
    title: "kind NOT IN ('place','route','tour')",
    sql: `SELECT id, title, kind FROM agent_route_knowledge WHERE kind IS NOT NULL AND kind NOT IN ('place','route','tour') ORDER BY kind LIMIT $1`,
    countSql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind IS NOT NULL AND kind NOT IN ('place','route','tour')`,
    severity: 'high',
  },
  {
    id: 'by_source',
    title: 'Breakdown by sourceName (top 10)',
    sql: `SELECT source_name, COUNT(*)::int AS n FROM agent_route_knowledge GROUP BY source_name ORDER BY n DESC LIMIT 10`,
    isIssue: () => false,
  },
];

const SEVERITY_COLORS = { high: '\x1b[31m', medium: '\x1b[33m', low: '\x1b[36m', '': '' };
const RESET = '\x1b[0m';

async function main() {
  const report = { generatedAt: new Date().toISOString(), checks: [] };

  for (const check of CHECKS) {
    try {
      if (check.countSql) {
        const { rows: cr } = await pool.query(check.countSql);
        const count = cr[0]?.n ?? 0;
        const samples = count > 0 ? (await pool.query(check.sql, [SAMPLES])).rows : [];
        report.checks.push({ id: check.id, title: check.title, severity: check.severity, count, samples });
      } else {
        const { rows } = await pool.query(check.sql);
        report.checks.push({ id: check.id, title: check.title, rows });
      }
    } catch (e) {
      report.checks.push({ id: check.id, title: check.title, error: e.message });
    }
  }

  if (AS_JSON) {
    console.log(JSON.stringify(report, null, 2));
    await pool.end();
    return;
  }

  // Pretty print
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  agent_route_knowledge — data integrity audit');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Generated: ${report.generatedAt}`);
  console.log();

  let highCount = 0, medCount = 0;
  for (const c of report.checks) {
    if (c.error) {
      console.log(`❌ ${c.title}\n   ERROR: ${c.error}\n`);
      continue;
    }
    if (c.rows !== undefined) {
      console.log(`ℹ️  ${c.title}`);
      for (const r of c.rows) console.log(`   ${JSON.stringify(r)}`);
      console.log();
      continue;
    }
    const color = SEVERITY_COLORS[c.severity] || '';
    const icon = c.count === 0 ? '✅' : (c.severity === 'high' ? '🔴' : c.severity === 'medium' ? '🟡' : '🔵');
    console.log(`${icon} ${color}[${(c.severity || 'info').toUpperCase().padEnd(6)}]${RESET} ${c.title}: ${c.count}`);
    if (c.count > 0) {
      if (c.severity === 'high') highCount += c.count;
      else if (c.severity === 'medium') medCount += c.count;
      for (const s of c.samples) console.log(`     · ${JSON.stringify(s)}`);
    }
    console.log();
  }

  console.log('───────────────────────────────────────────────────────────');
  console.log(`  Summary: ${highCount} high-severity, ${medCount} medium-severity issues`);
  console.log('───────────────────────────────────────────────────────────');

  await pool.end();
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});

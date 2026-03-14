/**
 * Seed tour_departures для туров TopKam + Камчатинтур
 * Запуск: node scripts/seed-departures.js
 */
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

const SEASON_MONTHS = {
  'зима': [11, 0, 1, 2], 'весна': [2, 3, 4], 'лето': [5, 6, 7, 8], 'осень': [8, 9, 10],
  'январь': [0], 'февраль': [1], 'март': [2], 'апрель': [3], 'май': [4], 'июнь': [5],
  'июль': [6], 'август': [7], 'сентябрь': [8], 'октябрь': [9], 'ноябрь': [10], 'декабрь': [11],
};

function parseSeasonMonths(season) {
  const items = Array.isArray(season) ? season : (typeof season === 'string' ? [season] : []);
  const months = new Set();
  for (const item of items) {
    const lower = item.toLowerCase();
    const parts = lower.split('-');
    if (parts.length === 2) {
      const mFrom = SEASON_MONTHS[parts[0].trim()];
      const mTo   = SEASON_MONTHS[parts[1].trim()];
      if (mFrom && mTo) {
        let m = mFrom[0];
        for (let i = 0; i < 12; i++) { months.add(m); if (m === mTo[0]) break; m = (m + 1) % 12; }
        continue;
      }
    }
    for (const [key, vals] of Object.entries(SEASON_MONTHS)) {
      if (lower.includes(key)) vals.forEach(v => months.add(v));
    }
  }
  return months.size > 0 ? [...months] : [3, 4, 5, 6, 7, 8, 9];
}

function nextSaturday(date) {
  const d = new Date(date);
  const offset = (6 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + offset);
  return d;
}

function firstDateInSeason(today, allowedMonths) {
  if (allowedMonths.includes(today.getMonth())) return nextSaturday(today);
  const d = new Date(today);
  for (let i = 0; i < 14; i++) {
    d.setMonth(d.getMonth() + 1); d.setDate(1);
    if (allowedMonths.includes(d.getMonth())) return nextSaturday(d);
  }
  return nextSaturday(today);
}

function generateDepartures(tour, count = 5) {
  const today       = new Date('2026-03-14');
  const durDays     = parseInt(tour.duration, 10) || 1;
  const seasonMonths = parseSeasonMonths(tour.season);
  const stepDays    = durDays <= 1 ? 7 : 14;
  const dates       = [];
  let cursor        = firstDateInSeason(today, seasonMonths);

  while (dates.length < count && cursor) {
    if (seasonMonths.includes(cursor.getMonth())) dates.push(new Date(cursor));
    const next = new Date(cursor);
    next.setDate(next.getDate() + stepDays);
    // find next valid date in season
    let found = false;
    for (let i = 1; i <= 365; i++) {
      if (seasonMonths.includes(next.getMonth())) { found = true; break; }
      next.setDate(next.getDate() + 1);
    }
    cursor = found ? next : null;
  }

  return dates.map(d => {
    const start = d.toISOString().split('T')[0];
    const endD  = new Date(d); endD.setDate(endD.getDate() + Math.max(durDays - 1, 0));
    return { start, end: endD.toISOString().split('T')[0] };
  });
}

async function main() {
  const client = await pool.connect();
  try {
    const { rows: tours } = await client.query(`
      SELECT t.id, t.name, t.duration, t.max_group_size, t.min_group_size, t.price, t.season
      FROM tours t
      INNER JOIN partners p ON p.id = t.operator_id
      WHERE p.slug IN ('topkam', 'kamchatintour') AND t.is_active = true
    `);
    console.log(`Found ${tours.length} tours. Generating departures...\n`);

    let inserted = 0, skipped = 0;
    for (const tour of tours) {
      const deps = generateDepartures(tour, 5);
      for (const dep of deps) {
        const r = await client.query(`
          INSERT INTO tour_departures (tour_id, start_date, end_date, available_slots, booked_slots, price_override, min_group_size, status)
          VALUES ($1, $2, $3, $4, 0, NULL, $5, 'active')
          ON CONFLICT (tour_id, start_date) DO NOTHING
        `, [tour.id, dep.start, dep.end, tour.max_group_size || 10, tour.min_group_size || 1]);
        if (r.rowCount > 0) inserted++; else skipped++;
      }
      console.log(`  ✓ ${tour.name.substring(0, 52).padEnd(52)} | ${deps.map(d => d.start).join('  ')}`);
    }

    console.log(`\n✅ Done — inserted: ${inserted}, skipped: ${skipped}`);

    const { rows: [{ count }] } = await client.query(
      `SELECT COUNT(*) FROM v_route_marketplace WHERE next_departure_date IS NOT NULL`
    );
    console.log(`\n🏪 Marketplace rows with next_departure_date: ${count}`);
  } catch(err) {
    console.error('❌', err.message);
    if (err.detail) console.error('   detail:', err.detail);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

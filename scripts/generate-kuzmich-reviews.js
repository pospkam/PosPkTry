/**
 * generate-kuzmich-reviews.js
 *
 * Генерирует kuzmich_review для топ-100 маршрутов через Anthropic API.
 *
 * Запуск:
 *   node scripts/generate-kuzmich-reviews.js
 *   node scripts/generate-kuzmich-reviews.js --limit 20     # только 20 маршрутов
 *   node scripts/generate-kuzmich-reviews.js --dry-run       # без записи в БД
 *   node scripts/generate-kuzmich-reviews.js --refill        # перезаписать существующие
 */

require('dotenv').config({ path: '.env.local', override: true });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DRY_RUN  = process.argv.includes('--dry-run');
const REFILL   = process.argv.includes('--refill');
const LIMIT    = (() => {
  const idx = process.argv.indexOf('--limit');
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : 100;
})();

const DELAY_MS = 600; // пауза между запросами (Haiku — высокий rate limit)

// ── Приоритет типов локаций ────────────────────────────────────────────────

const LOCATION_PRIORITY = {
  volcano:    10,
  geyser:      9,
  hot_spring:  8,
  bay:         7,
  lake:        6,
  mountain:    5,
  waterfall:   4,
  river:       3,
  beach:       3,
  cape:        2,
  glacier:     2,
  island:      2,
  other:       1,
};

const LOCATION_RU = {
  volcano:    'вулкан',
  geyser:     'гейзерное поле',
  hot_spring: 'термальный источник',
  bay:        'бухта',
  lake:       'озеро',
  mountain:   'горный массив',
  waterfall:  'водопад',
  river:      'река',
  beach:      'пляж',
  cape:       'мыс',
  glacier:    'ледник',
  island:     'остров',
  forest:     'лес',
  viewpoint:  'смотровая точка',
  settlement: 'населённый пункт',
  other:      'природное место',
};

const ACTIVITY_RU = {
  trekking:      'пешеходный маршрут',
  fishing:       'рыбалка',
  thermal:       'термальный отдых',
  helicopter:    'вертолётная экскурсия',
  boat_trip:     'морская прогулка',
  snowmobile:    'снегоходный тур',
  bear_watching: 'наблюдение за медведями',
  ski:           'горные лыжи / фрирайд',
  diving:        'дайвинг',
  kayak:         'байдарки',
  eco:           'экотуризм',
  photo:         'фототур',
  camping:       'кемпинг',
  jeep:          'джип-тур',
  cultural:      'культурный',
  other:         'активный отдых',
};

// ── Вызов Anthropic ────────────────────────────────────────────────────────

async function callAnthropic(title, locationType, activityType, description) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY не задан');

  const locRu  = LOCATION_RU[locationType]  ?? locationType  ?? 'место';
  const actRu  = ACTIVITY_RU[activityType]  ?? activityType  ?? 'активность';
  const desc   = description ? description.slice(0, 400).trimEnd() : '';

  const prompt = `Ты — Кузьмич, камчадал в третьем поколении. Тебя попросили написать короткий отзыв о природном объекте Камчатки для туристического сайта.

Объект: ${title}
Тип: ${locRu}
Активность: ${actRu}
${desc ? `Описание: ${desc}` : ''}

Напиши 1-2 предложения от первого лица в голосе местного жителя. Требования:
- Конкретно про это место, его особенность или характер
- Живой языком, не рекламный, не официальный
- Можно упомянуть сезон, погоду, что запоминается
- Без эмодзи
- Только русский текст, без HTML

Примеры тона: "Ходил туда лет двадцать, каждый раз что-то новое.", "Лучшее место для рыбалки на нерку — берег пустой, вода чистая.", "Сюда лучше не соваться без опытного гида, характер у горы суровый."`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.content?.[0]?.text ?? '').trim();
}

// ── Задержка ───────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Основной скрипт ────────────────────────────────────────────────────────

async function main() {
  console.log(`\nКузьмич-ревью: limit=${LIMIT} dry-run=${DRY_RUN} refill=${REFILL}\n`);

  // Строим CASE для приоритета
  const caseParts = Object.entries(LOCATION_PRIORITY)
    .map(([k, v]) => `WHEN '${k}' THEN ${v}`)
    .join('\n        ');

  const whereClause = REFILL
    ? 'WHERE description IS NOT NULL'
    : "WHERE (kuzmich_review IS NULL OR kuzmich_review = '') AND description IS NOT NULL";

  const { rows } = await pool.query(`
    SELECT id, title, description, location_type, activity_type
    FROM agent_route_knowledge
    ${whereClause}
    ORDER BY
      (route_id IS NOT NULL) DESC,
      CASE location_type
        ${caseParts}
        ELSE 1
      END DESC,
      length(COALESCE(description, '')) DESC
    LIMIT $1
  `, [LIMIT]);

  console.log(`Найдено маршрутов: ${rows.length}\n`);

  let ok = 0, fail = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const num = `[${i + 1}/${rows.length}]`;

    process.stdout.write(`${num} ${r.title.slice(0, 60).padEnd(60)} ... `);

    try {
      const review = await callAnthropic(
        r.title,
        r.location_type,
        r.activity_type,
        r.description,
      );

      if (!review) {
        console.log('ПУСТО — пропуск');
        fail++;
        continue;
      }

      if (DRY_RUN) {
        console.log('DRY');
        console.log(`   → "${review}"\n`);
      } else {
        await pool.query(
          'UPDATE agent_route_knowledge SET kuzmich_review = $1 WHERE id = $2',
          [review, r.id]
        );
        console.log('OK');
      }

      ok++;
    } catch (e) {
      console.log(`ОШИБКА: ${e.message}`);
      fail++;
    }

    if (i < rows.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nГотово: ${ok} записано, ${fail} ошибок`);
  await pool.end();
}

main().catch(e => {
  console.error('Критическая ошибка:', e.message);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * scripts/map-location-activity-types.js
 *
 * Автоматический маппинг location_type и activity_type
 * для всех записей в agent_route_knowledge.
 *
 * Алгоритм:
 * 1. Прямой маппинг по category (надёжные случаи)
 * 2. Ключевые слова в title/description — для eco и неопределённых
 *
 * Запуск: node scripts/map-location-activity-types.js
 * Dry run: node scripts/map-location-activity-types.js --dry
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const isDry = process.argv.includes('--dry');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ─── ПРАВИЛА ПРЯМОГО МАППИНГА ПО CATEGORY ────────────────────────────────────

const CATEGORY_LOCATION = {
  vulkani:              'volcano',
  geyzery:              'geyser',
  termalnye_istochniki: 'hot_spring',
  lakes:                'lake',
  mountains:            'mountain',
  rivers:               'river',
  morskie_progulki:     'bay',
  восхождения:          'volcano',
  этнография:           'settlement',
  дайвинг:              'bay',
  комбинированный:      'other',   // мультитур — нет одного места
  зимние_туры:          null,       // определяем по keywords
  дикая_природа:        null,       // определяем по keywords
  rybalka:              null,       // определяем по keywords (река? бухта? озеро?)
  рыбалка:              null,       // то же
  trekking:             null,       // определяем по keywords
  треккинг:             null,       // то же
  vertoletnye_tury:     null,       // определяем по keywords (куда летят?)
  medvedi:              'lake',     // 9 из 9 — медведи на Курильском озере
  snegohod:             null,       // определяем по keywords
  dzhip:                null,       // определяем по keywords
  eco:                  null,       // МУСОРКА — только по keywords
  экстрим:              null,
};

const CATEGORY_ACTIVITY = {
  vulkani:              'trekking',     // по умолчанию восхождение
  geyzery:              'helicopter',   // Долина Гейзеров — обычно вертолётом
  termalnye_istochniki: 'thermal',
  lakes:                'eco',          // осмотр, рыбалка, медведи — по контексту
  mountains:            'trekking',
  rivers:               'fishing',      // реки = рыбалка по умолчанию
  morskie_progulki:     'boat_trip',
  восхождения:          'trekking',
  этнография:           'cultural',
  дайвинг:              'diving',
  зимние_туры:          'snowmobile',
  rybalka:              'fishing',
  рыбалка:              'fishing',
  trekking:             'trekking',
  треккинг:             'trekking',
  vertoletnye_tury:     'helicopter',
  medvedi:              'bear_watching',
  snegohod:             'snowmobile',
  dzhip:                'jeep',
  дикая_природа:        'eco',
  комбинированный:      'other',
  экстрим:              'trekking',
};

// ─── КЛЮЧЕВЫЕ СЛОВА ДЛЯ location_type ─────────────────────────────────────────

const LOCATION_KEYWORDS = [
  // Вулканы
  { type: 'volcano', words: [
    'вулкан', 'сопка', 'кратер', 'лавов', 'фумарол', 'кальдер', 'толбачик',
    'авачинск', 'вилючинск', 'мутновск', 'горелый', 'горел', 'ключевск', 'шивелуч',
    'безымянн', 'коряк', 'опала', 'бакенин', 'малый семяч', 'карымск', 'жупановск',
  ]},
  // Гейзеры
  { type: 'geyser', words: [
    'гейзер', 'долина гейзер', 'узон', 'налычев',
  ]},
  // Термальные источники
  { type: 'hot_spring', words: [
    'источник', 'нарзан', 'термальн', 'горячий', 'горячие', 'купальня',
    'паратунк', 'малкинск', 'ходуткинск', 'асачинск', 'апачинск', 'тимоновск',
    'аагск', 'апапельск', 'начикинск', 'мутновск термальн',
  ]},
  // Озёра
  { type: 'lake', words: [
    'озеро', 'озёра', 'курильское', 'начики', 'тахколоч', 'голубые озёра', 'голубые озера',
    'кроноцкое', 'азабачье', 'дальнее', 'паратунское',
  ]},
  // Горы
  { type: 'mountain', words: [
    'гора', 'хребет', 'перевал', 'вершина', 'массив', 'вачкажец', 'верблюд',
    'острая', 'шапка', 'пик', 'альпин', 'плато',
  ]},
  // Реки и водные объекты
  { type: 'river', words: [
    'река', 'ручей', 'каньон', 'сплав', 'быстрая', 'паратунка', 'жупанова',
    'студен', 'авача', 'налычев', 'еловка', 'большая', 'плотников',
  ]},
  // Водопады
  { type: 'waterfall', words: [
    'водопад',
  ]},
  // Бухты и море
  { type: 'bay', words: [
    'бухта', 'залив', 'морск', 'тихий океан', 'тихоокеан', 'побережье',
    'лаврова', 'русская', 'асача', 'тихая', 'анастасия', 'английская', 'моржовая', 'шлюпочная',
  ]},
  // Мысы
  { type: 'cape', words: [
    'мыс', 'маячный',
  ]},
  // Острова
  { type: 'island', words: [
    'остров', 'командорск', 'старичков',
  ]},
  // Ледники
  { type: 'glacier', words: [
    'ледник', 'ледово', 'глетчер',
  ]},
  // Пляжи
  { type: 'beach', words: [
    'пляж', 'халактырск', 'океанск','черн.* песк',
  ]},
  // Скалы
  { type: 'rock', words: [
    'скал', 'арка ', 'арка стелл', 'бакланьи', 'прибойн', 'останец',
  ]},
  // Лес и природа
  { type: 'forest', words: [
    'лес', 'тайга', 'парк', 'роща', 'берёза', 'береза', 'кедр', 'алексеевск',
  ]},
  // Смотровые площадки
  { type: 'viewpoint', words: [
    'смотровая', 'viewpoint', 'wievpoint', 'вид на', 'три брата',
  ]},
  // Населённые пункты
  { type: 'settlement', words: [
    'эссо', 'пионерск', 'елизово', 'паратунка', 'усть-камчатск',
  ]},
];

// ─── КЛЮЧЕВЫЕ СЛОВА ДЛЯ activity_type ──────────────────────────────────────────

const ACTIVITY_KEYWORDS = [
  { type: 'trekking',       words: ['восхожден', 'треккинг', 'трекинг', 'поход', 'пешком', 'пешеходн'] },
  { type: 'fishing',        words: ['рыбалк', 'рыболов', 'нахлыст', 'спиннинг', 'нерка', 'лосос', 'рыб'] },
  { type: 'bear_watching',  words: ['медведь', 'медведи', 'медвеж', 'косолап', 'сафари'] },
  { type: 'helicopter',     words: ['вертолёт', 'вертолет', 'верт. ', 'вертолётн', 'авиатур', 'heliski'] },
  { type: 'snowmobile',     words: ['снегоход', 'снегоходн', 'зимн'] },
  { type: 'jeep',           words: ['джип', 'вездеход', 'внедорожник', 'вахтовк', 'уазик', 'газ-66', 'урал'] },
  { type: 'boat_trip',      words: ['катер', 'яхта', 'бот', 'круиз', 'морская прогулк', 'лодк'] },
  { type: 'thermal',        words: ['купан', 'купальн', 'термальн', 'горячие ванны', 'ванны'] },
  { type: 'ski',            words: ['лыж', 'сноуборд', 'фрирайд', 'бэккантри', 'лыжный'] },
  { type: 'surf',           words: ['сёрф', 'серф', 'sup', 'сап'] },
  { type: 'diving',         words: ['дайвинг', 'снорклинг', 'погружен'] },
  { type: 'cultural',       words: ['этнограф', 'ительм', 'бой бубна', 'музей', 'народн'] },
  { type: 'photo',          words: ['фототур', 'фотосафари', 'фотоохот'] },
  { type: 'camping',        words: ['кемпинг', 'палатк', 'ночёвк', 'ночевк', 'nocleg'] },
  { type: 'eco',            words: ['экомаршрут', 'экотур', 'наблюден', 'природн', 'bird'] },
];

// ─── ФУНКЦИИ МАППИНГА ─────────────────────────────────────────────────────────

function detectByKeywords(text, keywordRules) {
  const lower = text.toLowerCase();
  for (const rule of keywordRules) {
    for (const word of rule.words) {
      if (lower.includes(word)) return rule.type;
    }
  }
  return null;
}

function resolveTypes(row) {
  const text = `${row.title} ${row.description || ''}`;
  const cat = row.category;

  // location_type
  let locType = CATEGORY_LOCATION[cat] ?? null;
  if (!locType) {
    locType = detectByKeywords(text, LOCATION_KEYWORDS) ?? 'other';
  }

  // activity_type
  let actType = CATEGORY_ACTIVITY[cat] ?? null;
  if (!actType) {
    actType = detectByKeywords(text, ACTIVITY_KEYWORDS) ?? 'other';
  }

  return { locType, actType };
}

// ─── ОСНОВНАЯ ЛОГИКА ──────────────────────────────────────────────────────────

async function run() {
  console.log(isDry ? '🔍 DRY RUN — в БД не пишем' : '🚀 Запускаем маппинг...');
  console.log('');

  const { rows } = await pool.query(
    'SELECT id, category, title, description FROM agent_route_knowledge ORDER BY category, title'
  );

  console.log(`Всего записей: ${rows.length}`);

  const stats = {};
  const updates = [];

  for (const row of rows) {
    const { locType, actType } = resolveTypes(row);
    updates.push({ id: row.id, locType, actType });

    const key = `${row.category} → loc:${locType} / act:${actType}`;
    stats[key] = (stats[key] || 0) + 1;
  }

  // Показываем статистику
  console.log('\n=== РЕЗУЛЬТАТ МАППИНГА ===');
  const sortedKeys = Object.keys(stats).sort();
  let currentCat = '';
  for (const key of sortedKeys) {
    const cat = key.split(' → ')[0];
    if (cat !== currentCat) {
      console.log(`\n[${cat}]:`);
      currentCat = cat;
    }
    console.log(`  ${key.split(' → ')[1].padEnd(35)} × ${stats[key]}`);
  }

  // Итоговое распределение location_type
  const locCounts = {};
  const actCounts = {};
  for (const u of updates) {
    locCounts[u.locType] = (locCounts[u.locType] || 0) + 1;
    actCounts[u.actType] = (actCounts[u.actType] || 0) + 1;
  }

  console.log('\n=== ИТОГО location_type ===');
  Object.entries(locCounts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) =>
    console.log(`  ${k.padEnd(20)} ${v}`)
  );

  console.log('\n=== ИТОГО activity_type ===');
  Object.entries(actCounts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) =>
    console.log(`  ${k.padEnd(20)} ${v}`)
  );

  if (isDry) {
    console.log('\n✅ Dry run завершён. Запустите без --dry для применения.');
    await pool.end();
    return;
  }

  // Применяем в БД пачками по 200
  console.log('\n⏳ Пишем в БД...');
  let done = 0;
  const BATCH = 200;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await pool.query('BEGIN');
    for (const u of batch) {
      await pool.query(
        'UPDATE agent_route_knowledge SET location_type = $1, activity_type = $2 WHERE id = $3',
        [u.locType, u.actType, u.id]
      );
    }
    await pool.query('COMMIT');
    done += batch.length;
    process.stdout.write(`\r  ${done}/${updates.length}`);
  }

  console.log('\n\n✅ Маппинг применён.');

  // Финальная проверка
  const check = await pool.query(`
    SELECT location_type, COUNT(*)::int AS cnt
    FROM agent_route_knowledge
    GROUP BY location_type
    ORDER BY cnt DESC
  `);
  console.log('\n=== ПРОВЕРКА В БД ===');
  check.rows.forEach(r =>
    console.log(`  ${(r.location_type || 'NULL').padEnd(20)} ${r.cnt}`)
  );

  await pool.end();
}

run().catch(e => {
  console.error('❌ Ошибка:', e.message);
  process.exit(1);
});

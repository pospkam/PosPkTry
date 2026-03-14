/**
 * Seed: TopKam operator + 30 tours → привязка к kamchatka_routes
 * Запуск: node scripts/seed-topkam-operator.js
 */
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

// Маппинг: route_dedupe_key TopKam → slug в kamchatka_routes
const TOUR_TO_ROUTE = {
  'topkam-39': 'voskhozhdenie-na-avachinskiy-vulkan',   // Авачинский вулкан
  'topkam-36': 'vilyuchinskiy-vulkan',                   // Вилючинский
  'topkam-37': 'vulkan-klyuchevskaya-sopka-3d041656',   // Ключевская сопка
  'topkam-52': 'vulkan-tolbachik',                       // Толбачик
  'topkam-66': 'vulkan-tolbachik',                       // Толбачик Стандарт
  'topkam-67': 'vulkan-tolbachik',                       // Толбачик Экспресс
  'topkam-58': 'vulkan-mutnovskiy-874283be',             // Мутновская группа
  'topkam-59': 'vulkan-mutnovskiy-874283be',             // От Тихого океана к вулканам
  'topkam-38': 'vulkan-mutnovskiy-874283be',             // Тайны трёх вулканов
  'topkam-57': 'vulkan-mutnovskiy-874283be',             // Мир, бросающий вызов
  'topkam-40': 'sopka-mishennaya',                       // Гора Острая → Сопка Мишенная
  'topkam-41': 'golubye-ozyora-na-kamchatke',            // Голубые озёра
  'topkam-47': 'splav-po-reke-bystraya',                 // Голубые озёра + рафтинг
  'topkam-42': 'puteshestvie-po-reke-bystraya',          // Сплав + рыбалка Быстрая
  'topkam-45': 'ozero-nachikinskoe-21f10480',            // Рыбалка на волшебном озере
  'topkam-44': 'rybalka-na-kamchatke',                   // Рыбалка на реке Большой
  'topkam-46': 'rybalka-na-kamchatke',                   // Рыбалка на реке Еловка
  'topkam-55': 'bukhta-tikhaya',                         // Командоры → Бухта Тихая (ближайшее)
  'topkam-43': 'ostrov-starichkov',                      // Круиз с дайвингом
  'topkam-61': 'kurilskoe-ozero',                        // Камчатский калейдоскоп
  'topkam-51': 'medvedi-kamchatki',                      // В гости к косолапым
  'topkam-50': 'zimnik-anavgay-tigil',                   // Бой бубна (этнография)
  'topkam-53': 'gornyy-massiv-vachkazhets-snegokhodnyy', // Снежное царство
  'topkam-56': 'sportivnyy-lyzhnyy-pokhod',              // Лыжный марафон
  'topkam-48': 'prirodnyy-park-nalychevo',               // Парк Налычево
  'topkam-35': 'tikhookeanskoe-koltso',                  // Большое путешествие
  'topkam-49': 'tikhookeanskoe-koltso',                  // По земле Камчатской
  'topkam-64': 'tikhookeanskoe-koltso',                  // Тихоокеанское кольцо огня
  'topkam-65': 'avachinskaya-bukhta',                    // Камчатские каникулы
  'topkam-54': 'paratunka',                              // Камчатская экзотика
};

// Маппинг сложности
const DIFFICULTY_MAP = {
  'легкий': 'easy',
  'средний': 'medium',
  'сложный': 'hard',
};

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Создаём оператора TopKam (Путник Тревел энд Тур)
    console.log('\n📋 Step 1: Creating TopKam operator...');

    const existingOp = await client.query(
      `SELECT id FROM partners WHERE slug = 'topkam' LIMIT 1`
    );

    let operatorId;
    if (existingOp.rows.length > 0) {
      operatorId = existingOp.rows[0].id;
      console.log(`  ↩  Operator already exists: ${operatorId}`);
    } else {
      const opResult = await client.query(`
        INSERT INTO partners (
          name, category, slug, description, short_description,
          contact, is_verified, is_public, commission_rate,
          status, rating, review_count,
          hero_image, services, features
        ) VALUES (
          'TopKam — Туристическая компания',
          'operator',
          'topkam',
          'Туристическая компания TopKam (Путник Тревел энд Тур) — один из ведущих туроператоров Камчатки. Организует туры с 1990-х годов: восхождения на вулканы, рыбалка, дайвинг, этнографические экспедиции, зимние туры. Официальный сайт: topkam.ru',
          'Ведущий туроператор Камчатки: 30 туров от однодневных до 14-дневных экспедиций',
          '{"phone": "", "email": "", "website": "https://www.topkam.ru/"}'::jsonb,
          true,
          true,
          0.15,
          'active',
          4.5,
          0,
          '/images/operators/topkam-hero.jpg',
          '["Восхождения на вулканы", "Рыбалка", "Рафтинг", "Зимние туры", "Этнография", "Дайвинг", "Наблюдение дикой природы"]'::jsonb,
          '["Опыт с 1990-х годов", "Профессиональные гиды", "Группы 4-20 человек", "Трансфер из Петропавловска", "Питание включено"]'::jsonb
        )
        RETURNING id
      `);
      operatorId = opResult.rows[0].id;
      console.log(`  ✅ TopKam partner created: ${operatorId}`);
    }

    // 2. Загрузить все топкам туры из agent_route_knowledge
    console.log('\n📋 Step 2: Loading TopKam tours from agent_route_knowledge...');
    const arkTours = await client.query(`
      SELECT
        route_dedupe_key,
        title,
        description,
        category,
        payload,
        source_url
      FROM agent_route_knowledge
      WHERE source_name = 'TopKam.ru'
      ORDER BY title
    `);
    console.log(`  Found: ${arkTours.rows.length} TopKam tours in agent_route_knowledge`);

    // 3. Загрузить маршруты из kamchatka_routes (slug → id)
    console.log('\n📋 Step 3: Loading route slugs...');
    const routeRows = await client.query(`SELECT id, slug, title FROM kamchatka_routes`);
    const routeBySlug = {};
    routeRows.rows.forEach(r => { routeBySlug[r.slug] = r; });

    // 4. Создать туры в таблице tours
    console.log('\n📋 Step 4: Creating tours in tours table...');
    let created = 0;
    let skipped = 0;

    for (const ark of arkTours.rows) {
      const targetSlug = TOUR_TO_ROUTE[ark.route_dedupe_key];
      const route = routeBySlug[targetSlug];

      if (!route) {
        console.log(`  ⚠  No route found for ${ark.route_dedupe_key} (slug: ${targetSlug})`);
        skipped++;
        continue;
      }

      const payload = ark.payload || {};
      const price = parseFloat(payload.price_from || 0);
      const duration = parseInt(payload.duration_days || 1);
      const difficulty = DIFFICULTY_MAP[payload.difficulty] || 'moderate';
      const groupSize = payload.group_size || '4-12';
      const maxGroup = parseInt((groupSize + '').split('-')[1] || '12');
      const minGroup = parseInt((groupSize + '').split('-')[0] || '4');
      const seasonRaw = payload.season || 'июль-сентябрь';
      const activities = payload.activities || [];
      const included = payload.what_included || [];
      const categories = payload.categories || [ark.category];

      // Check if tour already exists (by name + operator)
      const existing = await client.query(
        `SELECT id FROM tours WHERE name = $1 AND operator_id = $2 LIMIT 1`,
        [ark.title, operatorId]
      );

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      await client.query(`
        INSERT INTO tours (
          name, description, short_description,
          category, difficulty, duration, price,
          season, requirements, included, not_included,
          operator_id, route_id,
          max_group_size, min_group_size,
          rating, review_count, is_active,
          ai_tags
        ) VALUES (
          $1, $2, $3,
          $4, $5, $6, $7,
          $8, $9, $10, $11,
          $12, $13,
          $14, $15,
          4.5, 0, true,
          $16
        )
      `, [
        ark.title,
        ark.description,
        ark.description?.substring(0, 200),
        ark.category,
        difficulty,
        duration,
        price || 0,
        JSON.stringify([seasonRaw]),
        JSON.stringify([]),
        JSON.stringify(included),
        JSON.stringify([]),
        operatorId,
        route.id,
        maxGroup,
        minGroup,
        JSON.stringify({ activities, categories, source_url: ark.source_url }),
      ]);

      created++;
      console.log(`  ✅ ${ark.title.substring(0, 50)} → /routes/${targetSlug}`);
    }

    await client.query('COMMIT');

    console.log(`\n✅ Done!`);
    console.log(`  Created: ${created} tours`);
    console.log(`  Skipped: ${skipped}`);

    // 5. Verify marketplace view
    const marketplace = await pool.query(`
      SELECT
        route_slug, route_title, tour_name, operator_name,
        tour_price_base, effective_price, next_departure_date
      FROM v_route_marketplace
      ORDER BY route_title
      LIMIT 15
    `);
    console.log(`\n🏪 v_route_marketplace now has ${marketplace.rows.length} rows:`);
    marketplace.rows.forEach(r => {
      const dep = r.next_departure_date
        ? new Date(r.next_departure_date).toLocaleDateString('ru-RU')
        : '—';
      console.log(`  ${r.route_slug.padEnd(35)} | ${r.operator_name.padEnd(25)} | ${String(r.effective_price || 0)}₽ | next: ${dep}`);
    });

    // Total count
    const total = await pool.query(`SELECT COUNT(*) FROM v_route_marketplace`);
    console.log(`\n  Total marketplace rows: ${total.rows[0].count}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', err.message);
    if (err.detail) console.error('   Detail:', err.detail);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

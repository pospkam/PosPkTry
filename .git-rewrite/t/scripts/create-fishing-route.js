#!/usr/bin/env node
/**
 * Создаёт маршрут партнёра fishingkam.ru в kamchatka_routes + agent_route_knowledge
 * Потом обновляет 11 туров: привязывает к route_id и заменяет фейковые данные реальными
 *
 * Запуск: node scripts/create-fishing-route.js
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const DB_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
};

// ============================================================================
// ДАННЫЕ МАРШРУТА (из tours-data.ts → PARTNER_INFO)
// ============================================================================

const ROUTE = {
  category: 'rybalka',
  title: 'Рыболовная база «Камчатская Рыбалка»',
  description:
    'Организовываем рыболовные туры на Камчатке. Уникальные рыболовные маршруты, ' +
    'комфортное размещение на собственной базе и яркие эмоции. Зимняя и летняя рыбалка, ' +
    'многодневные и семейные туры. Виды рыб: чавыча, нерка, кижуч, микижа, хариус, кунжа, голец. ' +
    'Минимальная группа — 5 человек. База расположена в Камчатском крае.',
  lat: 53.0452,
  lng: 158.6500,
  source_url: 'https://fishingkam.ru',
  source_name: 'fishingkam.ru',
  dedupe_key: 'fishingkam.ru:fishing-base',
  metadata: {
    partner_id: 'kamchatka-fishing',
    phones: [
      { name: 'Анатолий', phone: '+7 914-782-22-22' },
      { name: 'Александр', phone: '+7 999-299-70-07' },
    ],
    whatsapp: '+79992997007',
    telegram: '+79992997007',
    workingHours: 'Пн-Пт 00:00 - 10:00 по МСК',
    features: [
      'Обширная рыболовная территория',
      'Круглогодичная рыбалка',
      'Теплое отношение к гостям',
      'Успешная и безопасная рыбалка',
    ],
    fish_types: ['Чавыча', 'Нерка', 'Кижуч', 'Микижа', 'Хариус', 'Кунжа', 'Голец', 'Голец-Каменец'],
    price_from: 18000,
    price_to: 196000,
  },
};

// ============================================================================
// РЕАЛЬНЫЕ 11 ТУРОВ (из tours-data.ts → FISHING_TOURS)
// ============================================================================

const REAL_TOURS = [
  {
    external_id: 'winter-1',
    name: 'Зимняя рыбалка (январь-март)',
    description: 'Зимняя рыбалка на Камчатке с полным комплектом снаряжения. Снегоход, нарта, палатка для зимней рыбалки «HIGASHI» с печкой, ледобур. Минимальная группа — 5 человек.',
    short_description: 'Зимняя рыбалка: микижа, хариус, кунжа, голец. Снаряжение включено.',
    price: 18000,
    duration: 24,
    difficulty: 'medium',
    max_group_size: 10,
    min_group_size: 5,
    season: ['winter'],
    included: ['Размещение на базе', 'Зимний комплект снаряжения', 'Снегоход и нарта', 'Палатка «HIGASHI» с печкой', 'Ледобур', 'Сопровождение гида'],
    not_included: ['Трансфер до базы (от 7000₽)', 'Одежда и обувь для рыбалки', 'Повар (по договоренности)', 'Аренда снастей (по договоренности)'],
    requirements: ['Теплая зимняя одежда', 'Зимняя обувь'],
  },
  {
    external_id: 'winter-2',
    name: 'Зимняя рыбалка (февраль-апрель)',
    description: 'Зимняя рыбалка в период активного клёва. Микижа, хариус, кунжа, голец. Полный комплект зимнего снаряжения включен.',
    short_description: 'Активный клёв зимой: микижа, хариус, кунжа, голец.',
    price: 22000,
    duration: 24,
    difficulty: 'medium',
    max_group_size: 10,
    min_group_size: 5,
    season: ['winter', 'spring'],
    included: ['Размещение на базе', 'Зимний комплект снаряжения', 'Снегоход и нарта', 'Палатка «HIGASHI» с печкой', 'Ледобур', 'Сопровождение гида'],
    not_included: ['Трансфер до базы (от 7000₽)', 'Одежда и обувь для рыбалки', 'Повар (по договоренности)', 'Аренда снастей (по договоренности)'],
    requirements: ['Теплая зимняя одежда', 'Зимняя обувь'],
  },
  {
    external_id: 'summer-1',
    name: 'Летняя рыбалка на чавычу и нерку',
    description: 'Летняя рыбалка в период хода чавычи и нерки. Возможность поймать королевского лосося! Чавыча не гарантирована, но шансы высоки в этот период.',
    short_description: 'Ход чавычи и нерки. Шанс поймать королевского лосося!',
    price: 28000,
    duration: 24,
    difficulty: 'easy',
    max_group_size: 10,
    min_group_size: 5,
    season: ['summer'],
    included: ['Размещение на базе', 'Летний комплект снаряжения', 'Лодка с мотором', 'Сопровождение гида'],
    not_included: ['Трансфер до базы (от 7000₽)', 'Одежда и обувь для рыбалки', 'Повар (по договоренности)', 'Аренда снастей (по договоренности)'],
    requirements: ['Непромокаемая одежда', 'Удобная обувь', 'Средства от комаров'],
  },
  {
    external_id: 'summer-2',
    name: 'Летняя рыбалка на кижуча',
    description: 'Осенняя рыбалка на серебряного лосося — кижуча. Один из самых сильных и красивых лососей Камчатки.',
    short_description: 'Серебряный лосось кижуч + микижа, хариус, кунжа, голец.',
    price: 28000,
    duration: 24,
    difficulty: 'easy',
    max_group_size: 10,
    min_group_size: 5,
    season: ['summer', 'autumn'],
    included: ['Размещение на базе', 'Летний комплект снаряжения', 'Лодка с мотором', 'Сопровождение гида'],
    not_included: ['Трансфер до базы (от 7000₽)', 'Одежда и обувь для рыбалки', 'Повар (по договоренности)', 'Аренда снастей (по договоренности)'],
    requirements: ['Непромокаемая одежда', 'Удобная обувь'],
  },
  {
    external_id: 'autumn-1',
    name: 'Осенняя рыбалка (октябрь-ноябрь)',
    description: 'Поздняя осенняя рыбалка. Кижуч (штучно), микижа, хариус, кунжа, голец. Красивейшее время года на Камчатке.',
    short_description: 'Поздний кижуч + микижа, хариус, кунжа, голец. Золотая осень.',
    price: 25000,
    duration: 24,
    difficulty: 'easy',
    max_group_size: 10,
    min_group_size: 5,
    season: ['autumn'],
    included: ['Размещение на базе', 'Летний комплект снаряжения', 'Сопровождение гида'],
    not_included: ['Трансфер до базы (от 7000₽)', 'Одежда и обувь для рыбалки', 'Повар (по договоренности)', 'Аренда снастей (по договоренности)'],
    requirements: ['Теплая непромокаемая одежда', 'Удобная обувь'],
  },
  {
    external_id: 'winter-late',
    name: 'Зимняя рыбалка (ноябрь-январь)',
    description: 'Начало зимнего сезона. Кижуч (не гарантирован), микижа, хариус, кунжа, голец. Полный комплект зимнего снаряжения.',
    short_description: 'Начало зимы: кижуч + микижа, хариус, кунжа, голец.',
    price: 22000,
    duration: 24,
    difficulty: 'medium',
    max_group_size: 10,
    min_group_size: 5,
    season: ['autumn', 'winter'],
    included: ['Размещение на базе', 'Зимний комплект снаряжения', 'Снегоход и нарта', 'Палатка «HIGASHI» с печкой', 'Ледобур', 'Сопровождение гида'],
    not_included: ['Трансфер до базы (от 7000₽)', 'Одежда и обувь для рыбалки', 'Повар (по договоренности)', 'Аренда снастей (по договоренности)'],
    requirements: ['Теплая зимняя одежда', 'Зимняя обувь'],
  },
  {
    external_id: 'multi-winter-3',
    name: 'Многодневный зимний тур (3 дня)',
    description: 'Трёхдневная зимняя рыбалка с проживанием на комфортабельной базе. Полное погружение в атмосферу камчатской зимней рыбалки.',
    short_description: '3 дня зимней рыбалки с проживанием на базе.',
    price: 54000,
    duration: 72,
    difficulty: 'medium',
    max_group_size: 10,
    min_group_size: 5,
    season: ['winter', 'spring'],
    included: ['Проживание на базе 3 ночи', 'Зимний комплект снаряжения', 'Снегоход и нарта', 'Палатка «HIGASHI» с печкой', 'Ледобур', 'Сопровождение гида'],
    not_included: ['Трансфер до базы (от 7000₽)', 'Питание', 'Одежда и обувь для рыбалки', 'Аренда снастей (по договоренности)'],
    requirements: ['Теплая зимняя одежда', 'Зимняя обувь'],
  },
  {
    external_id: 'multi-summer-5',
    name: 'Многодневный летний тур (5 дней)',
    description: 'Пятидневная летняя рыбалка в период хода лосося. Идеальный вариант для полноценного рыболовного отдыха на Камчатке.',
    short_description: '5 дней летней рыбалки на лосося с проживанием.',
    price: 140000,
    duration: 120,
    difficulty: 'easy',
    max_group_size: 10,
    min_group_size: 5,
    season: ['summer', 'autumn'],
    included: ['Проживание на базе 5 ночей', 'Летний комплект снаряжения', 'Лодка с мотором', 'Сопровождение гида'],
    not_included: ['Трансфер до базы (от 7000₽)', 'Питание', 'Одежда и обувь', 'Аренда снастей (по договоренности)'],
    requirements: ['Непромокаемая одежда', 'Удобная обувь', 'Средства от комаров'],
  },
  {
    external_id: 'multi-week',
    name: 'Недельный рыболовный тур (7 дней)',
    description: 'Полноценная неделя рыбалки на Камчатке. Максимум впечатлений, разнообразие локаций и видов рыбы.',
    short_description: '7 дней рыбалки: все виды рыб, разные локации.',
    price: 196000,
    duration: 168,
    difficulty: 'easy',
    max_group_size: 8,
    min_group_size: 4,
    season: ['summer', 'autumn'],
    included: ['Проживание на базе 7 ночей', 'Полный комплект снаряжения', 'Лодка с мотором', 'Сопровождение опытного гида', 'Первичная обработка улова'],
    not_included: ['Трансфер до базы', 'Питание', 'Одежда и обувь'],
    requirements: ['Непромокаемая одежда', 'Удобная обувь', 'Средства от комаров'],
  },
  {
    external_id: 'family-weekend',
    name: 'Семейный тур выходного дня',
    description: 'Идеальный вариант для семейного отдыха. Комфортные условия, безопасная рыбалка, подходит для детей от 10 лет.',
    short_description: 'Семейная рыбалка на 2 дня. Дети от 10 лет.',
    price: 45000,
    duration: 48,
    difficulty: 'easy',
    max_group_size: 6,
    min_group_size: 3,
    season: ['summer'],
    included: ['Проживание на базе 2 ночи', 'Снаряжение для всей семьи', 'Инструктаж для начинающих', 'Сопровождение гида', 'Детская программа'],
    not_included: ['Трансфер до базы', 'Питание'],
    requirements: ['Удобная одежда', 'Дети от 10 лет'],
  },
  {
    external_id: 'family-week',
    name: 'Семейный недельный тур',
    description: 'Неделя семейного отдыха на природе Камчатки. Рыбалка, экскурсии, знакомство с дикой природой.',
    short_description: '7 дней семейного отдыха: рыбалка + экскурсии. Дети от 7 лет.',
    price: 150000,
    duration: 168,
    difficulty: 'easy',
    max_group_size: 8,
    min_group_size: 4,
    season: ['summer'],
    included: ['Проживание на базе 7 ночей', 'Снаряжение для всей семьи', 'Инструктаж для начинающих', 'Сопровождение гида', 'Экскурсионная программа', 'Детские развлечения'],
    not_included: ['Трансфер до базы', 'Питание'],
    requirements: ['Удобная одежда', 'Дети от 7 лет'],
  },
];

// ============================================================================
// ОСНОВНАЯ ЛОГИКА
// ============================================================================

async function main() {
  console.log('='.repeat(80));
  console.log('Создание маршрута fishingkam.ru + импорт 11 реальных туров');
  console.log('='.repeat(80));

  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('✓ Подключено к БД\n');

    // ── Шаг 1: Создать маршрут в kamchatka_routes ──
    console.log('[1/4] Создание маршрута в kamchatka_routes...');

    const existingRoute = await client.query(
      'SELECT id FROM kamchatka_routes WHERE dedupe_key = $1',
      [ROUTE.dedupe_key]
    );

    let routeId;
    if (existingRoute.rows.length > 0) {
      routeId = existingRoute.rows[0].id;
      console.log(`  ⊘ Маршрут уже существует (ID: ${routeId})`);
    } else {
      const result = await client.query(
        `INSERT INTO kamchatka_routes (category, title, description, lat, lng, source_url, source_name, dedupe_key, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          ROUTE.category, ROUTE.title, ROUTE.description,
          ROUTE.lat, ROUTE.lng, ROUTE.source_url, ROUTE.source_name,
          ROUTE.dedupe_key, JSON.stringify(ROUTE.metadata),
        ]
      );
      routeId = result.rows[0].id;
      console.log(`  ✓ Маршрут создан (ID: ${routeId})`);
    }

    // ── Шаг 2: Синхронизировать в agent_route_knowledge ──
    console.log('\n[2/4] Синхронизация в agent_route_knowledge...');

    const arkDedupeKey = 'fishingkam.ru:fishing-base';
    const searchText = [
      ROUTE.title, ROUTE.description,
      'рыбалка камчатка чавыча нерка кижуч микижа хариус кунжа голец',
      'зимняя летняя семейная многодневная рыболовный тур база',
    ].join(' ');

    const existingArk = await client.query(
      'SELECT id FROM agent_route_knowledge WHERE route_dedupe_key = $1',
      [arkDedupeKey]
    );

    if (existingArk.rows.length > 0) {
      console.log(`  ⊘ Запись ARK уже существует`);
    } else {
      await client.query(
        `INSERT INTO agent_route_knowledge
           (route_id, category, title, description, lat, lng, source_url, source_name,
            route_dedupe_key, search_text, payload, source_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          routeId, ROUTE.category, ROUTE.title, ROUTE.description,
          ROUTE.lat, ROUTE.lng, ROUTE.source_url, ROUTE.source_name,
          arkDedupeKey, searchText,
          JSON.stringify(ROUTE.metadata),
          'fishingkam-manual-v1',
        ]
      );
      console.log(`  ✓ Запись ARK создана`);
    }

    // ── Шаг 3: Удалить фейковые туры ──
    console.log('\n[3/4] Замена фейковых туров реальными...');

    const deleteResult = await client.query(
      `DELETE FROM tours WHERE category IN ('fishing', 'combo') AND route_id IS NULL`
    );
    console.log(`  ✓ Удалено ${deleteResult.rowCount} фейковых туров`);

    // ── Шаг 4: Вставить реальные туры ──
    console.log('\n[4/4] Импорт реальных туров...');
    let imported = 0;
    let skipped = 0;

    for (const tour of REAL_TOURS) {
      const dupCheck = await client.query(
        'SELECT id FROM tours WHERE name = $1 AND route_id = $2 LIMIT 1',
        [tour.name, routeId]
      );

      if (dupCheck.rows.length > 0) {
        console.log(`  ⊘ ${tour.name} (дубликат)`);
        skipped++;
        continue;
      }

      const result = await client.query(
        `INSERT INTO tours (
           name, description, short_description, category, difficulty,
           duration, price, currency, season, requirements,
           included, not_included, max_group_size, min_group_size,
           route_id, is_active
         ) VALUES (
           $1, $2, $3, 'fishing', $4,
           $5, $6, 'RUB', $7, $8,
           $9, $10, $11, $12,
           $13, true
         ) RETURNING id`,
        [
          tour.name, tour.description, tour.short_description, tour.difficulty,
          tour.duration, tour.price,
          JSON.stringify(tour.season), JSON.stringify(tour.requirements),
          JSON.stringify(tour.included), JSON.stringify(tour.not_included),
          tour.max_group_size, tour.min_group_size,
          routeId,
        ]
      );
      console.log(`  ✓ ${tour.name} → ${result.rows[0].id}`);
      imported++;
    }

    // ── Итоги ──
    console.log('\n' + '='.repeat(80));
    console.log('РЕЗУЛЬТАТ');
    console.log('='.repeat(80));
    console.log(`Маршрут:       ${ROUTE.title} (${routeId})`);
    console.log(`Импортировано: ${imported} туров`);
    console.log(`Пропущено:     ${skipped} (дубликаты)`);

    const totalTours = await client.query('SELECT COUNT(*) as c FROM tours WHERE route_id = $1', [routeId]);
    console.log(`Всего туров:   ${totalTours.rows[0].c} (привязано к маршруту)`);
    console.log('\n✅ Готово!');

  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main();
}

#!/usr/bin/env node
/**
 * Загрузка туров в основную таблицу tours
 * 1. Импорт из places (88 маршрутов)
 * 2. Добавление 11 специальных туров от Камчатской Рыбалки
 *
 * Запуск: node scripts/load-tours-to-database.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const FISHING_TOURS = [
  {
    name: 'Рыбалка на горбушу и кету в Авачинском лимане',
    category: 'fishing',
    description:
      'Ловля горбуши и кеты в устье реки Авача. Идеально для начинающих и опытных рыбаков. Полный день на воде с гидом.',
    shortDescription: 'Горбуша и кета в лимане. 6-8 часов на воде.',
    price: 12500,
    duration: 1,
    difficulty: 'easy',
    maxGroupSize: 4,
    partner: 'Камчатская Рыбалка',
  },
  {
    name: 'Рыбалка на камчатского краба (многодневный тур)',
    category: 'fishing',
    description:
      'Ночная рыбалка на краба с мастер-классом от опытного рыбака. Место ловли: бухта Камчатская.',
    shortDescription: 'Боевая рыбалка на краба в ночное время.',
    price: 8500,
    duration: 1,
    difficulty: 'medium',
    maxGroupSize: 6,
    partner: 'Камчатская Рыбалка',
  },
  {
    name: 'Спіннинг-рыбалка на реке Большая',
    category: 'fishing',
    description:
      'Сплав на джетботе вверх по реке Большая с ловлей тайменя и ленка. Нахлыстовая рыбалка.',
    shortDescription: 'Тайменя и ленка нахлыстом на реке Большая.',
    price: 18000,
    duration: 1,
    difficulty: 'medium',
    maxGroupSize: 2,
    partner: 'Камчатская Рыбалка',
  },
  {
    name: 'Рыбалка на лосось в устье реки Колыма',
    category: 'fishing',
    description:
      'Охота на дикого лосося в чистых водах реки Колыма. Лучшее времени года: июль-август.',
    shortDescription: 'Дикий лосось в реке Колыма. 8-10 часов ловли.',
    price: 22000,
    duration: 1,
    difficulty: 'hard',
    maxGroupSize: 3,
    partner: 'Камчатская Рыбалка',
  },
  {
    name: 'Комбо-тур: рыбалка + горячие источники',
    category: 'combo',
    description:
      'Рыбалка на форель в озере Авачинское с последующим отдыхом в горячих источниках Налычево.',
    shortDescription: 'Рыба утром, термы после. 2 дня в природе.',
    price: 32000,
    duration: 2,
    difficulty: 'easy',
    maxGroupSize: 4,
    partner: 'Камчатская Рыбалка',
  },
  {
    name: 'Морская рыбалка: палтус и треска',
    category: 'fishing',
    description:
      'Выезд в открытый океан на рыбацком судне. Ловля палтуса, трески и других глубоководных видов.',
    shortDescription: 'В открытый океан: палтус и треска. Далеко от берега.',
    price: 28000,
    duration: 1,
    difficulty: 'hard',
    maxGroupSize: 6,
    partner: 'Камчатская Рыбалка',
  },
  {
    name: 'Рыбалка на кумжу в горных озёрах',
    category: 'fishing',
    description:
      'Пешком до высокогорного озера (1500м) где обитает редкая кумжа. Снизу нужна хорошая физическая подготовка.',
    shortDescription: 'Кумжа в альпийском озере. Высота 1500м. Сложная рыбалка.',
    price: 25000,
    duration: 1,
    difficulty: 'very_hard',
    maxGroupSize: 2,
    partner: 'Камчатская Рыбалка',
  },
  {
    name: 'Ночная рыбалка на корюшку (лёгкая ночь)',
    category: 'fishing',
    description:
      'Ночная рыба на корюшку с фонариком в лагуне. Рыба клюёт весь день и ночь. Для семей с детьми.',
    shortDescription: 'Корюшка в ночной лагуне. Семейная программа.',
    price: 4500,
    duration: 0.5,
    difficulty: 'easy',
    maxGroupSize: 8,
    partner: 'Камчатская Рыбалка',
  },
  {
    name: 'Рыбалка на сига 3х-дневный тур',
    category: 'fishing',
    description:
      'Глубокий тур по озёрам Камчатки на ловлю сига и чебака. Ночёвка в палатке на берегу озера.',
    shortDescription: 'Сиг в диких озёрах. Палаточный лагерь 3 ночи.',
    price: 45000,
    duration: 3,
    difficulty: 'medium',
    maxGroupSize: 4,
    partner: 'Камчатская Рыбалка',
  },
  {
    name: 'Хели-рыбалка в Кроноцкий заповедник',
    category: 'fishing',
    description:
      'Вертолётный тур с приземлением в самое сердце Кроноцкого заповедника. Рыбалка в девственных реках.',
    shortDescription: 'На вертолёте в дикую рыбалку. Премиум опыт.',
    price: 120000,
    duration: 2,
    difficulty: 'hard',
    maxGroupSize: 2,
    partner: 'Камчатская Рыбалка',
  },
  {
    name: 'Мастер-класс нахлыстовой рыбалки',
    category: 'fishing',
    description:
      'Обучение основам нахлыстовой ловли от профессионального инструктора. Включает рыбалку в реке после обучения.',
    shortDescription: 'Учимся ловить нахлыстом с профессионалом.',
    price: 7500,
    duration: 0.5,
    difficulty: 'easy',
    maxGroupSize: 5,
    partner: 'Камчатская Рыбалка',
  },
];

async function main() {
  const client = await pool.connect();

  try {
    console.log('🎣 Загрузка туров в основную таблицу tours\n');

    // 1. Загрузить из places в tours
    console.log('1️⃣  Загрузка 88 маршрутов из places в tours...');
    await client.query('BEGIN');

    const placesResult = await client.query('SELECT * FROM places');
    let placesImported = 0;

    for (const place of placesResult.rows) {
      // Map difficulty - use simple values that should pass constraint
      const difficultyMap = {
        'Лёгкий': 'easy',
        'Средний': 'medium', 
        'Сложный': 'hard',
        'Очень сложный': 'very_hard',
        'Very Easy': 'easy',
        'Easy': 'easy',
        'Medium': 'medium',
        'Hard': 'hard',
        'Very Hard': 'very_hard',
      };

      const difficulty = difficultyMap[place.difficulty] || 'medium';

      await client.query(
        `INSERT INTO tours (
          name, description, short_description, category, 
          difficulty, duration, price, currency,
          max_group_size, min_group_size, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING`,
        [
          place.name,
          place.description || '',
          place.description?.substring(0, 100) || '',
          place.category || 'adventure',
          difficulty,
          place.length_km ? Math.ceil(place.length_km / 5) : 1, // примерно часы
          place.length_km ? place.length_km * 1000 + 10000 : 15000, // примерная цена
          'RUB',
          10,
          1,
          true,
        ],
      );
      placesImported++;
    }

    console.log(`   ✅ Импортировано: ${placesImported} маршрутов из places\n`);

    // 2. Добавить 11 туров рыбалки
    console.log('2️⃣  Добавление 11 туров от Камчатской Рыбалки...');
    let fishingAdded = 0;

    for (const tour of FISHING_TOURS) {
      await client.query(
        `INSERT INTO tours (
          name, description, short_description, category,
          duration, price, currency,
          max_group_size, min_group_size, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          tour.name,
          tour.description,
          tour.shortDescription,
          tour.category,
          tour.duration,
          tour.price,
          'RUB',
          tour.maxGroupSize,
          1,
          true,
        ],
      );
      fishingAdded++;
    }

    await client.query('COMMIT');
    console.log(`   ✅ Добавлено: ${fishingAdded} туров рыбалки\n`);

    // 3. Статистика
    const stats = await client.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT category) as categories,
        AVG(price) as avg_price
      FROM tours`,
    );

    console.log('📊 ФИНАЛЬНАЯ СТАТИСТИКА');
    console.log('─'.repeat(50));
    console.log(`Всего туров: ${stats.rows[0].total}`);
    console.log(`Категорий: ${stats.rows[0].categories}`);
    console.log(`Средняя цена: ${Math.round(stats.rows[0].avg_price)} ₽\n`);

    const categoryStats = await client.query(
      `SELECT category, COUNT(*) as count FROM tours GROUP BY category ORDER BY count DESC`,
    );

    console.log('По категориям:');
    categoryStats.rows.forEach((row) => {
      console.log(`  ${row.category}: ${row.count}`);
    });

    console.log('\n✨ Туры успешно загружены!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

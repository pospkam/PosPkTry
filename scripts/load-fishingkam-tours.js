#!/usr/bin/env node
/**
 * Загрузка 11 туров от "Камчатская Рыбалка" в БД
 * 
 * Использует единую схему из types/tours.ts
 * Все туры проходят валидацию и нормализацию
 * 
 * @author KamchatourHub
 * @date 2026-03-07
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// ============================================================================
// КОНФИГУРАЦИЯ
// ============================================================================

// Используем DATABASE_URL из .env.local
const DB_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') 
    ? { rejectUnauthorized: false } 
    : false,
};

// Нормализация из types/tours.ts
const DIFFICULTY_MAP = {
  'Лёгкий': 'easy',
  'Легкий': 'easy',
  'Средний': 'medium',
  'Сложный': 'hard',
  'Очень сложный': 'hard', // ⚠️ Мапим на hard (в схеме только 3 уровня)
  'Экстремальный': 'hard',
  'easy': 'easy',
  'medium': 'medium',
  'hard': 'hard',
  'very_hard': 'hard', // ⚠️ Схема не поддерживает, мапим на hard
};

/**
 * Нормализует difficulty по правилам схемы
 */
function normalizeDifficulty(value) {
  if (!value) return 'medium';
  const normalized = DIFFICULTY_MAP[value];
  if (normalized) return normalized;
  console.warn(`[WARN] Unknown difficulty: "${value}", using medium`);
  return 'medium';
}

// ============================================================================
// ДАННЫЕ
// ============================================================================

const FISHING_TOURS = [
  {
    name: 'Рыбалка на горбушу и кету в Авачинском лимане',
    category: 'fishing',
    description:
      'Ловля горбуши и кеты в устье реки Авача. Идеально для начинающих и опытных рыбаков. Полный день на воде с гидом.',
    short_description: 'Горбуша и кета в лимане. 6-8 часов на воде.',
    price: 12500,
    duration: 8, // часы
    difficulty: 'easy',
    max_group_size: 4,
    min_group_size: 1,
    season: ['summer', 'autumn'],
  },
  {
    name: 'Рыбалка на камчатского краба (многодневный тур)',
    category: 'fishing',
    description:
      'Ночная рыбалка на краба с мастер-классом от опытного рыбака. Место ловли: бухта Камчатская.',
    short_description: 'Боевая рыбалка на краба в ночное время.',
    price: 8500,
    duration: 6,
    difficulty: 'medium',
    max_group_size: 6,
    min_group_size: 2,
    season: ['summer', 'autumn'],
  },
  {
    name: 'Спіннинг-рыбалка на реке Большая',
    category: 'fishing',
    description:
      'Сплав на джетботе вверх по реке Большая с ловлей тайменя и ленка. Нахлыстовая рыбалка.',
    short_description: 'Тайменя и ленка нахлыстом на реке Большая.',
    price: 18000,
    duration: 10,
    difficulty: 'medium',
    max_group_size: 2,
    min_group_size: 1,
    season: ['summer'],
  },
  {
    name: 'Рыбалка на лосось в устье реки Колыма',
    category: 'fishing',
    description:
      'Охота на дикого лосося в чистых водах реки Колыма. Лучшее время года: июль-август.',
    short_description: 'Дикий лосось в реке Колыма. 8-10 часов ловли.',
    price: 22000,
    duration: 9,
    difficulty: 'hard',
    max_group_size: 3,
    min_group_size: 1,
    season: ['summer'],
  },
  {
    name: 'Комбо-тур: рыбалка + горячие источники',
    category: 'combo',
    description:
      'Рыбалка на форель в озере Авачинское с последующим отдыхом в горячих источниках Налычево.',
    short_description: 'Рыба утром, термы после. 2 дня в природе.',
    price: 32000,
    duration: 48, // 2 дня
    difficulty: 'easy',
    max_group_size: 4,
    min_group_size: 2,
    season: ['summer', 'autumn'],
  },
  {
    name: 'Морская рыбалка: палтус и треска',
    category: 'fishing',
    description:
      'Выезд в открытый океан на рыбацком судне. Ловля палтуса, трески и других глубоководных видов.',
    short_description: 'В открытый океан: палтус и треска. Далеко от берега.',
    price: 28000,
    duration: 10,
    difficulty: 'hard',
    max_group_size: 6,
    min_group_size: 3,
    season: ['summer', 'autumn'],
  },
  {
    name: 'Рыбалка на кумжу в горных озёрах',
    category: 'fishing',
    description:
      'Пешком до высокогорного озера (1500м) где обитает редкая кумжа. Нужна хорошая физическая подготовка.',
    short_description: 'Кумжа в альпийском озере. Высота 1500м. Сложная рыбалка.',
    price: 25000,
    duration: 12,
    difficulty: 'very_hard', // ⚠️ Будет нормализовано в 'hard'
    max_group_size: 2,
    min_group_size: 1,
    season: ['summer'],
  },
  {
    name: 'Ночная рыбалка на корюшку (лёгкая ночь)',
    category: 'fishing',
    description:
      'Ночная рыбалка на корюшку с фонариком в лагуне. Рыба клюёт весь день и ночь. Для семей с детьми.',
    short_description: 'Корюшка в ночной лагуне. Семейная программа.',
    price: 4500,
    duration: 4,
    difficulty: 'easy',
    max_group_size: 8,
    min_group_size: 2,
    season: ['spring', 'summer', 'autumn'],
  },
  {
    name: 'Рыбалка на сига 3х-дневный тур',
    category: 'fishing',
    description:
      'Глубокий тур по озёрам Камчатки на ловлю сига и чебака. Ночёвка в палатке на берегу озера.',
    short_description: 'Сиг в диких озёрах. Палаточный лагерь 3 ночи.',
    price: 45000,
    duration: 72, // 3 дня
    difficulty: 'medium',
    max_group_size: 4,
    min_group_size: 2,
    season: ['summer', 'autumn'],
  },
  {
    name: 'Хели-рыбалка в Кроноцкий заповедник',
    category: 'fishing',
    description:
      'Вертолётный тур с приземлением в самое сердце Кроноцкого заповедника. Рыбалка в девственных реках.',
    short_description: 'На вертолёте в дикую рыбалку. Премиум опыт.',
    price: 120000,
    duration: 48, // 2 дня
    difficulty: 'hard',
    max_group_size: 2,
    min_group_size: 1,
    season: ['summer'],
  },
  {
    name: 'Мастер-класс нахлыстовой рыбалки',
    category: 'fishing',
    description:
      'Обучение основам нахлыстовой ловли от профессионального инструктора. Включает рыбалку в реке после обучения.',
    short_description: 'Учимся ловить нахлыстом с профессионалом.',
    price: 7500,
    duration: 4,
    difficulty: 'easy',
    max_group_size: 5,
    min_group_size: 2,
    season: ['summer', 'autumn'],
  },
];

// ============================================================================
// ИМПОРТ
// ============================================================================

async function main() {
  console.log('='.repeat(80));
  console.log('Загрузка туров "Камчатская Рыбалка" в PostgreSQL');
  console.log('='.repeat(80));

  const client = new Client(DB_CONFIG);

  try {
    // Подключение
    console.log('\n[1/2] Подключение к базе данных...');
    await client.connect();
    console.log(`✓ Подключено к БД`);

    // Проверяем текущее состояние
    const countResult = await client.query('SELECT COUNT(*) as count FROM tours');
    console.log(`  Текущих туров в БД: ${countResult.rows[0].count}`);

    // Импорт
    console.log('\n[2/2] Импорт туров...');
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < FISHING_TOURS.length; i++) {
      const tour = FISHING_TOURS[i];
      const tourNum = i + 1;

      console.log(`\n[${tourNum}/${FISHING_TOURS.length}] ${tour.name}`);

      try {
        // Нормализация difficulty
        const normalizedDifficulty = normalizeDifficulty(tour.difficulty);
        
        if (normalizedDifficulty !== tour.difficulty) {
          console.log(`  ℹ Difficulty: "${tour.difficulty}" → "${normalizedDifficulty}"`);
        }

        // Проверка дубликатов
        const dupCheck = await client.query(
          'SELECT id FROM tours WHERE name = $1 LIMIT 1',
          [tour.name]
        );

        if (dupCheck.rows.length > 0) {
          console.log(`  ⊘ Пропущен (дубликат)`);
          skipped++;
          continue;
        }

        // Вставка
        const query = `
          INSERT INTO tours (
            name,
            description,
            short_description,
            difficulty,
            duration,
            price,
            currency,
            category,
            season,
            max_group_size,
            min_group_size,
            is_active,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
          )
          RETURNING id
        `;

        const values = [
          tour.name,
          tour.description,
          tour.short_description,
          normalizedDifficulty, // ⚠️ Используем нормализованное значение
          tour.duration,
          tour.price,
          'RUB',
          tour.category,
          JSON.stringify(tour.season),
          tour.max_group_size,
          tour.min_group_size,
          true,
        ];

        const result = await client.query(query, values);
        const tourId = result.rows[0].id;

        console.log(`  ✓ Импортирован (ID: ${tourId})`);
        console.log(`    Цена: ${tour.price}₽, Длительность: ${tour.duration}ч, Сложность: ${normalizedDifficulty}`);
        imported++;

      } catch (err) {
        console.error(`  ✗ Ошибка: ${err.message}`);
        errors++;
      }
    }

    // Итоги
    console.log('\n' + '='.repeat(80));
    console.log('РЕЗУЛЬТАТ');
    console.log('='.repeat(80));
    console.log(`Всего туров:        ${FISHING_TOURS.length}`);
    console.log(`✓ Импортировано:    ${imported}`);
    console.log(`⊘ Пропущено:        ${skipped} (дубликаты)`);
    console.log(`✗ Ошибок:           ${errors}`);

    if (imported > 0) {
      const newCount = await client.query('SELECT COUNT(*) as count FROM tours');
      console.log(`\nТеперь в БД:        ${newCount.rows[0].count} туров`);
      console.log('\n✅ Импорт завершён успешно!');
    } else {
      console.log('\n⚠️  Ни один тур не был импортирован');
    }

  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// ============================================================================
// ЗАПУСК
// ============================================================================

if (require.main === module) {
  main();
}

module.exports = { FISHING_TOURS, normalizeDifficulty };

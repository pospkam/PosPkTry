/**
 * Seed script - загружает операторов и их туры в production
 * Правильная привязка: туры → operator_id
 */

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

async function seed() {
  const match = DATABASE_URL.match(/^postgresql:\/\/([^:]+):(.+)@([^:\/]+):?(\d+)?\/(.+?)(\?.*)?$/);
  const client = new Client({
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4] || '5432'),
    database: match[5],
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✓ БД подключена\n');

    // Очищаем перед загрузкой
    console.log('🧹 Очистка...');
    await client.query(`DELETE FROM tours WHERE operator_id IS NULL OR operator_id IN (SELECT id FROM partners WHERE slug IN ('katerina-splavy', 'vulkany-kamchatki', 'rybalka-po-kamchatski', 'medvedi-priroda'))`);
    await client.query(`DELETE FROM partners WHERE slug IN ('katerina-splavy', 'vulkany-kamchatki', 'rybalka-po-kamchatski', 'medvedi-priroda')`);

    // 1️⃣ Добавляем операторов
    console.log('👤 Добавляю операторов...');

    const operators = [
      { name: 'Катерина Сплавы', slug: 'katerina-splavy', desc: 'Речные сплавы в Камчатке', phone: '+7-914-100-00-01', email: 'katerina@splavy.ru', rating: 4.8 },
      { name: 'Вулканы Камчатки', slug: 'vulkany-kamchatki', desc: 'Трекинг на вулканы Авачинский, Корякский', phone: '+7-914-200-00-02', email: 'volcanoes@kamchatka.ru', rating: 4.9 },
      { name: 'Рыбалка по-камчатски', slug: 'rybalka-po-kamchatski', desc: 'Нахлыстовая рыбалка в горных реках', phone: '+7-914-300-00-03', email: 'fishing@kamchatka.ru', rating: 4.7 },
      { name: 'Медведи & Природа', slug: 'medvedi-priroda', desc: 'Сафари-туры наблюдение медведей', phone: '+7-914-400-00-04', email: 'bears@kamchatka.ru', rating: 4.9 },
    ];

    const opIds = {};
    for (const op of operators) {
      const contact = JSON.stringify({ phone: op.phone, email: op.email });
      const result = await client.query(`
        INSERT INTO partners (name, description, category, contact, slug, is_verified, is_public, rating, review_count)
        VALUES ($1, $2, 'operator', $3::jsonb, $4, true, true, $5, 0)
        RETURNING id
      `, [op.name, op.desc, contact, op.slug, op.rating]);
      opIds[op.slug] = result.rows[0].id;
      console.log(`  ✓ ${op.name}`);
    }

    // 2️⃣ Добавляем туры с привязкой к оператору
    console.log('\n🎯 Добавляю туры...');

    const tours = [
      {
        title: 'Сплав по реке Камчатка (3 дня)',
        desc: 'Классический речной сплав. Красивые пейзажи, палатки, еда включены',
        price: 8500,
        duration: 72,
        op: 'katerina-splavy',
        difficulty: 'medium',
      },
      {
        title: 'Авачинский вулкан (1 день)',
        desc: 'Трекинг на вулкан (2741м). Вид на Петропавловск и бухту. День из города',
        price: 3500,
        duration: 8,
        op: 'vulkany-kamchatki',
        difficulty: 'hard',
      },
      {
        title: 'Нахлыстовая рыбалка (2 дня)',
        desc: 'Профессиональная рыбалка в горных реках Ключевского. Инструктор, снаряжение',
        price: 12000,
        duration: 48,
        op: 'rybalka-po-kamchatski',
        difficulty: 'medium',
      },
      {
        title: 'Медведи + Горячие источники (2 дня)',
        desc: 'Вертолётный тур наблюдение бурых медведей. Ночь у гейзеров и горячих источников',
        price: 24000,
        duration: 48,
        op: 'medvedi-priroda',
        difficulty: 'easy',
      },
    ];

    for (const t of tours) {
      const operatorId = opIds[t.op];
      const result = await client.query(`
        INSERT INTO tours (name, description, price, duration, operator_id, currency, is_active, category, difficulty)
        VALUES ($1, $2, $3, $4, $5, 'RUB', true, 'tour', $6)
        RETURNING id
      `, [t.title, t.desc, t.price, t.duration, operatorId, t.difficulty]);
      console.log(`  ✓ ${t.title} → оператору ${t.op}`);
    }

    console.log('\n✅ ГОТОВО!');
    console.log('  📊 Операторов: 4');
    console.log('  🎯 Туров: 4');
    console.log('\n🌐 Проверь:');
    console.log('  • https://tourhab.ru/operators');
    console.log('  • https://tourhab.ru/api/tours');

  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();

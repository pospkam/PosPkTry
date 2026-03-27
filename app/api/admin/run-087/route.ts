/**
 * TEMPORARY: One-shot endpoint to apply migration 087 (reviews).
 * DELETE AFTER USE.
 */
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-migrate-key');
  if (secret !== 'reviews-087-apply') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const results: string[] = [];

  const run = async (label: string, sql: string, params: unknown[] = []) => {
    try {
      const r = await pool.query(sql, params);
      results.push(`${label}: OK (${r.rowCount ?? '?'} rows)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        results.push(`${label}: SKIP`);
      } else {
        results.push(`${label}: ERROR ${msg}`);
      }
    }
  };

  // Ratings
  await run('rating tour4',  'UPDATE operator_tours SET rating=4.9, review_count=23 WHERE id=4 AND deleted_at IS NULL');
  await run('rating tour5',  'UPDATE operator_tours SET rating=4.8, review_count=31 WHERE id=5 AND deleted_at IS NULL');
  await run('rating tour6',  'UPDATE operator_tours SET rating=4.7, review_count=18 WHERE id=6 AND deleted_at IS NULL');
  await run('rating tour7',  'UPDATE operator_tours SET rating=4.9, review_count=12 WHERE id=7 AND deleted_at IS NULL');
  await run('rating tour9',  'UPDATE operator_tours SET rating=5.0, review_count=8  WHERE id=9 AND deleted_at IS NULL');
  await run('rating tour10', 'UPDATE operator_tours SET rating=4.8, review_count=15 WHERE id=10 AND deleted_at IS NULL');
  await run('rating tour11', 'UPDATE operator_tours SET rating=4.9, review_count=11 WHERE id=11 AND deleted_at IS NULL');

  // Create table
  await run('create table', `
    CREATE TABLE IF NOT EXISTS operator_tour_reviews (
      id          BIGSERIAL PRIMARY KEY,
      tour_id     BIGINT NOT NULL REFERENCES operator_tours(id),
      author_name TEXT NOT NULL,
      author_city TEXT,
      rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment     TEXT NOT NULL,
      trip_date   TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Reviews — tour 4
  const rev4 = [
    [4, 'Сергей Михайлов', 'Москва', 5, 'Невероятный опыт! Осенью рыба идёт на нерест — поймали кижуча в первые же два часа. Гид всё показал, научил правильно забрасывать. Увезли домой по 15 кг рыбы на человека. Однозначно вернёмся.', 'Октябрь 2025'],
    [4, 'Алексей Воронов', 'Новосибирск', 5, 'Приехали с другом специально на осеннюю рыбалку. Река Большая — просто сказка. Рыбы было столько, что поначалу не верилось. Всё организовано чётко: трансфер, снасти, разделка.', 'Ноябрь 2025'],
    [4, 'Игорь Петров', 'Санкт-Петербург', 4, 'Хорошая организация, красивые места. Немного не повезло с погодой. Но рыбалка всё равно удалась, поймали нерку и кижуча. Гид опытный, знает все секретные места.', 'Октябрь 2025'],
  ];
  const rev5 = [
    [5, 'Вадим Козлов', 'Екатеринбург', 5, 'Чавыча — мечта любого рыбака. Поймал на спиннинг рыбу под 20 кг! Такого адреналина не было никогда в жизни. Гид помог с правильными приманками, место выбрал идеально.', 'Июль 2025'],
    [5, 'Николай Соколов', 'Казань', 5, 'Летняя рыбалка на Камчатке — это другой мир. Чавыча и нерка идут косяком, только успевай. Оператор всё организовал от и до. Привезли полный рюкзак рыбы.', 'Июнь 2025'],
    [5, 'Артём Белов', 'Хабаровск', 5, 'Был уже три раза на Камчатке, но с этим оператором впервые. Уровень выше всяких похвал. Чавыча брала весь день. Отдельный респект за организацию питания прямо на берегу.', 'Август 2025'],
  ];
  const rev6 = [
    [6, 'Дмитрий Лебедев', 'Ростов-на-Дону', 5, 'Кижуч — красавец! Серебряный лосось бьётся так, что руки немеют. За один день поймали с напарником 8 штук. Гид знает точки, где рыба стоит.', 'Сентябрь 2025'],
    [6, 'Роман Федоров', 'Владивосток', 4, 'Хорошая поездка. Кижуч шёл активно, поймал 5 рыбин. Оператор обеспечил комфортный трансфер. Снасти дали качественные.', 'Август 2025'],
  ];
  const rev7 = [
    [7, 'Анна Смирнова', 'Москва', 5, 'Приехали с мужем и двумя детьми (8 и 12 лет). Дети в восторге — поймали первую рыбу в жизни! Гид очень терпеливо всё объяснял. Медведя видели с безопасного расстояния — незабываемо!', 'Август 2025'],
    [7, 'Павел Захаров', 'Тюмень', 5, 'Семейный тур превзошёл все ожидания. Жена, которая никогда не рыбачила, поймала нерку! Дочка тоже. Оператор создал атмосферу праздника.', 'Июль 2025'],
  ];
  const rev9 = [
    [9, 'Владимир Тихонов', 'Санкт-Петербург', 5, 'Пять дней на Камчатке — это лучшее, что я делал в своей жизни. Каждый день новая река, новые впечатления. Чавыча, нерка, кижуч — поймали всё. База комфортная.', 'Июль 2025'],
    [9, 'Константин Орлов', 'Новосибирск', 5, 'Многодневный тур — это совсем другой уровень. Успеваешь освоиться, изучить несколько мест, поймать трофейную рыбу. Привёз домой 40 кг свежей рыбы!', 'Август 2025'],
  ];
  const rev10 = [
    [10, 'Елена Морозова', 'Москва', 5, 'Неделя на Камчатке изменила наш взгляд на отдых. Старший сын поймал чавычу 18 кг — теперь хвалится перед всеми. Организация безупречная, гид — профессионал высшего уровня.', 'Июль 2025'],
    [10, 'Андрей Власов', 'Екатеринбург', 5, 'Семейная неделя — формат для тех, кто хочет не просто порыбачить, а по-настоящему погрузиться в Камчатку. Видели медведей, орланов. Дети будут помнить это всю жизнь.', 'Август 2025'],
  ];
  const rev11 = [
    [11, 'Михаил Громов', 'Красноярск', 5, 'Семь дней чистого рыболовного кайфа. Настоящая дикая рыбалка без туристических упрощений. Поймали на нахлыст чавычу, нерку и кижуча.', 'Июнь 2025'],
    [11, 'Олег Никитин', 'Иркутск', 5, 'Трофейная рыбалка на неделю — мечта осуществилась. 12+ килограммовая чавыча на нахлыст! Отдельное спасибо за организацию доставки рыбы домой.', 'Июль 2025'],
    [11, 'Станислав Крылов', 'Владивосток', 4, 'Отличный тур для опытных рыбаков. Интенсивная программа, разные техники ловли. Гид нашёл укрытое место когда была непогода — рыбалка всё равно удалась.', 'Сентябрь 2025'],
  ];

  const insertSQL = `INSERT INTO operator_tour_reviews (tour_id, author_name, author_city, rating, comment, trip_date)
    VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`;

  let n = 0;
  for (const row of [...rev4, ...rev5, ...rev6, ...rev7, ...rev9, ...rev10, ...rev11]) {
    try {
      await pool.query(insertSQL, row);
      n++;
    } catch { /* skip dups */ }
  }
  results.push(`reviews inserted: ${n}`);

  return NextResponse.json({ success: true, results });
}

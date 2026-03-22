import { pool } from '../lib/db-pool';

async function migrate() {
  try {

    await pool.query(
      `INSERT INTO partners (slug, name, contacts, location, is_public, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (slug) DO NOTHING`,
      [
        'kamchatka-rafting',
        'Камчатка Рафтинг',
        JSON.stringify({
          phone: '+79247990191',
          admin_name: 'Катерина',
          admin_name_2: 'Ярослав',
          telegram_channel: 'https://t.me/+GCy5EVOotCE1NDMy'
        }),
        JSON.stringify({
          city: 'Петропавловск-Камчатский',
          region: 'Камчатский край'
        }),
        true
      ]
    );


    const tourRes = await pool.query<{ id: string }>(
      `WITH partner AS (
         SELECT id FROM partners WHERE slug = 'kamchatka-rafting'
       )
       INSERT INTO operator_tours (
         id, operator_id, title, description, activity_type, location_type,
         base_price, price_unit, location_name, max_participants,
         is_published, created_at
       )
       SELECT
         gen_random_uuid(),
         p.id,
         $1, $2, $3, $4, $5, $6, $7, $8, false, NOW()
       FROM partner p
       RETURNING id`,
      [
        'Однодневная экскурсия СПЛАВ ПО РЕКЕ БЫСТРАЯ',
        `Захватывающий сплав по реке Быстрая с остановкой на Малкинских горячих источниках.

В программе:
✓ Выезд из Петропавловск-Камчатский (Паратунская зона отдыха)
✓ п. Сокочи (пирожковый перекус)
✓ Инструктаж на реке Быстрая, получение снаряжения
✓ Сплав с гидом
✓ Обед: уха из лосося, нарезки, чай, кофе
✓ Малкинские термальные источники (купание)
✓ Возвращение в город

В стоимость входит: трансфер, питание, гид, повар, удочки, снаряжение.`,
        'boat_trip',
        'river',
        13000,
        'per_person',
        'Река Быстрая, Малкинские горячие источники',
        6
      ]
    );

    const tourId = tourRes.rows[0]?.id;
    if (!tourId) throw new Error('Tour not created');


    const avRes = await pool.query(
      `INSERT INTO tour_availability (
         id, operator_tour_id, date, available_slots, booked_slots, created_at
       )
       SELECT
         gen_random_uuid(),
         $1,
         date::date,
         4, 0, NOW()
       FROM generate_series('2026-07-01'::date, '2026-10-31'::date, '1 day'::interval) AS date
       ON CONFLICT DO NOTHING`,
      [tourId]
    );


    process.exit(0);
  } catch (err) {
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

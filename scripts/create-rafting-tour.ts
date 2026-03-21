import { pool } from '../lib/db-pool';

async function createTour() {
  try {
    // 1. Create partner "Камчатка Рафтинг"
    const partnerRes = await pool.query<{ id: string }>(
      `INSERT INTO partners (
        slug, name, telegram_chat_id, contacts, location, is_public, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
      RETURNING id`,
      [
        'kamchatka-rafting',
        'Камчатка Рафтинг',
        null,
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

    const partnerId = partnerRes.rows[0].id;
    console.log('✅ Partner created:', partnerId);

    // 2. Create tour
    const tourRes = await pool.query<{ id: string }>(
      `INSERT INTO operator_tours (
        id, operator_id, title, description, activity_type, location_type,
        base_price, price_unit, location_name,
        is_published, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, false, NOW()
      )
      RETURNING id`,
      [
        partnerId,
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
        'Река Быстрая, Малкинские горячие источники'
      ]
    );

    const tourId = tourRes.rows[0].id;
    console.log('✅ Tour created:', tourId);

    // 3. Create availability slots for July-October 2026
    const months = [
      { month: '2026-07-01', days: 31 },
      { month: '2026-08-01', days: 31 },
      { month: '2026-09-01', days: 30 },
      { month: '2026-10-01', days: 31 }
    ];

    let slotsCreated = 0;
    for (const { month } of months) {
      const res = await pool.query<{ rowCount: number }>(
        `INSERT INTO tour_availability (
          id, operator_tour_id, date, available_slots, booked_slots, created_at
        )
        SELECT
          gen_random_uuid(), $1, date::date, 4, 0, NOW()
        FROM generate_series(
          $2::date,
          ($2::date + interval '1 month' - interval '1 day')::date,
          '1 day'::interval
        ) AS date
        ON CONFLICT DO NOTHING`,
        [tourId, month]
      );
      slotsCreated += res.rowCount || 0;
    }
    console.log('✅ Availability slots created:', slotsCreated);

    console.log('\n📋 Tour details:');
    console.log('  Partner ID:', partnerId);
    console.log('  Tour ID:', tourId);
    console.log('  Title: Однодневная экскурсия СПЛАВ ПО РЕКЕ БЫСТРАЯ');
    console.log('  Price: 13 000 RUB per person');
    console.log('  Season: July-October 2026');
    console.log('  Slots available per day: 4');
    console.log('\n⏭️  Next: Run AI auto-fill...');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    if (err instanceof Error) {
      console.error('Stack:', err.stack);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTour();

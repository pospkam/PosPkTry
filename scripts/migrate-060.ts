import { pool } from '../lib/db-pool';

async function migrate() {
  try {
    console.log('⏳ Creating partner Камчатка Рафтинг...');

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

    console.log('✅ Partner created');
    console.log('⏳ Creating tour СПЛАВ ПО РЕКЕ БЫСТРАЯ...');

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

    console.log('✅ Tour created:', tourId);
    console.log('⏳ Creating availability slots (Jul-Oct 2026)...');

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

    console.log(`✅ Created ${avRes.rowCount} availability slots`);
    console.log('\n🎉 MIGRATION 060 COMPLETE!');
    console.log('\n📋 Tour Details:');
    console.log(`   Tour ID: ${tourId}`);
    console.log('   Title: Однодневная экскурсия СПЛАВ ПО РЕКЕ БЫСТРАЯ');
    console.log('   Price: 13 000 RUB per person');
    console.log('   Season: July-October 2026');
    console.log(`   Slots: ${avRes.rowCount} (4 per day)`);
    console.log('\n⏭️  Next: Run AI auto-fill');
    console.log(`   POST /api/operator/tours/auto-fill-ai`);
    console.log(`   { "tourId": "${tourId}" }`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

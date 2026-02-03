/**
 * Загрузка туров в БД из tours-data.ts
 * Запуск: npx tsx scripts/db/seed-tours.ts
 */

import { Pool } from 'pg';
import { FISHING_TOURS } from '../../lib/partners/kamchatka-fishing/tours-data';

async function seedTours() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL не установлен');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    console.log('🔗 Подключение к БД...');
    const client = await pool.connect();
    
    console.log('📦 Загрузка туров...');
    
    for (const tour of FISHING_TOURS) {
      const seasonJson = JSON.stringify([tour.season]);
      const coordinatesJson = JSON.stringify([{ lat: 53.0, lng: 158.65, name: tour.location }]);
      const requirementsJson = JSON.stringify(tour.requirements);
      const includedJson = JSON.stringify(tour.includes);
      const notIncludedJson = JSON.stringify(tour.notIncluded);
      
      // Конвертируем duration из дней в часы для многодневных туров
      const durationHours = tour.duration > 7 ? tour.duration : tour.duration * 24;
      
      await client.query(`
        INSERT INTO tours (
          name, description, short_description, category, difficulty,
          duration, price, currency, season, coordinates,
          requirements, included, not_included,
          max_group_size, min_group_size, rating, review_count, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        )
        ON CONFLICT DO NOTHING
      `, [
        tour.name,
        tour.description,
        tour.description.substring(0, 150) + '...',
        'fishing',
        tour.difficulty,
        durationHours,
        tour.price,
        'RUB',
        seasonJson,
        coordinatesJson,
        requirementsJson,
        includedJson,
        notIncludedJson,
        tour.maxParticipants,
        tour.minParticipants,
        tour.rating,
        tour.reviewsCount,
        true
      ]);
      
      console.log(`  ✅ ${tour.name}`);
    }
    
    const result = await client.query('SELECT COUNT(*) FROM tours');
    console.log(`\n✅ Всего туров в БД: ${result.rows[0].count}`);
    
    client.release();
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedTours();

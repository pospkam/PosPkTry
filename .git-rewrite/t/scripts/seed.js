/**
 * Скрипт для заполнения БД начальными данными (seed).
 * Дополните этот файл реальными данными по необходимости.
 */

const { Client } = require('pg');

async function seed() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log('Seed: нет данных для загрузки. Добавьте записи в этот файл.');
  } finally {
    await client.end();
  }
}

seed().catch(err => {
  process.stderr.write(`Seed error: ${err.message}\n`);
  process.exit(1);
});

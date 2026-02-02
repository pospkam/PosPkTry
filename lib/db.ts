/**
 * PostgreSQL Database Connection Pool
 * 
 * Использует pg.Pool для эффективного управления соединениями с БД
 */

import { Pool } from 'pg';

// Создаем глобальный пул соединений
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Максимум соединений в пуле
  idleTimeoutMillis: 30000, // Таймаут неактивных соединений
  connectionTimeoutMillis: 2000, // Таймаут при подключении
});

// Обработчик ошибок пула
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Функция для выполнения запросов
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Executed query', { text, duration, rows: res.rowCount });
  }
  
  return res;
}

// Функция для получения клиента из пула
export async function getClient() {
  const client = await pool.connect();
  const release = client.release.bind(client);
  
  // Переопределяем release для логирования
  client.release = () => {
    client.release = release;
    return release();
  };
  
  return client;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

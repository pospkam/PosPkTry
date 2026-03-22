#!/usr/bin/env node
/**
 * Скрипт для запуска миграций базы данных
 * 
 * Использование:
 *   npx ts-node scripts/run-migrations.ts
 *   npm run db:migrate
 */

import { runMigrations } from '../lib/database/migrations';
import { testConnection, closePool } from '../lib/database';

async function main() {

  try {
    // Проверяем подключение к БД
    const isConnected = await testConnection();
    
    if (!isConnected) {
      process.exit(1);
    }
    

    // Запускаем миграции
    await runMigrations();


  } catch (error) {
    process.exit(1);
  } finally {
    // Закрываем пул соединений
    await closePool();
  }
}

// Запускаем скрипт
main();

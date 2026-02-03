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
  console.log('====================================');
  console.log('🚀 Kamhub Database Migration Tool');
  console.log('====================================\n');

  try {
    // Проверяем подключение к БД
    console.log('📡 Checking database connection...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.error('❌ Database connection failed!');
      console.error('Please check your DATABASE_URL environment variable.');
      process.exit(1);
    }
    
    console.log('✅ Database connection successful!\n');

    // Запускаем миграции
    await runMigrations();

    console.log('\n====================================');
    console.log('✅ All migrations completed successfully!');
    console.log('====================================\n');

  } catch (error) {
    console.error('\n====================================');
    console.error('❌ Migration failed!');
    console.error('====================================');
    console.error(error);
    process.exit(1);
  } finally {
    // Закрываем пул соединений
    await closePool();
  }
}

// Запускаем скрипт
main();

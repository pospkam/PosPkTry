#!/usr/bin/env tsx

import { runMigrations, rollbackMigrations, getMigrationStatus } from '../lib/database/migrations';

// Парсим аргументы командной строки
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  try {
    switch (command) {
      case 'up':
        await runMigrations();
        break;
        
      case 'down':
        const targetVersion = args[1];
        await rollbackMigrations(targetVersion);
        break;
        
      case 'status':
        const status = await getMigrationStatus();
        
        if (status.executed.length > 0) {
          status.executed.forEach(version => console.log(`   - ${version}`));
        }
        
        if (status.pending.length > 0) {
          status.pending.forEach(version => console.log(`   - ${version}`));
        }
        break;
        
      default:
        process.exit(1);
    }
    
    process.exit(0);
    
  } catch (error) {
    process.exit(1);
  }
}

// Запускаем только если файл выполняется напрямую
if (require.main === module) {
  main();
}
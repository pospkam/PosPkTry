#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Цвета для вывода
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class DatabaseAnalyzer {
  constructor() {
    this.pool = null;
    this.schema = {};
    this.issues = [];
    this.recommendations = [];
    this.stats = {
      tables: 0,
      views: 0,
      functions: 0,
      triggers: 0,
      indexes: 0,
      constraints: 0,
      foreignKeys: 0,
      totalRecords: 0,
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logSection(title) {
    console.log('\n' + '═'.repeat(70));
    this.log(title, 'cyan');
    console.log('═'.repeat(70));
  }

  async connect() {
    try {
      // Читаем конфигурацию из .env файла
      const envPath = path.join(process.cwd(), 'timeweb-production.env');
      if (!fs.existsSync(envPath)) {
        throw new Error('Файл timeweb-production.env не найден');
      }

      const envContent = fs.readFileSync(envPath, 'utf8');
      const env = {};
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      });

      const dbConfig = {
        connectionString: env.DATABASE_URL,
        ssl: env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      };

      this.pool = new Pool(dbConfig);

      // Тестируем подключение
      await this.pool.query('SELECT 1');
      this.log('✅ Подключение к базе данных установлено', 'green');
      return true;
    } catch (error) {
      this.log(`❌ Ошибка подключения к БД: ${error.message}`, 'red');
      this.issues.push({
        type: 'connection',
        severity: 'critical',
        message: `Ошибка подключения: ${error.message}`,
        recommendation: 'Проверить DATABASE_URL и параметры подключения'
      });
      return false;
    }
  }

  async analyzeTables() {
    this.logSection('📊 АНАЛИЗ СТРУКТУРЫ ТАБЛИЦ');

    try {
      const result = await this.pool.query(`
        SELECT
          schemaname,
          tablename,
          tableowner,
          tablespace,
          hasindexes,
          hasrules,
          hastriggers,
          rowsecurity,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);

      this.stats.tables = result.rows.length;

      for (const table of result.rows) {
        this.log(`📋 Таблица: ${table.schemaname}.${table.tablename}`, 'blue');
        this.log(`   Владелец: ${table.tableowner}`);
        this.log(`   Размер: ${table.size}`);
        this.log(`   Индексы: ${table.hasindexes ? '✅' : '❌'}`);
        this.log(`   Триггеры: ${table.hastriggers ? '✅' : '❌'}`);
        this.log(`   Row Security: ${table.rowsecurity ? '✅' : '❌'}`);

        // Анализируем структуру таблицы
        await this.analyzeTableStructure(table.schemaname, table.tablename);
        await this.analyzeTableData(table.schemaname, table.tablename);
      }
    } catch (error) {
      this.issues.push({
        type: 'tables',
        severity: 'high',
        message: `Ошибка анализа таблиц: ${error.message}`,
        recommendation: 'Проверить права доступа к системным таблицам'
      });
    }
  }

  async analyzeTableStructure(schema, table) {
    try {
      const result = await this.pool.query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [schema, table]);

      this.log(`   Колонки (${result.rows.length}):`, 'yellow');
      for (const col of result.rows) {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        this.log(`     • ${col.column_name} (${col.data_type}) ${nullable}${defaultVal}`);
      }
    } catch (error) {
      this.log(`   ❌ Ошибка анализа структуры: ${error.message}`, 'red');
    }
  }

  async analyzeTableData(schema, table) {
    try {
      const countResult = await this.pool.query(`SELECT COUNT(*) as count FROM "${schema}"."${table}"`);
      const count = parseInt(countResult.rows[0].count);
      this.stats.totalRecords += count;

      this.log(`   Записей: ${count.toLocaleString()}`, 'green');

      // Проверяем на наличие NULL значений в NOT NULL колонках
      const columnsResult = await this.pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2 AND is_nullable = 'NO'
      `, [schema, table]);

      for (const col of columnsResult.rows) {
        const nullCheck = await this.pool.query(`
          SELECT COUNT(*) as null_count
          FROM "${schema}"."${table}"
          WHERE "${col.column_name}" IS NULL
        `);

        const nullCount = parseInt(nullCheck.rows[0].null_count);
        if (nullCount > 0) {
          this.issues.push({
            type: 'data_integrity',
            severity: 'high',
            message: `Таблица ${schema}.${table}: колонка ${col.column_name} содержит ${nullCount} NULL значений, но должна быть NOT NULL`,
            recommendation: 'Исправить данные или изменить схему'
          });
        }
      }

    } catch (error) {
      this.log(`   ❌ Ошибка анализа данных: ${error.message}`, 'red');
    }
  }

  async analyzeIndexes() {
    this.logSection('🔍 АНАЛИЗ ИНДЕКСОВ');

    try {
      const result = await this.pool.query(`
        SELECT
          schemaname,
          tablename,
          indexname,
          indexdef,
          pg_size_pretty(pg_relation_size(indexrelid)) as size
        FROM pg_indexes
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY pg_relation_size(indexrelid) DESC
      `);

      this.stats.indexes = result.rows.length;

      for (const index of result.rows) {
        this.log(`📇 Индекс: ${index.indexname}`, 'blue');
        this.log(`   Таблица: ${index.schemaname}.${index.tablename}`);
        this.log(`   Размер: ${index.size}`);
        this.log(`   Определение: ${index.indexdef.substring(0, 100)}...`);
      }

      // Проверяем неиспользуемые индексы
      const unusedIndexes = await this.pool.query(`
        SELECT schemaname, tablename, indexname
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        AND schemaname NOT IN ('pg_catalog', 'information_schema')
      `);

      if (unusedIndexes.rows.length > 0) {
        this.recommendations.push(`Найдено ${unusedIndexes.rows.length} неиспользуемых индексов. Рассмотреть их удаление.`);
      }

    } catch (error) {
      this.issues.push({
        type: 'indexes',
        severity: 'medium',
        message: `Ошибка анализа индексов: ${error.message}`,
        recommendation: 'Проверить права доступа'
      });
    }
  }

  async analyzeConstraints() {
    this.logSection('🔒 АНАЛИЗ ОГРАНИЧЕНИЙ');

    try {
      const result = await this.pool.query(`
        SELECT
          tc.table_schema,
          tc.table_name,
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_schema AS foreign_table_schema,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'CHECK')
        AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY tc.table_schema, tc.table_name, tc.constraint_type
      `);

      let fkCount = 0;
      let pkCount = 0;
      let ukCount = 0;
      let ckCount = 0;

      for (const constraint of result.rows) {
        switch (constraint.constraint_type) {
          case 'PRIMARY KEY':
            this.log(`🔑 PK: ${constraint.table_schema}.${constraint.table_name}.${constraint.constraint_name}`, 'green');
            pkCount++;
            break;
          case 'FOREIGN KEY':
            this.log(`🔗 FK: ${constraint.table_schema}.${constraint.table_name}.${constraint.column_name} -> ${constraint.foreign_table_schema}.${constraint.foreign_table_name}.${constraint.foreign_column_name}`, 'blue');
            fkCount++;
            break;
          case 'UNIQUE':
            this.log(`🎯 UK: ${constraint.table_schema}.${constraint.table_name}.${constraint.constraint_name}`, 'yellow');
            ukCount++;
            break;
          case 'CHECK':
            this.log(`✅ CK: ${constraint.table_schema}.${constraint.table_name}.${constraint.constraint_name}`, 'cyan');
            ckCount++;
            break;
        }
      }

      this.stats.constraints = pkCount + ukCount + ckCount;
      this.stats.foreignKeys = fkCount;

      this.log(`\n📊 Статистика ограничений:`, 'cyan');
      this.log(`   Primary Keys: ${pkCount}`);
      this.log(`   Foreign Keys: ${fkCount}`);
      this.log(`   Unique Keys: ${ukCount}`);
      this.log(`   Check Constraints: ${ckCount}`);

    } catch (error) {
      this.issues.push({
        type: 'constraints',
        severity: 'medium',
        message: `Ошибка анализа ограничений: ${error.message}`,
        recommendation: 'Проверить права доступа'
      });
    }
  }

  async analyzePerformance() {
    this.logSection('⚡ АНАЛИЗ ПРОИЗВОДИТЕЛЬНОСТИ');

    try {
      // Проверяем медленные запросы
      const slowQueries = await this.pool.query(`
        SELECT
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements
        WHERE mean_time > 1000 -- больше 1 секунды
        ORDER BY mean_time DESC
        LIMIT 10
      `);

      if (slowQueries.rows.length > 0) {
        this.log('🐌 Медленные запросы:', 'red');
        for (const query of slowQueries.rows) {
          this.log(`   • Среднее время: ${query.mean_time.toFixed(2)}ms, Вызовов: ${query.calls}`);
          this.log(`     Запрос: ${query.query.substring(0, 100)}...`);
        }

        this.recommendations.push('Найдены медленные запросы. Рассмотреть оптимизацию индексов.');
      } else {
        this.log('✅ Медленных запросов не найдено', 'green');
      }

      // Анализируем использование кэша
      const cacheStats = await this.pool.query(`
        SELECT
          sum(heap_blks_read) as heap_read,
          sum(heap_blks_hit) as heap_hit,
          sum(idx_blks_read) as idx_read,
          sum(idx_blks_hit) as idx_hit
        FROM pg_statio_user_tables
      `);

      if (cacheStats.rows.length > 0) {
        const { heap_read, heap_hit, idx_read, idx_hit } = cacheStats.rows[0];
        const heapCacheRatio = heap_hit / (heap_hit + heap_read) * 100;
        const idxCacheRatio = idx_hit / (idx_hit + idx_read) * 100;

        this.log(`📈 Кэш таблиц: ${heapCacheRatio.toFixed(1)}%`, heapCacheRatio > 95 ? 'green' : 'yellow');
        this.log(`📈 Кэш индексов: ${idxCacheRatio.toFixed(1)}%`, idxCacheRatio > 95 ? 'green' : 'yellow');

        if (heapCacheRatio < 95 || idxCacheRatio < 95) {
          this.recommendations.push('Низкий процент попаданий в кэш. Рассмотреть увеличение shared_buffers.');
        }
      }

    } catch (error) {
      this.log(`⚠️  Ошибка анализа производительности: ${error.message}`, 'yellow');
    }
  }

  async analyzeSecurity() {
    this.logSection('🔐 АНАЛИЗ БЕЗОПАСНОСТИ');

    try {
      // Проверяем пользователей и роли
      const users = await this.pool.query(`
        SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin
        FROM pg_roles
        WHERE rolname NOT LIKE 'pg_%'
        ORDER BY rolname
      `);

      this.log('👥 Пользователи и роли:', 'blue');
      for (const user of users.rows) {
        const flags = [];
        if (user.rolsuper) flags.push('SUPERUSER');
        if (user.rolcreaterole) flags.push('CREATEROLE');
        if (user.rolcreatedb) flags.push('CREATEDB');
        if (user.rolcanlogin) flags.push('LOGIN');

        this.log(`   • ${user.rolname}: ${flags.join(', ') || 'NO SPECIAL PRIVILEGES'}`);
      }

      // Проверяем права на таблицы
      const privileges = await this.pool.query(`
        SELECT
          schemaname,
          tablename,
          grantee,
          privilege_type
        FROM information_schema.role_table_grants
        WHERE grantee NOT IN ('postgres', 'PUBLIC')
        ORDER BY schemaname, tablename, grantee
      `);

      if (privileges.rows.length > 0) {
        this.log('\n🔑 Права доступа к таблицам:', 'blue');
        for (const priv of privileges.rows) {
          this.log(`   • ${priv.schemaname}.${priv.tablename}: ${priv.grantee} -> ${priv.privilege_type}`);
        }
      }

      // Проверяем открытые соединения
      const connections = await this.pool.query(`
        SELECT count(*) as active_connections
        FROM pg_stat_activity
        WHERE state = 'active'
      `);

      this.log(`\n🔌 Активных соединений: ${connections.rows[0].active_connections}`, 'cyan');

    } catch (error) {
      this.log(`⚠️  Ошибка анализа безопасности: ${error.message}`, 'yellow');
    }
  }

  async analyzeBackupAndRecovery() {
    this.logSection('💾 АНАЛИЗ РЕЗЕРВНОГО КОПИРОВАНИЯ');

    try {
      // Проверяем настройки WAL
      const walSettings = await this.pool.query(`
        SELECT name, setting, unit
        FROM pg_settings
        WHERE name IN ('wal_level', 'archive_mode', 'max_wal_senders', 'wal_keep_segments')
      `);

      this.log('📋 Настройки WAL:', 'blue');
      for (const setting of walSettings.rows) {
        this.log(`   • ${setting.name}: ${setting.setting}${setting.unit || ''}`);
      }

      // Проверяем размер WAL файлов
      const walSize = await this.pool.query(`
        SELECT
          pg_size_pretty(sum(size)) as total_wal_size,
          count(*) as wal_files
        FROM pg_ls_waldir() AS wal_files(size)
      `);

      if (walSize.rows.length > 0) {
        this.log(`📏 WAL файлы: ${walSize.rows[0].wal_files} файлов, размер: ${walSize.rows[0].total_wal_size}`);
      }

    } catch (error) {
      this.log(`⚠️  Ошибка анализа резервного копирования: ${error.message}`, 'yellow');
    }
  }

  async generateReport() {
    this.logSection('📋 ПОЛНЫЙ АНАЛИТИЧЕСКИЙ ОТЧЁТ БАЗЫ ДАННЫХ');

    // Общая статистика
    this.log('🎯 ОБЩАЯ СТАТИСТИКА', 'cyan');
    this.log(`   Таблиц: ${this.stats.tables}`);
    this.log(`   Индексов: ${this.stats.indexes}`);
    this.log(`   Ограничений: ${this.stats.constraints}`);
    this.log(`   Внешних ключей: ${this.stats.foreignKeys}`);
    this.log(`   Всего записей: ${this.stats.totalRecords.toLocaleString()}`);
    this.log(`   Общий размер БД: ~${(this.stats.totalRecords * 0.001).toFixed(1)} MB (примерно)`);

    // Проблемы
    if (this.issues.length > 0) {
      this.log('\n🚨 ВЫЯВЛЕННЫЕ ПРОБЛЕМЫ', 'red');
      const critical = this.issues.filter(i => i.severity === 'critical');
      const high = this.issues.filter(i => i.severity === 'high');
      const medium = this.issues.filter(i => i.severity === 'medium');

      if (critical.length > 0) {
        this.log('🔴 КРИТИЧЕСКИЕ:', 'red');
        critical.forEach(issue => {
          this.log(`   • ${issue.message}`, 'red');
          this.log(`     💡 ${issue.recommendation}`, 'yellow');
        });
      }

      if (high.length > 0) {
        this.log('🟠 ВЫСОКИЙ ПРИОРИТЕТ:', 'yellow');
        high.forEach(issue => {
          this.log(`   • ${issue.message}`, 'yellow');
          this.log(`     💡 ${issue.recommendation}`, 'cyan');
        });
      }

      if (medium.length > 0) {
        this.log('🟡 СРЕДНИЙ ПРИОРИТЕТ:', 'cyan');
        medium.forEach(issue => {
          this.log(`   • ${issue.message}`, 'cyan');
          this.log(`     💡 ${issue.recommendation}`, 'blue');
        });
      }
    } else {
      this.log('\n✅ ПРОБЛЕМ НЕ ВЫЯВЛЕНО', 'green');
    }

    // Рекомендации
    if (this.recommendations.length > 0) {
      this.log('\n💡 РЕКОМЕНДАЦИИ ПО ОПТИМИЗАЦИИ', 'blue');
      this.recommendations.forEach(rec => {
        this.log(`   • ${rec}`, 'blue');
      });
    }

    // Оценка здоровья БД
    const healthScore = this.calculateHealthScore();
    this.log('\n🏥 ОЦЕНКА ЗДОРОВЬЯ БАЗЫ ДАННЫХ', 'cyan');
    this.log(`   Счет: ${healthScore}/100`, healthScore >= 80 ? 'green' : healthScore >= 60 ? 'yellow' : 'red');

    if (healthScore >= 80) {
      this.log('   Статус: ОТЛИЧНОЕ СОСТОЯНИЕ', 'green');
    } else if (healthScore >= 60) {
      this.log('   Статус: ХОРОШЕЕ СОСТОЯНИЕ', 'yellow');
    } else {
      this.log('   Статус: ТРЕБУЕТ ВНИМАНИЯ', 'red');
    }

    // Сохранение отчета
    this.saveReport();
  }

  calculateHealthScore() {
    let score = 100;

    // Вычитаем баллы за проблемы
    score -= this.issues.filter(i => i.severity === 'critical').length * 20;
    score -= this.issues.filter(i => i.severity === 'high').length * 10;
    score -= this.issues.filter(i => i.severity === 'medium').length * 5;

    // Проверяем наличие основных компонентов
    if (this.stats.tables === 0) score -= 30;
    if (this.stats.indexes === 0) score -= 20;
    if (this.stats.constraints === 0) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  saveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      issues: this.issues,
      recommendations: this.recommendations,
      healthScore: this.calculateHealthScore()
    };

    fs.writeFileSync('database-analysis-report.json', JSON.stringify(report, null, 2));
    this.log('\n💾 Отчёт сохранён в: database-analysis-report.json', 'green');
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  async runAnalysis() {
    this.logSection('🚀 ЗАПУСК ПОЛНОГО АНАЛИЗА БАЗЫ ДАННЫХ');
    this.log(`Время начала: ${new Date().toLocaleString('ru-RU')}`, 'blue');

    try {
      const connected = await this.connect();
      if (!connected) {
        this.log('❌ Невозможно продолжить анализ без подключения к БД', 'red');
        return;
      }

      await this.analyzeTables();
      await this.analyzeIndexes();
      await this.analyzeConstraints();
      await this.analyzePerformance();
      await this.analyzeSecurity();
      await this.analyzeBackupAndRecovery();

      await this.generateReport();

      this.log('\n✅ АНАЛИЗ ЗАВЕРШЁН!', 'green');

    } catch (error) {
      this.log(`❌ Ошибка анализа: ${error.message}`, 'red');
    } finally {
      await this.close();
    }
  }
}

// Запуск анализа
(async () => {
  const analyzer = new DatabaseAnalyzer();
  await analyzer.runAnalysis();
})();


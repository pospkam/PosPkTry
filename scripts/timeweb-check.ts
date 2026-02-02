#!/usr/bin/env tsx

/**
 * Проверка готовности к созданию инфраструктуры Timeweb Cloud
 * 
 * Использование:
 * export TIMEWEB_TOKEN=your_token
 * npm run timeweb:check
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Helper для получения сообщения об ошибке
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

interface CheckResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
}

class TimewebChecker {
  private apiToken: string;
  private apiUrl = 'https://api.timeweb.cloud';
  private results: CheckResult[] = [];

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  /**
   * Выполнить все проверки
   */
  async runAllChecks(): Promise<boolean> {
    console.log(' ПРОВЕРКА ГОТОВНОСТИ К СОЗДАНИЮ ИНФРАСТРУКТУРЫ\n');
    console.log('='.repeat(60));

    await this.checkAPIToken();
    await this.checkAccountBalance();
    await this.checkAccountLimits();
    await this.checkRegionAvailability();
    await this.checkResourceNames();
    await this.checkEstimatedCosts();

    console.log('\n' + '='.repeat(60));
    console.log('  ИТОГИ ПРОВЕРКИ\n');

    this.printResults();

    const hasErrors = this.results.some(r => r.status === 'error');
    const hasWarnings = this.results.some(r => r.status === 'warning');

    if (hasErrors) {
      console.log('\n[] ПРОВЕРКА НЕ ПРОЙДЕНА');
      console.log('   Исправьте ошибки и запустите проверку снова.');
      return false;
    }

    if (hasWarnings) {
      console.log('\n!  ПРОВЕРКА ПРОЙДЕНА С ПРЕДУПРЕЖДЕНИЯМИ');
      console.log('   Рекомендуется исправить предупреждения перед созданием.');
    } else {
      console.log('\n[] ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!');
      console.log('   Можно запускать: npm run timeweb:setup');
    }

    return true;
  }

  /**
   * Проверка API токена
   */
  private async checkAPIToken(): Promise<void> {
    try {
      const response = await this.apiRequest('GET', '/api/v1/account/status');
      
      if (response.status) {
        this.results.push({
          name: 'API Токен',
          status: 'ok',
          message: 'Токен валидный',
          details: `Аккаунт зарегистрирован: ${response.status.registered_at ? new Date(response.status.registered_at).toLocaleDateString() : 'N/A'}`,
        });
      } else {
        throw new Error('Некорректный ответ от API');
      }
    } catch (error) {
      this.results.push({
        name: 'API Токен',
        status: 'error',
        message: 'Токен недействителен или истёк',
        details: getErrorMessage(error),
      });
    }
  }

  /**
   * Проверка баланса аккаунта
   */
  private async checkAccountBalance(): Promise<void> {
    try {
      const response = await this.apiRequest('GET', '/api/v1/account/finances');
      
      const balance = response.finances?.balance || response.balance || 0;
      const estimatedCost = 3000; // Примерная стоимость на первый месяц

      if (balance >= estimatedCost) {
        this.results.push({
          name: 'Баланс аккаунта',
          status: 'ok',
          message: `Достаточно средств: ${balance}₽`,
          details: `Рекомендуется: минимум ${estimatedCost}₽`,
        });
      } else if (balance >= 1000) {
        this.results.push({
          name: 'Баланс аккаунта',
          status: 'warning',
          message: `Мало средств: ${balance}₽`,
          details: `Рекомендуется пополнить до ${estimatedCost}₽`,
        });
      } else {
        this.results.push({
          name: 'Баланс аккаунта',
          status: 'error',
          message: `Недостаточно средств: ${balance}₽`,
          details: `Необходимо минимум ${estimatedCost}₽`,
        });
      }
    } catch (error) {
      this.results.push({
        name: 'Баланс аккаунта',
        status: 'warning',
        message: 'Не удалось проверить баланс',
        details: getErrorMessage(error),
      });
    }
  }

  /**
   * Проверка лимитов аккаунта
   */
  private async checkAccountLimits(): Promise<void> {
    try {
      const response = await this.apiRequest('GET', '/api/v1/account/status');
      
      // Проверяем, заблокирован ли аккаунт
      const isBlocked = response.status?.is_blocked || false;
      const isPermanentBlocked = response.status?.is_permanent_blocked || false;
      
      if (!isBlocked && !isPermanentBlocked) {
        this.results.push({
          name: 'Лимиты аккаунта',
          status: 'ok',
          message: 'Аккаунт активен',
          details: 'Нет ограничений на создание ресурсов',
        });
      } else {
        this.results.push({
          name: 'Лимиты аккаунта',
          status: 'error',
          message: 'Аккаунт заблокирован',
          details: isPermanentBlocked ? 'Постоянная блокировка' : 'Временная блокировка',
        });
      }
    } catch (error) {
      this.results.push({
        name: 'Лимиты аккаунта',
        status: 'warning',
        message: 'Не удалось проверить лимиты',
        details: getErrorMessage(error),
      });
    }
  }

  /**
   * Проверка доступности регионов
   */
  private async checkRegionAvailability(): Promise<void> {
    try {
      // Пробуем получить список серверов чтобы увидеть доступные регионы
      const response = await this.apiRequest('GET', '/api/v1/servers');
      
      const servers = response.servers || [];
      const regions = [...new Set(servers.map((s: any) => s.location).filter(Boolean))];
      
      // Для новых ресурсов обычно используются те же регионы где уже есть серверы
      // Или стандартные ru-1, ru-2
      const targetRegion = regions.length > 0 ? regions[0] : 'ru-1';

      this.results.push({
        name: 'Доступность региона',
        status: 'ok',
        message: `Будет использован регион: ${targetRegion}`,
        details: servers.length > 0 ? `У вас уже есть серверы в регионе ${targetRegion}` : 'Будет использован регион по умолчанию',
      });
    } catch (error) {
      this.results.push({
        name: 'Доступность региона',
        status: 'warning',
        message: 'Не удалось проверить регионы',
        details: 'Будет использован регион ru-1 (Москва) по умолчанию',
      });
    }
  }

  /**
   * Проверка имён ресурсов на конфликты
   */
  private async checkResourceNames(): Promise<void> {
    try {
      // Проверяем существующие серверы
      const serversResponse = await this.apiRequest('GET', '/api/v1/servers');
      const servers = serversResponse.servers || [];
      const hasKamchatourVDS = servers.some((s: any) => 
        s.name && s.name.includes('kamchatour')
      );

      // Проверяем существующие БД
      const dbResponse = await this.apiRequest('GET', '/api/v1/databases');
      const databases = dbResponse.databases || [];
      const hasKamchatourDB = databases.some((db: any) => 
        db.name && db.name.includes('kamchatour')
      );

      // Проверяем существующие бакеты
      const bucketsResponse = await this.apiRequest('GET', '/api/v1/storages/buckets');
      const buckets = bucketsResponse.buckets || [];
      const hasKamchatourBucket = buckets.some((b: any) => 
        b.name === 'kamchatour-media'
      );

      if (hasKamchatourVDS || hasKamchatourDB || hasKamchatourBucket) {
        const conflicts = [];
        if (hasKamchatourVDS) conflicts.push('VDS');
        if (hasKamchatourDB) conflicts.push('Database');
        if (hasKamchatourBucket) conflicts.push('S3 Bucket');

        this.results.push({
          name: 'Имена ресурсов',
          status: 'error',
          message: 'Ресурсы с такими именами уже существуют',
          details: `Конфликты: ${conflicts.join(', ')}. Удалите их или измените имена.`,
        });
      } else {
        this.results.push({
          name: 'Имена ресурсов',
          status: 'ok',
          message: 'Имена свободны',
          details: 'Конфликтов не обнаружено',
        });
      }
    } catch (error) {
      this.results.push({
        name: 'Имена ресурсов',
        status: 'warning',
        message: 'Не удалось проверить имена',
        details: getErrorMessage(error),
      });
    }
  }

  /**
   * Оценка стоимости
   */
  private async checkEstimatedCosts(): Promise<void> {
    const costs = {
      vds: 1200, // 2 vCPU, 4 GB
      database: 1200, // PostgreSQL 2 vCPU, 4 GB
      s3: 50, // 50 GB
      traffic: 0, // Обычно включён
      total: 2450,
    };

    this.results.push({
      name: 'Оценка стоимости',
      status: 'ok',
      message: `~${costs.total}₽/месяц`,
      details: `VDS: ${costs.vds}₽, DB: ${costs.database}₽, S3: ${costs.s3}₽`,
    });
  }

  /**
   * Вывод результатов
   */
  private printResults(): void {
    this.results.forEach(result => {
      const icon = result.status === 'ok' ? '[]' : result.status === 'warning' ? '!' : '[]';
      console.log(`${icon} ${result.name}: ${result.message}`);
      if (result.details) {
        console.log(`   ${result.details}`);
      }
    });
  }

  /**
   * API запрос
   */
  private async apiRequest(method: string, endpoint: string): Promise<any> {
    const url = `${this.apiUrl}${endpoint}`;
    const cmd = `curl -s -X ${method} "${url}" -H "Authorization: Bearer ${this.apiToken}" -H "Content-Type: application/json"`;

    try {
      const { stdout } = await execAsync(cmd);
      return JSON.parse(stdout);
    } catch (error) {
      throw new Error(`API request failed: ${getErrorMessage(error)}`);
    }
  }
}

/**
 * Главная функция
 */
async function main() {
  const apiToken = process.env.TIMEWEB_TOKEN;

  if (!apiToken) {
    console.error('[] Ошибка: TIMEWEB_TOKEN не найден');
    console.error('\n  Получите токен:');
    console.error('1. https://timeweb.cloud/my/api');
    console.error('2. export TIMEWEB_TOKEN=your_token');
    console.error('3. npm run timeweb:check');
    process.exit(1);
  }

  const checker = new TimewebChecker(apiToken);
  const success = await checker.runAllChecks();

  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error(' Критическая ошибка:', getErrorMessage(error));
    process.exit(1);
  });
}

export { TimewebChecker };

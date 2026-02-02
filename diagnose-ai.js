/**
 * Диагностика Timeweb AI API
 */
const timewebConfig = {
  ai: {
    agentId: '3933ea81-05e2-470e-80de-80dc67c1101f',
    token: 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6IjFrYnhacFJNQGJSI0tSbE1xS1lqIn0.eyJ1c2VyIjoicGE0MjIxMDgiLCJ0eXBlIjoiYXBpX2tleSIsImFwaV9rZXlfaWQiOiI0MmZmZTY1MC02OWI4LTRmZmQtYTFkOC02OWRkMjMwM2QyY2MiLCJpYXQiOjE3NjE3ODUzNDl9.SFHpwgy9kr-EH2CwN6K1REkOl7KCpiUnMk5ivTRljEaWl8iE-B-BMjaJxaFhpdB2dqcb33ky2oyfwxkU1Sszrbo-8UINnFO5SothY4P6WC8kSSHxFlLI2i0xGCa3YzgyYZ1Wgn2a0jf__ZcyZi7ZsaJkuold9NAeeGCCrAUbdVsr39-fLDL_EKh0iekq_tuO59f_BCmg7Poe7xKlmNYzu2hy3GnfNp3ueKW52H6kFkGwibixS3tWKCHkPpyTAjRztWKCnDZOOG6xDk4sSiPPMlZOEfFzzkpKkizQ9CykBC06SXwmT2uPRR2NyZJIY-PZd4AVZ34H1jXQ-NGquRPi_aYiywt3LtOVDRarpVErBdk6I0qO0Yf33zICvMN-yFpXuY_oSlE8v3C-02XHnYLsMXcHTsUB4ISkJrhglBkv-hTzuiQxwAEZp0eHOEq8YNz6qOLU3RcaNgg0DWGXMDrMzObYx2NknrZUCMbRFftIU-C1Ilo8Ayy98MwI3J77X62p'
  }
};

// Возможные endpoints для тестирования
const possibleEndpoints = [
  // Agent endpoints
  `https://agent.timeweb.cloud/api/v1/cloud-ai/agents/${timewebConfig.ai.agentId}/v1`,
  `https://agent.timeweb.cloud/api/v1/cloud-ai/agents/${timewebConfig.ai.agentId}`,
  `https://agent.timeweb.cloud/api/v1/agents/${timewebConfig.ai.agentId}`,

  // API endpoints
  `https://api.timeweb.cloud/v1/cloud-ai/agents/${timewebConfig.ai.agentId}`,
  `https://api.timeweb.cloud/v1/cloud-ai/agents/${timewebConfig.ai.agentId}/chat`,
  `https://api.timeweb.cloud/v1/agents/${timewebConfig.ai.agentId}`,
  `https://api.timeweb.cloud/v1/agents/${timewebConfig.ai.agentId}/chat`,

  // Alternative formats
  `https://timeweb.cloud/api/v1/ai/agents/${timewebConfig.ai.agentId}`,
  `https://cloud.timeweb.cloud/api/v1/ai/agents/${timewebConfig.ai.agentId}`,
];

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  success: (msg) => console.log(`${colors.green}[OK] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[X] ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}!  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}i  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}▶️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.magenta}🧪 ${msg}${colors.reset}`),
};

async function testEndpoint(url, method = 'POST') {
  const testPayload = {
    messages: [
      {
        role: 'user',
        content: 'Привет! Ты AI ассистент?'
      }
    ],
    max_tokens: 100,
    temperature: 0.3
  };

  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${timewebConfig.ai.token}`,
      },
      body: method === 'POST' ? JSON.stringify(testPayload) : undefined,
    });

    return {
      url,
      method,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    };

  } catch (error) {
    return {
      url,
      method,
      error: error.message,
      networkError: true,
    };
  }
}

async function testAllEndpoints() {
  log.step('НАЧАЛО ДИАГНОСТИКИ TIMEWEB AI');
  console.log(`Agent ID: ${timewebConfig.ai.agentId}`);
  console.log('');

  const results = [];

  // Тест 1: GET запросы для проверки доступности
  log.step('ЭТАП 1: Проверка доступности endpoints (GET)');

  for (const url of possibleEndpoints.slice(0, 3)) { // Первые 3 endpoint'а
    log.test(`Проверка: ${url}`);
    const result = await testEndpoint(url, 'GET');
    results.push(result);

    if (result.ok) {
      log.success(`[OK] ${result.status} ${result.statusText}`);
    } else if (result.networkError) {
      log.error(`[X] Сеть: ${result.error}`);
    } else {
      log.warning(`!  ${result.status} ${result.statusText}`);
    }
    console.log('');
  }

  // Тест 2: POST запросы для функциональности
  log.step('ЭТАП 2: Тестирование API вызовов (POST)');

  for (const url of possibleEndpoints) {
    log.test(`API вызов: ${url}`);
    const result = await testEndpoint(url, 'POST');
    results.push(result);

    if (result.ok) {
      log.success(`[OK] ${result.status} ${result.statusText} - РАБОТАЕТ!`);
      console.log(`    Headers: ${JSON.stringify(result.headers, null, 2)}`);
    } else if (result.networkError) {
      log.error(`[X] Сеть: ${result.error}`);
    } else {
      log.warning(`!  ${result.status} ${result.statusText}`);
    }
    console.log('');
  }

  return results;
}

function analyzeResults(results) {
  log.step('ЭТАП 3: АНАЛИЗ РЕЗУЛЬТАТОВ');

  const successful = results.filter(r => r.ok);
  const total = results.length;

  console.log(`\n РЕЗУЛЬТАТЫ: ${successful.length}/${total} успешных endpoints`);
  console.log('');

  if (successful.length > 0) {
    log.success(' НАЙДЕНЫ РАБОЧИЕ ENDPOINTS!');

    successful.forEach(result => {
      log.success(`[OK] ${result.url}`);
      log.info(`   Метод: ${result.method}, Статус: ${result.status}`);
    });

    console.log('');
    console.log(' РЕКОМЕНДАЦИИ:');
    console.log('• Используйте первый рабочий endpoint');
    console.log('• Обновите конфигурацию в приложении');
    console.log('• Протестируйте с реальными данными');

  } else {
    log.error('[X] НИ ОДИН ENDPOINT НЕ РАБОТАЕТ');

    // Анализ ошибок
    const notFound = results.filter(r => r.status === 404).length;
    const forbidden = results.filter(r => r.status === 403).length;
    const unauthorized = results.filter(r => r.status === 401).length;
    const networkErrors = results.filter(r => r.networkError).length;

    console.log('');
    console.log('🔍 АНАЛИЗ ОШИБОК:');
    console.log(`   • 404 Not Found: ${notFound} endpoints`);
    console.log(`   • 403 Forbidden: ${forbidden} endpoints`);
    console.log(`   • 401 Unauthorized: ${unauthorized} endpoints`);
    console.log(`   • Network errors: ${networkErrors} endpoints`);

    console.log('');
    console.log('🛠️  ВОЗМОЖНЫЕ РЕШЕНИЯ:');

    if (notFound > 0) {
      console.log('');
      console.log('1. 🔍 НЕПРАВИЛЬНЫЙ ENDPOINT:');
      console.log('   • Проверьте документацию Timeweb Cloud AI');
      console.log('   • Возможно API изменилось');
      console.log('   • Попробуйте другие пути API');
    }

    if (forbidden > 0 || unauthorized > 0) {
      console.log('');
      console.log('2.  ПРОБЛЕМЫ АВТОРИЗАЦИИ:');
      console.log('   • Проверьте API токен');
      console.log('   • Возможно токен истек');
      console.log('   • Проверьте права доступа');
    }

    if (networkErrors > 0) {
      console.log('');
      console.log('3. 🌐 СЕТЕВЫЕ ПРОБЛЕМЫ:');
      console.log('   • Сервис AI временно недоступен');
      console.log('   • Проверьте подключение к интернету');
    }

    console.log('');
    console.log('4.  ОБРАТИТЕСЬ В ПОДДЕРЖКУ:');
    console.log('   • Свяжитесь с Timeweb Cloud support');
    console.log('   • Предоставьте результаты диагностики');
    console.log('   • Запросите актуальную документацию AI API');
  }
}

// Основная функция
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🤖 ДИАГНОСТИКА TIMEWEB AI API');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  try {
    const results = await testAllEndpoints();
    analyzeResults(results);

    console.log('═══════════════════════════════════════════════════════');
    console.log('🏁 ДИАГНОСТИКА ЗАВЕРШЕНА');
    console.log('═══════════════════════════════════════════════════════');

  } catch (error) {
    log.error(`Критическая ошибка: ${error.message}`);
    process.exit(1);
  }
}

// Запуск
main();



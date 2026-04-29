#!/usr/bin/env node

/**
 * agent-query-tool.ts
 * Интерактивный инструмент для запросов к Board of Directors
 *
 * Usage: npx ts-node agent-query-tool.ts
 */

const AGENTS = {
  admin: 'Операционный директор (метрики, данные)',
  hacker: 'Директор по росту (конверсия, фанели)',
  content: 'Контент-аудитор (качество описаний)',
  quality: 'Директор по качеству (рейтинги, операторы)',
  security: 'Безопасность (аномалии, риски)',
  evo: 'Архитектор (системы, стратегия)',
};

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dev-token';

async function queryAgent(
  agentId: keyof typeof AGENTS,
  question: string,
  context?: Record<string, unknown>
): Promise<{ agent: string; response: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/agents/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        agent_id: agentId,
        question,
        context,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Agent error: ${error.error}`);
    }

    const data = await res.json();
    return {
      agent: `${data.agent.name} (${data.agent.role})`,
      response: data.response,
    };
  } catch (error) {
    throw new Error(`Failed to query agent: ${String(error)}`);
  }
}

// ───────────────────────────────────────────────────────────────

async function investigateConversion() {
  console.log('\n📊 INVESTIGATION: Конверсия 0/1448\n');
  console.log('='.repeat(60));

  // Шаг 1: Admin проверяет данные
  console.log('\n1️⃣  ADMIN — Проверяем реальные метрики:');
  console.log('-'.repeat(60));
  try {
    const adminReport = await queryAgent(
      'admin',
      'Какие данные нам говорят о том, что 1448 views не конвертируются в лиды? Покажи реальные цифры из таблиц page_views и leads за последние 7 дней.'
    );
    console.log(adminReport.response);
  } catch (e) {
    console.error(`❌ Admin error: ${e}`);
  }

  // Шаг 2: Hacker анализирует воронку
  console.log('\n2️⃣  HACKER — Анализируем воронку конверсии:');
  console.log('-'.repeat(60));
  try {
    const hackerReport = await queryAgent(
      'hacker',
      'Конверсия views → leads = 0%. Где узкое место? (1) LeadModal невидима? (2) Форма не работает? (3) Туристы просто не заинтересованы? Предложи топ-3 гипотезы и как их проверить.'
    );
    console.log(hackerReport.response);
  } catch (e) {
    console.error(`❌ Hacker error: ${e}`);
  }

  // Шаг 3: Content проверяет качество контента
  console.log('\n3️⃣  CONTENT — Качество контента маршрутов:');
  console.log('-'.repeat(60));
  try {
    const contentReport = await queryAgent(
      'content',
      'Какие маршруты смотрели туристы (из top 5 по views) и почему они нас не оставляют? Описания скучные? Фото плохие? Цены непонятные?'
    );
    console.log(contentReport.response);
  } catch (e) {
    console.error(`❌ Content error: ${e}`);
  }

  // Шаг 4: Evo стратегия
  console.log('\n4️⃣  EVO — Архитектурный вид на проблему:');
  console.log('-'.repeat(60));
  try {
    const evoReport = await queryAgent(
      'evo',
      'На уровне архитектуры: почему конверсия views→leads упала в 0? Это фронтенд, бэк, БД, или стратегия неправильная? Где точка отказа системы?'
    );
    console.log(evoReport.response);
  } catch (e) {
    console.error(`❌ Evo error: ${e}`);
  }

  console.log('\n' + '='.repeat(60));
}

async function analyzeMonetization() {
  console.log('\n💰 INVESTIGATION: Стратегия монетизации (TravelPayouts vs Лиды)\n');
  console.log('='.repeat(60));

  // Hacker: что даёт больше денег?
  console.log('\n🎯 HACKER — ROI сравнение:');
  console.log('-'.repeat(60));
  try {
    const report = await queryAgent(
      'hacker',
      'Два варианта монетизации: (A) TravelPayouts аффилиат-ссылки (~500-1000 ₽/турист, работает ~35%), (B) Лид оператору (~2000-9000 ₽/лид). Какой приоритет? Какой метрики смотреть?'
    );
    console.log(report.response);
  } catch (e) {
    console.error(`❌ Error: ${e}`);
  }

  // Evo: архитектура
  console.log('\n🏗️  EVO — Архитектурные последствия:');
  console.log('-'.repeat(60));
  try {
    const report = await queryAgent(
      'evo',
      'Если мы сосредоточимся на лидах вместо TravelPayouts, как это изменит архитектуру? Какие компоненты переделать? Какие риски?'
    );
    console.log(report.response);
  } catch (e) {
    console.error(`❌ Error: ${e}`);
  }

  // Security: риски санкций
  console.log('\n🔐 SECURITY — Санкционные риски:');
  console.log('-'.repeat(60));
  try {
    const report = await queryAgent(
      'security',
      'TravelPayouts работает через CloudPayments. Если CloudPayments упадёт под санкции, система умрёт. Какие резервные платёжные системы? Какие точки отказа?'
    );
    console.log(report.response);
  } catch (e) {
    console.error(`❌ Error: ${e}`);
  }

  console.log('\n' + '='.repeat(60));
}

// ───────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🤖 BOARD OF DIRECTORS QUERY TOOL\n');
  console.log('Доступные агенты:');
  Object.entries(AGENTS).forEach(([id, desc]) => {
    console.log(`  • ${id.padEnd(10)} — ${desc}`);
  });

  // Выбираем какое расследование запустить
  const investigations = [
    { name: 'Конверсия 0/1448', fn: investigateConversion },
    { name: 'Монетизация и ROI', fn: analyzeMonetization },
  ];

  console.log('\nДоступные расследования:');
  investigations.forEach((inv, i) => {
    console.log(`  ${i + 1}. ${inv.name}`);
  });

  // Если аргумент передан — запустим нужное расследование
  const arg = process.argv[2];
  if (arg === '1' || arg === 'conversion') {
    await investigateConversion();
  } else if (arg === '2' || arg === 'monetization') {
    await analyzeMonetization();
  } else {
    console.log('\nПример использования:');
    console.log('  npx ts-node agent-query-tool.ts 1         # Конверсия');
    console.log('  npx ts-node agent-query-tool.ts 2         # Монетизация');
    console.log('  npx ts-node agent-query-tool.ts conversion');
  }
}

main().catch(console.error);

#!/usr/bin/env node

/**
 * Evolution Loop Runner
 * Запускает автономный цикл: Board Meeting → Инициативы → Исполнение
 */

const PROD_URL = 'https://tourhab.ru';
const CRON_SECRET = '93cb1fbc1f67bcab036693ef0802ed86b35edc62a938b02333ecd8819655d28f';

async function log(stage, msg, data = {}) {
  console.log(`[${new Date().toISOString()}] ${stage}: ${msg}`, data);
}

async function triggerBoardMeeting() {
  log('EVOLUTION', '🎯 Триггер Board Meeting...');
  try {
    const res = await fetch(`${PROD_URL}/api/cron/board-meeting?secret=${CRON_SECRET}`);
    const data = await res.json();
    if (data.success) {
      log('EVOLUTION', '✅ Board Meeting запущен');
      return true;
    }
  } catch (e) {
    log('ERROR', '❌ Trigger failed', { error: String(e) });
  }
  return false;
}

async function waitForBoardMeeting() {
  log('EVOLUTION', '⏳ Жду результатов совещания...');

  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${PROD_URL}/api/agents/board-meeting/debug`);
      const data = await res.json();

      if (data.stats && data.stats.buffer_size > 0) {
        const events = data.stats.events_by_type;
        log('EVOLUTION', `Прогресс: ${data.stats.buffer_size} событий`, events);

        // Проверяем завершён ли
        if (events.done) {
          log('EVOLUTION', '✅ Совещание завершено');
          return true;
        }
      }
    } catch (e) {
      // ignore
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  log('ERROR', '⏱ Timeout: Board meeting не завершился за 2 минуты');
  return false;
}

async function main() {
  log('EVOLUTION', '🌀 EVOLUTION LOOP STARTED');

  const triggered = await triggerBoardMeeting();
  if (!triggered) {
    log('ERROR', 'Не удалось триггерить board meeting');
    process.exit(1);
  }

  await new Promise(r => setTimeout(r, 3000));

  const completed = await waitForBoardMeeting();
  if (!completed) {
    log('ERROR', 'Не дождались результатов');
    process.exit(1);
  }

  log('EVOLUTION', '✨ Evolution loop завершён');
}

main().catch(e => {
  log('ERROR', 'Fatal error', { error: String(e) });
  process.exit(1);
});

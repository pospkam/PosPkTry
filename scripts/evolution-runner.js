#!/usr/bin/env node

/**
 * Evolution Loop Runner
 * Запускает автономный цикл: Board Meeting → Инициативы → Исполнение
 *
 * Использование:
 *   DRY_RUN=true node scripts/evolution-runner.js   # Тестовый режим
 *   node scripts/evolution-runner.js                # Production режим
 */

const PROD_URL = process.env.TOURHAB_URL || 'https://tourhab.ru';
const CRON_SECRET = process.env.CRON_SECRET || '93cb1fbc1f67bcab036693ef0802ed86b35edc62a938b02333ecd8819655d28f';
const DRY_RUN = process.env.DRY_RUN === 'true';

async function log(stage, msg, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    stage,
    message: msg,
    dryRun: DRY_RUN,
    ...data,
  };
  console.log(JSON.stringify(entry));
}

async function triggerBoardMeeting() {
  log('EVOLUTION', '🎯 Триггер Board Meeting...');

  if (DRY_RUN) {
    log('EVOLUTION', '(DRY_RUN: пропускаем реальный триггер)');
    return true;
  }

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

  if (DRY_RUN) {
    log('EVOLUTION', '(DRY_RUN: пропускаем ожидание)');
    return true;
  }

  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${PROD_URL}/api/cron/evolution-loop/status`);
      const data = await res.json();

      if (data.last_board_meeting) {
        log('EVOLUTION', '✅ Совещание завершено', {
          meeting: data.last_board_meeting,
        });
        return true;
      }

      log('EVOLUTION', `⏳ Попытка ${i + 1}/60...`);
    } catch (e) {
      // ignore
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  log('ERROR', '⏱ Timeout: Board meeting не завершился за 2 минуты');
  return false;
}

async function main() {
  log('EVOLUTION', `🌀 EVOLUTION LOOP STARTED [${DRY_RUN ? 'DRY_RUN' : 'PRODUCTION'}]`);

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

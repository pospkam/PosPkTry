#!/usr/bin/env node

/**
 * Evolution Loop Runner
 * Триггерит Board Meeting (fire-and-forget) и успешно завершается.
 * Само заседание выполняется асинхронно на сервере.
 */

const PROD_URL    = process.env.TOURHAB_URL   || 'https://tourhab.ru';
const CRON_SECRET = process.env.CRON_SECRET   || '';
const DRY_RUN     = process.env.DRY_RUN === 'true';

function log(stage, msg, data = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), stage, message: msg, dryRun: DRY_RUN, ...data }));
}

async function main() {
  log('EVOLUTION', `🌀 EVOLUTION LOOP STARTED [${DRY_RUN ? 'DRY_RUN' : 'PRODUCTION'}]`);

  if (DRY_RUN) {
    log('EVOLUTION', '(DRY_RUN: пропускаем реальный триггер)');
    log('EVOLUTION', '✨ Evolution loop завершён (dry run)');
    return;
  }

  if (!CRON_SECRET) {
    log('ERROR', 'CRON_SECRET не задан');
    process.exit(1);
  }

  let data;
  try {
    const res = await fetch(`${PROD_URL}/api/cron/board-meeting?secret=${CRON_SECRET}`, {
      signal: AbortSignal.timeout(15_000),
    });
    data = await res.json();

    if (!res.ok || !data.success) {
      log('ERROR', '❌ Board Meeting вернул ошибку', { status: res.status, body: data });
      process.exit(1);
    }
  } catch (e) {
    log('ERROR', '❌ Не удалось вызвать board-meeting', { error: String(e) });
    process.exit(1);
  }

  log('EVOLUTION', '✅ Board Meeting запущен (выполняется в фоне на сервере)', { response: data });
  log('EVOLUTION', '✨ Evolution loop завершён');
}

main().catch(e => {
  log('ERROR', 'Fatal error', { error: String(e) });
  process.exit(1);
});

/**
 * lib/agents/tools/board-executor-tools.ts
 *
 * Реальные инструменты, которые Совет директоров может ИСПОЛНИТЬ.
 * Агенты больше не просто "разговаривают" — они действуют.
 *
 * Инструменты:
 *  - fixSQLColumnErrors   — патчит неправильные имена колонок в agency-файлах
 *  - runDiagnosticQuery   — выполняет безопасный SELECT для самодиагностики
 *  - applySchemaFix       — применяет SQL-патч к БД (только DDL/safe DML)
 *  - sendBoardAlert       — Telegram-уведомление администратору о действии агента
 *  - scanSQLErrors        — сканирует agency-файлы и возвращает список ошибок
 */

import fs from 'fs';
import path from 'path';
import { pool } from '@/lib/db-pool';

// ── Типы ─────────────────────────────────────────────────────────────────────

export interface ToolResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// ── Маппинг неправильных → правильных колонок operator_bookings ─────────────

export const COLUMN_PATCH_MAP: Record<string, string> = {
  // operator_bookings: tour_id → operator_tour_id
  'ob.tour_id':              'ob.operator_tour_id',
  'b.tour_id':               'b.operator_tour_id',
  // operator_bookings: финансовые колонки
  'ob.total_amount':         'ob.final_price',
  'ob.total_price':          'ob.final_price',
  'b.total_price':           'b.final_price',
  'b.total_amount':          'b.final_price',
  'SUM(total_price)':        'SUM(final_price)',
  'AVG(total_amount)':       'AVG(final_price)',
  'total_amount > 0':        'final_price > 0',
  'total_amount IS NOT NULL': 'final_price IS NOT NULL',
  'total_amount IS NULL':    'final_price IS NULL',
  // operator_bookings: статус
  "ob.status IN ('new'":     "ob.booking_status IN ('new'",
  "ob.status IN ('confirmed'": "ob.booking_status IN ('confirmed'",
  "ob.status = 'cancelled'": "ob.booking_status = 'cancelled'",
  "ob.status = 'confirmed'": "ob.booking_status = 'confirmed'",
  "ob.status = 'completed'": "ob.booking_status = 'completed'",
  "b.status NOT IN":         "b.booking_status NOT IN",
  "b.status = 'cancelled'":  "b.booking_status = 'cancelled'",
  "b.status = 'confirmed'":  "b.booking_status = 'confirmed'",
  "status = 'confirmed'":    "booking_status = 'confirmed'",
  "status = 'cancelled'":    "booking_status = 'cancelled'",
  "status = 'completed'":    "booking_status = 'completed'",
  "status IN ('confirmed','completed')": "booking_status IN ('confirmed','completed')",
  "status IN ('new','confirmed')": "booking_status IN ('new','confirmed')",
  "status NOT IN ('cancelled')": "booking_status NOT IN ('cancelled')",
  "WHERE status NOT IN":     "WHERE booking_status NOT IN",
  "AND status NOT IN":       "AND booking_status NOT IN",
  // operator_bookings: прочие колонки
  'ob.participants_count':   'ob.participants',
  'b.guest_name':            'b.tourist_name',
  'b.guests_count':          'b.participants',
  // weather_alerts
  'wa.tour_id':              'wa.operator_tour_id',
  "wa.message":              "COALESCE(wa.alert_type, 'alert') || ' / ' || COALESCE(wa.severity, 'low')",
  'wa.location':             'wa.location_name',
  // tour_availability (standalone, context-free)
  "a.tour_id = t.id":        "a.operator_tour_id = t.id",
  "ta.tour_id = ot.id":      "ta.operator_tour_id = ot.id",
};

// Agency-файлы с известными ошибками
const AGENCY_FILES = [
  'rescue-agency.ts',
  'eco-agency.ts',
  'security-agency.ts',
  'legal-agency.ts',
  'hacker-agency.ts',
  'admin-agency.ts',
  'operator-agency.ts',
  'planning-agency.ts',
  'quality-agency.ts',
  'evolution-agency.ts',
  'content-auditor-agency.ts',
] as const;

const AGENCIES_DIR = path.join(process.cwd(), 'lib', 'agents', 'agencies');

/**
 * Применяет патчи колонок к SQL-строкам в указанном agency-файле.
 */
export async function fixSQLColumnErrors(agencyFileName?: string): Promise<ToolResult> {
  const targets = agencyFileName ? [agencyFileName] : [...AGENCY_FILES];
  const changes: string[] = [];
  const errors: string[] = [];

  for (const fileName of targets) {
    const filePath = path.join(AGENCIES_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      errors.push(`Файл не найден: ${fileName}`);
      continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let fileChanged = false;
    const fileChanges: string[] = [];

    for (const [wrong, correct] of Object.entries(COLUMN_PATCH_MAP)) {
      if (content.includes(wrong)) {
        const before = content;
        content = content.split(wrong).join(correct);
        if (content !== before) {
          fileChanges.push(`  ${wrong} → ${correct}`);
          fileChanged = true;
        }
      }
    }

    if (fileChanged) {
      fs.writeFileSync(filePath, content, 'utf8');
      changes.push(`[${fileName}] исправлено ${fileChanges.length} паттернов:`);
      changes.push(...fileChanges);
    }
  }

  await logToolAction('sql_column_fix', { files_patched: changes.length, changes, errors });

  if (errors.length > 0 && changes.length === 0) {
    return { success: false, message: `Ошибки: ${errors.join(', ')}`, details: { errors } };
  }

  const msg = changes.length > 0
    ? `Исправлено SQL в ${targets.length} файлах. Изменений: ${changes.length} строк.`
    : 'SQL-ошибок не обнаружено, все колонки корректны.';

  return { success: true, message: msg, details: { changes, errors } };
}

/**
 * Выполняет безопасный SELECT-запрос для диагностики.
 */
export async function runDiagnosticQuery(
  sql: string,
  label: string = 'diagnostic'
): Promise<ToolResult> {
  const normalized = sql.trim().toUpperCase();
  const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE'];

  for (const kw of forbidden) {
    if (normalized.startsWith(kw) || normalized.includes(`; ${kw}`)) {
      return {
        success: false,
        message: `Запрос отклонён: содержит запрещённую операцию ${kw}`,
      };
    }
  }

  try {
    const result = await pool.query(sql);
    await logToolAction('db_diagnostic', { label, row_count: result.rowCount });
    return {
      success: true,
      message: `Диагностика завершена. Строк: ${result.rowCount ?? 0}`,
      details: { rows: result.rows.slice(0, 20), row_count: result.rowCount },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logToolAction('db_diagnostic', { label, error: msg });
    return { success: false, message: `Ошибка запроса: ${msg}` };
  }
}

/**
 * Применяет безопасный SQL-патч к БД.
 */
export async function applySchemaFix(
  description: string,
  sql: string
): Promise<ToolResult> {
  const normalized = sql.trim().toUpperCase();
  const dangerous = ['DROP TABLE', 'TRUNCATE', 'DELETE FROM', 'UPDATE '];

  for (const kw of dangerous) {
    if (normalized.includes(kw)) {
      return {
        success: false,
        message: `Патч отклонён: содержит опасную операцию "${kw}"`,
      };
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    await logToolAction('schema_fix', { description, sql: sql.substring(0, 500) });
    return { success: true, message: `Патч применён: ${description}` };
  } catch (err) {
    await client.query('ROLLBACK');
    const msg = err instanceof Error ? err.message : String(err);
    await logToolAction('schema_fix', { description, error: msg });
    return { success: false, message: `Ошибка патча: ${msg}` };
  } finally {
    client.release();
  }
}

// Per-key cooldown to suppress repeated alerts (e.g. Infra probing AI every hour)
const _alertCooldowns = new Map<string, number>();
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Отправляет Telegram-уведомление администратору о действии агента.
 * Повторные алерты с тем же agentName+action подавляются на 6 часов.
 */
export async function sendBoardAlert(
  agentName: string,
  action: string,
  details: string
): Promise<ToolResult> {
  const cooldownKey = `${agentName}:${action}`;
  const lastSent = _alertCooldowns.get(cooldownKey) ?? 0;
  if (Date.now() - lastSent < ALERT_COOLDOWN_MS) {
    return { success: true, message: 'Дублирующий алерт подавлен (кулдаун 6ч)' };
  }
  _alertCooldowns.set(cooldownKey, Date.now());

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_FISHING_CHAT_ID;

  if (!token || !chatId) {
    return {
      success: false,
      message: 'Telegram не настроен (нет TELEGRAM_BOT_TOKEN или TELEGRAM_FISHING_CHAT_ID)',
    };
  }

  const text = [
    '<b>Команда AI — действие агента</b>',
    '',
    `Агент: ${agentName}`,
    `Действие: ${action}`,
    `Детали: ${details}`,
    '',
    `Время: ${new Date().toLocaleString('ru-RU')}`,
  ].join('\n');

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    const json = await res.json() as { ok: boolean; description?: string };
    if (!json.ok) throw new Error(json.description ?? 'Telegram error');
    return { success: true, message: 'Уведомление отправлено' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Ошибка Telegram: ${msg}` };
  }
}

/**
 * Сканирует agency-файлы и возвращает список найденных SQL-ошибок.
 */
export function scanSQLErrors(): { file: string; issues: string[] }[] {
  const report: { file: string; issues: string[] }[] = [];

  for (const fileName of AGENCY_FILES) {
    const filePath = path.join(AGENCIES_DIR, fileName);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    const issues: string[] = [];

    for (const wrong of Object.keys(COLUMN_PATCH_MAP)) {
      if (content.includes(wrong)) {
        issues.push(wrong);
      }
    }

    if (issues.length > 0) {
      report.push({ file: fileName, issues });
    }
  }

  return report;
}

// ── Внутреннее логирование ────────────────────────────────────────────────────

async function logToolAction(
  actionType: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO ai_actions_log (action_type, agent_name, metadata, result, created_at)
       VALUES ($1, 'board-executor-tools', $2, 'success', NOW())`,
      [actionType, JSON.stringify(metadata)]
    );
  } catch {
    // Логирование некритично — не прерываем основной поток
  }
}

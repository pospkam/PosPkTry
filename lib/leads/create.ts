/**
 * Единая функция создания лида.
 * Все точки входа вызывают createLead() — это гарантирует:
 *   1. Скоринг (ни один лид без оценки качества)
 *   2. Вставка в БД (единая точка)
 *   3. Уведомление админу (fire-and-forget, не блокирует ответ)
 */

import { pool } from '@/lib/db-pool';
import { computeQuickScore, classifyLead } from '@/lib/leads/scoring';
import { notifyAdminNewLead } from '@/lib/notifications/telegram-channel';

export interface CreateLeadParams {
  /** Имя туриста */
  name: string;
  /** Телефон (может быть пустым для виджета) */
  phone?: string;
  /** Комментарий / сообщение туриста */
  comment?: string;
  /** ID маршрута (если есть) */
  route_id?: string;
  /** Название маршрута (если есть) */
  route_title?: string;
  /** URL страницы откуда пришла заявка */
  source_url?: string;
  /** Метаданные источника */
  source_data?: Record<string, unknown>;
  /** ID оператора (для виджетов партнёров) */
  operator_id?: string | null;
  /** Telegram chat_id (для TG-бота) */
  telegram_chat_id?: string;
  /** Статус лида (по умолчанию 'new') */
  status?: string;
}

/**
 * Создаёт лид: скоринг → INSERT → уведомление админу.
 * Возвращает ID созданного лида (или существующего при дубликате).
 *
 * Для /api/leads (форма сайта) вызывается с дополнительными полями:
 *   route_id, route_title, operator_id — они заполняются из schema.
 *
 * Для дедупликации (тот же телефон + комментарий за 24ч)
 * возвращает ID существующего лида вместо вставки.
 */
export async function createLead(params: CreateLeadParams): Promise<string | null> {
  const {
    name,
    phone = '',
    comment,
    route_id,
    route_title,
    source_url,
    source_data,
    operator_id,
    telegram_chat_id,
    status = 'new',
  } = params;

  // ── 1. Скоринг ──────────────────────────────────────────────────────────
  const quickScore = computeQuickScore(name, phone, comment ?? null, source_data ?? null);
  const isLowQuality = quickScore < 30;

  // ── 2. Дубль: тот же телефон + тот же комментарий за 24ч ────────────────
  if (phone && comment) {
    try {
      const dupCheck = await pool.query<{ id: string }>(
        `SELECT id FROM leads
         WHERE phone = $1 AND comment = $2
           AND created_at > NOW() - INTERVAL '24 hours'
         LIMIT 1`,
        [phone, comment],
      );
      if (dupCheck.rows.length > 0) {
        return dupCheck.rows[0].id;
      }
    } catch {
      // Не блокируем — дедуп опционален
    }
  }

  // ── 3. INSERT ───────────────────────────────────────────────────────────
  let leadId: string | null = null;
  try {
    const res = await pool.query<{ id: string }>(
      `INSERT INTO leads (name, phone, comment, route_id, route_title, source_url, source_data, ai_score, processed_at, operator_id, telegram_chat_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        name,
        phone,
        comment ?? null,
        route_id ?? null,
        route_title ?? null,
        source_url ?? null,
        source_data ? JSON.stringify(source_data) : null,
        quickScore,
        isLowQuality ? new Date() : null,   // низкое качество — сразу закрываем для cron
        operator_id ?? null,
        telegram_chat_id ?? null,
        status,
      ],
    );
    leadId = res.rows[0]?.id ?? null;
  } catch {
    return null;
  }

  // ── 4. Уведомление админу (fire-and-forget) ─────────────────────────────
  // Пропускаем для низкого качества — не спамим
  if (leadId && !isLowQuality) {
    const quality = classifyLead(quickScore);
    void notifyAdminNewLead({
      id: leadId,
      name,
      phone: phone || '',
      comment,
      sourceUrl: source_url,
      sourceData: source_data,
      score: quickScore,
      emoji: quality.emoji,
      labelRu: quality.labelRu,
    }).catch((e) => console.error('[createLead] notifyAdminNewLead failed:', e));
  }

  return leadId;
}

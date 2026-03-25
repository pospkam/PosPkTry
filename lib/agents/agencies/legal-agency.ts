/**
 * LegalAgency — AI-юрист туристической платформы.
 *
 * Анализирует правовые риски, соответствие требованиям и контрактную базу:
 *   legal_contract   — проверка договоров туров (лицензии, ответственность, условия)
 *   legal_compliance — аудит соответствия требованиям (обязательные поля, документы)
 *   legal_risks      — сводка юридических рисков в бронированиях и турах
 */

import { pool } from '@/lib/db-pool';
import { callAIWithModel } from '@/lib/ai/providers';
import type { AgentContext } from '../context-hub';
import type { ChatMessage } from '@/lib/ai/prompts';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

interface TourLegalRow {
  id: number;
  title: string;
  operator: string;
  base_price: number | null;
  has_description: boolean;
  has_cancellation_policy: boolean;
  has_min_participants: boolean;
  has_duration: boolean;
  is_published: boolean;
  risk_score: number;
}

interface ComplianceSummaryRow {
  total_tours: string;
  published_tours: string;
  no_price: string;
  no_description: string;
  no_duration: string;
  no_cancellation: string;
  operators_without_contacts: string;
}

interface BookingRiskRow {
  booking_id: number;
  tour_title: string;
  operator: string;
  status: string;
  amount: number | null;
  created_at: string;
  issue: string;
}

export class LegalAgency {
  private briefing = '';
  private preferredModel: string | null = null;
  private tools: Record<string, (...args: unknown[]) => Promise<{ success: boolean; message: string; details?: Record<string, unknown> }>> = {};

  async run(intent: string, context: AgentContext): Promise<AgencyResult> {
    this.briefing = context.richBriefing ?? '';
    this.preferredModel = context.preferredModel ?? null;
    this.tools = context.tools ?? {};
    try {
      switch (intent) {
        case 'legal_contract':   return await this.reviewContracts();
        case 'legal_compliance': return await this.auditCompliance();
        case 'legal_risks':      return await this.assessRisks();
        default:                 return { response: 'LegalAgency: команда не поддерживается.' };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        response: `Ошибка юридического агента: ${msg}. Система восстановлена, попробуйте позже.`,
        data: {}
      };
    }
  }

  /** Проверяет туры на наличие обязательных условий договора */
  private async reviewContracts(): Promise<AgencyResult> {
    const { rows } = await pool.query<TourLegalRow>(`
      SELECT
        ot.id,
        ot.title,
        p.name                                                          AS operator,
        ot.base_price,
        (ot.description IS NOT NULL AND length(ot.description) >= 100) AS has_description,
        (ot.cancellation_policy IS NOT NULL
          AND length(ot.cancellation_policy) > 10)                     AS has_cancellation_policy,
        (ot.min_participants IS NOT NULL AND ot.min_participants > 0)   AS has_min_participants,
        (ot.duration_hours IS NOT NULL AND ot.duration_hours > 0)      AS has_duration,
        ot.is_published,
        (
          CASE WHEN ot.description IS NOT NULL AND length(ot.description) >= 100 THEN 0 ELSE 2 END +
          CASE WHEN ot.cancellation_policy IS NOT NULL AND length(ot.cancellation_policy) > 10 THEN 0 ELSE 3 END +
          CASE WHEN ot.min_participants IS NOT NULL THEN 0 ELSE 1 END +
          CASE WHEN ot.duration_hours IS NOT NULL   THEN 0 ELSE 1 END +
          CASE WHEN ot.base_price IS NOT NULL AND ot.base_price > 0 THEN 0 ELSE 3 END
        ) AS risk_score
      FROM operator_tours ot
      JOIN partners p ON p.id = ot.operator_id
      WHERE ot.deleted_at IS NULL AND ot.is_active = true
      ORDER BY risk_score DESC, ot.is_published DESC
      LIMIT 15
    `);

    if (rows.length === 0) {
      return { response: 'Активные туры не найдены.' };
    }

    const highRisk = rows.filter(r => r.risk_score >= 4);
    const medRisk  = rows.filter(r => r.risk_score >= 2 && r.risk_score < 4);

    const lines: string[] = [
      '<b>Проверка договоров туров</b>',
      '',
      `Проанализировано: ${rows.length} туров`,
      `Высокий риск (нарушения): ${highRisk.length}`,
      `Средний риск: ${medRisk.length}`,
    ];

    if (highRisk.length > 0) {
      lines.push('', '<b>Требуют немедленного внимания:</b>');
      for (const t of highRisk) {
        const issues: string[] = [];
        if (!t.has_cancellation_policy) issues.push('нет политики отмены');
        if (!t.base_price)              issues.push('нет цены');
        if (!t.has_description)         issues.push('описание < 100 симв.');
        if (!t.has_duration)            issues.push('нет продолжительности');
        const pub = t.is_published ? '[опубл.]' : '[черновик]';
        lines.push(`• [${t.id}] ${t.title} ${pub} — ${issues.join(', ')}`);
      }
    }

    const aiSummary = await this.callAI(
      `Дай краткую юридическую оценку: ${highRisk.length} туров из ${rows.length} имеют высокий риск. ` +
      `Главные проблемы: отсутствие политики отмены бронирования, цен, подробных описаний услуг. ` +
      `Контекст: туристическая платформа Камчатка. Ответ 2-3 предложения.`
    );

    if (aiSummary) lines.push('', aiSummary);

    return { response: lines.join('\n'), data: { high_risk: highRisk, med_risk: medRisk } };
  }

  /** Полный аудит соответствия требованиям платформы и законодательства */
  private async auditCompliance(): Promise<AgencyResult> {
    const [summary, operatorIssues] = await Promise.all([
      pool.query<ComplianceSummaryRow>(`
        SELECT
          COUNT(*)::text                                              AS total_tours,
          COUNT(*) FILTER (WHERE is_published)::text                 AS published_tours,
          COUNT(*) FILTER (WHERE base_price IS NULL OR base_price = 0)::text AS no_price,
          COUNT(*) FILTER (WHERE description IS NULL
                             OR length(description) < 50)::text     AS no_description,
          COUNT(*) FILTER (WHERE duration_hours IS NULL)::text       AS no_duration,
          COUNT(*) FILTER (WHERE cancellation_policy IS NULL
                             OR length(cancellation_policy) < 10)::text AS no_cancellation,
          (SELECT COUNT(*)::text FROM partners
            WHERE type = 'operator' AND deleted_at IS NULL
              AND (contacts IS NULL OR contacts->>'phone' IS NULL))  AS operators_without_contacts
        FROM operator_tours
        WHERE deleted_at IS NULL AND is_active = true
      `),
      pool.query<{ id: number; name: string; issue: string }>(`
        SELECT p.id, p.name,
          CONCAT_WS(' | ',
            CASE WHEN p.contacts IS NULL OR p.contacts->>'phone' IS NULL
                 THEN 'нет телефона' END,
            CASE WHEN p.is_public = false THEN 'профиль скрыт' END,
            CASE WHEN (SELECT COUNT(*) FROM operator_tours ot
                       WHERE ot.operator_id = p.id AND ot.deleted_at IS NULL
                         AND ot.cancellation_policy IS NULL) > 0
                 THEN 'туры без политики отмены' END
          ) AS issue
        FROM partners p
        WHERE p.type = 'operator' AND p.deleted_at IS NULL
          AND (
            p.contacts IS NULL OR p.contacts->>'phone' IS NULL OR p.is_public = false OR
            EXISTS (
              SELECT 1 FROM operator_tours ot
              WHERE ot.operator_id = p.id AND ot.deleted_at IS NULL
                AND ot.cancellation_policy IS NULL AND ot.is_active = true
            )
          )
        ORDER BY p.name
        LIMIT 10
      `),
    ]);

    const s = summary.rows[0];
    const total = parseInt(s.total_tours, 10);
    const complianceScore = total > 0
      ? Math.round(
          (1 - (parseInt(s.no_price, 10) + parseInt(s.no_cancellation, 10)) / (total * 2)) * 100
        )
      : 100;

    let agreementStr = '';
    if (this.tools.getAgreementStats) {
      try {
        const as = await this.tools.getAgreementStats();
        if (as.success && as.details?.stats) {
          agreementStr = `\nСтатистика соглашений: ${JSON.stringify(as.details.stats)}`;
        }
      } catch { /* non-critical */ }
    }

    const lines: string[] = [
      '<b>Аудит соответствия требованиям</b>',
      '',
      `Туров: ${s.total_tours} (опубликовано: ${s.published_tours})`,
      `Индекс соответствия: ${complianceScore}%`,
      '',
      'Нарушения:',
      `• Нет цены: ${s.no_price} туров`,
      `• Нет описания: ${s.no_description} туров`,
      `• Нет продолжительности: ${s.no_duration} туров`,
      `• Нет политики отмены: ${s.no_cancellation} туров`,
      `• Операторы без контактов: ${s.operators_without_contacts}`,
    ];

    if (agreementStr) {
      lines.push(agreementStr);
    }

    if (operatorIssues.rows.length > 0) {
      lines.push('', 'Операторы с нарушениями:');
      for (const op of operatorIssues.rows) {
        if (op.issue) lines.push(`• ${op.name} — ${op.issue}`);
      }
    }

    return { response: lines.join('\n'), data: { summary: s, operators: operatorIssues.rows } };
  }

  /** Оценка юридических рисков в бронированиях */
  private async assessRisks(): Promise<AgencyResult> {
    const { rows } = await pool.query<BookingRiskRow>(`
      SELECT
        ob.id                    AS booking_id,
        ot.title                 AS tour_title,
        p.name                   AS operator,
        ob.booking_status AS status,
        ob.final_price          AS amount,
        ob.created_at::text,
        CASE
          WHEN ob.booking_status = 'cancelled' AND ob.final_price > 0
               THEN 'отмена без возврата'
          WHEN ob.booking_status = 'confirmed' AND ot.cancellation_policy IS NULL
               THEN 'нет политики отмены'
          WHEN ob.final_price IS NULL OR ob.final_price = 0
               THEN 'нет суммы оплаты'
          ELSE 'проверяется'
        END AS issue
      FROM operator_bookings ob
      JOIN operator_tours ot ON ot.id = ob.operator_tour_id
      JOIN partners p        ON p.id  = ot.operator_id
      WHERE ob.created_at >= NOW() - INTERVAL '30 days'
        AND (
          (ob.booking_status = 'cancelled' AND ob.final_price > 0) OR
          (ob.booking_status = 'confirmed' AND ot.cancellation_policy IS NULL) OR
          (ob.final_price IS NULL OR ob.final_price = 0)
        )
      ORDER BY ob.created_at DESC
      LIMIT 15
    `);

    if (rows.length === 0) {
      return {
        response: 'Юридических рисков в бронированиях за последние 30 дней не обнаружено.',
      };
    }

    const byIssue = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.issue] = (acc[r.issue] ?? 0) + 1;
      return acc;
    }, {});

    const lines: string[] = [
      `<b>Юридические риски в бронированиях (30 дней): ${rows.length}</b>`,
      '',
    ];

    for (const [issue, count] of Object.entries(byIssue)) {
      lines.push(`• ${issue}: ${count} случ.`);
    }

    lines.push('', 'Детали:');
    for (const r of rows.slice(0, 8)) {
      const amt = r.amount ? `${Number(r.amount).toLocaleString('ru')} руб.` : 'сумма ?';
      lines.push(`• #${r.booking_id} "${r.tour_title}" (${r.operator}) — ${r.issue} [${amt}]`);
    }

    return { response: lines.join('\n'), data: { risks: rows } };
  }

  private async callAI(prompt: string): Promise<string | null> {
    try {
      const fullPrompt = this.briefing ? `${this.briefing}\n\n${prompt}` : prompt;
      const messages: ChatMessage[] = [{ role: 'user', content: fullPrompt }];
      const { text } = await callAIWithModel(messages, this.preferredModel);
      return text;
    } catch {
      return null;
    }
  }
}

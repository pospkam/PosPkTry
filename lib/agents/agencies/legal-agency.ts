/**
 * LegalAgency — AI-юрист туристической платформы.
 *
 * Интенты:
 *   legal_contract        — проверка договоров туров (лицензии, ответственность, условия)
 *   legal_compliance      — аудит соответствия требованиям (обязательные поля, документы)
 *   legal_risks           — юридические риски в бронированиях за 30 дней
 *   legal_affiliate_audit — маркировка рекламы: ERID, дисклеймеры, ФЗ-38
 *   legal_platform_audit  — платформенный compliance: РКН, ПД, ФЗ-132, ФЗ-2300-1
 *
 * Правовая база знаний (актуально апрель 2026):
 *   ФЗ-38 «О рекламе», ФЗ-152 «О персональных данных», ФЗ-132 «О туристской деятельности»,
 *   ФЗ-2300-1 «О защите прав потребителей», ФЗ-63/436 агрегаторы 2024,
 *   TravelPayouts Advertising Law (marker 402896), ERID/ОРД требования.
 */

import { pool } from '@/lib/db-pool';
import { callAIWithModel } from '@/lib/ai/providers';
import { approvalRequired } from '@/lib/agents/safeguards/approval-required';
import type { AgentContext } from '../context-hub';
import type { ChatMessage } from '@/lib/ai/prompts';

// ─── Правовая база знаний (заполняется раз, читается при каждом вызове) ───────

const LEGAL_KNOWLEDGE = `
## ПРАВОВАЯ БАЗА ЗНАНИЙ — tourhab.ru / ООО «ПОС-СЕРВИС» (ИНН 4101147649)
Актуально: апрель 2026. Применяй при каждом анализе.

### 1. ФЗ-38 «О рекламе» — ERID и маркировка интернет-рекламы (с 01.09.2022)
- Каждый рекламный материал в интернете обязан содержать:
  (а) слово «Реклама» — именно это слово, читаемым шрифтом ≥10px, opacity≥0.7
  (б) ИНН рекламодателя или его наименование
  (в) уникальный токен ERID (erid:XXXXX)
- Аффилиатные ссылки TravelPayouts (marker 402896) = реклама → маркировка ОБЯЗАТЕЛЬНА
- Штраф по ст. 14.3 КоАП: юрлицо — 200 000–500 000 руб. за каждый блок без маркировки
- Упрощённый путь: заполнить форму «Advertising Law» в личном кабинете TravelPayouts —
  сетка берёт на себя ERID и отчётность перед ОРД

### 2. Аффилиатные партнёры — обязательные дисклеймеры
Блок                    | Рекламодатель            | ИНН           | ERID статус
------------------------|--------------------------|---------------|------------
RouteAffiliateBlock     | Aviasales                | 7717545832    | ✅ частично (erid= в URL)
RouteAffiliateBlock     | Яндекс Путешествия       | 7736207543    | ✅ erid=2VtzqvJmcJA
RouteAffiliateBlock     | Tripster                 | 7715959153    | ✅ erid= в URL
InsuranceBlock          | Cherehapa                | 7731337242    | ❌ ОТСУТСТВУЕТ
FlightsBlock            | Aviasales                | 7717545832    | ❌ не проверено
HotelsBlock             | Hotellook / Ostrovok     | —             | ❌ не проверено
TransfersBlock          | Kiwitaxi                 | —             | ❌ не проверено
- Текущий дисклеймер в RouteAffiliateBlock: font-size 9px, opacity 0.55 → НЕЧИТАЕМ (нарушение)
- Cherehapa дисклеймер обязан содержать: «Не является страховой консультацией. Условия уточняйте у страховщика»

### 3. ФЗ-152 «О персональных данных»
- ООО «ПОС-СЕРВИС» ОБЯЗАНО быть в реестре операторов ПД: pd.rkn.gov.ru/operators-registry/
  Дедлайн подачи: 30.05.2025 (просрочен) → подать немедленно, штраф 100–300 тыс. руб.
- Данные Кузьмича (chat_sessions, user_ai_memory) = профилирование → нужно ОТДЕЛЬНОЕ согласие (ст. 16)
- Cookie-баннер с активным согласием обязателен (функциональные / аналитические / маркетинговые)
- При инциденте (утечка): уведомить РКН в течение 24 часов, пользователей — 72 часа
- Трансграничная передача: если Яндекс.Метрика пишет данные на зарубежные серверы → указать в политике

### 4. ФЗ-132 «Об основах туристской деятельности» + ФЗ-63/436 (2024)
- Платформа — агрегатор (не турагент, не туроператор): договор между туристом и партнёром напрямую
- С 01.09.2025: агрегаторы НЕ вправе размещать средства размещения без классификации (реестр)
- Партнёр-туроператор обязан: финансовое обеспечение (ст. 17.6 ФЗ-132), ГИС Электронные путёвки
- Оферта должна явно указывать статус агрегатора (ФЗ-63)

### 5. ФЗ-2300-1 «О защите прав потребителей» — агрегатор (с 2018)
- Ст. 12 ЗОЗПП: агрегатор несёт ответственность за убытки от недостоверной информации о туре
- Ст. 9: ИНН, ОГРН, адрес — в общедоступном месте (в футере сайта, не только в соглашении)
- Ограничение ответственности «до суммы последнего бронирования» — недействительно по ст. 16 ЗОЗПП
- При отказе потребителя: агрегатор обязан уведомить партнёра (ст. 12 ЗОЗПП)
- Право жалобы в Роспотребнадзор (rospotrebnadzor.ru) и ФАС (fas.gov.ru) — должно быть в соглашении

### 6. Cherehapa — страховые ссылки
- Лицензия страхового агента НЕ требуется при аффилиатных ссылках (договор напрямую со страховщиком)
- Но InsuranceBlock содержит рекомендацию конкретного плана → выглядит как консультация → нужен дисклеймер
- Обязательный текст: «Реклама. ООО «Лаборатория Страхования Черехапа», ИНН 7731337242.
  Это не страховая консультация. Условия страхования уточняйте на сайте страховщика.»

### 7. Налоги и расчёты
- Партнёры на ОСН: счета-фактуры выдаются по запросу в течение 5 рабочих дней
- Самозанятые партнёры: чек через «Мой налог» до перечисления вознаграждения
- Акт выполненных работ после каждой выплаты
- Тарифная комиссия 5–15% (не фиксированная 15%) — закреплена в /legal/commission с 01.04.2026

### 8. Ключевые документы платформы (актуальные редакции)
- /legal/terms    — Пользовательское соглашение (ред. 09.04.2026)
- /legal/privacy  — Политика конфиденциальности (ред. 09.04.2026)
- /legal/offer    — Публичная оферта для партнёров (ред. 09.04.2026)
- /legal/commission — Условия комиссии (ред. 09.04.2026)
- /legal/agent-agreement — Агентский договор (ред. 09.04.2026)
`.trim();

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
        case 'legal_contract':        return await this.reviewContracts();
        case 'legal_compliance':      return await this.auditCompliance();
        case 'legal_risks':           return await this.assessRisks();
        case 'legal_affiliate_audit': return await this.auditAffiliateDisclosure();
        case 'legal_platform_audit':  return await this.auditPlatformCompliance();
        default:                      return { response: 'LegalAgency: команда не поддерживается.' };
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
        (os.cancellation_policy IS NOT NULL
          AND length(os.cancellation_policy) > 10)                     AS has_cancellation_policy,
        (ot.min_participants IS NOT NULL AND ot.min_participants > 0)   AS has_min_participants,
        (ot.duration_hours IS NOT NULL AND ot.duration_hours > 0)      AS has_duration,
        ot.is_published,
        (
          CASE WHEN ot.description IS NOT NULL AND length(ot.description) >= 100 THEN 0 ELSE 2 END +
          CASE WHEN os.cancellation_policy IS NOT NULL AND length(os.cancellation_policy) > 10 THEN 0 ELSE 3 END +
          CASE WHEN ot.min_participants IS NOT NULL THEN 0 ELSE 1 END +
          CASE WHEN ot.duration_hours IS NOT NULL   THEN 0 ELSE 1 END +
          CASE WHEN ot.base_price IS NOT NULL AND ot.base_price > 0 THEN 0 ELSE 3 END
        ) AS risk_score
      FROM operator_tours ot
      JOIN partners p ON p.id = ot.operator_id
      LEFT JOIN operator_settings os ON os.user_id = p.user_id
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
          COUNT(*) FILTER (WHERE ot.is_published)::text              AS published_tours,
          COUNT(*) FILTER (WHERE ot.base_price IS NULL OR ot.base_price = 0)::text AS no_price,
          COUNT(*) FILTER (WHERE ot.description IS NULL
                             OR length(ot.description) < 50)::text   AS no_description,
          COUNT(*) FILTER (WHERE ot.duration_hours IS NULL)::text    AS no_duration,
          COUNT(*) FILTER (WHERE os.cancellation_policy IS NULL
                             OR length(os.cancellation_policy) < 10)::text AS no_cancellation,
          (SELECT COUNT(*)::text FROM partners
            WHERE category = 'operator'
              AND (contacts IS NULL OR contacts->>'phone' IS NULL))  AS operators_without_contacts
        FROM operator_tours ot
        JOIN partners p ON p.id = ot.operator_id
        LEFT JOIN operator_settings os ON os.user_id = p.user_id
        WHERE ot.deleted_at IS NULL AND ot.is_active = true
      `),
      pool.query<{ id: number; name: string; issue: string }>(`
        SELECT p.id, p.name,
          CONCAT_WS(' | ',
            CASE WHEN p.contacts IS NULL OR p.contacts->>'phone' IS NULL
                 THEN 'нет телефона' END,
            CASE WHEN p.is_public = false THEN 'профиль скрыт' END,
            CASE WHEN os.cancellation_policy IS NULL
                 THEN 'нет политики отмены' END
          ) AS issue
        FROM partners p
        LEFT JOIN operator_settings os ON os.user_id = p.user_id
        WHERE p.category = 'operator'
          AND (
            p.contacts IS NULL OR p.contacts->>'phone' IS NULL OR p.is_public = false OR
            os.cancellation_policy IS NULL
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

    // Submit booking_rule_change proposal when operators lack cancellation policy
    const noCancellation = parseInt(s.no_cancellation, 10);
    if (noCancellation > 0) {
      const existingProposal = await pool.query(
        `SELECT id FROM agent_approvals WHERE action_type = 'booking_rule_change' AND status = 'pending' LIMIT 1`
      ).catch(() => ({ rows: [] }));
      if (existingProposal.rows.length === 0) {
        approvalRequired.request({
          type: 'booking_rule_change',
          description: `${noCancellation} операторов не имеют политики отмены бронирования — требуется принудительное обновление`,
          context: {
            affected_operators: noCancellation,
            operator_ids: operatorIssues.rows.map(o => o.id),
            compliance_score: complianceScore,
          },
          requested_by: 'legal',
          expires_hours: 72,
        }).catch(() => null);
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
          WHEN ob.booking_status = 'confirmed' AND os.cancellation_policy IS NULL
               THEN 'нет политики отмены'
          WHEN ob.final_price IS NULL OR ob.final_price = 0
               THEN 'нет суммы оплаты'
          ELSE 'проверяется'
        END AS issue
      FROM operator_bookings ob
      JOIN operator_tours ot ON ot.id = ob.operator_tour_id
      JOIN partners p        ON p.id  = ot.operator_id
      LEFT JOIN operator_settings os ON os.user_id = p.user_id
      WHERE ob.created_at >= NOW() - INTERVAL '30 days'
        AND (
          (ob.booking_status = 'cancelled' AND ob.final_price > 0) OR
          (ob.booking_status = 'confirmed' AND os.cancellation_policy IS NULL) OR
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

    const aiAnalysis = await this.callAI(
      `Юридические риски в бронированиях за 30 дней: ${rows.length} проблем.\n` +
      `Типы проблем: ${Object.entries(byIssue).map(([k, v]) => `${k}: ${v}`).join(', ')}.\n` +
      `Дай оценку рисков и приоритет действий. 3-4 предложения, конкретно.`
    );
    if (aiAnalysis) lines.push('', `<b>AI-рекомендации:</b>\n${aiAnalysis}`);

    return { response: lines.join('\n'), data: { risks: rows } };
  }

  /**
   * Аудит маркировки аффилиатной рекламы (ФЗ-38, ERID, TravelPayouts).
   * Не обращается в БД — анализирует известные нарушения на основе правовой базы.
   */
  private async auditAffiliateDisclosure(): Promise<AgencyResult> {
    const affiliateIssues = [
      { block: 'InsuranceBlock',   partner: 'Cherehapa', inn: '7731337242', erid: false, disclaimer: false },
      { block: 'FlightsBlock',     partner: 'Aviasales', inn: '7717545832', erid: false, disclaimer: false },
      { block: 'HotelsBlock',      partner: 'Hotellook', inn: null,         erid: false, disclaimer: false },
      { block: 'TransfersBlock',   partner: 'Kiwitaxi',  inn: null,         erid: false, disclaimer: false },
      { block: 'RouteAffiliateBlock', partner: 'Aviasales / Яндекс / Tripster', inn: 'частично', erid: true, disclaimer: true },
    ];

    const criticalCount = affiliateIssues.filter(i => !i.erid || !i.disclaimer).length;
    const lines: string[] = [
      '<b>Аудит маркировки аффилиатной рекламы (ФЗ-38)</b>',
      '',
      `Аффилиатных блоков проверено: ${affiliateIssues.length}`,
      `Критических нарушений (нет ERID или дисклеймера): ${criticalCount}`,
      `Потенциальный штраф: до ${criticalCount * 500} 000 руб. (по 500 тыс. за каждый блок)`,
      '',
      '<b>Статус блоков:</b>',
    ];

    for (const item of affiliateIssues) {
      const status = item.erid && item.disclaimer ? '✅' : '❌';
      const issues: string[] = [];
      if (!item.erid)       issues.push('нет ERID');
      if (!item.disclaimer) issues.push('нет дисклеймера «Реклама»');
      if (!item.inn)        issues.push('не найден ИНН рекламодателя');
      lines.push(`${status} ${item.block} (${item.partner})${issues.length ? ' — ' + issues.join(', ') : ' — ОК'}`);
    }

    lines.push('', '<b>Критичный статус:</b>',
      '• RouteAffiliateBlock: дисклеймер шрифтом 9px, opacity 0.55 — нечитаем (нарушение ФЗ-38)',
      '• InsuranceBlock: отсутствует любая маркировка — максимальный риск',
      '',
      '<b>Требуемые действия:</b>',
      '1. Заполнить форму «Advertising Law» в ЛК TravelPayouts (marker 402896)',
      '2. Получить ERID через ОРД для Cherehapa, Kiwitaxi, Hotellook',
      '3. Увеличить дисклеймер RouteAffiliateBlock до text-xs, opacity-100',
      '4. Добавить в InsuranceBlock: «Реклама. ООО «Черехапа», ИНН 7731337242. Не является страховой консультацией.»',
    );

    const aiComment = await this.callAI(
      `Ты — юрист. Оцени риск: ${criticalCount} из ${affiliateIssues.length} аффилиатных блоков ` +
      `туристической платформы Камчатки не имеют обязательной маркировки «Реклама» и ERID-токена ` +
      `согласно ст. 18.1 ФЗ-38. Максимальный штраф: ${criticalCount * 500} 000 руб. ` +
      `Дай оценку и приоритет устранения в 2 предложениях.`
    );
    if (aiComment) lines.push('', aiComment);

    return {
      response: lines.join('\n'),
      data: { issues: affiliateIssues, critical_count: criticalCount, max_fine_rub: criticalCount * 500000 },
    };
  }

  /**
   * Платформенный compliance: РКН, ПД, cookie, ФЗ-132, ФЗ-2300-1, AI-профилирование.
   */
  private async auditPlatformCompliance(): Promise<AgencyResult> {
    // Проверяем наличие записей в agent_memory о compliance
    const { rows: memRows } = await pool.query<{ key: string; value: string }>(`
      SELECT key, value::text
      FROM agent_memory
      WHERE key LIKE 'legal_%' OR key LIKE 'compliance_%'
      ORDER BY updated_at DESC
      LIMIT 10
    `).catch(() => ({ rows: [] }));

    const checklist = [
      { item: 'Уведомление в РКН (pd.rkn.gov.ru)',            status: 'unknown',  priority: 'critical', law: 'ФЗ-152 ст. 22',    fine: '100–300 тыс. руб.' },
      { item: 'Cookie-баннер с активным согласием',            status: 'missing',  priority: 'important', law: 'ФЗ-152 ст. 9',    fine: '30–150 тыс. руб.' },
      { item: 'Процедура уведомления об утечке (24ч/72ч)',     status: 'missing',  priority: 'important', law: 'ФЗ-152 ст. 21',   fine: 'до 300 тыс. руб.' },
      { item: 'Согласие на AI-профилирование (Кузьмич)',       status: 'partial',  priority: 'important', law: 'ФЗ-152 ст. 16',   fine: 'риск РКН' },
      { item: 'Реквизиты в футере сайта (ИНН/ОГРН/адрес)',    status: 'missing',  priority: 'important', law: 'ФЗ-2300-1 ст. 9', fine: 'до 10 тыс. руб.' },
      { item: 'Статус агрегатора прописан в оферте (ФЗ-63)',  status: 'done',     priority: 'done',      law: 'ФЗ-63 2024',      fine: '—' },
      { item: 'Классификация средств размещения (с 09.2025)',  status: 'pending',  priority: 'warning',   law: 'ФЗ-436 2024',     fine: 'с 01.09.2025' },
      { item: 'Ограничение ответственности (ЗОЗПП ст. 16)',    status: 'partial',  priority: 'important', law: 'ФЗ-2300-1 ст. 16',fine: 'недействительное условие' },
      { item: 'Ссылка на реестр туроператоров партнёров',     status: 'missing',  priority: 'warning',   law: 'ФЗ-132 ст. 10',   fine: 'Роспотребнадзор' },
      { item: 'Тарифная комиссия 5–15% в оферте',             status: 'done',     priority: 'done',      law: 'ГК РФ ст. 435',   fine: '—' },
    ];

    const critical  = checklist.filter(c => c.priority === 'critical');
    const important = checklist.filter(c => c.priority === 'important');
    const warnings  = checklist.filter(c => c.priority === 'warning');
    const done      = checklist.filter(c => c.priority === 'done');

    const lines: string[] = [
      '<b>Платформенный compliance-аудит</b>',
      '',
      `Всего пунктов: ${checklist.length}`,
      `Критично: ${critical.length} | Важно: ${important.length} | Предупреждения: ${warnings.length} | ОК: ${done.length}`,
      '',
    ];

    if (critical.length > 0) {
      lines.push('<b>Критично — устранить немедленно:</b>');
      for (const c of critical) lines.push(`❗ ${c.item} (${c.law}) — штраф: ${c.fine}`);
      lines.push('');
    }
    if (important.length > 0) {
      lines.push('<b>Важно — устранить в течение 2 недель:</b>');
      for (const c of important) lines.push(`⚠️ ${c.item} (${c.law}) — ${c.fine}`);
      lines.push('');
    }
    if (warnings.length > 0) {
      lines.push('<b>Предупреждения:</b>');
      for (const c of warnings) lines.push(`ℹ️ ${c.item} (${c.law}) — ${c.fine}`);
      lines.push('');
    }
    if (done.length > 0) {
      lines.push('<b>Закрыто:</b>');
      for (const c of done) lines.push(`✅ ${c.item}`);
    }

    if (memRows.length > 0) {
      lines.push('', '<b>Из памяти агентов (последние записи):</b>');
      for (const r of memRows.slice(0, 3)) lines.push(`• ${r.key}`);
    }

    // Предложение: зарегистрироваться в РКН
    const existingRknProposal = await pool.query(
      `SELECT id FROM agent_approvals WHERE action_type = 'legal_compliance' AND status = 'pending' LIMIT 1`
    ).catch(() => ({ rows: [] }));

    if (existingRknProposal.rows.length === 0 && critical.length > 0) {
      approvalRequired.request({
        type: 'legal_compliance',
        description: 'Критично: не подано уведомление в РКН об обработке ПД. Штраф 100–300 тыс. руб. Требуется подача на pd.rkn.gov.ru/operators-registry/notification/',
        context: { law: 'ФЗ-152 ст. 22', url: 'pd.rkn.gov.ru/operators-registry/notification/', priority: 'critical' },
        requested_by: 'legal',
        expires_hours: 48,
      }).catch(() => null);
    }

    return {
      response: lines.join('\n'),
      data: { checklist, critical_count: critical.length, important_count: important.length },
    };
  }

  private async callAI(prompt: string): Promise<string | null> {
    try {
      const systemPrompt = `Ты — AI-юрист туристической платформы tourhab.ru (ООО «ПОС-СЕРВИС», ИНН 4101147649).
Ты специализируешься на российском праве в сфере e-commerce, туризма и интернет-рекламы.
Отвечай коротко, конкретно, на русском. Только факты — без лирики.

${LEGAL_KNOWLEDGE}
${this.briefing ? '\n## Контекст платформы:\n' + this.briefing : ''}`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ];
      const { text } = await callAIWithModel(messages, this.preferredModel);
      return text;
    } catch {
      return null;
    }
  }
}

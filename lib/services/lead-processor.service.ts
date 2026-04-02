/**
 * LeadProcessorService — AI Lead Processor
 *
 * Пайплайн:
 *   1. Достаём лид из БД
 *   2. AI-квалификация: извлекаем намерение (бюджет, активность, даты, группа)
 *   3. Подбираем до 3 подходящих туров из каталога
 *   4. Генерируем персональное предложение (headline + summary + highlights)
 *   5. Сохраняем lead_proposal, обновляем статус лида
 *   6. Возвращаем предложение для последующей отправки и PDF-генерации
 *
 * Используем callAIFast (DeepSeek via OpenRouter) — быстрый, точный для JSON
 */

import { pool } from '@/lib/db-pool';
import { callAIFast } from '@/lib/ai/providers';

// ── Типы ──────────────────────────────────────────────────────────────────────

export interface LeadIntent {
  activity_types: string[];      // ['trekking', 'volcano', 'fishing']
  group_size: number;
  budget_rub: number | null;
  desired_dates: string | null;  // свободный текст
  duration_days: number | null;
  interests: string[];           // ['медведи', 'вулканы', 'термальные источники']
  urgency: 'low' | 'medium' | 'high';
  qualification_notes: string;
}

export interface MatchedTour {
  id: string;
  title: string;
  price: number;
  duration_days: number;
  activity_type: string;
  description: string;
  match_reason: string;
}

export interface AdversarialVerdict {
  bullSignals: string[];
  bearRisks: string[];
  conversionProb: number;
  recommendedAction: 'call_immediately' | 'send_proposal' | 'nurture' | 'skip';
  callStrategy: string;
  urgency: 'hot' | 'warm' | 'cold';
}

export interface LeadProposalData {
  lead_id: string;
  proposal_id: string;
  headline: string;
  summary: string;
  highlights: string[];
  price_from: number | null;
  price_to: number | null;
  duration_days: number | null;
  primary_tour: MatchedTour | null;
  alt_tours: MatchedTour[];
  ai_score: number;
  intent: LeadIntent;
  generation_ms: number;
  adversarial?: AdversarialVerdict;
}

interface LeadRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  comment: string | null;
  route_title: string | null;
  source_data: Record<string, unknown> | null;
  group_size: number | null;
  budget_rub: number | null;
  desired_dates: string | null;
  status: string;
}

interface TourRow {
  id: string;
  title: string;
  price: number;
  duration_days: number | null;
  activity_type: string | null;
  description: string | null;
}

// ── Утилиты ───────────────────────────────────────────────────────────────────

function safeJSON<T>(text: string, fallback: T): T {
  const match = text.match(/```json\s*([\s\S]*?)```/) ??
                text.match(/\{[\s\S]*\}/) ??
                text.match(/\[[\s\S]*\]/);
  const raw = match ? (match[1] ?? match[0]) : text.trim();
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ── Основной класс ────────────────────────────────────────────────────────────

export class LeadProcessorService {

  /**
   * Полный пайплайн обработки лида.
   * Бросает Error если лид не найден или уже обработан.
   */
  async process(leadId: string): Promise<LeadProposalData> {
    const start = Date.now();

    // 1. Загружаем лид
    const lead = await this.getLead(leadId);
    if (!lead) throw new Error('Лид не найден');
    if (lead.status === 'ai_processing') throw new Error('Лид уже обрабатывается');
    if (lead.status === 'proposal_sent' || lead.status === 'converted') {
      throw new Error('Лид уже имеет предложение');
    }

    // 2. Ставим статус "в обработке"
    await pool.query(
      `UPDATE leads SET status = 'ai_processing', updated_at = NOW() WHERE id = $1`,
      [leadId]
    );
    await this.logActivity(leadId, 'ai', 'processing_started', {});

    try {
      // 3. AI-квалификация
      const intent = await this.qualifyLead(lead);

      // 4. Подбираем туры
      const tours = await this.matchTours(intent, lead.route_title ?? null);

      // 4.5. Adversarial analysis: Bull + Bear параллельно → Arbiter
      const verdict = await this.runAdversarialAnalysis(lead, intent, tours);

      // 5. Генерируем предложение (с учётом возражений Bear-агента)
      const proposal = await this.generateProposal(lead, intent, tours, verdict);

      // 6. Считаем AI-score (на основе verdict.conversionProb)
      const aiScore = this.computeScore(intent, tours, verdict);

      // 7. Сохраняем в БД
      const proposalId = await this.saveProposal({
        leadId,
        primaryTour: tours[0] ?? null,
        altTours: tours.slice(1),
        headline: proposal.headline,
        summary: proposal.summary,
        highlights: proposal.highlights,
        priceFrom: tours[0]?.price ?? null,
        priceTo: tours[tours.length - 1]?.price ?? null,
        durationDays: intent.duration_days ?? tours[0]?.duration_days ?? null,
        generationMs: Date.now() - start,
        verdict,
      });

      // 8. Обновляем лид
      await pool.query(
        `UPDATE leads
         SET status = 'ai_qualified',
             ai_score = $1,
             ai_summary = $2,
             ai_intent = $3,
             matched_tour_ids = $4,
             proposal_id = $5,
             processed_at = NOW(),
             updated_at = NOW()
         WHERE id = $6`,
        [
          aiScore,
          proposal.summary.slice(0, 500),
          JSON.stringify(intent),
          tours.map(t => t.id),
          proposalId,
          leadId,
        ]
      );

      await this.logActivity(leadId, 'ai', 'processing_complete', {
        score: aiScore,
        tours_matched: tours.length,
        proposal_id: proposalId,
      });

      return {
        lead_id:      leadId,
        proposal_id:  proposalId,
        headline:     proposal.headline,
        summary:      proposal.summary,
        highlights:   proposal.highlights,
        price_from:   tours[0]?.price ?? null,
        price_to:     tours[tours.length - 1]?.price ?? null,
        duration_days: intent.duration_days ?? tours[0]?.duration_days ?? null,
        primary_tour: tours[0] ?? null,
        alt_tours:    tours.slice(1),
        ai_score:     aiScore,
        intent,
        generation_ms: Date.now() - start,
        adversarial:  verdict,
      };
    } catch (err) {
      // При ошибке — снимаем статус
      await pool.query(
        `UPDATE leads SET status = 'new', updated_at = NOW() WHERE id = $1`,
        [leadId]
      );
      await this.logActivity(leadId, 'system', 'processing_error', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  // ── Вспомогательные методы ─────────────────────────────────────────────────

  private async getLead(id: string): Promise<LeadRow | null> {
    const { rows } = await pool.query<LeadRow>(
      `SELECT id, name, phone, email, comment, route_title, source_data,
              group_size, budget_rub, desired_dates, status
       FROM leads WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  }

  private async qualifyLead(lead: LeadRow): Promise<LeadIntent> {
    const prompt = `Ты — AI-квалификатор туристических заявок на Камчатке.

Заявка:
- Имя: ${lead.name}
- Телефон: ${lead.phone}
- Комментарий: ${lead.comment ?? 'не указан'}
- Интересующий маршрут: ${lead.route_title ?? 'не указан'}
- Размер группы: ${lead.group_size ?? 'не указан'}
- Бюджет (руб): ${lead.budget_rub ?? 'не указан'}
- Желаемые даты: ${lead.desired_dates ?? 'не указаны'}
- Доп. данные: ${JSON.stringify(lead.source_data ?? {})}

Извлеки намерение туриста и верни ТОЛЬКО JSON без комментариев:
{
  "activity_types": ["trekking"|"volcano"|"fishing"|"thermal"|"helicopter"|"boat_trip"|"snowmobile"|"skiing"|"diving"|"kayak"|"horseback"|"birdwatching"|"photography"],
  "group_size": <число, 1 если неизвестно>,
  "budget_rub": <число или null>,
  "desired_dates": "<строка или null>",
  "duration_days": <число или null>,
  "interests": ["медведи"|"вулканы"|"гейзеры"|"рыбалка"|...],
  "urgency": "low"|"medium"|"high",
  "qualification_notes": "<краткое резюме по-русски>"
}`;

    const raw = await callAIFast([
      { role: 'system', content: 'Отвечай только валидным JSON. Никакого текста вне JSON.' },
      { role: 'user', content: prompt },
    ]);

    return safeJSON<LeadIntent>(raw, {
      activity_types: [],
      group_size: lead.group_size ?? 1,
      budget_rub: lead.budget_rub ?? null,
      desired_dates: lead.desired_dates ?? null,
      duration_days: null,
      interests: [],
      urgency: 'medium',
      qualification_notes: lead.comment ?? 'Нет данных',
    });
  }

  private async matchTours(intent: LeadIntent, routeTitle: string | null): Promise<MatchedTour[]> {
    const activityFilter = intent.activity_types.length > 0
      ? `AND (activity_type = ANY($1) OR title ILIKE ANY($2))`
      : '';
    const keywords = [...intent.interests, ...(routeTitle ? [routeTitle] : [])];
    const keywordFilter = keywords.map(k => `%${k}%`);

    const params: unknown[] = [];
    if (intent.activity_types.length > 0) {
      params.push(intent.activity_types);
      params.push(keywordFilter.length > 0 ? keywordFilter : ['%%']);
    }

    let budgetFilter = '';
    if (intent.budget_rub) {
      params.push(Math.round(Number(intent.budget_rub) * 1.2));
      budgetFilter = `AND base_price <= $${params.length}`;
    }

    const { rows } = await pool.query<TourRow>(
      `SELECT id::text, title, base_price AS price,
              CEIL(COALESCE(duration_hours, 8) / 8.0)::int AS duration_days,
              activity_type, description
       FROM operator_tours
       WHERE is_active = true AND deleted_at IS NULL
         ${activityFilter}
         ${budgetFilter}
       ORDER BY RANDOM()
       LIMIT 10`,
      params
    );

    if (rows.length === 0) {
      // Fallback — любые активные туры
      const { rows: fallback } = await pool.query<TourRow>(
        `SELECT id::text, title, base_price AS price,
                CEIL(COALESCE(duration_hours, 8) / 8.0)::int AS duration_days,
                activity_type, description
         FROM operator_tours WHERE is_active = true AND deleted_at IS NULL ORDER BY RANDOM() LIMIT 5`
      );
      return this.rankTours(fallback, intent).slice(0, 3);
    }

    return this.rankTours(rows, intent).slice(0, 3);
  }

  private rankTours(tours: TourRow[], intent: LeadIntent): MatchedTour[] {
    return tours
      .map(t => {
        let score = 0;
        if (intent.activity_types.includes(t.activity_type ?? '')) score += 30;
        if (intent.budget_rub && t.price <= intent.budget_rub) score += 20;
        if (intent.duration_days && t.duration_days === intent.duration_days) score += 15;
        const titleLower = t.title.toLowerCase();
        for (const interest of intent.interests) {
          if (titleLower.includes(interest.toLowerCase())) score += 10;
        }
        return { ...t, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(t => ({
        id:            t.id,
        title:         t.title,
        price:         t.price,
        duration_days: t.duration_days ?? 1,
        activity_type: t.activity_type ?? 'other',
        description:   (t.description ?? '').slice(0, 300),
        match_reason:  this.buildMatchReason(t, intent),
      }));
  }

  private buildMatchReason(
    tour: TourRow & { score?: number },
    intent: LeadIntent
  ): string {
    const reasons: string[] = [];
    if (intent.activity_types.includes(tour.activity_type ?? '')) {
      reasons.push('соответствует запрошенной активности');
    }
    if (intent.budget_rub && tour.price <= intent.budget_rub) {
      reasons.push('укладывается в бюджет');
    }
    if (reasons.length === 0) reasons.push('рекомендован по популярности');
    return reasons.join(', ');
  }

  // ── Adversarial Analysis ──────────────────────────────────────────────────

  /**
   * Запускает Bull + Bear агентов параллельно, затем Arbiter синтезирует вердикт.
   */
  private async runAdversarialAnalysis(
    lead: LeadRow,
    intent: LeadIntent,
    tours: MatchedTour[]
  ): Promise<AdversarialVerdict> {
    const context = `
Лид: ${lead.name}, ${lead.comment ?? 'нет комментария'}
Группа: ${intent.group_size} чел. | Бюджет: ${intent.budget_rub ? intent.budget_rub.toLocaleString('ru-RU') + ' ₽' : 'не указан'}
Активности: ${intent.activity_types.join(', ') || 'не указаны'}
Даты: ${intent.desired_dates ?? 'не указаны'}
Туры: ${tours.map(t => `"${t.title}" ${t.price.toLocaleString('ru-RU')} ₽`).join(', ') || 'нет подходящих'}
    `.trim();

    const bullPrompt = `Ты — Bull-агент. Твоя задача: найти все сигналы, которые говорят о том, что этот турист КУПИТ тур.
${context}
Верни ТОЛЬКО JSON: { "signals": ["...", "...", "..."] }
3-5 конкретных сигналов. Будь честным аналитиком, не фантазируй.`;

    const bearPrompt = `Ты — Bear-агент. Твоя задача: найти все причины, по которым этот турист НЕ КУПИТ тур.
${context}
Верни ТОЛЬКО JSON: { "risks": ["...", "...", "..."] }
3-5 реальных рисков и возражений. Будь честным, не сгущай краски.`;

    const [bullRaw, bearRaw] = await Promise.all([
      callAIFast([
        { role: 'system', content: 'Отвечай только валидным JSON.' },
        { role: 'user', content: bullPrompt },
      ]).catch(() => '{"signals":[]}'),
      callAIFast([
        { role: 'system', content: 'Отвечай только валидным JSON.' },
        { role: 'user', content: bearPrompt },
      ]).catch(() => '{"risks":[]}'),
    ]);

    const bull = safeJSON<{ signals: string[] }>(bullRaw, { signals: [] });
    const bear = safeJSON<{ risks: string[] }>(bearRaw, { risks: [] });

    const arbiterPrompt = `Ты — Arbiter-агент. Выслушал Bull и Bear по одному лиду. Вынеси итоговый вердикт.

Bull нашёл:
${bull.signals.map((s, i) => `${i + 1}. ${s}`).join('\n') || 'нет сигналов'}

Bear нашёл:
${bear.risks.map((r, i) => `${i + 1}. ${r}`).join('\n') || 'нет рисков'}

${context}

Верни ТОЛЬКО JSON:
{
  "conversion_prob": <0-100, реальная вероятность конверсии>,
  "recommended_action": "call_immediately"|"send_proposal"|"nurture"|"skip",
  "call_strategy": "<одно предложение: с чего начать разговор, чтобы закрыть главное возражение>",
  "urgency": "hot"|"warm"|"cold"
}`;

    const arbiterRaw = await callAIFast([
      { role: 'system', content: 'Отвечай только валидным JSON.' },
      { role: 'user', content: arbiterPrompt },
    ]).catch(() => '{}');

    const arbiter = safeJSON<{
      conversion_prob: number;
      recommended_action: string;
      call_strategy: string;
      urgency: string;
    }>(arbiterRaw, {
      conversion_prob: 50,
      recommended_action: 'send_proposal',
      call_strategy: 'Уточните детали поездки и предложите лучший тур.',
      urgency: 'warm',
    });

    return {
      bullSignals:        bull.signals.slice(0, 5),
      bearRisks:          bear.risks.slice(0, 5),
      conversionProb:     Math.max(0, Math.min(100, arbiter.conversion_prob ?? 50)),
      recommendedAction:  (['call_immediately', 'send_proposal', 'nurture', 'skip'] as const)
                            .includes(arbiter.recommended_action as 'call_immediately')
                            ? arbiter.recommended_action as AdversarialVerdict['recommendedAction']
                            : 'send_proposal',
      callStrategy:       arbiter.call_strategy ?? '',
      urgency:            (['hot', 'warm', 'cold'] as const).includes(arbiter.urgency as 'hot')
                            ? arbiter.urgency as AdversarialVerdict['urgency']
                            : 'warm',
    };
  }

  private async generateProposal(
    lead: LeadRow,
    intent: LeadIntent,
    tours: MatchedTour[],
    verdict: AdversarialVerdict
  ): Promise<{ headline: string; summary: string; highlights: string[] }> {
    const toursText = tours.length > 0
      ? tours.map((t, i) =>
          `${i + 1}. "${t.title}" — ${t.price.toLocaleString('ru-RU')} ₽/чел, ${t.duration_days} дн. (${t.activity_type})`
        ).join('\n')
      : 'Туры подбираются индивидуально';

    const bearContext = verdict.bearRisks.length > 0
      ? `\nГлавные возражения клиента (нейтрализуй их в тексте):\n${verdict.bearRisks.slice(0, 3).map((r, i) => `${i + 1}. ${r}`).join('\n')}`
      : '';

    const prompt = `Ты — менеджер туристической платформы TourHab на Камчатке.
Составь персональное коммерческое предложение для клиента.

Клиент: ${lead.name}
Запрос: ${lead.comment ?? intent.qualification_notes}
Группа: ${intent.group_size} чел.
Активности: ${intent.activity_types.join(', ') || 'любые'}
Интересы: ${intent.interests.join(', ') || 'не указаны'}
Бюджет: ${intent.budget_rub ? intent.budget_rub.toLocaleString('ru-RU') + ' ₽' : 'не указан'}
Даты: ${intent.desired_dates ?? 'гибкие'}
${bearContext}

Подобранные туры:
${toursText}

Верни ТОЛЬКО JSON:
{
  "headline": "<цепляющий заголовок до 80 символов>",
  "summary": "<персональное приветствие + описание предложения, 150-200 слов, по-русски. Ненавязчиво сними возражения.>",
  "highlights": ["<ключевая фишка 1>", "<ключевая фишка 2>", "<ключевая фишка 3>", "<ключевая фишка 4>"]
}`;

    const raw = await callAIFast([
      { role: 'system', content: 'Отвечай только валидным JSON.' },
      { role: 'user', content: prompt },
    ]);

    return safeJSON(raw, {
      headline: `Персональный тур на Камчатку для ${lead.name}`,
      summary: `Здравствуйте, ${lead.name}! Мы подобрали для вас лучшие варианты туров на Камчатке с учётом ваших интересов. Наши эксперты готовы организовать незабываемое путешествие.`,
      highlights: [
        'Подбор тура под ваш запрос',
        'Опытные гиды с лицензиями МЧС',
        'Полное сопровождение от заезда до выезда',
        'Гарантия лучшей цены',
      ],
    });
  }

  private computeScore(intent: LeadIntent, tours: MatchedTour[], verdict?: AdversarialVerdict): number {
    // Если есть вердикт Arbiter — он первичен (70%), эвристика — вторична (30%)
    if (verdict) {
      let heuristic = 30;
      if (intent.activity_types.length > 0) heuristic += 5;
      if (intent.budget_rub) heuristic += 5;
      if (intent.desired_dates) heuristic += 5;
      if (intent.urgency === 'high') heuristic += 5;
      if (tours.length > 0) heuristic += 5;
      heuristic = Math.min(25, heuristic - 30); // нормируем добавку
      return Math.min(100, Math.round(verdict.conversionProb * 0.7 + (50 + heuristic) * 0.3));
    }
    let score = 50;
    if (intent.activity_types.length > 0) score += 15;
    if (intent.budget_rub) score += 10;
    if (intent.group_size > 1) score += 5;
    if (intent.desired_dates) score += 10;
    if (intent.urgency === 'high') score += 10;
    if (tours.length > 0) score += 10;
    return Math.min(100, score);
  }

  private async saveProposal(data: {
    leadId: string;
    primaryTour: MatchedTour | null;
    altTours: MatchedTour[];
    headline: string;
    summary: string;
    highlights: string[];
    priceFrom: number | null;
    priceTo: number | null;
    durationDays: number | null;
    generationMs: number;
    verdict?: AdversarialVerdict;
  }): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO lead_proposals
         (lead_id, primary_tour_id, alt_tour_ids, headline, summary, highlights,
          price_from, price_to, duration_days, generation_ms,
          bull_signals, bear_risks, conversion_prob,
          recommended_action, call_strategy, verdict_urgency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING id`,
      [
        data.leadId,
        data.primaryTour?.id ?? null,
        data.altTours.map(t => t.id),
        data.headline,
        data.summary,
        JSON.stringify(data.highlights),
        data.priceFrom,
        data.priceTo,
        data.durationDays,
        data.generationMs,
        JSON.stringify(data.verdict?.bullSignals ?? []),
        JSON.stringify(data.verdict?.bearRisks ?? []),
        data.verdict?.conversionProb ?? null,
        data.verdict?.recommendedAction ?? null,
        data.verdict?.callStrategy ?? null,
        data.verdict?.urgency ?? null,
      ]
    );
    return rows[0].id;
  }

  private async logActivity(
    leadId: string,
    actor: string,
    action: string,
    details: Record<string, unknown>
  ): Promise<void> {
    await pool.query(
      `INSERT INTO lead_activity_log (lead_id, actor, action, details) VALUES ($1, $2, $3, $4)`,
      [leadId, actor, action, JSON.stringify(details)]
    );
  }

  /**
   * Получить предложение с полными данными тура
   */
  async getProposal(proposalId: string): Promise<LeadProposalData | null> {
    const { rows } = await pool.query(
      `SELECT
         lp.*,
         l.name       AS lead_name,
         l.phone      AS lead_phone,
         l.email      AS lead_email,
         l.comment    AS lead_comment,
         l.group_size AS lead_group_size,
         l.ai_score,
         l.ai_intent,
         t.title      AS tour_title,
         t.base_price AS tour_price,
         CEIL(COALESCE(t.duration_hours, 8) / 8.0)::int AS tour_duration_days,
         t.activity_type    AS tour_activity_type,
         t.description      AS tour_description
       FROM lead_proposals lp
       JOIN leads l ON l.id = lp.lead_id
       LEFT JOIN operator_tours t ON t.id::text = lp.primary_tour_id
       WHERE lp.id = $1`,
      [proposalId]
    );

    if (!rows[0]) return null;
    const r = rows[0];

    const primaryTour: MatchedTour | null = r.tour_title ? {
      id:            r.primary_tour_id,
      title:         r.tour_title,
      price:         Number(r.tour_price),
      duration_days: r.tour_duration_days ?? 1,
      activity_type: r.tour_activity_type ?? 'other',
      description:   r.tour_description ?? '',
      match_reason:  '',
    } : null;

    return {
      lead_id:      r.lead_id,
      proposal_id:  r.id,
      headline:     r.headline,
      summary:      r.summary,
      highlights:   Array.isArray(r.highlights) ? r.highlights : JSON.parse(r.highlights ?? '[]'),
      price_from:   r.price_from ? Number(r.price_from) : null,
      price_to:     r.price_to ? Number(r.price_to) : null,
      duration_days: r.duration_days ? Number(r.duration_days) : null,
      primary_tour: primaryTour,
      alt_tours:    [],
      ai_score:     r.ai_score ?? 0,
      intent:       typeof r.ai_intent === 'string' ? JSON.parse(r.ai_intent) : (r.ai_intent ?? {}),
      generation_ms: r.generation_ms ?? 0,
    };
  }

  /**
   * Пометить предложение как отправленное + обновить статус лида
   */
  async markProposalSent(proposalId: string, leadId: string): Promise<void> {
    await Promise.all([
      pool.query(
        `UPDATE lead_proposals SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [proposalId]
      ),
      pool.query(
        `UPDATE leads SET status = 'proposal_sent', updated_at = NOW() WHERE id = $1`,
        [leadId]
      ),
    ]);
    await this.logActivity(leadId, 'system', 'proposal_sent', { proposal_id: proposalId });
  }
}

export const leadProcessor = new LeadProcessorService();

/** Convenience wrapper for batch routes — fetches lead from DB by ID */
export async function processSingleLead(leadId: string, _data?: unknown): Promise<void> {
  await leadProcessor.process(leadId);
}

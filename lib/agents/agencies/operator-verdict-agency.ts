/**
 * OperatorVerdictAgency — симметричная оценка операторов для пользы проекта.
 *
 * 5 сторонников vs 5 скептиков спорят по каждому оператору.
 * Цель: выявить кого продвигать, кому помочь, кого предупредить — без предвзятости.
 * Данные: только последние 30 дней (актуальная картина).
 * Вердикт: promote / hold / warn / suspend.
 *
 * READ ONLY — не пишет в БД, только анализирует.
 */

import { pool } from '@/lib/db-pool';
import { callAIFast } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

// ── Types ──────────────────────────────────────────────────────────────────

export interface OperatorMetrics {
  operator_id: string;
  operator_name: string;
  tours: number;
  published: number;
  bookings_30d: number;
  revenue_30d: number;
  slots_ahead: number;
  cancellation_rate: number;
}

export type Verdict = 'promote' | 'hold' | 'warn' | 'suspend';

export interface VerdictArgument {
  role: string;
  side: 'pro' | 'con';
  argument: string;
}

export interface OperatorVerdictResult {
  operator_id: string;
  operator_name: string;
  metrics: OperatorMetrics;
  arguments: VerdictArgument[];
  pro_score: number;
  con_score: number;
  verdict: Verdict;
  reasoning: string;
}

// ── Роли сторонников и скептиков (на пользу проекта) ──────────────────────

const PRO_ROLES = [
  { role: 'Аналитик роста', focus: 'динамика бронирований, вклад в развитие платформы' },
  { role: 'Голос туриста', focus: 'клиентский опыт, доступность туров, удобство' },
  { role: 'Финансовый аналитик', focus: 'вклад в выручку платформы, средний чек' },
  { role: 'Стратег платформы', focus: 'уникальность предложения, заполнение ниш каталога' },
  { role: 'Аналитик перспектив', focus: 'сезонный потенциал, возможности для улучшения' },
];

const CON_ROLES = [
  { role: 'Инспектор рисков', focus: 'риски для репутации платформы, красные флаги' },
  { role: 'Аудитор качества', focus: 'стандарты сервиса, отмены, несоответствия' },
  { role: 'Аналитик ёмкости', focus: 'реальная доступность туров, незаполненные слоты' },
  { role: 'Аналитик эффективности', focus: 'реальный вклад vs занимаемое место на платформе' },
  { role: 'Защитник туриста', focus: 'интересы клиентов, риск негативного опыта' },
];

// ── SQL: метрики оператора за 30 дней ──────────────────────────────────────

interface MetricsRow {
  operator_id: string;
  operator_name: string;
  tours: string;
  published: string;
  bookings_30d: string;
  revenue_30d: string;
  slots_ahead: string;
  cancelled_30d: string;
}

async function fetchOperatorMetrics(operatorId?: string): Promise<OperatorMetrics[]> {
  const whereClause = operatorId
    ? 'WHERE p.is_public = true AND p.id::text = $1'
    : 'WHERE p.is_public = true';

  const params = operatorId ? [operatorId] : [];

  const { rows } = await pool.query<MetricsRow>(`
    SELECT
      p.id::text                                                           AS operator_id,
      p.name                                                               AS operator_name,
      COUNT(DISTINCT ot.id)::text                                          AS tours,
      COUNT(DISTINCT ot.id) FILTER (WHERE ot.is_published)::text          AS published,
      COUNT(ob.id) FILTER (
        WHERE ob.created_at >= NOW() - INTERVAL '30 days'
      )::text                                                              AS bookings_30d,
      COALESCE(SUM(ob.final_price) FILTER (
        WHERE ob.created_at >= NOW() - INTERVAL '30 days'
          AND ob.booking_status IN ('confirmed','completed')
      ), 0)::text                                                          AS revenue_30d,
      COUNT(DISTINCT ta.date) FILTER (
        WHERE ta.date >= CURRENT_DATE AND ta.is_cancelled = false
      )::text                                                              AS slots_ahead,
      COUNT(ob.id) FILTER (
        WHERE ob.created_at >= NOW() - INTERVAL '30 days'
          AND ob.booking_status IN ('cancelled','cancelled_by_operator','cancelled_by_tourist')
      )::text                                                              AS cancelled_30d
    FROM partners p
    LEFT JOIN operator_tours ot
      ON ot.operator_id = p.id AND ot.deleted_at IS NULL
    LEFT JOIN operator_bookings ob
      ON ob.operator_tour_id = ot.id AND ob.deleted_at IS NULL
    LEFT JOIN tour_availability ta
      ON ta.operator_tour_id = ot.id
    ${whereClause}
    GROUP BY p.id, p.name
    ORDER BY bookings_30d DESC NULLS LAST
    LIMIT 20
  `, params);

  return rows.map(r => {
    const bookings = parseInt(r.bookings_30d, 10);
    const cancelled = parseInt(r.cancelled_30d, 10);
    const cancellationRate = bookings > 0
      ? Math.round((cancelled / bookings) * 100)
      : 0;

    return {
      operator_id:       r.operator_id,
      operator_name:     r.operator_name,
      tours:             parseInt(r.tours, 10),
      published:         parseInt(r.published, 10),
      bookings_30d:      bookings,
      revenue_30d:       parseInt(r.revenue_30d, 10),
      slots_ahead:       parseInt(r.slots_ahead, 10),
      cancellation_rate: cancellationRate,
    };
  });
}

// ── Форматировать метрики для промпта ───────────────────────────────────────

function formatMetrics(m: OperatorMetrics): string {
  return [
    `Оператор: ${m.operator_name}`,
    `Туры: ${m.tours} всего, ${m.published} опубликовано`,
    `Бронирования (30 дней): ${m.bookings_30d}`,
    `Выручка (30 дней): ${m.revenue_30d.toLocaleString('ru-RU')} руб`,
    `Слотов доступно: ${m.slots_ahead}`,
    `Отмены (30 дней): ${m.cancellation_rate}%`,
  ].join('\n');
}

// ── Генерация одного аргумента ──────────────────────────────────────────────

async function generateArgument(
  role: { role: string; focus: string },
  side: 'pro' | 'con',
  metrics: OperatorMetrics,
): Promise<VerdictArgument> {
  const stance = side === 'pro'
    ? 'Ты ОПТИМИСТ. Найди 1 сильный аргумент ПОЧЕМУ этого оператора стоит продвигать.'
    : 'Ты СКЕПТИК. Найди 1 конкретный риск или слабое место этого оператора.';

  const prompt = `Ты ${role.role} на платформе туристических маршрутов Камчатки.
Твой фокус: ${role.focus}

ДАННЫЕ ОПЕРАТОРА (только последние 30 дней):
${formatMetrics(metrics)}

${stance}

Правила:
- Только факты из данных выше, никаких выдумок
- Одно предложение, максимум 100 символов
- Без вступлений и лести`;

  const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
  const text = await callAIFast(messages).catch(() => null);

  return {
    role: role.role,
    side,
    argument: text?.trim().substring(0, 150) ?? 'Нет данных для анализа.',
  };
}

// ── Финальный вердикт ───────────────────────────────────────────────────────

async function generateVerdict(
  metrics: OperatorMetrics,
  args: VerdictArgument[],
): Promise<{ verdict: Verdict; pro_score: number; con_score: number; reasoning: string }> {
  const proArgs = args.filter(a => a.side === 'pro').map(a => `[${a.role}]: ${a.argument}`).join('\n');
  const conArgs = args.filter(a => a.side === 'con').map(a => `[${a.role}]: ${a.argument}`).join('\n');

  const prompt = `Ты арбитр оценки операторов туристической платформы Камчатки.
Твоя цель: вынести вердикт, который принесёт наибольшую пользу платформе и туристам.

ОПЕРАТОР: ${metrics.operator_name}
МЕТРИКИ (30 дней): ${formatMetrics(metrics)}

СТОРОННИКИ (аргументы за):
${proArgs}

СКЕПТИКИ (аргументы против):
${conArgs}

На основе данных и аргументов вынеси вердикт. Ответь строго JSON:
{"verdict":"promote"|"hold"|"warn"|"suspend","pro_score":0-100,"con_score":0-100,"reasoning":"1 предложение на русском"}

Критерии:
- promote: сильный оператор, заслуживает больше видимости
- hold: нормально, без изменений
- warn: есть риски, нужно наблюдение или уведомление
- suspend: серьёзные проблемы, рассмотреть приостановку`;

  const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
  const text = await callAIFast(messages).catch(() => null);

  if (!text) {
    return { verdict: 'hold', pro_score: 50, con_score: 50, reasoning: 'Нет данных для вердикта.' };
  }

  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) {
    return { verdict: 'hold', pro_score: 50, con_score: 50, reasoning: text.trim().substring(0, 200) };
  }

  try {
    const parsed = JSON.parse(match[0]) as {
      verdict?: string;
      pro_score?: number;
      con_score?: number;
      reasoning?: string;
    };

    const verdicts: Verdict[] = ['promote', 'hold', 'warn', 'suspend'];
    const verdict = verdicts.includes(parsed.verdict as Verdict)
      ? (parsed.verdict as Verdict)
      : 'hold';

    return {
      verdict,
      pro_score: typeof parsed.pro_score === 'number' ? Math.max(0, Math.min(100, parsed.pro_score)) : 50,
      con_score: typeof parsed.con_score === 'number' ? Math.max(0, Math.min(100, parsed.con_score)) : 50,
      reasoning:  typeof parsed.reasoning === 'string' ? parsed.reasoning.substring(0, 300) : '',
    };
  } catch {
    return { verdict: 'hold', pro_score: 50, con_score: 50, reasoning: text.substring(0, 200) };
  }
}

// ── Публичный API ───────────────────────────────────────────────────────────

export class OperatorVerdictAgency {
  /**
   * Запустить симметричный анализ оператора(ов) для пользы проекта.
   * @param operatorId — UUID оператора. Если не указан — анализирует топ-5 по активности.
   */
  async run(operatorId?: string): Promise<OperatorVerdictResult[]> {
    const allMetrics = await fetchOperatorMetrics(operatorId);

    if (allMetrics.length === 0) return [];

    // Анализируем не больше 5 операторов за раз (стоимость AI-вызовов)
    const targets = allMetrics.slice(0, 5);

    const results = await Promise.allSettled(
      targets.map(metrics => this.analyzeOne(metrics))
    );

    return results
      .map(r => r.status === 'fulfilled' ? r.value : null)
      .filter((r): r is OperatorVerdictResult => r !== null);
  }

  private async analyzeOne(metrics: OperatorMetrics): Promise<OperatorVerdictResult> {
    // 5 сторонников + 5 скептиков параллельно
    const [proResults, conResults] = await Promise.all([
      Promise.allSettled(PRO_ROLES.map(role => generateArgument(role, 'pro', metrics))),
      Promise.allSettled(CON_ROLES.map(role => generateArgument(role, 'con', metrics))),
    ]);

    const args: VerdictArgument[] = [
      ...proResults.map(r => r.status === 'fulfilled' ? r.value : null),
      ...conResults.map(r => r.status === 'fulfilled' ? r.value : null),
    ].filter((a): a is VerdictArgument => a !== null);

    const { verdict, pro_score, con_score, reasoning } = await generateVerdict(metrics, args);

    return {
      operator_id:   metrics.operator_id,
      operator_name: metrics.operator_name,
      metrics,
      arguments: args,
      pro_score,
      con_score,
      verdict,
      reasoning,
    };
  }
}

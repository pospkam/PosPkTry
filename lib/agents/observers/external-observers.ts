/**
 * External AI Observers — независимые наблюдатели в совете директоров.
 *
 * DeepSeek       — Trend Observer:  тренды, социальные настроения, внешний взгляд
 * Gemini (Google) — Market Observer: поисковые тренды, спрос, конкуренты
 *
 * Observers are advisory-only (non-voting). They provide external perspective
 * that breaks the "echo chamber" of a single-AI board.
 *
 * Called between Round 1 (reports) and Round 2 (reactions).
 */

import { callAIWaterfall } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

// ── Types ─────────────────────────────────────────────────────

export interface ObserverReport {
  id:          string;
  name:        string;
  role:        string;
  provider:    'deepseek' | 'gemini';
  report:      string;
  duration_ms: number;
  status:      'ok' | 'error' | 'unavailable';
  color:       string;
}

// ── Observer definitions ──────────────────────────────────────

interface ObserverDef {
  id:       string;
  name:     string;
  role:     string;
  provider: 'deepseek' | 'gemini';
  color:    string;
  persona:  string;
  focus:    string;
}

const OBSERVERS: ObserverDef[] = [
  {
    id:       'observer_deepseek',
    name:     'DeepSeek Observer',
    role:     'Trend Observer (DeepSeek)',
    provider: 'deepseek',
    color:    '#5B6EE1',
    persona:  'Ты независимый внешний наблюдатель совета директоров туристической платформы Камчатки (TourHab). Ты НЕ часть команды — ты независимый аудитор трендов.',
    focus:    'Социальные тренды, настроения в соцсетях, хайп/антихайп вокруг Камчатки и туризма в России. Что обсуждают люди? Какие тренды в adventure travel? Есть ли негатив про регион?',
  },
  {
    id:       'observer_gemini',
    name:     'Gemini Observer',
    role:     'Market Observer (Google)',
    provider: 'gemini',
    color:    '#4285F4',
    persona:  'Ты независимый внешний наблюдатель совета директоров туристической платформы Камчатки (TourHab). Ты НЕ часть команды — ты независимый рыночный аналитик.',
    focus:    'Рыночные тренды: поисковый спрос на туризм Камчатки, конкуренты (booking, tripadvisor, локальные агентства), сезонность, ценовые тренды. Как ведёт себя рынок adventure travel в 2026?',
  },
];

// ── Build observer prompt ─────────────────────────────────────

function buildObserverPrompt(
  observer: ObserverDef,
  agentReportsSummary: string,
  platformMetrics: string,
): string {
  return [
    observer.persona,
    '',
    `ТВОЙ ФОКУС: ${observer.focus}`,
    '',
    'КОНТЕКСТ СОВЕЩАНИЯ:',
    'Команда AI платформы только что подготовила отчёты по своим направлениям.',
    'Вот краткие выводы:',
    agentReportsSummary,
    '',
    'МЕТРИКИ ПЛАТФОРМЫ:',
    platformMetrics,
    '',
    'ЗАДАНИЕ:',
    'Дай 3-5 инсайтов из ВНЕШНЕЙ перспективы, которые совет мог пропустить.',
    'Формат каждого инсайта:',
    '- [TREND/RISK/OPPORTUNITY] Краткое описание (1-2 предложения)',
    '',
    'Правила:',
    '- Только факты и наблюдения, не комплименты',
    '- Если не знаешь — скажи "нет данных" вместо выдумки',
    '- Твоя роль — указать на слепые пятна, а не хвалить',
    '- Отвечай на русском языке',
    '- Будь кратким — максимум 5 пунктов',
  ].join('\n');
}

// ── Run single observer ───────────────────────────────────────

async function runObserver(
  observer: ObserverDef,
  agentReportsSummary: string,
  platformMetrics: string,
): Promise<ObserverReport> {
  const start = Date.now();

  const prompt = buildObserverPrompt(observer, agentReportsSummary, platformMetrics);
  const messages: ChatMessage[] = [
    { role: 'system', content: observer.persona },
    { role: 'user', content: prompt },
  ];

  try {
    const response = await callAIWaterfall(messages);

    if (!response || response.startsWith('Извините, сервис')) {
      return {
        id:          observer.id,
        name:        observer.name,
        role:        observer.role,
        provider:    observer.provider,
        report:      `${observer.name} временно недоступен.`,
        duration_ms: Date.now() - start,
        status:      'unavailable',
        color:       observer.color,
      };
    }

    return {
      id:          observer.id,
      name:        observer.name,
      role:        observer.role,
      provider:    observer.provider,
      report:      response.trim(),
      duration_ms: Date.now() - start,
      status:      'ok',
      color:       observer.color,
    };
  } catch (err) {
    return {
      id:          observer.id,
      name:        observer.name,
      role:        observer.role,
      provider:    observer.provider,
      report:      `Ошибка: ${err instanceof Error ? err.message : String(err)}`,
      duration_ms: Date.now() - start,
      status:      'error',
      color:       observer.color,
    };
  }
}

// ── Public API ────────────────────────────────────────────────

/**
 * Prepare summary of agent reports for observers.
 * Strips HTML, truncates, formats as bullet list.
 */
export function summarizeReportsForObservers(
  agents: Array<{ id: string; name: string; role: string; report: string; status: string }>
): string {
  return agents
    .filter(a => a.status === 'ok')
    .map(a => `- ${a.name} (${a.role}): ${a.report.replace(/<[^>]+>/g, '').substring(0, 200)}...`)
    .join('\n');
}

/**
 * Build basic platform metrics string for observer context.
 */
export function buildMetricsForObservers(context: { platformStats?: Record<string, unknown>; [key: string]: unknown }): string {
  const stats = context.platformStats;
  if (!stats || typeof stats !== 'object') {
    return 'Метрики платформы: ~1189 маршрутов, ~50 бронирований/месяц, 1 активный оператор, Камчатка (Россия).';
  }
  return Object.entries(stats as Record<string, unknown>)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

/**
 * Run all external observers in parallel (DeepSeek + Gemini + Scout-Innovator).
 * Returns reports from each observer.
 */
export async function runExternalObservers(
  agentReportsSummary: string,
  platformMetrics: string,
): Promise<ObserverReport[]> {
  const start = Date.now();

  // Scout-Innovator — читает накопленные разведданные, предлагает эволюцию
  const scoutPromise: Promise<ObserverReport> = (async () => {
    try {
      const { ScoutInnovatorAgency } = await import('@/lib/agents/agencies/scout-innovator-agency');
      const scout = new ScoutInnovatorAgency();
      const brief = await scout.briefForBoardMeeting();
      return {
        id:          'observer_scout',
        name:        'Scout-Innovator',
        role:        'Разведчик-Новатор (AI-эволюция + отрасль)',
        provider:    'deepseek' as const,
        report:      brief,
        duration_ms: Date.now() - start,
        status:      (brief && !brief.startsWith('Нет данных')) ? 'ok' as const : 'unavailable' as const,
        color:       '#7C3AED',
      };
    } catch {
      return {
        id: 'observer_scout', name: 'Scout-Innovator',
        role: 'Разведчик-Новатор', provider: 'deepseek' as const,
        report: 'Scout-Innovator временно недоступен.',
        duration_ms: Date.now() - start, status: 'unavailable' as const, color: '#7C3AED',
      };
    }
  })();

  const [observerResults, scoutResult] = await Promise.all([
    Promise.allSettled(OBSERVERS.map(obs => runObserver(obs, agentReportsSummary, platformMetrics))),
    scoutPromise,
  ]);

  const observerReports = observerResults
    .map(r => r.status === 'fulfilled' ? r.value : null)
    .filter((r): r is ObserverReport => r !== null);

  return [...observerReports, scoutResult];
}

/**
 * Check if any observer API keys are configured.
 * DeepSeek needs DEEPSEEK_API_KEY, Gemini uses OPENROUTER_API_KEY.
 */
export function hasObserverKeys(): boolean {
  return !!(process.env.DEEPSEEK_API_KEY || process.env.OPENROUTER_API_KEY);
}

export { OBSERVERS };

/**
 * AgentMesh — система межагентного взаимодействия.
 *
 * Позволяет агентам читать отчёты коллег и реагировать на них
 * со своей профессиональной точки зрения.
 *
 * Протокол двух раундов:
 *   Раунд 1 (reports): каждый агент независимо анализирует данные
 *   Раунд 2 (reactions): каждый агент читает ВСЕ отчёты → даёт реакцию
 *
 * Раунд 3 (consensus) выполняется через EvolutionAgency.runFacilitator().
 */

import { callAIWithModel } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReactionTone = 'alert' | 'support' | 'conflict' | 'question';

export interface AgentReaction {
  from_id:     string;
  from_name:   string;
  from_role:   string;
  content:     string;
  tone:        ReactionTone;
  color:       string;
  duration_ms: number;
  /** Числовая оценка качества чужих отчётов (1-5), если агент её дал */
  score?:      number;
}

interface AgentReport {
  id:     string;
  name:   string;
  role:   string;
  report: string;
  status: 'ok' | 'error';
}

// ── Agent personas (для задания промпта) ──────────────────────────────────────

const AGENT_PERSONAS: Record<string, {
  persona:    string;
  color:      string;
  /** Какие темы из чужих отчётов важны для этого агента */
  interests:  string[];
}> = {
  admin: {
    persona:   'Ты операционный директор туристической платформы Камчатки. Отвечаешь за общую работоспособность.',
    color:     'var(--accent)',
    interests: ['риски', 'безопасность', 'правовые', 'инциденты', 'конверсия'],
  },
  legal: {
    persona:   'Ты юрисконсульт. Тебя интересуют риски ответственности, договорные нарушения и регуляторные угрозы.',
    color:     '#8B5CF6',
    interests: ['мошенничество', 'аномалии', 'отмены', 'инциденты', 'sos', 'экологические', 'рост'],
  },
  security: {
    persona:   'Ты руководитель службы безопасности. Тебя интересуют угрозы, аномалии, уязвимости.',
    color:     'var(--danger)',
    interests: ['автоматизация', 'новые функции', 'эволюция', 'рост', 'мошенничество', 'аномалии'],
  },
  hacker: {
    persona:   'Ты директор по росту (growth hacker). Тебя интересуют барьеры конверсии, возможности роста, узкие места.',
    color:     'var(--success)',
    interests: ['правовые', 'качество', 'прогноз', 'пробелы', 'контент'],
  },
  rescue: {
    persona:   'Ты начальник службы безопасности туристов (SAR). Тебя интересуют угрозы жизни и здоровью туристов.',
    color:     'var(--warning)',
    interests: ['экологические зоны', 'погода', 'инциденты', 'маршруты', 'правовые'],
  },
  eco: {
    persona:   'Ты эколог-аналитик. Тебя интересует нагрузка на природу, охраняемые зоны, устойчивость туризма.',
    color:     '#10B981',
    interests: ['рост', 'маршруты', 'новые туры', 'спасательные операции', 'планирование'],
  },
  content: {
    persona:   'Ты контент-директор. Тебя интересует качество информации, её полнота и достоверность.',
    color:     'var(--ocean)',
    interests: ['marketing', 'качество', 'отзывы', 'конверсия', 'операторы'],
  },
  quality: {
    persona:   'Ты директор по качеству. Тебя интересуют отзывы, репутация, системные сбои в обслуживании.',
    color:     '#F59E0B',
    interests: ['контент', 'правовые', 'аномалии', 'бронирования', 'операторы'],
  },
  evo: {
    persona:   'Ты AI-архитектор системы. Тебя интересует ВСЁ — ты видишь паттерны, которые другие не замечают.',
    color:     '#EC4899',
    interests: ['все', 'паттерны', 'системные', 'эволюция', 'автоматизация'],
  },
  planning: {
    persona:   'Ты стратегический плановик. Тебя интересуют прогнозы, сезонные тренды и разрывы спроса/предложения.',
    color:     '#3B82F6',
    interests: ['прогноз', 'сезон', 'спрос', 'дефицит', 'бронирования', 'тренд'],
  },
  finance: {
    persona:   'Ты финансовый директор. Тебя интересует выручка, комиссии, cashflow и unit-экономика.',
    color:     '#6366F1',
    interests: ['выручка', 'комиссия', 'платеж', 'возврат', 'средний чек', 'маржа'],
  },
  infra: {
    persona:   'Ты SRE-инженер. Тебя интересует здоровье инфраструктуры, AI-провайдеры, latency и downtime.',
    color:     '#14B8A6',
    interests: ['ошибки', 'latency', 'база данных', 'AI', 'cron', 'деградация'],
  },
  vibe_coder: {
    persona:   'Ты senior-разработчик. Тебя интересует качество кода, технический долг и провалившиеся интенты.',
    color:     '#F97316',
    interests: ['код', 'баг', 'рефакторинг', 'ошибки', 'интент', 'тест'],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectTone(text: string): ReactionTone {
  const lower = text.toLowerCase();
  if (lower.includes('опасн') || lower.includes('критич') || lower.includes('немедленно') ||
      lower.includes('угроз') || lower.includes('нарушен')) return 'alert';
  if (lower.includes('противоречи') || lower.includes('не согласен') || lower.includes('ошибочно') ||
      lower.includes('конфликт') || lower.includes('спорн')) return 'conflict';
  if (lower.includes('подтвержд') || lower.includes('согласен') || lower.includes('поддержива') ||
      lower.includes('важно') || lower.includes('поддержу')) return 'support';
  return 'question';
}

/** Анонимные метки для отчётов — убирает bias «я согласен с Admin потому что он главный» */
const ANON_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function buildReactionPrompt(
  agent:       { id: string; name: string; role: string },
  allReports:  AgentReport[],
  persona:     string
): string {
  // Анонимизация: заменяем имена/роли на нейтральные метки (Karpathy llm-council pattern)
  const others = allReports
    .filter(r => r.id !== agent.id && r.status === 'ok')
    .map((r, i) => `[Подразделение ${ANON_LABELS[i % ANON_LABELS.length]}]:\n${r.report.replace(/<[^>]+>/g, '').substring(0, 1000)}...`)
    .join('\n\n');

  return (
    `${persona}\n\n` +
    `На оперативном совещании другие подразделения (анонимизированы) представили следующие отчёты:\n\n` +
    `${others}\n\n` +
    `Ответь одним из двух вариантов:\n` +
    `1) Если тебе НЕЧЕГО добавить или все отчёты не касаются твоей сферы — ответь ровно: NULL\n` +
    `2) Если у тебя есть ВАЖНАЯ реакция (предупреждение, поддержка позиции, конфликт интересов, ` +
    `уточняющий вопрос) — дай 1-2 конкретных предложения. Укажи букву подразделения. ` +
    `Не повторяй что уже сказал в своём отчёте. Стиль: деловой, конкретный.\n\n` +
    `В конце ответа обязательно поставь общую оценку качества отчётов: SCORE:<число от 1 до 5> ` +
    `(1=критично плохо, 3=нормально, 5=отлично). Оценивай полноту данных и практичность.`
  );
}

/** Извлекает числовой score из текста реакции (SCORE:N) */
function extractScore(text: string): number | undefined {
  const m = text.match(/SCORE:\s*([1-5])/i);
  return m ? parseInt(m[1], 10) : undefined;
}

// ── AgentMesh ──────────────────────────────────────────────────────────────────

export class AgentMesh {
  /**
   * Раунд 2: каждый агент реагирует на чужие отчёты.
   * Все вызовы параллельны. NULL-ответы фильтруются.
   */
  async runReactions(
    agents: AgentReport[],
    modelMap?: Record<string, string>,
  ): Promise<AgentReaction[]> {
    const REACTION_TIMEOUT_MS = 15_000;
    const tasks = agents
      .filter(a => a.status === 'ok')
      .map(async (agent): Promise<AgentReaction | null> => {
        const cfg = AGENT_PERSONAS[agent.id];
        if (!cfg) return null;

        const start = Date.now();
        try {
          const prompt = buildReactionPrompt(agent, agents, cfg.persona);
          const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
          const agentModel = modelMap?.[agent.id] ?? null;
          const { text } = await Promise.race([
            callAIWithModel(messages, agentModel),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Reaction timeout ${agent.id}`)), REACTION_TIMEOUT_MS)
            ),
          ]);

          if (!text || text.trim().toUpperCase() === 'NULL' || text.trim() === '') {
            return null;
          }

          const cleanText = text.trim().replace(/SCORE:\s*[1-5]/i, '').trim();
          return {
            from_id:     agent.id,
            from_name:   agent.name,
            from_role:   agent.role,
            content:     cleanText,
            tone:        detectTone(text),
            color:       cfg.color,
            duration_ms: Date.now() - start,
            score:       extractScore(text),
          };
        } catch {
          return null;
        }
      });

    const results = await Promise.allSettled(tasks);
    return results
      .filter((r): r is PromiseFulfilledResult<AgentReaction | null> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter((r): r is AgentReaction => r !== null);
  }

  /**
   * Раунд 3: фасилитатор (Evolution) синтезирует консенсус и конфликты.
   * На входе — все отчёты + все реакции.
   */
  async runConsensus(
    agents:    AgentReport[],
    reactions: AgentReaction[],
    observerInsights?: string,
    consensusModel?: string | null,
  ): Promise<string> {
    const reportsSummary = agents
      .filter(a => a.status === 'ok')
      .map(a => `[${a.name}]: ${a.report.replace(/<[^>]+>/g, '').substring(0, 1000)}`)
      .join('\n');

    const reactionsSummary = reactions.length > 0
      ? reactions
          .map(r => `[${r.from_name}]: ${r.content}`)
          .join('\n')
      : 'Реакций нет — участники приняли всё к сведению.';

    const observerBlock = observerInsights
      ? `\n\nВНЕШНИЕ НАБЛЮДАТЕЛИ:${observerInsights}\n`
      : '';

    const messages: ChatMessage[] = [{
      role: 'user',
      content:
        `Ты фасилитатор совещания директоров туристической платформы Камчатки.\n\n` +
        `ОТЧЁТЫ ПОДРАЗДЕЛЕНИЙ:\n${reportsSummary}\n\n` +
        `ПЕРЕКРЁСТНЫЕ РЕАКЦИИ:\n${reactionsSummary}\n\n` +
        `${observerBlock}` +
        `Составь ИТОГ СОВЕЩАНИЯ в трёх блоках:\n\n` +
        `1. КОНСЕНСУС — что все агенты подтверждают, нет разногласий (2–3 пункта)\n` +
        `2. КОНФЛИКТЫ — где мнения расходятся, требуется решение директора (1–3 пункта)\n` +
        `3. ПРИОРИТЕТЫ — ТОП-3 действия, которые нужно сделать СЕГОДНЯ\n` +
        (observerInsights ? `\n4. ВНЕШНИЙ ВЗГЛЯД — ключевые инсайты от независимых наблюдателей, которые совет должен учесть (1–3 пункта)\n` : '') +
        `\nФормат: маркированный список. Деловой стиль. Без воды.`,
    }];

    const CONSENSUS_TIMEOUT_MS = 30_000;
    try {
      const { text } = await Promise.race([
        callAIWithModel(messages, consensusModel),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Consensus timeout')), CONSENSUS_TIMEOUT_MS)
        ),
      ]);
      return text || 'AI-синтез недоступен.';
    } catch {
      return 'AI-синтез временно недоступен.';
    }
  }
}

/**
 * ScoutInnovatorAgency — Разведчик-Новатор.
 *
 * Внешний агент, не входящий в совет директоров.
 * Читает накопленные разведданные из agent_memory (собранные intelligence-monitor),
 * анализирует AI-эволюцию и отраслевые тренды,
 * генерирует конкретные эволюционные предложения для платформы.
 *
 * Источники знаний:
 *   - agent_memory (evo/intel_*) — AI & tech сигналы (habr, OpenAI, Anthropic, HuggingFace)
 *   - agent_memory (evo/insight) — выводы прошлых заседаний совета
 *   - agent_memory (evo/intelligence) — travel-индустрия и конкуренты
 *
 * Выход:
 *   - ScoutReport с 2-4 конкретными предложениями
 *   - Каждое предложение → agent_approvals (owner review)
 *
 * READ intel + WRITE proposals only.
 */

import { agentMemory } from '@/lib/agents/memory/agent-memory';
import { approvalRequired } from '@/lib/agents/safeguards/approval-required';
import { callAIWaterfall } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

// ── Types ──────────────────────────────────────────────────────────────────

export interface EvolutionProposal {
  title:       string;
  category:    'ai_capability' | 'travel_feature' | 'ux_improvement' | 'integration';
  description: string;
  inspiration: string; // откуда идея (AI-тренд, отраслевой опыт)
  effort:      'low' | 'medium' | 'high';
  impact:      'low' | 'medium' | 'high';
  approval_id: string | null;
}

export interface ScoutReport {
  generated_at:   string;
  intel_sources:  number;
  synthesis:      string;
  proposals:      EvolutionProposal[];
  duration_ms:    number;
}

// ── Промпт синтеза внешних сигналов ────────────────────────────────────────

function buildSynthesisPrompt(intelSummary: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content: `Ты Разведчик-Новатор туристической платформы Камчатки (TourHab).

Твоя роль: наблюдать за внешним миром (AI, технологии, туриндустрия) и предлагать
конкретные эволюционные улучшения ДЛЯ ЭТОГО ПРОЕКТА.

Платформа: Next.js 15, PostgreSQL, 13 AI-директоров, маршруты Камчатки, операторы, туристы.
Стек AI: DeepSeek, Gemini, OpenRouter, Anthropic — всё уже подключено.

Принципы:
1. Только то, что реально применимо к TourHab прямо сейчас
2. Конкретно: что именно добавить, где, зачем
3. Не фантазии — только то, что уже работает у других
4. Приоритет: пользователи (туристы + операторы) получают реальную выгоду`,
    },
    {
      role: 'user',
      content: `Вот последние разведданные из внешнего мира:

${intelSummary}

Задача:
1. Синтезируй 2-4 самых релевантных тренда для нашей платформы (1-2 предложения каждый)
2. Для каждого тренда — конкретное предложение что добавить в TourHab

Формат ответа (строго JSON):
{
  "synthesis": "общий вывод о направлении эволюции (2-3 предложения)",
  "proposals": [
    {
      "title": "краткое название (до 60 символов)",
      "category": "ai_capability|travel_feature|ux_improvement|integration",
      "description": "что конкретно сделать (1-2 предложения, технически)",
      "inspiration": "откуда идея — конкретный тренд или технология",
      "effort": "low|medium|high",
      "impact": "low|medium|high"
    }
  ]
}`,
    },
  ];
}

// ── Чтение intel из agent_memory ────────────────────────────────────────────

async function gatherIntel(): Promise<{ summary: string; count: number }> {
  const [aiIntel, travelIntel, boardInsights] = await Promise.allSettled([
    agentMemory.recall('evo', 'intelligence', 6),
    agentMemory.recall('evo', 'insight', 4),
    agentMemory.recall('evo', 'insight', 3),
  ]);

  const pieces: string[] = [];

  if (aiIntel.status === 'fulfilled' && aiIntel.value.length > 0) {
    pieces.push('=== AI & ТЕХНОЛОГИИ ===');
    for (const m of aiIntel.value) {
      const val = m.value as Record<string, unknown>;
      const text = val.summary ?? val.consensus ?? val.findings ?? JSON.stringify(val).substring(0, 300);
      pieces.push(`• ${String(text).substring(0, 400)}`);
    }
  }

  if (travelIntel.status === 'fulfilled' && travelIntel.value.length > 0) {
    pieces.push('\n=== ТУРИСТИЧЕСКАЯ ОТРАСЛЬ ===');
    for (const m of travelIntel.value.slice(0, 3)) {
      const val = m.value as Record<string, unknown>;
      const text = val.summary ?? val.consensus ?? JSON.stringify(val).substring(0, 300);
      pieces.push(`• ${String(text).substring(0, 300)}`);
    }
  }

  if (boardInsights.status === 'fulfilled' && boardInsights.value.length > 0) {
    pieces.push('\n=== ВЫВОДЫ СОВЕТА (контекст платформы) ===');
    for (const m of boardInsights.value.slice(0, 2)) {
      const val = m.value as Record<string, unknown>;
      const text = val.consensus ?? val.summary ?? JSON.stringify(val).substring(0, 200);
      pieces.push(`• ${String(text).substring(0, 200)}`);
    }
  }

  const summary = pieces.join('\n').substring(0, 4000);
  const count = (aiIntel.status === 'fulfilled' ? aiIntel.value.length : 0)
    + (travelIntel.status === 'fulfilled' ? travelIntel.value.length : 0);

  return { summary, count };
}

// ── Публичный API ───────────────────────────────────────────────────────────

export class ScoutInnovatorAgency {
  async run(): Promise<ScoutReport> {
    const started = Date.now();

    // 1. Собираем разведданные
    const { summary, count } = await gatherIntel();

    if (!summary || count === 0) {
      return {
        generated_at:  new Date().toISOString(),
        intel_sources: 0,
        synthesis:     'Разведданных пока нет. Запустите intelligence-monitor для сбора сигналов.',
        proposals:     [],
        duration_ms:   Date.now() - started,
      };
    }

    // 2. AI-синтез → предложения
    const messages = buildSynthesisPrompt(summary);
    const text = await callAIWaterfall(messages).catch(() => null);

    if (!text || text.startsWith('Извините')) {
      return {
        generated_at:  new Date().toISOString(),
        intel_sources: count,
        synthesis:     'AI-синтез недоступен. Попробуйте позже.',
        proposals:     [],
        duration_ms:   Date.now() - started,
      };
    }

    // 3. Парсим JSON
    const match = text.match(/\{[\s\S]*\}/);
    let synthesis = text.substring(0, 400);
    const rawProposals: EvolutionProposal[] = [];

    if (match) {
      try {
        const parsed = JSON.parse(match[0]) as {
          synthesis?: string;
          proposals?: Array<{
            title?: string;
            category?: string;
            description?: string;
            inspiration?: string;
            effort?: string;
            impact?: string;
          }>;
        };

        if (parsed.synthesis) synthesis = parsed.synthesis.substring(0, 600);

        const categories = ['ai_capability', 'travel_feature', 'ux_improvement', 'integration'] as const;
        const efforts    = ['low', 'medium', 'high'] as const;

        for (const p of (parsed.proposals ?? []).slice(0, 4)) {
          rawProposals.push({
            title:       (p.title ?? 'Эволюционное предложение').substring(0, 60),
            category:    categories.includes(p.category as typeof categories[number])
              ? (p.category as typeof categories[number])
              : 'ai_capability',
            description: (p.description ?? '').substring(0, 400),
            inspiration: (p.inspiration ?? '').substring(0, 200),
            effort:      efforts.includes(p.effort as typeof efforts[number])
              ? (p.effort as typeof efforts[number])
              : 'medium',
            impact:      efforts.includes(p.impact as typeof efforts[number])
              ? (p.impact as typeof efforts[number])
              : 'medium',
            approval_id: null,
          });
        }
      } catch { /* используем fallback */ }
    }

    // 4. Сохраняем в agent_approvals — каждое предложение на одобрение
    const proposals: EvolutionProposal[] = [];
    for (const p of rawProposals) {
      try {
        const approval = await approvalRequired.request({
          type:         'prompt_optimize',
          description:  `[Scout-Innovator] ${p.title}: ${p.description}`,
          context:      { category: p.category, inspiration: p.inspiration, effort: p.effort, impact: p.impact },
          requested_by: 'agent_scout_innovator',
          expires_hours: 72,
        });
        proposals.push({ ...p, approval_id: approval.id ?? null });
      } catch {
        proposals.push(p);
      }
    }

    // 5. Сохраняем отчёт в agent_memory для истории
    await agentMemory.remember({
      agent_id:    'evo',
      memory_type: 'intelligence',
      key:         `scout_${Date.now()}`,
      value:       { synthesis, proposals_count: proposals.length, generated_at: new Date().toISOString() },
      source:      'scout_innovator',
      expires_at:  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }).catch(() => null);

    return {
      generated_at:  new Date().toISOString(),
      intel_sources: count,
      synthesis,
      proposals,
      duration_ms:   Date.now() - started,
    };
  }

  /**
   * Краткий отчёт для board meeting (как external observer).
   * Читает последний сохранённый scout-отчёт из agent_memory.
   */
  async briefForBoardMeeting(): Promise<string> {
    const recent = await agentMemory.recall('evo', 'intelligence', 3);
    const scoutMemories = recent.filter(m => m.source === 'scout_innovator');

    if (scoutMemories.length === 0) {
      return 'Нет данных — запустите Scout-Innovator (/api/cron/scout) для получения разведки.';
    }

    const latest = scoutMemories[0];
    const val = latest.value as Record<string, unknown>;
    const synthesis = String(val.synthesis ?? '').substring(0, 500);
    const count = Number(val.proposals_count ?? 0);

    return `[Scout-Innovator] ${synthesis}\nПредложений на одобрение: ${count}`;
  }
}

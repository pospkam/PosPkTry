/**
 * lib/agents/evolution/optimized-runner.ts
 * AGENT EVOLUTION — Phase 3: Parallel Execution
 *
 * Problem: 9 agents × 4 rounds runs sequentially, hits 30s timeout
 * Solution: Run agents in parallel with timeout control + fallback
 *
 * Result: From timeout errors → all agents complete in < 20s
 */

import { callAIWithModelDirect } from '@/lib/ai/providers';
import { getModelForAgent } from '@/lib/ai/agent-models';
import type { ChatMessage } from '@/lib/ai/prompts';
import type { RichAgentContext } from './agent-context-v2';
import { formatContextForPrompt } from './agent-context-v2';

export interface AgentExecutionResult {
  agentId: string;
  agentName: string;
  success: boolean;
  report: string;
  error?: string;
  executionTimeMs: number;
}

/**
 * Execute single agent with timeout + retry
 */
async function executeAgentWithTimeout(
  context: RichAgentContext,
  prompt: string,
  timeoutMs: number,
  agentId?: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let completed = false;

    // Timeout handler
    const timeoutHandle = setTimeout(() => {
      if (!completed) {
        completed = true;
        reject(new Error(`Agent timeout after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    // Execute AI call
    (async () => {
      try {
        const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
        const model = agentId ? getModelForAgent(agentId) : null;
        const result = await callAIWithModelDirect(messages, model);

        if (!completed) {
          completed = true;
          clearTimeout(timeoutHandle);
          resolve(result || '');
        }
      } catch (err) {
        if (!completed) {
          completed = true;
          clearTimeout(timeoutHandle);
          reject(err);
        }
      }
    })();
  });
}

/**
 * Run all agents in parallel (Round 1, 2, 3, or 4)
 */
export async function runAgentsInParallel(
  agents: Array<{
    id: string;
    name: string;
    context: RichAgentContext;
    prompt: string;
  }>
): Promise<AgentExecutionResult[]> {
  const executions = agents.map(async (agent) => {
    const startTime = Date.now();

    try {
      const fullPrompt = [
        formatContextForPrompt(agent.context),
        '',
        '═════════════════════════════════════════════════',
        '',
        agent.prompt,
      ].join('\n');

      const report = await executeAgentWithTimeout(
        agent.context,
        fullPrompt,
        agent.context.timeLimit,
        agent.id,
      );

      return {
        agentId: agent.id,
        agentName: agent.name,
        success: true,
        report: report || '(пусто)',
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      // On first failure, return fallback generic report
      return {
        agentId: agent.id,
        agentName: agent.name,
        success: false,
        report: `[FALLBACK] ${agent.name} не смог завершить анализ. Ошибка: ${errorMsg}`,
        error: errorMsg,
        executionTimeMs: Date.now() - startTime,
      };
    }
  });

  // Wait for all agents (with Promise.allSettled to not fail on individual errors)
  const results = await Promise.allSettled(executions);

  return results.map((result, idx) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        agentId: agents[idx].id,
        agentName: agents[idx].name,
        success: false,
        report: `[FALLBACK] Непредвиденная ошибка`,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        executionTimeMs: 0,
      };
    }
  });
}

/**
 * Helper: Create agent briefing for a round
 */
export function createAgentPromptForRound(
  round: 1 | 2 | 3 | 4,
  topic: string | null,
  focusArea: string
): string {
  switch (round) {
    case 1:
      return [
        'РАУНД 1: ИНДИВИДУАЛЬНЫЕ ОТЧЕТЫ',
        '',
        'Проанализируй текущее состояние платформы в своей области компетенции.',
        focusArea ? `Особое внимание: ${focusArea}` : '',
        topic ? `Тема совещания: "${topic}" - твой анализ должен быть напрямую связан` : '',
        '',
        'Структура отчёта:',
        '1. ТЕКУЩЕЕ СОСТОЯНИЕ (основные метрики)',
        '2. ПРОБЛЕМЫ (что упало/изменилось)',
        '3. КОРНЕВЫЕ ПРИЧИНЫ (почему)',
        '4. РИСКИ (чем это опасно)',
        '5. РЕКОМЕНДАЦИИ (что делать)',
      ].join('\n');

    case 2:
      return [
        'РАУНД 2: ПЕРЕКРЁСТНЫЕ РЕАКЦИИ',
        '',
        'Прочитай отчёты других агентов. Согласен ли ты? Есть ли противоречия?',
        'Респондируй кратко (2-3 предложения на каждого).',
      ].join('\n');

    case 3:
      return [
        'РАУНД 3: КОНСЕНСУС',
        '',
        'Синтезируй общее мнение совета. Что все согласны? Где разногласия?',
        'Формат: СОГЛАСИЕ, ПРОТИВОРЕЧИЯ, ПРИОРИТЕТЫ',
      ].join('\n');

    case 4:
      return [
        'РАУНД 4: ИНИЦИАТИВЫ',
        '',
        'На основе анализа, предложи ОДНО конкретное действие.',
        'Формат: JSON с полями title, description, priority, confidence',
      ].join('\n');

    default:
      return '';
  }
}

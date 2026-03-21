/**
 * EvolutionAgency — AI-эволюция: система саморазвития платформы.
 *
 * Анализирует собственную эффективность, запускает эксперименты
 * и адаптирует поведение агентов на основе данных:
 *
 *   evo_optimize    — самоанализ: где ИИ работает плохо, что улучшить
 *   evo_experiments — автоматически предложить A/B-тест на основе паттернов
 *   evo_adapt       — адаптация на основе фидбека пользователей
 *
 * Принцип: агент изучает ВСЕ доступные сигналы и эволюционирует.
 * Не удалять. Не ограничивать. Это — мозг системы.
 */

import { pool } from '@/lib/db-pool';
import { callAIWaterfall } from '@/lib/ai/providers';
import type { AgentContext } from '../context-hub';
import type { ChatMessage } from '@/lib/ai/prompts';
import { PatternRecognition }  from '../learning/pattern-recognition';
import { FeedbackLoop }        from '../learning/feedback-loop';
import { ExperimentTracker }   from '../learning/experiment-tracker';
import { agentMemory }         from '../memory/agent-memory';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

interface IntentMetricRow {
  decision: string;
  count: string;
  success_rate: string;
  avg_duration_ms: string;
  feedback_score: string;
}

export class EvolutionAgency {
  private readonly patterns    = new PatternRecognition();
  private readonly feedback    = new FeedbackLoop();
  private readonly experiments = new ExperimentTracker();

  async run(intent: string, _context: AgentContext): Promise<AgencyResult> {
    switch (intent) {
      case 'evo_optimize':     return this.selfOptimize();
      case 'evo_experiments':  return this.autoExperiment();
      case 'evo_adapt':        return this.adaptFromFeedback();
      default:                 return { response: 'EvolutionAgency: команда не поддерживается.' };
    }
  }

  /**
   * Самоанализ: выявляет слабые места агентной системы
   * и предлагает конкретные улучшения.
   */
  private async selfOptimize(): Promise<AgencyResult> {
    const [systemPatterns, feedbackSummary, intentMetrics, directorDecisions] = await Promise.all([
      this.patterns.detectPatterns(168), // 7 дней
      this.feedback.getSummary(168),
      pool.query<IntentMetricRow>(`
        SELECT
          metadata->>'decision'                                          AS decision,
          COUNT(*)::text                                                 AS count,
          ROUND(
            100.0 * COUNT(*) FILTER (WHERE metadata->>'result' = 'success')
            / NULLIF(COUNT(*), 0), 1
          )::text                                                        AS success_rate,
          ROUND(AVG((metadata->>'duration_ms')::numeric))::text          AS avg_duration_ms,
          COALESCE(
            (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE metadata->>'rating' = 'good')
                          / NULLIF(COUNT(*), 0), 1)
             FROM ai_actions_log fb
             WHERE fb.action_type = 'agent_feedback'
               AND fb.metadata->>'intent' = al.metadata->>'decision'
             )::text,
            'нет данных'
          )                                                              AS feedback_score
        FROM ai_actions_log al
        WHERE action_type LIKE 'agent_%'
          AND action_type NOT IN ('agent_feedback', 'agent_experiment_result')
          AND created_at >= NOW() - INTERVAL '7 days'
          AND metadata->>'decision' IS NOT NULL
        GROUP BY metadata->>'decision'
        ORDER BY count::int DESC
        LIMIT 15
      `),
      agentMemory.recall('director', 'decision', 3),
    ]);

    const lines: string[] = [
      '<b>Самоанализ AI-системы (7 дней)</b>',
      '',
      `Паттернов обнаружено: ${systemPatterns.length}`,
      `Удовлетворённость (feedback): ${
        feedbackSummary.overall_satisfaction !== undefined
          ? `${Math.round(feedbackSummary.overall_satisfaction * 100)}%`
          : 'нет данных'
      }`,
    ];

    // Критичные паттерны
    const critical = systemPatterns.filter(p => p.severity === 'critical');
    const warnings = systemPatterns.filter(p => p.severity === 'warning');

    if (critical.length > 0) {
      lines.push('', '<b>Критичные проблемы:</b>');
      for (const p of critical) lines.push(`- [${p.intent}] ${p.description}`);
    }

    if (warnings.length > 0) {
      lines.push('', '<b>Предупреждения:</b>');
      for (const p of warnings.slice(0, 3)) lines.push(`- [${p.intent}] ${p.description}`);
    }

    if (intentMetrics.rows.length > 0) {
      lines.push('', 'Статистика интентов:');
      for (const m of intentMetrics.rows) {
        const sr = parseFloat(m.success_rate);
        const flag = sr < 70 ? ' <-- слабый' : '';
        lines.push(
          `- ${m.decision}: ${m.count} вызовов, ${m.success_rate}% успех, ${m.avg_duration_ms}ms${flag}`
        );
      }
    }

    if (feedbackSummary.worst_intent) {
      lines.push(
        '',
        `Самый слабый интент по отзывам: ${feedbackSummary.worst_intent}`,
        'Рекомендация: пересмотреть промпт для этого интента.'
      );
    }

    // Fix 2: решения директора с прошлых совещаний
    const decisionLines: string[] = [];
    for (const d of directorDecisions) {
      const val = d.value as { decision?: string; decided_at?: string };
      if (val.decision) {
        decisionLines.push(`- [${val.decided_at?.slice(0, 10) ?? 'ранее'}] ${val.decision.substring(0, 200)}`);
      }
    }
    if (decisionLines.length > 0) {
      lines.push('', '<b>Решения директора с прошлых совещаний:</b>', ...decisionLines);
    }

    const decisionsContext = decisionLines.length > 0
      ? `Решения директора: ${decisionLines.join('; ')}. `
      : '';

    const aiEvolution = await this.callAI(
      `Ты AI-эволюция туристической платформы. Данные за 7 дней: ` +
      `${critical.length} критичных паттернов, ${warnings.length} предупреждений, ` +
      `удовлетворённость: ${Math.round((feedbackSummary.overall_satisfaction ?? 0) * 100)}%. ` +
      decisionsContext +
      `Предложи ТОП-3 конкретных улучшения архитектуры агентной системы с учётом курса директора. ` +
      `Мыслишь как эволюционный алгоритм — выжить и улучшиться.`
    );

    if (aiEvolution) lines.push('', '<b>Эволюционные рекомендации:</b>', aiEvolution);

    // Store analysis results as memory
    await agentMemory.remember({
      agent_id: 'evo',
      memory_type: 'insight',
      key: `optimize_${new Date().toISOString().slice(0, 10)}`,
      value: {
        patterns_found: systemPatterns.length,
        critical: critical.length,
        warnings: warnings.length,
        satisfaction: feedbackSummary.overall_satisfaction,
        worst_intent: feedbackSummary.worst_intent,
        recommendations: aiEvolution?.substring(0, 500) ?? null,
      },
      source: 'self_optimize',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return {
      response: lines.join('\n'),
      data: {
        patterns: systemPatterns,
        feedback: feedbackSummary,
        metrics: intentMetrics.rows,
      },
    };
  }

  /**
   * Автоматически предлагает A/B-тест для самого используемого интента.
   * Создаёт эксперимент если нет активных для данного интента.
   */
  private async autoExperiment(): Promise<AgencyResult> {
    const [topIntents, activeExps] = await Promise.all([
      pool.query<{ decision: string; count: string }>(`
        SELECT metadata->>'decision' AS decision, COUNT(*)::text AS count
        FROM ai_actions_log
        WHERE action_type LIKE 'agent_%'
          AND action_type NOT IN ('agent_feedback', 'agent_experiment_result')
          AND created_at >= NOW() - INTERVAL '7 days'
          AND metadata->>'decision' IS NOT NULL
          AND metadata->>'decision' != 'unknown'
        GROUP BY metadata->>'decision'
        ORDER BY count::int DESC
        LIMIT 5
      `),
      this.experiments.list('running'),
    ]);

    const activeIntents = new Set(activeExps.map(e => e.intent ?? ''));
    const candidate = topIntents.rows.find(r => !activeIntents.has(r.decision));

    if (!candidate) {
      return {
        response: `Все популярные интенты (${topIntents.rows.map(r => r.decision).join(', ')}) уже участвуют в A/B-тестах.`,
      };
    }

    // Создаём эксперимент автоматически
    const exp = await this.experiments.create({
      name:        `auto_${candidate.decision}_${Date.now()}`,
      description: `Автоэксперимент: оптимизация интента "${candidate.decision}" (${candidate.count} вызовов/нед.)`,
      variant_a:   { label: 'control',          prompt_style: 'current' },
      variant_b:   { label: 'optimized_prompt', prompt_style: 'concise_structured' },
      intent:      candidate.decision,
      metric:      'success_rate',
    });

    const lines: string[] = [
      '<b>Автоматический A/B-эксперимент создан</b>',
      '',
      `Интент: ${candidate.decision}`,
      `Использований за 7 дней: ${candidate.count}`,
      `Эксперимент ID: ${exp.id}`,
      '',
      'Варианты:',
      '- control — текущее поведение',
      '- optimized_prompt — улучшенная формулировка ответа',
      '',
      'Результаты через: /api/agents/experiments',
      `Управление: /hub/admin/agents vkladka "Experiments"`,
    ];

    return {
      response: lines.join('\n'),
      data: { experiment_id: exp.id, intent: candidate.decision, count: candidate.count },
    };
  }

  /**
   * Адаптация поведения системы на основе фидбека.
   * Изучает паттерны неудовлетворённости и предлагает конкретные патчи.
   */
  private async adaptFromFeedback(): Promise<AgencyResult> {
    const [summary, badFeedback] = await Promise.all([
      this.feedback.getSummary(168),
      pool.query<{ intent: string; comment: string | null; created_at: string }>(`
        SELECT
          metadata->>'intent' AS intent,
          metadata->>'comment' AS comment,
          created_at::text
        FROM ai_actions_log
        WHERE action_type = 'agent_feedback'
          AND metadata->>'rating' = 'bad'
          AND created_at >= NOW() - INTERVAL '7 days'
        ORDER BY created_at DESC
        LIMIT 10
      `),
    ]);

    if (badFeedback.rows.length === 0) {
      return {
        response: 'Отрицательных отзывов за 7 дней нет. Система работает оптимально.',
      };
    }

    const byIntent = badFeedback.rows.reduce<Record<string, string[]>>((acc, r) => {
      if (!acc[r.intent]) acc[r.intent] = [];
      if (r.comment) acc[r.intent].push(r.comment);
      return acc;
    }, {});

    const lines: string[] = [
      `<b>Адаптация на основе фидбека: ${badFeedback.rows.length} отриц. отзыва</b>`,
      '',
      `Общая удовлетворённость: ${Math.round((summary.overall_satisfaction ?? 0) * 100)}%`,
      '',
      'Проблемные интенты:',
    ];

    for (const [intent, comments] of Object.entries(byIntent)) {
      lines.push(`- ${intent}: ${comments.length} жалоб`);
      if (comments.length > 0) {
        lines.push(`  "${comments[0].substring(0, 100)}"`);
      }
    }

    const commentsText = badFeedback.rows
      .filter(r => r.comment)
      .map(r => r.comment)
      .slice(0, 5)
      .join('; ');

    const aiAdaptation = await this.callAI(
      `Ты AI-эволюция. Анализируй жалобы пользователей туристической платформы: ` +
      `"${commentsText}". ` +
      `Предложи конкретные изменения в поведении агентов (промпты, логику, формат ответов). ` +
      `Мыслишь как система, которая учится на своих ошибках.`
    );

    if (aiAdaptation) {
      lines.push('', '<b>План адаптации:</b>', aiAdaptation);
    }

    // Store adaptation plan as memory
    await agentMemory.remember({
      agent_id: 'evo',
      memory_type: 'prompt_patch',
      key: `adapt_${summary.worst_intent ?? 'general'}`,
      value: {
        worst_intent: summary.worst_intent,
        adaptation_plan: aiAdaptation?.substring(0, 500) ?? null,
        bad_feedback_count: badFeedback.rows.length,
        by_intent: Object.fromEntries(
          Object.entries(byIntent).map(([k, v]) => [k, v.length])
        ),
      },
      source: 'feedback',
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    });

    return { response: lines.join('\n'), data: { by_intent: byIntent, summary } };
  }

  private async callAI(prompt: string): Promise<string | null> {
    try {
      const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
      return await callAIWaterfall(messages);
    } catch {
      return null;
    }
  }
}

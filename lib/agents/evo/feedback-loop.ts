/**
 * Feedback Loop — система обратной связи.
 *
 * Когда человек проверяет PR/фикс Evo Agent:
 * - Оценивает результат (success/partial/failure/regression)
 * - Пишет что сработало, что нет
 * - AI анализирует фидбек и обновляет стратегию
 *
 * Через месяц система знает: какие категории фиксов работают, какие нет.
 */

import { pool } from '@/lib/db-pool';
import { callAIWithModelDirect } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

export interface FeedbackInput {
  evolution_id: string;
  outcome: 'success' | 'partial' | 'failure' | 'regression';
  impact_score: number;   // -100 до +100
  human_notes: string;
}

export interface FeedbackResult {
  saved: boolean;
  ai_learning: string | null;
  updated_strategy: string | null;
}

/**
 * Сохраняет фидбек и запускает AI-анализ.
 */
export async function submitFeedback(input: FeedbackInput): Promise<FeedbackResult> {
  // 1. Сохраняем фидбек
  await pool.query(
    `INSERT INTO evo_feedback (evolution_id, outcome, impact_score, human_notes)
     VALUES ($1, $2, $3, $4)`,
    [input.evolution_id, input.outcome, input.impact_score, input.human_notes],
  );

  // Обновляем статус evolution log
  await pool.query(
    `UPDATE evo_evolution_log
     SET status = $1, review_notes = $2, resolved_at = NOW()
     WHERE id = $3`,
    [input.outcome === 'success' ? 'merged' : 'rejected', input.human_notes, input.evolution_id],
  );

  // 2. AI-анализ фидбека — что извлечь для следующего цикла
  const aiLearning = await analyzeFeedback(input);

  if (aiLearning) {
    await pool.query(
      `UPDATE evo_feedback SET ai_learning = $1 WHERE evolution_id = $2`,
      [aiLearning, input.evolution_id],
    );

    // 3. Обновляем общую стратегию
    const newStrategy = await updateEvolutionStrategy(aiLearning, input);

    return { saved: true, ai_learning: aiLearning, updated_strategy: newStrategy };
  }

  return { saved: true, ai_learning: null, updated_strategy: null };
}

async function analyzeFeedback(input: FeedbackInput): Promise<string | null> {
  // Получаем контекст: какой issue, какой категории
  const { rows } = await pool.query<{
    category: string;
    action: string;
    issue_title: string;
    diff_summary: string | null;
  }>(`
    SELECT e.action, i.category, i.title AS issue_title, e.diff_summary
    FROM evo_evolution_log e
    JOIN evo_growth_issues i ON i.id = e.issue_id
    WHERE e.id = $1
  `, [input.evolution_id]);

  if (rows.length === 0) return null;

  const row = rows[0];

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты анализируешь фидбек на автоматические фиксы кода.
Извлеки урок: что пошло хорошо/плохо, что делать иначе в следующий раз.
Ответь 1-2 предложениями на русском. Будь конкретным.`,
    },
    {
      role: 'user',
      content: `Фикс: ${row.action} (${row.category})
Проблема: ${row.issue_title}
${row.diff_summary ? `Diff: ${row.diff_summary.slice(0, 500)}` : ''}

Результат: ${input.outcome}
Оценка влияния: ${input.impact_score}
Комментарий человека: ${input.human_notes}

Какой урок извлечь для будущих фиксов?`,
    },
  ];

  try {
    const result = await callAIWithModelDirect(messages, 'google/gemini-2.0-flash-001');
    return result?.trim() ?? null;
  } catch {
    return null;
  }
}

async function updateEvolutionStrategy(learning: string, input: FeedbackInput): Promise<string | null> {
  // Получаем текущую стратегию
  const { rows } = await pool.query<{ value: string }>(
    `SELECT value FROM evo_agent_state WHERE key = 'learning_summary'`,
  );

  // JSONB already deserialized by pg driver — use directly
  const current = rows[0] ? String(rows[0].value) : '';
  const newSummary = `${current}\n• ${input.outcome}: ${learning}`.slice(-2000);

  await pool.query(
    `UPDATE evo_agent_state SET value = $1, updated_at = NOW() WHERE key = 'learning_summary'`,
    [JSON.stringify(newSummary)],
  );

  return newSummary;
}

/**
 * Возвращает статистику эволюции для дашборда.
 */
export async function getEvoStats(): Promise<Record<string, unknown>> {
  const [scanStats, issueStats, evoStats, feedbackStats] = await Promise.all([
    pool.query<{ total: string; avg_duration: string }>(
      `SELECT COUNT(*)::text AS total, COALESCE(AVG(duration_ms), 0)::text AS avg_duration
       FROM evo_growth_scans WHERE status = 'complete'`,
    ),
    pool.query<{ open: string; fixed: string; ignored: string }>(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'open')::text AS open,
        COUNT(*) FILTER (WHERE status = 'fixed')::text AS fixed,
        COUNT(*) FILTER (WHERE status = 'ignored')::text AS ignored
       FROM evo_growth_issues`,
    ),
    pool.query<{ pending: string; merged: string; rejected: string }>(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
        COUNT(*) FILTER (WHERE status = 'merged')::text AS merged,
        COUNT(*) FILTER (WHERE status = 'rejected')::text AS rejected
       FROM evo_evolution_log`,
    ),
    pool.query<{ success: string; failure: string; avg_impact: string }>(
      `SELECT
        COUNT(*) FILTER (WHERE outcome = 'success')::text AS success,
        COUNT(*) FILTER (WHERE outcome IN ('failure', 'regression'))::text AS failure,
        COALESCE(AVG(impact_score), 0)::text AS avg_impact
       FROM evo_feedback`,
    ),
  ]);

  return {
    scans: scanStats.rows[0],
    issues: issueStats.rows[0],
    evolution: evoStats.rows[0],
    feedback: feedbackStats.rows[0],
  };
}
